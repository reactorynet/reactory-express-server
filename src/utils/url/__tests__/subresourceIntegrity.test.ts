import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { integrityForCdnUri, integrityForFile, localCdnFile, sriMode } from '../subresourceIntegrity';
import MergeGraphResolvers from '@reactory/server-core/utils/graph/mergeResolver';

jest.mock('@reactory/server-core/logging', () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

describe('subresource integrity (WP-C4)', () => {
  let dataRoot: string;
  let pluginFile: string;
  const content = 'window.plugin = true;\n';
  const expected = `sha384-${crypto.createHash('sha384').update(content).digest('base64')}`;

  beforeEach(() => {
    dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sri-'));
    pluginFile = path.join(dataRoot, 'plugins', 'core', 'lib', 'core.js');
    fs.mkdirSync(path.dirname(pluginFile), { recursive: true });
    fs.writeFileSync(pluginFile, content);
  });

  const env = (extra: Record<string, string> = {}) => ({
    APP_DATA_ROOT: dataRoot,
    CDN_ROOT: 'http://localhost:4000/cdn',
    API_URI_ROOT: 'http://localhost:4000',
    ...extra,
  });
  const uri = 'http://localhost:4000/cdn/plugins/core/lib/core.js?cs=abc';

  it('hashes the file the CDN serves, ignoring the query string', () => {
    expect(localCdnFile(uri, env())).toBe(pluginFile);
    expect(integrityForCdnUri(uri, env())).toBe(expected);
  });

  it('recomputes when the file changes', () => {
    expect(integrityForFile(pluginFile)).toBe(expected);
    fs.writeFileSync(pluginFile, 'window.plugin = "rebuilt";\n');
    fs.utimesSync(pluginFile, new Date(), new Date(Date.now() + 5000));
    expect(integrityForFile(pluginFile)).not.toBe(expected);
  });

  it('refuses a path that escapes the data root', () => {
    expect(localCdnFile('http://localhost:4000/cdn/../../etc/passwd', env())).toBeNull();
    expect(localCdnFile('http://localhost:4000/cdn/%2e%2e/%2e%2e/etc/passwd', env())).toBeNull();
  });

  it('only vouches for URIs on this CDN', () => {
    expect(integrityForCdnUri('https://elsewhere.example/cdn/plugins/core/lib/core.js', env())).toBeNull();
  });

  it('in auto mode, hashes only when this server serves the CDN', () => {
    const external = env({ CDN_ROOT: 'https://cdn.example.com/cdn' });
    expect(integrityForCdnUri('https://cdn.example.com/cdn/plugins/core/lib/core.js', external)).toBeNull();
    expect(integrityForCdnUri('https://cdn.example.com/cdn/plugins/core/lib/core.js', { ...external, REACTORY_PLUGIN_SRI: 'on' })).toBe(expected);
  });

  it('can be turned off', () => {
    expect(integrityForCdnUri(uri, env({ REACTORY_PLUGIN_SRI: 'off' }))).toBeNull();
    expect(sriMode({})).toBe('auto');
    expect(sriMode({ REACTORY_PLUGIN_SRI: 'bogus' })).toBe('auto');
  });

  it('returns null for a missing file', () => {
    expect(integrityForCdnUri('http://localhost:4000/cdn/plugins/none.js', env())).toBeNull();
  });

  describe('GraphQL fields', () => {
    const saved = { ...process.env };
    afterEach(() => { process.env = { ...saved }; });

    it('resolve integrity for plugins and form resources, preferring an explicit value', () => {
      Object.assign(process.env, env());
      const SubresourceIntegrityResolver = require('@reactory/server-modules/reactory-core/resolvers/System/SubresourceIntegrityResolver').default;
      const merged: any = MergeGraphResolvers([SubresourceIntegrityResolver]);

      expect(merged.ApplicationPlugin.integrity({ uri })).toBe(expected);
      expect(merged.ReactoryFormUIResource.integrity({ uri })).toBe(expected);
      expect(merged.ApplicationPlugin.integrity({ uri: 'https://elsewhere.example/p.js', integrity: 'sha384-pinned' })).toBe('sha384-pinned');
    });
  });
});
