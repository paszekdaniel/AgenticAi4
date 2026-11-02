import { query } from '@anthropic-ai/claude-agent-sdk';
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';
import { reviewAgents } from './agents/index.js';
import { mcpServersConfig } from './config/mcp.config.js';
import { buildOrchestratorPrompt } from './prompts/orchestrator.prompt.js';
import type { ReviewReport } from './types/report-types.js';
import {
  ReviewReportJSONSchema,
  ReviewReportSchema
} from './types/index.js';
import { ErrorCodes, ReviewError } from './utils/error-handler.js';
import {
  logReviewComplete,
  logReviewError,
  logReviewStart
} from './utils/logger.js';

/**
 * GitHub MCP tools the orchestrator agent may use to read the pull request.
 * Tool names follow the SDK's `mcp__<server>__<tool>` convention.
 */
const GITHUB_MCP_TOOLS = [
  'mcp__github__get_pull_request',
  'mcp__github__get_pull_request_files',
  'mcp__github__get_file_contents',
  'mcp__github__search_code'
] as const;

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  /** Model used by the orchestrator and inherited by subagents. Defaults to ANTHROPIC_MODEL. */
  model?: string;
  /** Maximum number of agent turns before the query is aborted. */
  maxTurns?: number;
  /** Working directory containing the checked-out pull request. */
  cwd?: string;
  /** Override the MCP servers for testing or alternative environments. */
  mcpServers?: Record<string, McpServerConfig>;
}

/**
 * The SDK accepts either a string or an async iterable of user messages.
 * The streaming form keeps MCP and structured-output sessions compatible.
 */
async function* generateMessages(prompt: string) {
  yield {
    type: 'user' as const,
    message: { role: 'user' as const, content: prompt },
    parent_tool_use_id: null,
    session_id: `code-review-${Date.now()}`
  };
}

/**
 * Structured output is normally an object, but some transports surface it as
 * a JSON string. Normalize both forms before Zod validation.
 */
function normalizeStructuredOutput(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private readonly model: string;
  private readonly maxTurns: number;
  private readonly cwd: string;
  private readonly mcpServers: Record<string, McpServerConfig>;

  constructor(options: OrchestratorOptions = {}) {
    const model = options.model ?? process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new ReviewError(
        'ANTHROPIC_MODEL environment variable is required',
        ErrorCodes.INVALID_CONFIG
      );
    }

    this.model = model;
    this.maxTurns = options.maxTurns ?? 80;
    this.cwd = options.cwd ?? process.env.PROJECT_ROOT ?? process.cwd();
    this.mcpServers = options.mcpServers ?? mcpServersConfig;
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startedAt = Date.now();
    logReviewStart(owner, repo, prNumber);

    try {
      const prompt = buildOrchestratorPrompt({ owner, repo, prNumber });
      let structuredOutput: unknown;
      let resultSubtype: string | undefined;

      for await (const message of query({
        prompt: generateMessages(prompt),
        options: {
          model: this.model,
          cwd: this.cwd,
          maxTurns: this.maxTurns,
          mcpServers: this.mcpServers,
          agents: reviewAgents,
          allowedTools: ['Task', 'Skill', 'Read', 'Grep', 'Glob', ...GITHUB_MCP_TOOLS],
          permissionMode: 'dontAsk',
          settingSources: ['project'],
          outputFormat: {
            type: 'json_schema',
            schema: ReviewReportJSONSchema
          }
        }
      })) {
        if (message.type !== 'result') continue;

        if (message.subtype !== 'success') {
          resultSubtype = message.subtype;
          break;
        }

        structuredOutput = normalizeStructuredOutput(message.structured_output);
        break;
      }

      if (resultSubtype) {
        throw new ReviewError(
          `Review query failed: ${resultSubtype}`,
          ErrorCodes.AGENT_FAILED,
          { owner, repo, prNumber, subtype: resultSubtype }
        );
      }

      if (structuredOutput === undefined || structuredOutput === null) {
        throw new ReviewError(
          'The orchestrator returned no structured output',
          ErrorCodes.STRUCTURED_OUTPUT_FAILED,
          { owner, repo, prNumber }
        );
      }

      const validation = ReviewReportSchema.safeParse(structuredOutput);
      if (!validation.success) {
        throw new ReviewError(
          'Review report failed schema validation',
          ErrorCodes.VALIDATION_FAILED,
          {
            owner,
            repo,
            prNumber,
            issues: validation.error.issues
          }
        );
      }

      const duration = Date.now() - startedAt;
      const report = this.normalizeReport(
        validation.data,
        { owner, repo, number: prNumber },
        duration
      );

      logReviewComplete(owner, repo, prNumber, report.summary.overallScore, duration);
      return report;
    } catch (error) {
      logReviewError(
        owner,
        repo,
        prNumber,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Normalize facts the orchestrator can determine deterministically so a
   * model-generated count or timestamp cannot drift from the actual results.
   */
  private normalizeReport(
    report: ReviewReport,
    pullRequest: ReviewReport['pullRequest'],
    duration: number
  ): ReviewReport {
    const fileReviews = report.fileReviews;
    const totalFiles = fileReviews.length;
    const overallScore = totalFiles === 0
      ? 0
      : Math.round(
          fileReviews.reduce(
            (sum, review) => sum + review.codeQuality.overallScore,
            0
          ) / totalFiles
        );

    return {
      ...report,
      pullRequest,
      fileReviews,
      summary: {
        totalFiles,
        overallScore,
        criticalIssues: fileReviews.reduce(
          (count, review) =>
            count + review.codeQuality.issues.filter(issue => issue.severity === 'critical').length,
          0
        ),
        highPriorityTests: fileReviews.reduce(
          (count, review) =>
            count +
            review.testCoverage.untestedPaths.filter(
              path => path.priority === 'critical' || path.priority === 'high'
            ).length,
          0
        ),
        refactoringOpportunities: fileReviews.reduce(
          (count, review) => count + review.refactorings.suggestions.length,
          0
        )
      },
      recommendations: report.recommendations.slice(0, 10),
      metadata: {
        ...report.metadata,
        analyzedAt: new Date().toISOString(),
        duration,
        agentVersions: {
          'code-quality-analyzer': '1.0.0',
          'test-coverage-analyzer': '1.0.0',
          'refactoring-suggester': '1.0.0'
        }
      }
    };
  }
}
