import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

/**
 * Refactoring Suggester subagent
 *
 * Proposes behavior-preserving structural improvements: extraction, renames,
 * modernization, simplification, and design-pattern changes. It complements
 * the Code Quality Analyzer by focusing on maintainability rather than defects.
 * The Skill tool lets it apply `javascript-best-practices` modernization guidance.
 */
export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies behavior-preserving refactoring opportunities such as extracting functions, renaming ' +
    'unclear symbols, modernizing outdated syntax, simplifying control flow, and improving design ' +
    'patterns. Use when a file works but is hard to understand, change, or test. ' +
    'Returns before/after code with an impact rating. Do not use for security or correctness defects ' +
    '(use code-quality-analyzer) or for missing tests (use test-coverage-analyzer).',
  prompt: REFACTORING_SUGGESTER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  model: 'inherit',
};
