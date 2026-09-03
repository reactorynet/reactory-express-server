import ReactoryClientModel from '../index';
import ReactoryTheme from '../../../../../data/clientConfigs/reactory/themes/reactory/index';

describe('ReactoryClient Themes Schema and Upsert Processing', () => {
  it('should preserve full theme definitions when instantiating ReactoryClient', () => {
    const client = new ReactoryClientModel({
      key: 'test-theme-client',
      name: 'Test Theme Client',
      theme: 'reactory',
      themes: [ReactoryTheme],
    });

    expect(client.themes).toBeDefined();
    expect(client.themes.length).toBe(1);
    
    const theme = client.themes[0] as any;
    expect(theme.name).toBe('reactory');
    expect(theme.description).toBe('The default reactory theme');
    expect(theme.defaultThemeMode).toBe('dark');
    expect(Array.isArray(theme.modes)).toBe(true);
    expect(theme.modes.length).toBe(2);
    expect(theme.modes[0].options?.palette?.mode).toBe('dark');
    expect(theme.modes[1].options?.palette?.mode).toBe('light');
    expect(Array.isArray(theme.assets)).toBe(true);
    expect(theme.assets.length).toBeGreaterThan(0);
    expect(theme.content?.appTitle).toBe('Reactory - Build Apps. Fast.');
  });

  it('should support updating themes via Object.assign and markModified', () => {
    const client = new ReactoryClientModel({
      key: 'test-theme-client-2',
      name: 'Test Theme Client 2',
      theme: 'reactory',
      themes: [],
    });

    expect(client.themes.length).toBe(0);

    Object.assign(client, {
      themes: [ReactoryTheme],
    });
    client.markModified('themes');

    expect(client.themes.length).toBe(1);
    const theme = client.themes[0] as any;
    expect(theme.name).toBe('reactory');
    expect(theme.modes.length).toBe(2);
  });
});
