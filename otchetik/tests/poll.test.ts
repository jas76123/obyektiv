import { describe, expect, it } from 'vitest';
import { PROBLEM_POLL_MS, problemPollInterval } from '../lib/poll';

describe('problemPollInterval', () => {
  it('polls while the last answer carries a problem', () => {
    expect(problemPollInterval({ problem: 'сервер не отвечает' })).toBe(PROBLEM_POLL_MS);
  });
  it('stops polling once the server answers cleanly or nothing is loaded yet', () => {
    expect(problemPollInterval({ problem: undefined })).toBe(false);
    expect(problemPollInterval({})).toBe(false);
    expect(problemPollInterval(undefined)).toBe(false);
  });
});
