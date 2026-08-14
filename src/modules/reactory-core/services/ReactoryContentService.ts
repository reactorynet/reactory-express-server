import Reactory from '@reactorynet/reactory-core';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import convertSvg from 'convert-svg-to-png';
import { roles } from '@reactory/server-core/authentication/decorators';
import { Content } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';
import { pathExistsSync } from 'fs-extra';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';
import {
  DEFAULT_CONTENT_FORMAT,
  IReactoryContentService,
  ReactoryContent,
  ReactoryContentInput,
  ReactoryContentTranslation,
  ReactoryContentTranslationInput,
  ReactoryGetContentOptions,
} from '@reactory/server-modules/reactory-core/types/Content';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Normalises a language tag to the lowercase primary subtag, so that "en-GB",
 * "EN" and "en" all resolve to the same translation.
 */
const normaliseLang = (lang?: string): string =>
  (lang || 'en').toLowerCase().split(/[-_]/)[0];

/**
 * Produces a stable fingerprint of the source fields a translation is derived
 * from. When the fingerprint changes, existing translations are stale.
 *
 * The fields are hashed as a JSON array rather than concatenated: that keeps
 * them unambiguously delimited, so moving text between the title and the body
 * changes the fingerprint instead of hashing to the same value.
 */
const sourceFingerprint = (content: Partial<ReactoryContent>): string =>
  createHash('sha1')
    .update(
      JSON.stringify([
        content?.title || '',
        content?.description || '',
        content?.content || '',
      ]),
    )
    .digest('hex');

class ReactoryContentService implements IReactoryContentService {

  name: string = 'ReactoryContentService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext;
  fileService: Reactory.Service.IReactoryFileService;
  userService: Reactory.Service.IReactoryUserService;
  redis?: any; // Reactory.Service.IRedisService

  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private defaultTtlSeconds: number = 3600; // 1 hour

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  /**
   * Reads from L1 memory cache or L2 Redis cache without touching the hit/miss
   * counters. Use this when a single logical lookup probes more than one key,
   * so that the statistics stay a count of resolutions rather than probes.
   */
  private async peekCache<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.value;
      }
      this.memoryCache.delete(key);
    }

    if (this.redis && typeof this.redis.getJSON === 'function') {
      try {
        const cached = await this.redis.getJSON<T>(key);
        if (cached) {
          // Populate L1 cache
          this.memoryCache.set(key, {
            value: cached,
            expiresAt: Date.now() + this.defaultTtlSeconds * 1000,
          });
          return cached;
        }
      } catch (err) {
        logger.warn(`ReactoryContentService Redis cache read error for key ${key}:`, err);
      }
    }

    return null;
  }

  /**
   * Reads from L1 memory cache or L2 Redis cache.
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    // 1. Check L1 Memory Cache
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        this.cacheHits++;
        return entry.value;
      }
      this.memoryCache.delete(key);
    }

    // 2. Check L2 Redis Cache if available
    if (this.redis && typeof this.redis.getJSON === 'function') {
      try {
        const cached = await this.redis.getJSON<T>(key);
        if (cached) {
          this.cacheHits++;
          // Populate L1 cache
          this.memoryCache.set(key, {
            value: cached,
            expiresAt: Date.now() + this.defaultTtlSeconds * 1000,
          });
          return cached;
        }
      } catch (err) {
        logger.warn(`ReactoryContentService Redis cache read error for key ${key}:`, err);
      }
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * Writes to L1 memory cache and L2 Redis cache.
   */
  private async setToCache<T>(key: string, value: T, ttlSeconds: number = this.defaultTtlSeconds): Promise<void> {
    if (!value) return;

    // 1. Populate L1 Memory Cache
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    // 2. Populate L2 Redis Cache
    if (this.redis && typeof this.redis.setJSON === 'function') {
      try {
        await this.redis.setJSON(key, value, ttlSeconds);
      } catch (err) {
        logger.warn(`ReactoryContentService Redis cache write error for key ${key}:`, err);
      }
    }
  }

  /**
   * Clears specific key or key pattern from both L1 and L2 caches.
   */
  public async clearCache(keyPattern?: string): Promise<void> {
    if (!keyPattern) {
      this.memoryCache.clear();
      if (this.redis && typeof this.redis.keys === 'function') {
        try {
          const keys = await this.redis.keys('content:*');
          if (keys && keys.length > 0) {
            await this.redis.delMultiple(keys);
          }
        } catch (err) {
          logger.warn('ReactoryContentService Redis clear cache error:', err);
        }
      }
      return;
    }

    // Delete matching memory cache entries
    for (const key of this.memoryCache.keys()) {
      if (key.includes(keyPattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Delete matching Redis entries
    if (this.redis && typeof this.redis.keys === 'function') {
      try {
        const keys = await this.redis.keys(`*${keyPattern}*`);
        if (keys && keys.length > 0) {
          await this.redis.delMultiple(keys);
        }
      } catch (err) {
        logger.warn(`ReactoryContentService Redis clear cache error for pattern ${keyPattern}:`, err);
      }
    }
  }

  /**
   * Returns cache statistics.
   */
  public getCacheStats(): { memoryCount: number; hits: number; misses: number } {
    return {
      memoryCount: this.memoryCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
    };
  }

  @roles(['USER'])
  getContentByTags(tags: string[], paging: Reactory.Data.PagingRequest): Promise<Reactory.Data.PagedDataResponse<Reactory.Models.IReactoryContent, String[]>> {
    throw new Error('Method not implemented.');
  }

  /**
   * Marks each translation as stale or current relative to the source content,
   * so callers can surface which languages need re-translating.
   */
  private decorateTranslations(content: ReactoryContent): ReactoryContentTranslation[] {
    const translations = (content?.translations || []) as ReactoryContentTranslation[];
    if (translations.length === 0) return [];

    const fingerprint = sourceFingerprint(content);
    return translations.map((translation) => ({
      ...translation,
      lang: normaliseLang(translation.lang as string) as typeof translation.lang,
      // A translation with no recorded fingerprint predates staleness tracking;
      // treat it as current rather than nagging about every legacy translation.
      stale: translation.sourceHash ? translation.sourceHash !== fingerprint : false,
    }));
  }

  /**
   * Applies the translation for `locale` over the source title/description/content.
   * Falls back to the source record when no translation exists for the language.
   */
  private applyTranslation(content: ReactoryContent, locale: string): ReactoryContent {
    const lang = normaliseLang(locale);
    const sourceLang = normaliseLang(content?.locale as string);
    const translations = this.decorateTranslations(content);

    if (lang === sourceLang || translations.length === 0) {
      return { ...content, resolvedLocale: sourceLang };
    }

    const translation = translations.find((t) => normaliseLang(t.lang as string) === lang);
    if (!translation) {
      return { ...content, resolvedLocale: sourceLang };
    }

    return {
      ...content,
      // Only overlay fields the translation actually provides, so a
      // title-only translation still renders the source body.
      title: translation.title || content.title,
      description: translation.description || content.description,
      content: translation.content || content.content,
      topics: translation.tags?.length ? translation.tags : content.topics,
      resolvedLocale: lang,
    };
  }

  /**
   * Shapes a stored content record for a caller: applies the locale overlay
   * unless `raw` was requested, and strips translations unless asked for.
   */
  private resolveForCaller(
    content: ReactoryContent,
    options: ReactoryGetContentOptions,
  ): ReactoryContent {
    if (!content) return content;

    const withFormat: ReactoryContent = {
      ...content,
      format: content.format || DEFAULT_CONTENT_FORMAT,
    };

    const resolved = options.raw === true
      ? { ...withFormat, resolvedLocale: normaliseLang(withFormat.locale as string) }
      : this.applyTranslation(withFormat, options.locale || this.contextLanguage());

    if (options.includeTranslations === true) {
      return { ...resolved, translations: this.decorateTranslations(withFormat) };
    }

    delete resolved.translations;
    return resolved;
  }

  /**
   * The language for the current request context.
   */
  private contextLanguage(): string {
    return normaliseLang(this.context?.i18n?.language);
  }

  @roles(['USER', 'ANON'])
  async getContentBySlug(
    slug: string,
    options: string | ReactoryGetContentOptions = 'content/static-content',
  ): Promise<ReactoryContent> {
    // The second argument was historically a bare basePath string.
    const opts: ReactoryGetContentOptions =
      typeof options === 'string' ? { basePath: options } : { ...options };
    const basePath = opts.basePath || 'content/static-content';
    const lang = normaliseLang(opts.locale || this.contextLanguage());

    // Database backed content is cached as the raw record under a single key,
    // so one entry serves every locale and every includeTranslations/raw
    // combination. File backed content resolves a different file per language,
    // so it gets a language scoped key of its own.
    const cacheKey = `content:slug:${slug}:base:${basePath}`;
    const fsCacheKey = `${cacheKey}:lang:${lang}`;

    // 1. Check both cache keys before going to the database, so file backed
    // content short-circuits Mongo on repeat reads. Probes are counted as a
    // single logical lookup.
    const cached = await this.peekCache<ReactoryContent>(cacheKey);
    if (cached) {
      this.cacheHits++;
      return this.resolveForCaller(cached, { ...opts, locale: lang });
    }

    const fsCached = await this.peekCache<ReactoryContent>(fsCacheKey);
    if (fsCached) {
      this.cacheHits++;
      // File backed content carries no translations collection; it is already
      // resolved for this language by virtue of the filename.
      return this.resolveForCaller(fsCached, { ...opts, locale: lang, raw: true });
    }

    this.cacheMisses++;

    // 2. Query MongoDB
    const result = await Content.findOne({ slug });
    if (result) {
      const contentObj = (typeof result.toObject === 'function' ? result.toObject() : result) as ReactoryContent;
      await this.setToCache(cacheKey, contentObj);
      return this.resolveForCaller(contentObj, { ...opts, locale: lang });
    }

    // 3. Fall back to the filesystem.
    const { APP_DATA_ROOT } = process.env;
    if (APP_DATA_ROOT && pathExistsSync(path.join(APP_DATA_ROOT, basePath))) {
      // Prefer a language specific file, then the language neutral one, in
      // html then markdown order.
      const candidates: { file: string; format: 'html' | 'markdown' }[] = [
        { file: path.join(APP_DATA_ROOT, basePath, `${slug}.${lang}.html`), format: 'html' },
        { file: path.join(APP_DATA_ROOT, basePath, `${slug}.html`), format: 'html' },
        { file: path.join(APP_DATA_ROOT, basePath, `${slug}.${lang}.md`), format: 'markdown' },
        { file: path.join(APP_DATA_ROOT, basePath, `${slug}.md`), format: 'markdown' },
      ];
      const match = candidates.find((candidate) => existsSync(candidate.file));

      if (match) {
        const content = Buffer.from(readFileSync(match.file)).toString();
        let props: Partial<ReactoryContent> = {};
        if (existsSync(path.join(APP_DATA_ROOT, basePath, `${slug}.${lang}.props.json`))) {
          props = JSON.parse(readFileSync(path.join(APP_DATA_ROOT, basePath, `${slug}.${lang}.props.json`)).toString());
        } else if (existsSync(path.join(APP_DATA_ROOT, basePath, `${slug}.props.json`))) {
          props = JSON.parse(readFileSync(path.join(APP_DATA_ROOT, basePath, `${slug}.props.json`)).toString());
        }

        let systemUser = null;
        if (this.userService && this.context?.partner?.email) {
          systemUser = await this.userService.findUserWithEmail(this.context.partner.email);
        }

        if (props.createdBy && (props.createdBy as Reactory.Models.IUser).email && this.userService) {
          const user = await this.userService.findUserWithEmail((props.createdBy as Reactory.Models.IUser).email);
          if (user) {
            systemUser = user;
          }
        }

        const contentObj: ReactoryContent = {
          slug,
          content,
          title: slug,
          // The file extension is authoritative for how the body should render.
          format: match.format,
          locale: lang,
          createdAt: new Date(),
          createdBy: systemUser || this.context?.user,
          updatedAt: new Date(),
          updatedBy: systemUser || this.context?.user,
          published: true,
          ...props,
        };

        await this.setToCache(fsCacheKey, contentObj);
        return this.resolveForCaller(contentObj, { ...opts, locale: lang, raw: true });
      }
    }

    return null;
  }

  @roles(['USER'])
  async getContentById(id: string): Promise<Reactory.Models.IReactoryContent> {
    const cacheKey = `content:id:${id}`;
    const cached = await this.getFromCache<Reactory.Models.IReactoryContent>(cacheKey);
    if (cached) return cached;

    const result: Reactory.Models.IReactoryContentDocument = await Content.findById(id);
    if (result) {
      const contentObj = typeof result.toObject === 'function' ? (result.toObject() as Reactory.Models.IReactoryContent) : result;
      await this.setToCache(cacheKey, contentObj);
      return contentObj;
    }
    return null;
  }

  @roles(['USER'])
  async getContentBySlugAndLocale(slug: string, locale: string): Promise<Reactory.Models.IReactoryContentDocument> {
    const cacheKey = `content:slug:${slug}:locale:${locale}`;
    const cached = await this.getFromCache<Reactory.Models.IReactoryContentDocument>(cacheKey);
    if (cached) return cached;

    const result: Reactory.Models.IReactoryContentDocument = await Content.findOne({ slug, locale });
    if (result) {
      const contentObj = typeof result.toObject === 'function' ? (result.toObject() as Reactory.Models.IReactoryContentDocument) : result;
      await this.setToCache(cacheKey, contentObj);
      return contentObj;
    }
    return null;
  }

  @roles(['USER'])
  async getContentByIdAndLocale(id: string, locale: string): Promise<Reactory.Models.IReactoryContent> {
    const cacheKey = `content:id:${id}:locale:${locale}`;
    const cached = await this.getFromCache<Reactory.Models.IReactoryContent>(cacheKey);
    if (cached) return cached;

    const result: Reactory.Models.IReactoryContentDocument = await Content.findOne({ _id: id, locale });
    if (result) {
      const contentObj = typeof result.toObject === 'function' ? (result.toObject() as Reactory.Models.IReactoryContent) : result;
      await this.setToCache(cacheKey, contentObj);
      return contentObj;
    }
    return null;
  }

  @roles(['USER'])
  async getContentBySlugAndClient(slug: string, client: Reactory.Models.TReactoryClient): Promise<Reactory.Models.IReactoryContent> {
    const clientId = typeof client === 'string' ? client : (client as any)?._id?.toString() || 'default';
    const cacheKey = `content:slug:${slug}:client:${clientId}`;
    const cached = await this.getFromCache<Reactory.Models.IReactoryContent>(cacheKey);
    if (cached) return cached;

    const result: Reactory.Models.IReactoryContentDocument = await Content.findOne({ slug, client });
    if (result) {
      const contentObj = typeof result.toObject === 'function' ? (result.toObject() as Reactory.Models.IReactoryContent) : result;
      await this.setToCache(cacheKey, contentObj);
      return contentObj;
    }
    return null;
  }

  @roles(['USER'])
  async listContent<TQuery>(query: TQuery, paging: Reactory.Data.PagingRequest): Promise<Reactory.Data.PagedDataResponse<Reactory.Models.IReactoryContent, TQuery>> {
    const result = await Content.find({});
    return {
      query: query,
      paging: { 
        page: 1,
        pageSize: 10,
        total: result.length,
        hasNext: true,
      },
      sort: [],
      sortDirection: [],
      data: result,
    }
  }

  /**
   * The cache key under which the raw (untranslated) record for a slug is held.
   * Reads resolve the locale overlay from this single entry, so writes only
   * need to invalidate one key per base path.
   */
  private slugCacheKey(slug: string, basePath: string = 'content/static-content'): string {
    return `content:slug:${slug}:base:${basePath}`;
  }

  /**
   * Strips fields that must not be written blindly from a create/update payload.
   * `translations` is only persisted when the caller explicitly supplies an
   * array, so an ordinary content save never wipes existing translations.
   */
  private toPersistablePayload(content: ReactoryContentInput): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...content };
    delete payload.id;

    if (!Array.isArray(content.translations)) {
      delete payload.translations;
    }

    if (!content.format) {
      payload.format = DEFAULT_CONTENT_FORMAT;
    }

    if (!content.locale) {
      payload.locale = this.contextLanguage();
    }

    return payload;
  }

  /**
   * Drops every cache entry derived from a slug, including the language scoped
   * filesystem entries, then re-primes the raw record.
   */
  private async refreshCacheForSlug(slug: string, record: ReactoryContent): Promise<void> {
    await this.clearCache(`slug:${slug}`);
    const id = (record as unknown as { _id?: { toString(): string } })?._id;
    if (id) {
      await this.clearCache(`id:${id.toString()}`);
    }
    await this.setToCache(this.slugCacheKey(slug), record);
  }

  @roles(['USER'])
  async createContent(content: ReactoryContentInput): Promise<ReactoryContent> {
    try {
      logger.debug('Reactory Create Content Starting: ', content);
      const userId = this.context?.user?._id;
      const updated = await Content.findOneAndUpdate(
        { slug: content.slug },
        {
          ...this.toPersistablePayload(content),
          createdAt: new Date().valueOf(),
          updatedAt: new Date().valueOf(),
          createdBy: userId,
          updatedBy: userId,
        },
        { upsert: true, new: true }
      );

      const resultObj = updated ? (typeof updated.toObject === 'function' ? updated.toObject() : updated) as ReactoryContent : null;
      if (resultObj) {
        await this.refreshCacheForSlug(content.slug, resultObj);
      }
      return resultObj;
    } catch (error) {
      logger.error('Reactory Create Content Error: ', error);
      throw error;
    }
  }

  @roles(['USER'])
  async updateContent(content: ReactoryContentInput): Promise<ReactoryContent> {
    try {
      logger.debug('Reactory Update Content Starting: ', content);
      const userId = this.context?.user?._id;
      const updated = await Content.findOneAndUpdate(
        { slug: content.slug },
        {
          ...this.toPersistablePayload(content),
          updatedAt: new Date().valueOf(),
          updatedBy: userId,
        },
        { new: true }
      );

      const resultObj = updated ? (typeof updated.toObject === 'function' ? updated.toObject() : updated) as ReactoryContent : null;
      if (resultObj) {
        await this.refreshCacheForSlug(content.slug, resultObj);
      }
      return resultObj;
    } catch (error) {
      logger.error('Reactory Update Content Error: ', error);
      throw error;
    }
  }

  /**
   * Creates or replaces a single translation on a content item, leaving the
   * source content untouched. The source fingerprint is stamped onto the
   * translation so later reads can tell whether it has gone stale.
   */
  @roles(['USER'])
  async saveContentTranslation(
    slug: string,
    translation: ReactoryContentTranslationInput,
  ): Promise<ReactoryContent> {
    const lang = normaliseLang(translation?.lang);
    if (!lang) {
      throw new Error('A language code is required to save a translation.');
    }

    const existing = await Content.findOne({ slug });
    if (!existing) {
      throw new Error(`No content found for slug "${slug}".`);
    }

    const record = (typeof existing.toObject === 'function' ? existing.toObject() : existing) as ReactoryContent;

    if (lang === normaliseLang(record.locale as string)) {
      throw new Error(
        `"${lang}" is the source language for "${slug}". Edit the content directly instead of adding a translation.`,
      );
    }

    const entry: ReactoryContentTranslation = {
      lang: lang as ReactoryContentTranslation['lang'],
      title: translation.title || '',
      description: translation.description || '',
      content: translation.content || '',
      tags: translation.tags || [],
      machineTranslated: translation.machineTranslated === true,
      sourceHash: sourceFingerprint(record),
      updatedAt: new Date(),
      updatedBy: this.context?.user?._id,
    };

    const translations = ((record.translations || []) as ReactoryContentTranslation[])
      .filter((t) => normaliseLang(t.lang as string) !== lang)
      .concat(entry);

    const updated = await Content.findOneAndUpdate(
      { slug },
      { translations, updatedAt: new Date().valueOf(), updatedBy: this.context?.user?._id },
      { new: true },
    );

    const resultObj = (typeof updated.toObject === 'function' ? updated.toObject() : updated) as ReactoryContent;
    await this.refreshCacheForSlug(slug, resultObj);
    return { ...resultObj, translations: this.decorateTranslations(resultObj) };
  }

  /**
   * Removes the translation for a given language from a content item.
   */
  @roles(['USER'])
  async deleteContentTranslation(slug: string, lang: string): Promise<ReactoryContent> {
    const target = normaliseLang(lang);
    const existing = await Content.findOne({ slug });
    if (!existing) {
      throw new Error(`No content found for slug "${slug}".`);
    }

    const record = (typeof existing.toObject === 'function' ? existing.toObject() : existing) as ReactoryContent;
    const translations = ((record.translations || []) as ReactoryContentTranslation[])
      .filter((t) => normaliseLang(t.lang as string) !== target);

    const updated = await Content.findOneAndUpdate(
      { slug },
      { translations, updatedAt: new Date().valueOf(), updatedBy: this.context?.user?._id },
      { new: true },
    );

    const resultObj = (typeof updated.toObject === 'function' ? updated.toObject() : updated) as ReactoryContent;
    await this.refreshCacheForSlug(slug, resultObj);
    return { ...resultObj, translations: this.decorateTranslations(resultObj) };
  }

  @roles(['USER'])
  async saveImageData(image: Reactory.Service.IReactorySvgToImageArgs): Promise<Reactory.Service.IReactorySaveImageDataResponse> {
    const { folder, filename, svg, height = 2000, width = 2000 } = image;

    const result: Reactory.Service.IReactorySaveImageDataResponse = {
      pngURL: null,
      svgURL: null,
      success: false
    }

    try {
      if (folder) {
        let fullpath = path.join(process.env.APP_DATA_ROOT || '', folder);
        if (existsSync(fullpath) === false) mkdirSync(fullpath, { recursive: true });
        if (svg) {
          let svgfile = path.join(fullpath, `${filename}.svg`);
          writeFileSync(svgfile, svg);
          logger.debug(`Saved svg to ${svgfile}`)
          result.svgURL = safeCDNUrl(`${folder}/${filename}.svg`);
          let pngfile = path.join(fullpath, `${filename}.png`);
          result.success = true;

          try {
            await convertSvg(svgfile, { 
              width,
              height
            });
            logger.info(`Converted svg to ${pngfile}`)
            result.pngURL = safeCDNUrl(`${folder}/${filename}.png`);

          } catch (convertErr) {
            logger.error(`Could not convert ${svgfile} to ${pngfile}`, convertErr)
          }
        }
      }
    } catch (error) {
      logger.error(`Could not save the image data`, error)
    }

    return result;
  }
  
  async onStartup(): Promise<any> {    
    return Promise.resolve(true)
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this.fileService = fileService;
  }

  setUserService(userService: Reactory.Service.IReactoryUserService) {
    this.userService = userService;
  }

  setRedis(redis: any) {
    this.redis = redis;
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactoryContentService> = {
    id: "core.ReactoryContentService@1.0.0",
    nameSpace: "core",
    name: "ReactoryContentService",
    version: "1.0.0",
    description: "Service for managing content in the reactory system with multi-layer caching support",
    service: (
      props: Reactory.Service.IReactoryServiceProps,
      context: Reactory.Server.IReactoryContext) => {
      return new ReactoryContentService(props, context);
    },
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService'},
      { id: 'core.UserService@1.0.0', alias: 'userService'},
      { id: 'core.RedisService@1.0.0', alias: 'redis', optional: true },
    ],
    serviceType: 'data'
  };

}

export default ReactoryContentService;
