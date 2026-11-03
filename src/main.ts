import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CodeReviewOrchestrator } from './orchestrator.js';
import type { ReviewReport } from './types/report-types.js';
import {
  ErrorCodes,
  ReviewError,
  formatError,
  isReviewError
} from './utils/error-handler.js';
import { logger } from './utils/logger.js';
import { ReportGenerator } from './utils/report-generator.js';

// Load environment variables before validation or orchestrator creation.
dotenv.config();

export type Environment = Record<string, string | undefined>;
export type AuthMethod = 'anthropic' | 'bedrock';

export interface CliArguments {
  owner: string;
  repo: string;
  prNumber: number;
}

export interface ReportPaths {
  markdown: string;
  html: string;
  json: string;
}

export const USAGE = `Usage: npm run dev -- <owner> <repo> <pr-number>

Arguments:
  owner      GitHub repository owner (for example: octocat)
  repo       GitHub repository name (for example: Hello-World)
  pr-number  Positive pull request number (for example: 1)

Example:
  npm run dev -- octocat Hello-World 1`;

function usageError(message: string): ReviewError {
  return new ReviewError(
    `${message}\n\n${USAGE}`,
    ErrorCodes.VALIDATION_FAILED
  );
}

/**
 * Parse and validate the three positional CLI arguments.
 */
export function parseArguments(argv: string[]): CliArguments {
  const [ownerArg, repoArg, prNumberArg] = argv;

  if (!ownerArg || !repoArg || !prNumberArg) {
    throw usageError(
      'Missing required arguments. Expected owner, repo, and pr-number.'
    );
  }

  const owner = ownerArg.trim();
  const repo = repoArg.trim();
  const prNumberText = prNumberArg.trim();

  if (!owner) {
    throw usageError('The repository owner must not be empty.');
  }

  if (!repo) {
    throw usageError('The repository name must not be empty.');
  }

  if (!/^\d+$/.test(prNumberText)) {
    throw usageError(
      `Invalid pull request number "${prNumberArg}". It must be a positive integer.`
    );
  }

  const prNumber = Number(prNumberText);
  if (prNumber <= 0) {
    throw usageError(
      `Invalid pull request number "${prNumberArg}". It must be a positive integer.`
    );
  }

  if (!Number.isSafeInteger(prNumber)) {
    throw usageError(
      `Invalid pull request number "${prNumberArg}". It is too large to be a valid integer.`
    );
  }

  return { owner, repo, prNumber };
}

/**
 * Determine which authentication method is configured.
 *
 * ANTHROPIC_API_KEY takes precedence. Otherwise, AWS Bedrock is used when
 * both AWS access key values are present.
 */
export function resolveAuthMethod(env: Environment = process.env): AuthMethod {
  if (env.ANTHROPIC_API_KEY?.trim()) {
    return 'anthropic';
  }

  const hasAwsKey = Boolean(env.AWS_ACCESS_KEY_ID?.trim());
  const hasAwsSecret = Boolean(env.AWS_SECRET_ACCESS_KEY?.trim());

  if (hasAwsKey !== hasAwsSecret) {
    throw new ReviewError(
      'Incomplete AWS credentials. Both AWS_ACCESS_KEY_ID and ' +
        'AWS_SECRET_ACCESS_KEY must be set when using AWS Bedrock.',
      ErrorCodes.INVALID_CONFIG
    );
  }

  if (hasAwsKey && hasAwsSecret) {
    if (!env.AWS_REGION?.trim()) {
      throw new ReviewError(
        'AWS_REGION is required when using AWS Bedrock. ' +
          'Set it to the region containing your model, for example: AWS_REGION=us-east-1',
        ErrorCodes.INVALID_CONFIG
      );
    }

    return 'bedrock';
  }

  throw new ReviewError(
    'No authentication configured. Configure one of the following:\n' +
      '  1. Anthropic API: set ANTHROPIC_API_KEY\n' +
      '  2. AWS Bedrock: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION',
    ErrorCodes.MISSING_API_KEY
  );
}

/**
 * Validate and return the required GitHub token used by the GitHub MCP server.
 */
export function resolveGitHubToken(env: Environment = process.env): string {
  const token = env.GITHUB_TOKEN?.trim();

  if (!token) {
    throw new ReviewError(
      'GITHUB_TOKEN is required for the GitHub MCP server. Add it to .env as GITHUB_TOKEN=ghp_your_token_here.',
      ErrorCodes.MISSING_GITHUB_TOKEN
    );
  }

  return token;
}

/**
 * Validate and return the required ANTHROPIC_MODEL value.
 */
export function resolveModel(env: Environment = process.env): string {
  const model = env.ANTHROPIC_MODEL?.trim();

  if (!model) {
    throw new ReviewError(
      'ANTHROPIC_MODEL is required. Examples:\n' +
        '  Anthropic API: ANTHROPIC_MODEL=claude-sonnet-4-5-20250929\n' +
        '  AWS Bedrock:    ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      ErrorCodes.INVALID_CONFIG
    );
  }

  return model;
}

function safeFileNamePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  );
}

/**
 * Generate Markdown, HTML, and JSON reports in the requested directory.
 */
export async function generateReports(
  report: ReviewReport,
  outputDir: string = 'reports'
): Promise<ReportPaths> {
  const generator = new ReportGenerator();
  const reportsDirectory = resolve(outputDir);
  const { owner, repo, number } = report.pullRequest;
  const baseName = `review-${safeFileNamePart(owner)}-${safeFileNamePart(repo)}-${number}`;

  const paths: ReportPaths = {
    markdown: resolve(reportsDirectory, `${baseName}.md`),
    html: resolve(reportsDirectory, `${baseName}.html`),
    json: resolve(reportsDirectory, `${baseName}.json`)
  };

  await mkdir(reportsDirectory, { recursive: true });
  await Promise.all([
    writeFile(paths.markdown, generator.generateMarkdownReport(report), 'utf8'),
    writeFile(paths.html, generator.generateHTMLReport(report), 'utf8'),
    writeFile(paths.json, generator.generateJSONReport(report), 'utf8')
  ]);

  return paths;
}

/**
 * Run the full review workflow. Validation and review failures are thrown so
 * the CLI wrapper can present them without printing a raw stack trace.
 */
export async function main(
  argv: string[] = process.argv.slice(2)
): Promise<void> {
  const { owner, repo, prNumber } = parseArguments(argv);
  const authMethod = resolveAuthMethod();

  console.log(
    authMethod === 'anthropic'
      ? 'Using Anthropic API authentication'
      : 'Using AWS Bedrock authentication'
  );

  resolveGitHubToken();

  const model = resolveModel();
  console.log(`Model: ${model}`);

  logger.info('Starting code review CLI', {
    owner,
    repo,
    prNumber,
    authMethod,
    model
  });

  const orchestrator = new CodeReviewOrchestrator({ model });
  const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);
  const reportPaths = await generateReports(report);

  console.log('\n Code review complete');
  console.log(` Markdown report: ${reportPaths.markdown}`);
  console.log(`HTML report:     ${reportPaths.html}`);
  console.log(`JSON report:     ${reportPaths.json}`);

  logger.info('Reports saved', {
    owner,
    repo,
    prNumber,
    reports: reportPaths
  });
}

function printError(error: unknown): void {
  console.error(`\n❌ ${formatError(error)}`);

  if (isReviewError(error) && error.metadata) {
    const details = Object.keys(error.metadata).length > 0
      ? error.metadata
      : undefined;

    if (details) {
      try {
        console.error(`   Details: ${JSON.stringify(details)}`);
      } catch {
        console.error('   Details: (metadata could not be serialized)');
      }
    }
  }
}

/**
 * CLI entry point that converts failures into a user-friendly message and a
 * non-zero exit code.
 */
export async function runCli(
  argv: string[] = process.argv.slice(2)
): Promise<number> {
  if (argv.length === 1 && ['--help', '-h', 'help'].includes(argv[0] ?? '')) {
    console.log(USAGE);
    return 0;
  }

  try {
    await main(argv);
    return 0;
  } catch (error) {
    printError(error);
    return 1;
  }
}

const entryPoint = process.argv[1];
const isDirectExecution = entryPoint !== undefined &&
  import.meta.url === pathToFileURL(resolve(entryPoint)).href;

if (isDirectExecution) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(`\n❌ ${formatError(error)}`);
      process.exitCode = 1;
    });
}
