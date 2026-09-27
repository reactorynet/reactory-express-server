import ReactoryClientModel from '@reactory/server-modules/reactory-core/models/ReactoryClient';
describe('validatePublicKey exact-origin matching', () => {
  const client = new ReactoryClientModel({ key: 'o', name: 'o', publicKey: 'pk', browserAuth: 'origin', whitelist: ['http://localhost:3000', 'https://apex.reactory.net'] });
  it('accepts an exact whitelisted origin', () => { expect(client.validatePublicKey('pk', 'http://localhost:3000')).toBe(true); });
  it('rejects a prefix-collision origin', () => { expect(client.validatePublicKey('pk', 'http://localhost:30001')).toBe(false); });
  it('accepts a Referer with a path on a whitelisted origin', () => { expect(client.validatePublicKey('pk', 'http://localhost:3000/some/page?x=1')).toBe(true); });
  it('rejects wrong key', () => { expect(client.validatePublicKey('nope', 'http://localhost:3000')).toBe(false); });
});
