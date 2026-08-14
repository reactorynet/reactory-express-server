import path from 'path';
import ReactoryContentService from '../ReactoryContentService';
import { Content } from '@reactory/server-modules/reactory-core/models';

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  Content: {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * Resolution behaviour of the content service: that a database record and a
 * filesystem seed both come back, that the locale overlay is applied for
 * readers but not for editors, and that translations are only handed out when
 * explicitly requested.
 */
describe('ReactoryContentService resolution', () => {
  let service: any;
  let mockContext: any;

  const APP_DATA_ROOT = path.resolve(__dirname, '../../../../../../reactory-data');

  /** Mongoose returns a thenable query; `null` means "no record for this slug". */
  const mockFindOne = (value: any) => {
    (Content.findOne as jest.Mock).mockReturnValue({
      then: (cb: any) => Promise.resolve(cb(value)),
    });
  };

  const asDoc = (record: any) => ({ ...record, toObject: () => record });

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      i18n: { language: 'en' },
      partner: { email: 'partner@reactory.net' },
      user: { _id: 'user_123', email: 'user@reactory.net' },
      hasRole: jest.fn().mockReturnValue(true),
    };

    service = new ReactoryContentService({}, mockContext);
    service.setUserService({
      findUserWithEmail: jest.fn().mockResolvedValue({ _id: 'sys_user', email: 'system@reactory.net' }),
      findUserById: jest.fn().mockResolvedValue({ _id: 'sys_user' }),
    });

    process.env.APP_DATA_ROOT = APP_DATA_ROOT;
  });

  describe('database backed content', () => {
    const record = {
      _id: 'abc123',
      slug: 'db-article',
      title: 'Source title',
      description: 'Source description',
      content: 'Source body',
      locale: 'en',
      format: 'markdown',
      published: true,
      translations: [
        { lang: 'fr', title: 'Titre', description: 'Le description', content: 'Le corps' },
      ],
    };

    it('resolves a record with the legacy string basePath argument', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', 'content/static-content');
      expect(result).not.toBeNull();
      expect(result.slug).toBe('db-article');
      expect(result.content).toBe('Source body');
    });

    it('resolves a record with an options object', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', {
        basePath: 'content/static-content',
      });
      expect(result.slug).toBe('db-article');
      expect(result.content).toBe('Source body');
    });

    it('resolves with no second argument at all', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article');
      expect(result.slug).toBe('db-article');
    });

    it('withholds translations unless they are asked for', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', {});
      expect(result.translations).toBeUndefined();
    });

    it('returns translations when requested', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', { includeTranslations: true });
      expect(result.translations).toHaveLength(1);
      expect(result.translations[0].lang).toBe('fr');
    });

    it('overlays the requested locale for readers', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', { locale: 'fr' });
      expect(result.content).toBe('Le corps');
      expect(result.title).toBe('Titre');
      expect(result.resolvedLocale).toBe('fr');
    });

    it('matches a region-qualified locale against its base language', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', { locale: 'fr-CA' });
      expect(result.content).toBe('Le corps');
    });

    it('falls back to the source when the locale has no translation', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', { locale: 'de' });
      expect(result.content).toBe('Source body');
      expect(result.resolvedLocale).toBe('en');
    });

    it('never overlays a translation when raw is requested, so editors see the source', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', { locale: 'fr', raw: true });
      expect(result.content).toBe('Source body');
      expect(result.title).toBe('Source title');
    });

    it('defaults the format for records saved before the field existed', async () => {
      mockFindOne(asDoc({ ...record, format: undefined }));
      const result = await service.getContentBySlug('db-article', {});
      expect(result.format).toBe('html');
    });

    it('preserves a stored format', async () => {
      mockFindOne(asDoc(record));
      const result = await service.getContentBySlug('db-article', {});
      expect(result.format).toBe('markdown');
    });
  });

  describe('filesystem seeded content', () => {
    beforeEach(() => mockFindOne(null));

    it('resolves the seed shipped in reactory-data', async () => {
      const result = await service.getContentBySlug('about-reactory');
      expect(result).not.toBeNull();
      expect(result.slug).toBe('about-reactory');
      expect(result.content).toContain('Reactory');
    });

    it('applies the props file over the derived defaults', async () => {
      const result = await service.getContentBySlug('about-reactory');
      expect(result.title).toBe('About Reactory Platform');
      expect(result.topics).toContain('reactory');
    });

    it('infers markdown from the .md extension', async () => {
      const result = await service.getContentBySlug('about-reactory');
      expect(result.format).toBe('markdown');
    });

    it('resolves with an options object as well as the legacy string', async () => {
      const viaObject = await service.getContentBySlug('about-reactory', {
        basePath: 'content/static-content',
      });
      const viaString = await service.getContentBySlug('about-reactory', 'content/static-content');
      expect(viaObject.content).toEqual(viaString.content);
    });

    it('serves the same body on a second read, from cache', async () => {
      const first = await service.getContentBySlug('about-reactory');
      const second = await service.getContentBySlug('about-reactory');
      expect(second.content).toEqual(first.content);
    });

    it('returns null for a slug with no record and no file', async () => {
      const result = await service.getContentBySlug('no-such-content-anywhere');
      expect(result).toBeNull();
    });
  });
});
