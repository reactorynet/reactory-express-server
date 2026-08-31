import Reactory from '@reactorynet/reactory-core';

/**
 * Content types local to the reactory-core server module.
 *
 * The published `@reactorynet/reactory-core` typings lag the fields we persist
 * (`format`, `locale`, `helpTopic`, translation provenance). These interfaces
 * extend the published shapes so the service and resolver stay type safe
 * without waiting on a reactory-core release. Once the package is rebuilt with
 * the matching definitions in `reactory-core/src/types`, these can collapse
 * back onto the base types.
 */

/**
 * The authoring format of a content item's body.
 */
export type ReactoryContentFormat = 'markdown' | 'html' | 'text';

/**
 * The set of formats a content body may be authored in.
 */
export const CONTENT_FORMATS: ReactoryContentFormat[] = ['markdown', 'html', 'text'];

/**
 * The format assumed for content saved before the `format` field existed.
 * Legacy content was authored through a WYSIWYG editor that emitted HTML.
 */
export const DEFAULT_CONTENT_FORMAT: ReactoryContentFormat = 'html';

/**
 * A translation of a content item, including the provenance fields we persist
 * but which are absent from the published typings.
 */
export interface ReactoryContentTranslation
  extends Reactory.Models.IReactoryContentTranslation {
  /**
   * Set when the translation was produced by an AI persona rather than a human.
   */
  machineTranslated?: boolean;
  /**
   * Hash of the source content at the time this translation was saved.
   */
  sourceHash?: string;
  /**
   * Computed on read: true when the source content changed after this
   * translation was last saved.
   */
  stale?: boolean;
  updatedAt?: Date;
  updatedBy?: unknown;
}

/**
 * A content record including the fields this module persists beyond the
 * published `IReactoryContent` definition.
 */
export interface ReactoryContent
  extends Omit<Reactory.Models.IReactoryContent, 'translations'> {
  format?: ReactoryContentFormat;
  locale?: string;
  helpTopic?: string;
  enableComments?: boolean;
  commentLayout?: string;
  commentsProps?: Record<string, any>;
  container?: string;
  containerProps?: Record<string, any>;
  style?: Record<string, any>;
  translations?: ReactoryContentTranslation[];
  /**
   * Computed on read: the language actually used to resolve `title`,
   * `description` and `content`.
   */
  resolvedLocale?: string;
}

/**
 * Options accepted when resolving a content item by slug.
 */
export interface ReactoryGetContentOptions {
  /**
   * Filesystem base path used when the slug is not backed by a database record.
   */
  basePath?: string;
  /**
   * Resolve the content into this language. Defaults to the context language.
   */
  locale?: string;
  /**
   * Return the full translations collection alongside the resolved content.
   */
  includeTranslations?: boolean;
  /**
   * Return the source record untouched, skipping any translation overlay.
   */
  raw?: boolean;
}

/**
 * The payload accepted when creating or replacing a single translation.
 */
export interface ReactoryContentTranslationInput {
  lang: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  machineTranslated?: boolean;
}

/**
 * Content create/update input including the extended fields.
 */
export interface ReactoryContentInput
  extends Reactory.Service.ReactoryContentInput {
  format?: ReactoryContentFormat;
  helpTopic?: string;
  enableComments?: boolean;
  commentLayout?: string;
  commentsProps?: Record<string, any>;
  container?: string;
  containerProps?: Record<string, any>;
  style?: Record<string, any>;
  roles?: string[];
  metadata?: Record<string, unknown>;
  translations?: ReactoryContentTranslationInput[];
}

/**
 * The content service surface used by this module's resolvers, including the
 * translation methods that are not yet part of the published interface.
 */
export interface IReactoryContentService
  extends Omit<
    Reactory.Service.IReactoryContentService,
    'getContentBySlug' | 'createContent'
  > {
  getContentBySlug(
    slug: string,
    options?: string | ReactoryGetContentOptions,
  ): Promise<ReactoryContent>;
  createContent(content: ReactoryContentInput): Promise<ReactoryContent>;
  updateContent(content: ReactoryContentInput): Promise<ReactoryContent>;
  saveContentTranslation(
    slug: string,
    translation: ReactoryContentTranslationInput,
  ): Promise<ReactoryContent>;
  deleteContentTranslation(slug: string, lang: string): Promise<ReactoryContent>;
}

/**
 * The fully qualified id used to resolve the content service from a context.
 */
export const CONTENT_SERVICE_ID = 'core.ReactoryContentService@1.0.0';
