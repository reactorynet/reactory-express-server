import ReactoryContentResolver from '../ReactoryContentResolver';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * The graph registry harvests resolvers by creating an object from the class
 * prototype without ever running the constructor, then spreading the decorator
 * built map into one shared root object:
 *
 *   const instance = Object.create(resolver.prototype);
 *   rootResolver.Query = { ...rootResolver.Query, ...instance.resolver.Query };
 *
 * Two consequences that these tests pin down:
 *
 *  1. At execution time `this` is the merged resolver map, not the resolver
 *     instance, so any `this.helper()` call throws "this.helper is not a
 *     function" and the field resolves to null with an INTERNAL_SERVER_ERROR.
 *  2. The constructor never runs, so instance state is never available either.
 *
 * Every resolver function is therefore invoked here fully detached from the
 * class, which is the only way these tests can fail if a `this.` reference
 * creeps back in.
 */
describe('ReactoryContentResolver prototype binding', () => {
  /** Mirrors MergeGraphResolvers exactly. */
  const harvest = () => {
    const instance: any = Object.create((ReactoryContentResolver as any).prototype);
    const map = instance.resolver;
    // Spreading into fresh objects reproduces the merge, so `this` inside a
    // resolver is a plain map with no prototype chain back to the class.
    return {
      Query: { ...map.Query },
      Mutation: { ...map.Mutation },
      ReactoryContent: { ...(map.ReactoryContent || {}) },
      ReactoryContentTranslation: { ...(map.ReactoryContentTranslation || {}) },
    };
  };

  let contentService: any;
  let context: any;

  beforeEach(() => {
    contentService = {
      getContentBySlug: jest.fn().mockResolvedValue({ slug: 'about', content: 'body' }),
      getContentById: jest.fn().mockResolvedValue({ slug: 'about' }),
      getContentByTags: jest.fn().mockResolvedValue({ data: [] }),
      listContent: jest.fn().mockResolvedValue({ data: [] }),
      createContent: jest.fn().mockResolvedValue({ slug: 'about' }),
      updateContent: jest.fn().mockResolvedValue({ slug: 'about' }),
      saveContentTranslation: jest.fn().mockResolvedValue({ slug: 'about' }),
      deleteContentTranslation: jest.fn().mockResolvedValue({ slug: 'about' }),
      saveImageData: jest.fn().mockResolvedValue({ success: true }),
    };

    context = {
      user: { _id: 'user_1', email: 'user@reactory.net' },
      partner: { email: 'partner@reactory.net' },
      i18n: { language: 'en' },
      hasRole: jest.fn().mockReturnValue(true),
      hasAnyRole: jest.fn().mockReturnValue(true),
      getService: jest.fn().mockReturnValue(contentService),
      log: jest.fn(),
    };
  });

  it('exposes every declared query and mutation on the harvested map', () => {
    const map = harvest();
    expect(Object.keys(map.Query)).toEqual(
      expect.arrayContaining([
        'ReactoryGetContentBySlug',
        'ReactoryGetContentById',
        'ReactoryGetContentByTags',
        'ReactoryGetContentList',
      ])
    );
    expect(Object.keys(map.Mutation)).toEqual(
      expect.arrayContaining([
        'ReactoryCreateContent',
        'ReactorySaveContent',
        'ReactorySaveContentTranslation',
        'ReactoryDeleteContentTranslation',
        'ReactorySaveImageData',
      ])
    );
  });

  describe('queries invoked detached from the class', () => {
    it('resolves content by slug without touching `this`', async () => {
      const map = harvest();
      const result = await map.Query.ReactoryGetContentBySlug(
        null,
        { slug: 'about', options: { basePath: 'content/static-content' } },
        context,
        {}
      );

      expect(context.getService).toHaveBeenCalledWith('core.ReactoryContentService@1.0.0');
      expect(contentService.getContentBySlug).toHaveBeenCalledWith(
        'about',
        expect.objectContaining({ basePath: 'content/static-content' })
      );
      expect(result).toEqual({ slug: 'about', content: 'body' });
    });

    it('defaults the base path when the caller supplies no options', async () => {
      const map = harvest();
      await map.Query.ReactoryGetContentBySlug(null, { slug: 'about' }, context, {});
      expect(contentService.getContentBySlug).toHaveBeenCalledWith(
        'about',
        expect.objectContaining({ basePath: 'content/static-content' })
      );
    });

    it('withholds translations from callers who cannot author content', async () => {
      context.hasAnyRole = jest.fn().mockReturnValue(false);
      const map = harvest();
      await map.Query.ReactoryGetContentBySlug(
        null,
        { slug: 'about', options: { includeTranslations: true, raw: true } },
        context,
        {}
      );
      expect(contentService.getContentBySlug).toHaveBeenCalledWith(
        'about',
        expect.objectContaining({ includeTranslations: false, raw: false })
      );
    });

    it('passes translation options through for an author', async () => {
      const map = harvest();
      await map.Query.ReactoryGetContentBySlug(
        null,
        { slug: 'about', options: { includeTranslations: true, raw: true } },
        context,
        {}
      );
      expect(contentService.getContentBySlug).toHaveBeenCalledWith(
        'about',
        expect.objectContaining({ includeTranslations: true, raw: true })
      );
    });

    it('survives a context with no hasAnyRole implementation', async () => {
      delete context.hasAnyRole;
      const map = harvest();
      await expect(
        map.Query.ReactoryGetContentBySlug(null, { slug: 'about' }, context, {})
      ).resolves.toBeTruthy();
    });

    it('resolves the remaining queries', async () => {
      const map = harvest();
      await expect(map.Query.ReactoryGetContentById(null, { id: 'x' }, context, {})).resolves.toBeTruthy();
      await expect(
        map.Query.ReactoryGetContentByTags(null, { tags: ['a'], paging: {} }, context, {})
      ).resolves.toBeTruthy();
      await expect(
        map.Query.ReactoryGetContentList(null, { search: {}, paging: {} }, context, {})
      ).resolves.toBeTruthy();
    });
  });

  describe('mutations invoked detached from the class', () => {
    it('creates content', async () => {
      const map = harvest();
      await map.Mutation.ReactoryCreateContent(
        null,
        { createInput: { slug: 'about', title: 'About', content: 'body' } },
        context,
        {}
      );
      expect(contentService.createContent).toHaveBeenCalled();
    });

    it('saves content', async () => {
      const map = harvest();
      await map.Mutation.ReactorySaveContent(
        null,
        { reactoryInput: { slug: 'about', title: 'About', content: 'body' } },
        context,
        {}
      );
      expect(contentService.updateContent).toHaveBeenCalled();
    });

    it('saves a translation', async () => {
      const map = harvest();
      await map.Mutation.ReactorySaveContentTranslation(
        null,
        { slug: 'about', translation: { lang: 'fr', content: 'corps' } },
        context,
        {}
      );
      expect(contentService.saveContentTranslation).toHaveBeenCalledWith('about', {
        lang: 'fr',
        content: 'corps',
      });
    });

    it('deletes a translation', async () => {
      const map = harvest();
      await map.Mutation.ReactoryDeleteContentTranslation(
        null,
        { slug: 'about', lang: 'fr' },
        context,
        {}
      );
      expect(contentService.deleteContentTranslation).toHaveBeenCalledWith('about', 'fr');
    });

    it('saves image data', async () => {
      const map = harvest();
      await map.Mutation.ReactorySaveImageData(null, { image: { folder: 'f' } }, context, {});
      expect(contentService.saveImageData).toHaveBeenCalled();
    });
  });

  describe('field resolvers invoked detached from the class', () => {
    it('falls back to html for content with no stored format', async () => {
      const map = harvest();
      await expect(map.ReactoryContent.format({ slug: 'a' }, {}, context, {})).resolves.toBe('html');
    });

    it('returns a stored format unchanged', async () => {
      const map = harvest();
      await expect(
        map.ReactoryContent.format({ format: 'markdown' }, {}, context, {})
      ).resolves.toBe('markdown');
    });

    it('resolves the id from either id or _id', async () => {
      const map = harvest();
      await expect(map.ReactoryContent.id({ id: 'a' }, {}, context, {})).resolves.toBe('a');
      await expect(
        map.ReactoryContent.id({ _id: { toString: () => 'b' } }, {}, context, {})
      ).resolves.toBe('b');
    });

    it('falls back to the slug when a record has no title', async () => {
      const map = harvest();
      await expect(map.ReactoryContent.title({ slug: 'a-slug' }, {}, context, {})).resolves.toBe(
        'a-slug'
      );
    });

    it('resolves the locale actually used, falling back to the source locale', async () => {
      const map = harvest();
      await expect(
        map.ReactoryContent.resolvedLocale({ resolvedLocale: 'fr' }, {}, context, {})
      ).resolves.toBe('fr');
      await expect(
        map.ReactoryContent.resolvedLocale({ locale: 'de' }, {}, context, {})
      ).resolves.toBe('de');
      await expect(map.ReactoryContent.resolvedLocale({}, {}, context, {})).resolves.toBe('en');
    });

    it('returns an empty translations collection rather than null', async () => {
      const map = harvest();
      await expect(map.ReactoryContent.translations({}, {}, context, {})).resolves.toEqual([]);
    });

    it('resolves a translation author, and null when there is none', async () => {
      const map = harvest();
      await expect(
        map.ReactoryContentTranslation.updatedBy({ lang: 'fr' }, {}, context, {})
      ).resolves.toBeNull();
      await expect(
        map.ReactoryContentTranslation.updatedBy(
          { lang: 'fr', updatedBy: { email: 'a@b.c' } },
          {},
          context,
          {}
        )
      ).resolves.toEqual({ email: 'a@b.c' });
    });
  });
});
