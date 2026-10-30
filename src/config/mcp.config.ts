import 'dotenv/config';
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

/**
 * Model Context Protocol (MCP) server configurations
 *
 * Required MCP Servers:
 * 1. GitHub - For PR/repo operations
 * 2. ESLint - For code linting and style analysis
 *
 * Documentation:
 * - MCP Protocol: https://modelcontextprotocol.io
 * - GitHub MCP: https://github.com/github/github-mcp-server
 * - ESLint MCP: https://eslint.org/docs/latest/use/mcp
 */

export const mcpServersConfig = {
  /**
   * GitHub MCP Server
   * Provides tools for GitHub API operations
   *
   * Package: @modelcontextprotocol/server-github
   * Transport: stdio (the SDK spawns `npx` and talks over stdin/stdout)
   *
   * Authentication: the server reads GITHUB_PERSONAL_ACCESS_TOKEN, so we map
   * our GITHUB_TOKEN from .env to that expected name. The token is optional
   * (recommended for private repos and higher rate limits).
   */
  github: {
    type: 'stdio' as const,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || ''
    }
  },

  /**
   * ESLint MCP Server
   * Provides tools for linting and code quality analysis
   *
   * Package: @eslint/mcp (published by the ESLint team)
   * Transport: stdio
   * Authentication: none required
   */
  eslint: {
    type: 'stdio' as const,
    command: 'npx',
    args: ['-y', '@eslint/mcp@latest'],
    env: {}
  }
} satisfies Record<string, McpServerConfig>;
