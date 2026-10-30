/**
 * Subagent exports
 *
 * Pass `reviewAgents` directly as the `agents` option when calling `query()`,
 * or import an individual definition when spawning one agent explicitly.
 */

import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { codeQualityAnalyzer } from './code-quality-analyzer.js';
import { testCoverageAnalyzer } from './test-coverage-analyzer.js';
import { refactoringSuggester } from './refactoring-suggester.js';

export { codeQualityAnalyzer } from './code-quality-analyzer.js';
export { testCoverageAnalyzer } from './test-coverage-analyzer.js';
export { refactoringSuggester } from './refactoring-suggester.js';

/**
 * All review subagents keyed by the name the orchestrator uses to invoke them.
 */
export const reviewAgents = {
  'code-quality-analyzer': codeQualityAnalyzer,
  'test-coverage-analyzer': testCoverageAnalyzer,
  'refactoring-suggester': refactoringSuggester,
} satisfies Record<string, AgentDefinition>;
