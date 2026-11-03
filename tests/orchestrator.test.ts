import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, mcpServersConfig } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  mcpServersConfig: {
    github: { type: 'stdio', command: 'npx', args: [], env: {} }
  }
}));

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: queryMock }));
vi.mock('../src/config/mcp.config.js', () => ({ mcpServersConfig }));
vi.mock('../src/utils/logger.js', () => ({
  logReviewStart: vi.fn(),
  logReviewComplete: vi.fn(),
  logReviewError: vi.fn()
}));

import { CodeReviewOrchestrator } from '../src/orchestrator.js';
import { ErrorCodes } from '../src/utils/error-handler.js';

const file = 'src/example.ts';

const report = {
  pullRequest: { owner: 'octocat', repo: 'Hello-World', number: 1 },
  fileReviews: [{
    file,
    codeQuality: {
      file,
      issues: [{
        line: 1,
        severity: 'critical',
        category: 'bug-risk',
        description: 'Missing null check.',
        suggestion: 'Return early when null.'
      }],
      overallScore: 80,
      summary: 'One critical issue.'
    },
    testCoverage: {
      file,
      hasTests: true,
      testFiles: [],
      untestedPaths: [{
        type: 'branch',
        location: `${file}:handleError`,
        priority: 'high',
        reasoning: 'Error branch is untested.',
        suggestedTest: 'Assert the fallback path.'
      }],
      coverageEstimate: 70,
      summary: 'Error branch is missing.'
    },
    refactorings: {
      file,
      suggestions: [{
        type: 'extract-function',
        location: `${file}:process`,
        impact: 'medium',
        description: 'Split validation and persistence.',
        before: 'process(input) { /* ... */ }',
        after: 'process(input) { validate(input); persist(input); }',
        benefits: 'Better separation of concerns.'
      }],
      summary: 'One extraction.'
    }
  }],
  // Incorrect values: the orchestrator must recompute the summary.
  summary: {
    totalFiles: 99,
    overallScore: 0,
    criticalIssues: 0,
    highPriorityTests: 0,
    refactoringOpportunities: 0
  },
  recommendations: [],
  metadata: { analyzedAt: '2000-01-01T00:00:00.000Z', duration: 0, agentVersions: {} }
};

const result = (structured_output: unknown = report) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: 'ok',
  structured_output
});

const mockQuery = (...messages: unknown[]) => {
  queryMock.mockImplementation(() => (async function* () {
    yield* messages;
  })());
};

const getOptions = () => queryMock.mock.calls[0]![0].options;
const getPrompt = async () => {
  let prompt = '';
  for await (const message of queryMock.mock.calls[0]![0].prompt) {
    prompt += message.message.content;
  }
  return prompt;
};

beforeEach(() => {
  vi.stubEnv('ANTHROPIC_MODEL', 'claude-test-model');
  vi.stubEnv('PROJECT_ROOT', '/tmp/project');
  queryMock.mockReset();
  mockQuery(result());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('CodeReviewOrchestrator', () => {
  describe('Configuration', () => {
    it('should initialize with default options', async () => {
      await new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1);

      expect(getOptions()).toMatchObject({
        model: 'claude-test-model',
        maxTurns: 80,
        cwd: '/tmp/project',
        mcpServers: mcpServersConfig
      });
    });

    it('should accept custom configuration', async () => {
      const customServers = { github: { ...mcpServersConfig.github, command: 'custom' } };
      const orchestrator = new CodeReviewOrchestrator({
        model: 'custom-model',
        maxTurns: 5,
        cwd: '/tmp/custom',
        mcpServers: customServers
      });

      await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);

      expect(getOptions()).toMatchObject({
        model: 'custom-model',
        maxTurns: 5,
        cwd: '/tmp/custom',
        mcpServers: customServers
      });
    });
  });

  describe('reviewPullRequest', () => {
    it('should fetch PR files from GitHub MCP', async () => {
      await new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1);

      expect(getOptions().allowedTools).toContain('mcp__github__get_pull_request_files');
      expect(await getPrompt()).toContain('mcp__github__get_pull_request_files');
    });

    it('should spawn all 3 subagents in parallel', async () => {
      await new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1);

      expect(Object.keys(getOptions().agents)).toEqual([
        'code-quality-analyzer',
        'test-coverage-analyzer',
        'refactoring-suggester'
      ]);
    });

    it('should aggregate results into ReviewReport', async () => {
      const review = await new CodeReviewOrchestrator()
        .reviewPullRequest('octocat', 'Hello-World', 1);

      expect(review.summary).toEqual({
        totalFiles: 1,
        overallScore: 80,
        criticalIssues: 1,
        highPriorityTests: 1,
        refactoringOpportunities: 1
      });
      expect(review.metadata.agentVersions).toHaveProperty('code-quality-analyzer');
    });

    it('should validate output with Zod schema', async () => {
      const { recommendations, ...invalidReport } = report;
      mockQuery(result(invalidReport));

      await expect(
        new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1)
      ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_FAILED });
    });
  });

  describe('Integration', () => {
    // These tests require actual API keys and should be skipped in CI
    it.skip('should review a real small PR', async () => {
      // TODO: Test with a real public PR
      // NOTE: Only run manually with valid API keys
    });
  });
});
