import fs from 'fs';
import path from 'path';
import {
  resolveNamespaces,
  discoverLocales,
  packageTranslations,
  resolveSourceI18nDir,
} from '../../../bin/utils/build/package-translations';

describe('packageTranslations utility', () => {
  const tmpDir = path.resolve(__dirname, '__fixtures_i18n_test__');
  const mockSourceDir = path.join(tmpDir, 'source_i18n');
  const mockOutputDir = path.join(tmpDir, 'output_i18n');

  beforeAll(() => {
    // Setup mock source translation files
    fs.mkdirSync(path.join(mockSourceDir, 'en-US'), { recursive: true });
    fs.mkdirSync(path.join(mockSourceDir, 'af'), { recursive: true });

    fs.writeFileSync(path.join(mockSourceDir, 'en-US/common.json'), JSON.stringify({ hello: 'Hello' }));
    fs.writeFileSync(path.join(mockSourceDir, 'en-US/reactory.json'), JSON.stringify({ app: 'Reactory' }));
    fs.writeFileSync(path.join(mockSourceDir, 'en-US/booktutor.json'), JSON.stringify({ tutor: 'Tutor' }));

    fs.writeFileSync(path.join(mockSourceDir, 'af/common.json'), JSON.stringify({ hello: 'Hallo' }));
    fs.writeFileSync(path.join(mockSourceDir, 'af/reactory.json'), JSON.stringify({ app: 'Reactory AF' }));
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('resolveNamespaces', () => {
    it('should include default core namespaces and fallback to reactory when empty', () => {
      const result = resolveNamespaces('');
      expect(result).toContain('common');
      expect(result).toContain('forms');
      expect(result).toContain('reactory');
    });

    it('should parse comma-separated namespaces from env', () => {
      const result = resolveNamespaces('reactory,reactor,booktutor,zepz-engineer');
      expect(result).toContain('common');
      expect(result).toContain('reactory');
      expect(result).toContain('reactor');
      expect(result).toContain('booktutor');
      expect(result).toContain('zepz-engineer');
    });

    it('should respect explicit namespaces override', () => {
      const result = resolveNamespaces('ignored', ['custom_ns', 'reactory']);
      expect(result).toContain('common');
      expect(result).toContain('custom_ns');
      expect(result).toContain('reactory');
    });
  });

  describe('discoverLocales', () => {
    it('should discover locale subdirectories', () => {
      const locales = discoverLocales(mockSourceDir);
      expect(locales).toContain('en-US');
      expect(locales).toContain('af');
    });

    it('should return default locale when source dir is missing', () => {
      const locales = discoverLocales('/non/existent/path/for/i18n');
      expect(locales).toEqual(['en-US']);
    });
  });

  describe('packageTranslations execution', () => {
    it('should copy configured namespace files to target output directory', async () => {
      const result = await packageTranslations({
        sourceDir: mockSourceDir,
        outputDir: mockOutputDir,
        namespaces: ['common', 'reactory', 'booktutor'],
      });

      expect(result.totalFilesCopied).toBe(5); // en-US (common, reactory, booktutor) + af (common, reactory)
      expect(fs.existsSync(path.join(mockOutputDir, 'en-US/common.json'))).toBe(true);
      expect(fs.existsSync(path.join(mockOutputDir, 'en-US/reactory.json'))).toBe(true);
      expect(fs.existsSync(path.join(mockOutputDir, 'en-US/booktutor.json'))).toBe(true);
      expect(fs.existsSync(path.join(mockOutputDir, 'af/common.json'))).toBe(true);
      expect(fs.existsSync(path.join(mockOutputDir, 'af/reactory.json'))).toBe(true);
      expect(fs.existsSync(path.join(mockOutputDir, 'af/booktutor.json'))).toBe(false); // not in source
    });
  });
});
