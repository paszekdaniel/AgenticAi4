import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

/**
 * Code Quality Analyzer subagent
 *
 * Reviews one source file for security vulnerabilities, performance problems,
 * correctness risks, and maintainability concerns. It has read-only repository
 * access plus the Skill tool so it can apply specialized review guidance
 * (for example `javascript-best-practices` and `security-analysis`).
 */
export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes source code for security vulnerabilities, performance problems, bug risk, and maintainability issues. ' +
    'Use when reviewing changed files for defects, unsafe patterns, or code smells that could block a merge. ' +
    'Returns structured per-file findings with severity, category, line number, and a concrete fix. ' +
    'Do not use for test completeness (use test-coverage-analyzer) or behavior-preserving structural ' +
    'improvements (use refactoring-suggester).',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  model: 'inherit',
};
