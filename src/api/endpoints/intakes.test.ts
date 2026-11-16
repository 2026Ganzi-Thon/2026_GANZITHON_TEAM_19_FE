import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/api/client';

import { createIntake } from './intakes';

vi.mock('@/api/client', () => ({ api: { post: vi.fn() } }));

const post = vi.mocked(api.post);
const TEXT = '요즘 퇴근하고 나면 아무것도 못 하겠어요. 어떻게 하면 좋을까요';

describe('createIntake', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { intake_id: 'intake-1' } });
  });

  it('fills in the optional yes/no fields, because the server rejects a body that leaves them out', async () => {
    await createIntake({ category: 'career', text: TEXT });

    expect(post).toHaveBeenCalledWith('/intakes', {
      category: 'career',
      text: TEXT,
      share_raw: false,
      preferred_times: [],
      notify_when_available: false,
    });
  });

  it('keeps the values it was given', async () => {
    await createIntake({
      category: 'burnout',
      text: TEXT,
      share_raw: true,
      preferred_times: ['evening'],
      notify_when_available: true,
    });

    expect(post).toHaveBeenCalledWith('/intakes', {
      category: 'burnout',
      text: TEXT,
      share_raw: true,
      preferred_times: ['evening'],
      notify_when_available: true,
    });
  });

  it('returns the created intake', async () => {
    await expect(createIntake({ category: 'career', text: TEXT })).resolves.toEqual({
      intake_id: 'intake-1',
    });
  });
});
