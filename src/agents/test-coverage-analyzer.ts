import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

/**
 * Test Coverage Analyzer subagent
 *
 * Statically estimates coverage by comparing the assigned source file with the
 * repository's test files, then proposes concrete missing tests. It is
 * intentionally read-only and has no shell access: it must not run the suite.
 */
export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Evaluates test completeness for a source file by comparing its exports and branches with existing ' +
    'test files, estimating coverage without running tests, and proposing specific missing test cases. ' +
    'Use when a changed file needs a coverage assessment or actionable test suggestions. ' +
    'Do not use for security or performance defects (use code-quality-analyzer) or for restructuring ' +
    'production code (use refactoring-suggester).',
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  model: 'inherit',
};
