import { describe, expect, it, vi } from 'vitest';
import { parseArguments, resolveGitHubToken, resolveModel } from '../src/main.js';
import { withTimeout, ReviewError } from '../src/utils/error-handler.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';

describe('basic utilities', () => {
  it('parseArguments accepts owner, repo, and positive PR number', () => {
    expect(parseArguments(['octocat', 'Hello-World', '1'])).toEqual({
      owner: 'octocat', repo: 'Hello-World', prNumber: 1
    });
  });

  it('resolveModel throws a helpful error when ANTHROPIC_MODEL is missing', () => {
    expect(() => resolveModel({})).toThrow(ReviewError);
  });

  it('resolveGitHubToken rejects a missing token and trims a valid one', () => {
    expect(() => resolveGitHubToken({})).toThrow(ReviewError);
    expect(resolveGitHubToken({ GITHUB_TOKEN: '  ghp_test  ' })).toBe('ghp_test');
  });

  it('RateLimiter enforces token limits with canProceed', () => {
    const limiter = new RateLimiter({ maxRequestsPerMinute: 1, maxTokensPerMinute: 10, maxConcurrent: 1 });
    expect(limiter.canProceed(11)).toBe(false);
  });
});