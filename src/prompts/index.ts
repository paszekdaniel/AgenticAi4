/**
 * Centralized prompt management
 *
 * Each prompt is a system prompt for one subagent and encodes the matching
 * Zod output schema from src/types/analysis-results.ts.
 */

export { CODE_QUALITY_ANALYZER_PROMPT } from './code-quality-analyzer.prompt.js';
export { TEST_COVERAGE_ANALYZER_PROMPT } from './test-coverage-analyzer.prompt.js';
export { REFACTORING_SUGGESTER_PROMPT } from './refactoring-suggester.prompt.js';
export { buildOrchestratorPrompt } from './orchestrator.prompt.js';
export type { OrchestratorPromptInput } from './orchestrator.prompt.js';
