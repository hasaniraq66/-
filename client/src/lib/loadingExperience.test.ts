import { describe, expect, it } from 'vitest';
import { getLoadingStageCopy } from './loadingExperience';

describe('loading experience copy', () => {
  it('describes each protected data-loading stage in Arabic', () => {
    expect(getLoadingStageCopy('auth')).toMatchObject({ completedSteps: 0, title: expect.stringContaining('جلستك') });
    expect(getLoadingStageCopy('profile')).toMatchObject({ completedSteps: 1, title: expect.stringContaining('إعدادات') });
    expect(getLoadingStageCopy('records')).toMatchObject({ completedSteps: 2, description: expect.stringContaining('الديون') });
  });

  it('keeps live announcements concise for screen readers', () => {
    for (const stage of ['auth', 'profile', 'records'] as const) {
      expect(getLoadingStageCopy(stage).liveMessage.length).toBeGreaterThan(10);
    }
  });
});
