import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadClientConfigFromYaml, loadEnabledClientConfigsFromYaml } from '../configLoader';

describe('Client Config YAML Loader', () => {
  const originalEnv = { ...process.env };
  let tempRoot: string;

  const writeFile = (relativePath: string, content: string) => {
    const filePath = path.resolve(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  };

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-client-configs-'));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('loads base config.yaml and interpolates environment variables', () => {
    process.env.APP_NAME = 'Test App';
    process.env.APP_USER = 'test-user';

    writeFile(
      'foo/config.yaml',
      [
        'key: foo',
        'name: ${APP_NAME:Default App}',
        'username: ${APP_USER}',
        'email: test@example.com',
        'salt: generate',
        'password: ${APP_PASSWORD:secret}',
        'avatar: https://cdn.example.com/avatar.png',
        'siteUrl: http://localhost:3000',
        'emailSendVia: sendgrid',
        'emailApiKey: ${EMAIL_API_KEY:SG.disabled}',
        'resetEmailRoute: /forgot-password',
        'applicationRoles: ["USER", "ANON"]',
        'menus: []',
        'routes: []',
      ].join('\n'),
    );

    const result = loadClientConfigFromYaml('foo', { clientConfigsDir: tempRoot });
    expect(result).not.toBeNull();
    expect(result?.config.name).toBe('Test App');
    expect(result?.config.username).toBe('test-user');
    expect(result?.config.password).toBe('secret');
    expect(result?.config.emailApiKey).toBe('SG.disabled');
  });

  it('overrides base fields with element-level YAML files', () => {
    writeFile(
      'bar/config.yaml',
      [
        'key: bar',
        'name: Bar App',
        'username: bar',
        'email: bar@example.com',
        'salt: generate',
        'password: bar-password',
        'avatar: https://cdn.example.com/bar.png',
        'siteUrl: http://localhost:3001',
        'emailSendVia: sendgrid',
        'emailApiKey: SG.bar',
        'resetEmailRoute: /forgot-password',
        'applicationRoles: ["USER", "ANON"]',
        'menus: []',
        'routes: []',
      ].join('\n'),
    );

    writeFile(
      'bar/menus.yaml',
      [
        '- name: Main',
        '  key: left-nav',
        '  target: left-nav',
        '  roles: ["USER"]',
        '  entries:',
        '    - title: Dashboard',
        '      link: /',
        '      roles: ["USER"]',
      ].join('\n'),
    );

    const result = loadClientConfigFromYaml('bar', { clientConfigsDir: tempRoot });
    expect(result).not.toBeNull();
    expect(Array.isArray(result?.config.menus)).toBe(true);
    expect((result?.config.menus as unknown[]).length).toBe(1);
  });

  it('loads enabled client list and skips missing configs', () => {
    writeFile(
      'enabled-clients.reactory.json',
      JSON.stringify(['alpha', 'missing-client'], null, 2),
    );

    writeFile(
      'alpha/config.yaml',
      [
        'key: alpha',
        'name: Alpha',
        'username: alpha',
        'email: alpha@example.com',
        'salt: generate',
        'password: alpha-password',
        'avatar: https://cdn.example.com/alpha.png',
        'siteUrl: http://localhost:3002',
        'emailSendVia: sendgrid',
        'emailApiKey: SG.alpha',
        'resetEmailRoute: /forgot-password',
        'applicationRoles: ["USER", "ANON"]',
        'menus: []',
        'routes: []',
      ].join('\n'),
    );

    const results = loadEnabledClientConfigsFromYaml({ clientConfigsDir: tempRoot });
    expect(results.length).toBe(1);
    expect(results[0].config.key).toBe('alpha');
  });

  it('interpolates nested values in arrays and objects', () => {
    process.env.NESTED_VALUE = 'nested';

    writeFile(
      'nested/config.yaml',
      [
        'key: nested',
        'name: Nested',
        'username: nested',
        'email: nested@example.com',
        'salt: generate',
        'password: nested-password',
        'avatar: https://cdn.example.com/nested.png',
        'siteUrl: http://localhost:3003',
        'emailSendVia: sendgrid',
        'emailApiKey: SG.nested',
        'resetEmailRoute: /forgot-password',
        'applicationRoles: ["USER", "ANON"]',
        'menus:',
        '  - name: Main',
        '    key: left-nav',
        '    target: left-nav',
        '    roles: ["USER"]',
        '    entries:',
        '      - title: ${NESTED_VALUE}',
        '        link: /',
        '        roles: ["USER"]',
        'routes: []',
      ].join('\n'),
    );

    const result = loadClientConfigFromYaml('nested', { clientConfigsDir: tempRoot });
    const menus = result?.config.menus as Array<{ entries: Array<{ title: string }> }>;
    expect(menus[0].entries[0].title).toBe('nested');
  });
});
