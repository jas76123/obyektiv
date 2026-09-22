import { describe, expect, it } from 'vitest';
import { listsChangedByRun, PROBLEM_POLL_MS, problemPollInterval } from '../lib/poll';

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

describe('listsChangedByRun', () => {
  it('refreshes lists when the run sent or failed at least one photo', () => {
    expect(listsChangedByRun({ sent: 1, failed: 0, skipped: false })).toBe(true);
    expect(listsChangedByRun({ sent: 0, failed: 1, skipped: false })).toBe(true);
  });
  it('leaves lists alone after an empty or skipped run', () => {
    expect(listsChangedByRun({ sent: 0, failed: 0, skipped: false })).toBe(false);
    expect(listsChangedByRun({ sent: 0, failed: 0, skipped: true })).toBe(false);
  });
});
