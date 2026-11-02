import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CodeQualityResultJSONSchema,
  CodeQualityResultSchema,
  RefactoringSuggestionJSONSchema,
  RefactoringSuggestionSchema,
  ReviewReportJSONSchema,
  ReviewReportSchema,
  TestCoverageResultJSONSchema,
  TestCoverageResultSchema
} from '../src/types/index.js';

type JsonSchema = Record<string, any>;

const validIssue = {
  line: 12,
  severity: 'high',
  category: 'bug-risk',
  description: 'The function does not handle a null response.',
  suggestion: 'Return early when the response is null.'
};

const validCodeQualityResult = {
  file: 'src/example.ts',
  issues: [validIssue],
  overallScore: 85,
  summary: 'Mostly solid, with one bug risk.'
};

const validUntestedPath = {
  type: 'branch',
  location: 'src/example.ts:handleError',
  priority: 'high',
  reasoning: 'The error branch is never exercised.',
  suggestedTest: 'Call handleError with a failed request and assert the fallback.'
};

const validTestCoverageResult = {
  file: 'src/example.ts',
  hasTests: true,
  testFiles: ['tests/example.test.ts'],
  untestedPaths: [validUntestedPath],
  coverageEstimate: 72,
  summary: 'Good coverage, but the error path is missing.'
};

const validRefactoringItem = {
  type: 'extract-function',
  location: 'src/example.ts:process',
  impact: 'medium',
  description: 'The function mixes validation and persistence.',
  before: 'function process(input) { /* validation and persistence */ }',
  after: 'function process(input) { validate(input); persist(input); }',
  benefits: 'Separates concerns and makes each step testable.'
};

const validRefactoringSuggestion = {
  file: 'src/example.ts',
  suggestions: [validRefactoringItem],
  summary: 'One worthwhile extraction.'
};

const validReviewReport = {
  pullRequest: {
    owner: 'octocat',
    repo: 'Hello-World',
    number: 1
  },
  fileReviews: [
    {
      file: 'src/example.ts',
      codeQuality: validCodeQualityResult,
      testCoverage: validTestCoverageResult,
      refactorings: validRefactoringSuggestion
    }
  ],
  summary: {
    totalFiles: 1,
    overallScore: 85,
    criticalIssues: 0,
    highPriorityTests: 1,
    refactoringOpportunities: 1
  },
  recommendations: [
    {
      priority: 'high',
      category: 'testing',
      description: 'Add a test for the error branch.',
      files: ['src/example.ts']
    }
  ],
  metadata: {
    analyzedAt: '2026-11-02T08:00:00.000Z',
    duration: 1234,
    agentVersions: {
      'code-quality-analyzer': '1.0.0'
    }
  }
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('CodeQualityResultSchema', () => {
  it('parses valid data', () => {
    expect(() => CodeQualityResultSchema.parse(validCodeQualityResult)).not.toThrow();

    const parsed = CodeQualityResultSchema.parse(validCodeQualityResult);
    expect(parsed).toEqual(validCodeQualityResult);
  });

  it('accepts an empty issues array', () => {
    const result = CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      issues: []
    });

    expect(result.issues).toEqual([]);
  });

  it('accepts boundary scores of 0 and 100', () => {
    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      overallScore: 0
    })).not.toThrow();

    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      overallScore: 100
    })).not.toThrow();
  });

  it('rejects scores below 0 and above 100', () => {
    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      overallScore: -1
    })).toThrow(ZodError);

    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      overallScore: 101
    })).toThrow(ZodError);
  });

  it('rejects a missing required field', () => {
    const invalid = clone(validCodeQualityResult) as Record<string, unknown>;
    delete invalid.summary;

    expect(() => CodeQualityResultSchema.parse(invalid)).toThrow(ZodError);
  });

  it('rejects wrong field types', () => {
    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      file: 42
    })).toThrow(ZodError);

    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      issues: 'not-an-array'
    })).toThrow(ZodError);
  });

  it('rejects invalid severity and category enum values', () => {
    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      issues: [{ ...clone(validIssue), severity: 'urgent' }]
    })).toThrow(ZodError);

    expect(() => CodeQualityResultSchema.parse({
      ...clone(validCodeQualityResult),
      issues: [{ ...clone(validIssue), category: 'unknown-category' }]
    })).toThrow(ZodError);
  });
});

describe('TestCoverageResultSchema', () => {
  it('parses valid data', () => {
    const parsed = TestCoverageResultSchema.parse(validTestCoverageResult);
    expect(parsed).toEqual(validTestCoverageResult);
  });

  it('accepts empty testFiles and untestedPaths arrays', () => {
    const result = TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      hasTests: false,
      testFiles: [],
      untestedPaths: []
    });

    expect(result.testFiles).toEqual([]);
    expect(result.untestedPaths).toEqual([]);
  });

  it('accepts coverage boundaries of 0 and 100', () => {
    expect(() => TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      coverageEstimate: 0
    })).not.toThrow();

    expect(() => TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      coverageEstimate: 100
    })).not.toThrow();
  });

  it('rejects coverage outside 0-100', () => {
    expect(() => TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      coverageEstimate: -0.1
    })).toThrow(ZodError);

    expect(() => TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      coverageEstimate: 100.1
    })).toThrow(ZodError);
  });

  it('rejects wrong hasTests type and missing fields', () => {
    expect(() => TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      hasTests: 'yes'
    })).toThrow(ZodError);

    const invalid = clone(validTestCoverageResult) as Record<string, unknown>;
    delete invalid.summary;

    expect(() => TestCoverageResultSchema.parse(invalid)).toThrow(ZodError);
  });

  it('rejects invalid path type and priority enums', () => {
    expect(() => TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      untestedPaths: [{ ...clone(validUntestedPath), type: 'method' }]
    })).toThrow(ZodError);

    expect(() => TestCoverageResultSchema.parse({
      ...clone(validTestCoverageResult),
      untestedPaths: [{ ...clone(validUntestedPath), priority: 'urgent' }]
    })).toThrow(ZodError);
  });
});

describe('RefactoringSuggestionSchema', () => {
  it('parses valid data', () => {
    const parsed = RefactoringSuggestionSchema.parse(validRefactoringSuggestion);
    expect(parsed).toEqual(validRefactoringSuggestion);
  });

  it('accepts an empty suggestions array', () => {
    const result = RefactoringSuggestionSchema.parse({
      ...clone(validRefactoringSuggestion),
      suggestions: []
    });

    expect(result.suggestions).toEqual([]);
  });

  it('rejects invalid type and impact enum values', () => {
    expect(() => RefactoringSuggestionSchema.parse({
      ...clone(validRefactoringSuggestion),
      suggestions: [{ ...clone(validRefactoringItem), type: 'rewrite' }]
    })).toThrow(ZodError);

    expect(() => RefactoringSuggestionSchema.parse({
      ...clone(validRefactoringSuggestion),
      suggestions: [{ ...clone(validRefactoringItem), impact: 'critical' }]
    })).toThrow(ZodError);
  });

  it('rejects a suggestion missing a required field', () => {
    const incompleteSuggestion = clone(validRefactoringItem) as Record<string, unknown>;
    delete incompleteSuggestion.benefits;

    expect(() => RefactoringSuggestionSchema.parse({
      ...clone(validRefactoringSuggestion),
      suggestions: [incompleteSuggestion]
    })).toThrow(ZodError);
  });

  it('rejects wrong types and a missing file', () => {
    expect(() => RefactoringSuggestionSchema.parse({
      ...clone(validRefactoringSuggestion),
      file: null
    })).toThrow(ZodError);

    const invalid = clone(validRefactoringSuggestion) as Record<string, unknown>;
    delete invalid.file;

    expect(() => RefactoringSuggestionSchema.parse(invalid)).toThrow(ZodError);
  });
});

describe('ReviewReportSchema', () => {
  it('parses a complete valid report', () => {
    const parsed = ReviewReportSchema.parse(validReviewReport);
    expect(parsed).toEqual(validReviewReport);
  });

  it('accepts empty fileReviews and recommendations arrays', () => {
    const result = ReviewReportSchema.parse({
      ...clone(validReviewReport),
      fileReviews: [],
      recommendations: [],
      summary: {
        ...clone(validReviewReport.summary),
        totalFiles: 0,
        overallScore: 0,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0
      },
      metadata: {
        ...clone(validReviewReport.metadata),
        agentVersions: {}
      }
    });

    expect(result.fileReviews).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.metadata.agentVersions).toEqual({});
  });

  it('accepts boundary summary scores', () => {
    expect(() => ReviewReportSchema.parse({
      ...clone(validReviewReport),
      summary: { ...clone(validReviewReport.summary), overallScore: 0 }
    })).not.toThrow();

    expect(() => ReviewReportSchema.parse({
      ...clone(validReviewReport),
      summary: { ...clone(validReviewReport.summary), overallScore: 100 }
    })).not.toThrow();
  });

  it('rejects a missing top-level section', () => {
    const invalid = clone(validReviewReport) as Record<string, unknown>;
    delete invalid.recommendations;

    expect(() => ReviewReportSchema.parse(invalid)).toThrow(ZodError);
  });

  it('rejects an invalid pull request number type', () => {
    expect(() => ReviewReportSchema.parse({
      ...clone(validReviewReport),
      pullRequest: {
        ...clone(validReviewReport.pullRequest),
        number: '1'
      }
    })).toThrow(ZodError);
  });

  it('rejects invalid nested agent output', () => {
    const invalid = clone(validReviewReport);
    invalid.fileReviews[0]!.codeQuality.issues = [
      { ...clone(validIssue), severity: 'very-high' }
    ] as any;

    expect(() => ReviewReportSchema.parse(invalid)).toThrow(ZodError);
  });

  it('rejects an invalid recommendation priority', () => {
    expect(() => ReviewReportSchema.parse({
      ...clone(validReviewReport),
      recommendations: [
        { ...clone(validReviewReport.recommendations[0]), priority: 'urgent' }
      ]
    })).toThrow(ZodError);
  });
});

describe('JSON Schema exports', () => {
  const expectValidJsonSchema = (schema: JsonSchema, required: string[]) => {
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(expect.arrayContaining(required));
    expect(schema.properties).toBeTypeOf('object');
    expect(schema.additionalProperties).toBe(false);
    expect(() => JSON.stringify(schema)).not.toThrow();
  };

  it('exports a valid CodeQualityResult JSON schema', () => {
    const schema = CodeQualityResultJSONSchema as JsonSchema;

    expectValidJsonSchema(schema, ['file', 'issues', 'overallScore', 'summary']);
    expect(schema.properties.overallScore).toMatchObject({
      type: 'number',
      minimum: 0,
      maximum: 100
    });
    expect(schema.properties.issues.type).toBe('array');
    expect(schema.properties.issues.items.required).toEqual(
      expect.arrayContaining([
        'line',
        'severity',
        'category',
        'description',
        'suggestion'
      ])
    );
    expect(schema.properties.issues.items.properties.severity.enum).toEqual([
      'critical',
      'high',
      'medium',
      'low',
      'info'
    ]);
  });

  it('exports a valid TestCoverageResult JSON schema', () => {
    const schema = TestCoverageResultJSONSchema as JsonSchema;

    expectValidJsonSchema(schema, [
      'file',
      'hasTests',
      'testFiles',
      'untestedPaths',
      'coverageEstimate',
      'summary'
    ]);
    expect(schema.properties.hasTests.type).toBe('boolean');
    expect(schema.properties.coverageEstimate).toMatchObject({
      type: 'number',
      minimum: 0,
      maximum: 100
    });
    expect(schema.properties.untestedPaths.items.required).toEqual(
      expect.arrayContaining([
        'type',
        'location',
        'priority',
        'reasoning',
        'suggestedTest'
      ])
    );
  });

  it('exports a valid RefactoringSuggestion JSON schema', () => {
    const schema = RefactoringSuggestionJSONSchema as JsonSchema;

    expectValidJsonSchema(schema, ['file', 'suggestions', 'summary']);
    expect(schema.properties.suggestions.type).toBe('array');
    expect(schema.properties.suggestions.items.required).toEqual(
      expect.arrayContaining([
        'type',
        'location',
        'impact',
        'description',
        'before',
        'after',
        'benefits'
      ])
    );
    expect(schema.properties.suggestions.items.properties.impact.enum).toEqual([
      'low',
      'medium',
      'high'
    ]);
  });

  it('exports a valid ReviewReport JSON schema with nested requirements', () => {
    const schema = ReviewReportJSONSchema as JsonSchema;

    expectValidJsonSchema(schema, [
      'pullRequest',
      'fileReviews',
      'summary',
      'recommendations',
      'metadata'
    ]);
    expect(schema.properties.pullRequest.required).toEqual(
      expect.arrayContaining(['owner', 'repo', 'number'])
    );
    expect(schema.properties.summary.required).toEqual(
      expect.arrayContaining([
        'totalFiles',
        'overallScore',
        'criticalIssues',
        'highPriorityTests',
        'refactoringOpportunities'
      ])
    );
    expect(schema.properties.metadata.required).toEqual(
      expect.arrayContaining(['analyzedAt', 'duration', 'agentVersions'])
    );
  });

  it('matches the schemas produced directly by zodToJsonSchema', () => {
    expect(CodeQualityResultJSONSchema).toEqual(
      zodToJsonSchema(CodeQualityResultSchema, { $refStrategy: 'root' })
    );
    expect(TestCoverageResultJSONSchema).toEqual(
      zodToJsonSchema(TestCoverageResultSchema, { $refStrategy: 'root' })
    );
    expect(RefactoringSuggestionJSONSchema).toEqual(
      zodToJsonSchema(RefactoringSuggestionSchema, { $refStrategy: 'root' })
    );
    expect(ReviewReportJSONSchema).toEqual(
      zodToJsonSchema(ReviewReportSchema, { $refStrategy: 'root' })
    );
  });
});
