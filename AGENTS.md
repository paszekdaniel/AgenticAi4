Context Goal: Build a multi-agent system where specialized AI agents work together to analyze pull requests from multiple angles—code quality, test coverage, and refactoring opportunities—then synthesize their findings into a polished, actionable report.

project/starter/
├── src/
│   ├── agents/              # YOU IMPLEMENT: Three subagent definitions
│   │   ├── code-quality-analyzer.ts
│   │   ├── test-coverage-analyzer.ts
│   │   ├── refactoring-suggester.ts
│   │   └── index.ts
│   ├── prompts/             # YOU IMPLEMENT: Prompts for orchestrator and subagents
│   │   ├── orchestrator.prompt.ts
│   │   ├── code-quality-analyzer.prompt.ts
│   │   ├── test-coverage-analyzer.prompt.ts
│   │   ├── refactoring-suggester.prompt.ts
│   │   └── index.ts
│   ├── config/              # YOU IMPLEMENT: MCP server configurations
│   │   └── mcp.config.ts
│   ├── utils/               # Part 2: Error handler and rate limiter
│   │   ├── error-handler.ts
│   │   ├── rate-limiter.ts
│   │   ├── logger.ts        # PROVIDED
│   │   ├── report-generator.ts  # PROVIDED
│   │   └── index.ts
│   ├── types/               # PROVIDED: Zod schemas for all data structures
│   │   └── index.ts
│   ├── orchestrator.ts      # YOU IMPLEMENT: Main coordination logic
│   └── main.ts              # Part 2: Entry point with validation
├── tests/                   # Part 2: Unit tests
│   └── schemas.test.ts
├── .claude/
│   └── skills/              # PROVIDED: Example skill
│       └── code-review-best-practices/
├── .env.example             # PROVIDED: Environment template
├── package.json             # PROVIDED: Dependencies and scripts
└── tsconfig.json            # PROVIDED: TypeScript configuration