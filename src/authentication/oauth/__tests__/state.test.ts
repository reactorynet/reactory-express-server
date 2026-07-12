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
});
