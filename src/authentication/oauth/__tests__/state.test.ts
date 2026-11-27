// Must be set before the encoder module is loaded (it captures SECRET_SAUCE at import).
process.env.SECRET_SAUCE = process.env.SECRET_SAUCE || 'unit-test-secret-sauce-value-32chars!';

import { createState, consumeState } from '../state';

describe('oauth state', () => {
  it('round-trips carried data', () => {
    const token = createState({ flow: 'mcp', serverId: 'grafana', userId: 'u1', clientKey: 'ck' });
    const data = consumeState(token);
    expect(data).toMatchObject({ flow: 'mcp', serverId: 'grafana', userId: 'u1', clientKey: 'ck' });
    expect(typeof data?.nonce).toBe('string');
  });

  it('rejects missing / tampered / malformed state', () => {
    expect(consumeState(undefined)).toBeNull();
    expect(consumeState('not-a-valid-token')).toBeNull();
    const token = createState({ flow: 'mcp' });
    expect(consumeState(token + 'tampered')).toBeNull();
  });

  it('rejects expired state', () => {
    const token = createState({ flow: 'mcp' });
    expect(consumeState(token, -1)).toBeNull(); // ttl in the past
  });

  // Pinned with a fixed clock: whether a real-time check notices a wrong TTL
  // depends on whether create and consume land in the same millisecond.
  describe('default TTL of 10 minutes', () => {
    const t0 = 1_700_000_000_000;
    const TEN_MINUTES = 10 * 60 * 1000;
    afterEach(() => jest.restoreAllMocks());

    const consumeAfter = (elapsedMs: number) => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(t0);
      const token = createState({ flow: 'mcp' });
      now.mockReturnValue(t0 + elapsedMs);
      return consumeState(token);
    };

    it('accepts state up to and including the 10-minute mark', () => {
      expect(consumeAfter(TEN_MINUTES - 1)).not.toBeNull();
      expect(consumeAfter(TEN_MINUTES)).not.toBeNull();
    });

    it('rejects state older than 10 minutes', () => {
      expect(consumeAfter(TEN_MINUTES + 1)).toBeNull();
    });
  });
});
