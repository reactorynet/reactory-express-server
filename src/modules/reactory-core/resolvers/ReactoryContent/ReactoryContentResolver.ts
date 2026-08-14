import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import {
  CONTENT_SERVICE_ID,
  DEFAULT_CONTENT_FORMAT,
  IReactoryContentService,
  ReactoryContent,
  ReactoryContentInput,
  ReactoryContentTranslation,
  ReactoryContentTranslationInput,
  ReactoryGetContentOptions,
} from '@reactory/server-modules/reactory-core/types/Content';

/**
 * Roles permitted to author content. Callers outside this set never receive
 * the translations collection, which keeps unpublished draft translations out
 * of anonymous responses.
 */
const CONTENT_EDITOR_ROLES = ['ADMIN', 'DEVELOPER', 'CONTENT-EDITOR'];

/**
 * Resolves the content service from the request context.
 *
 * Deliberately a module function rather than a class method: the @query,
 * @mutation and @property decorators copy each function off the prototype into
 * a plain resolver map, so at execution time `this` is that map and not the
 * resolver instance. Any `this.helper()` call inside a resolver therefore fails
 * at runtime with "this.helper is not a function".
 */
const getContentService = (
  context: Reactory.Server.IReactoryContext,
): IReactoryContentService =>
  context.getService<IReactoryContentService>(CONTENT_SERVICE_ID);

@resolver
class ReactoryContentResolver {

  resolver: any

  @roles(["USER", "ANON"], 'args.context')
  @query("ReactoryGetContentBySlug")
  async getContentBySlug(
    parent: unknown,
    args: { slug: string, options?: ReactoryGetContentOptions },
    context: Reactory.Server.IReactoryContext
  ) {
    const { slug, options } = args;
    const contentService = getContentService(context);

    // Translations are editor-only data; silently drop the request for anyone
    // who cannot author content rather than failing the whole query.
    const canEdit = typeof context.hasAnyRole === 'function'
      ? context.hasAnyRole(CONTENT_EDITOR_ROLES)
      : false;

    return contentService.getContentBySlug(slug, {
      basePath: options?.basePath || "content/static-content",
      locale: options?.locale,
      includeTranslations: options?.includeTranslations === true && canEdit,
      raw: options?.raw === true && canEdit,
    });
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryGetContentById")
  async getContentById(parent: unknown, args: { id: string }, context: Reactory.Server.IReactoryContext) {
    const { id } = args;
    const contentService = getContentService(context);
    return contentService.getContentById(id);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryGetContentByTags")
  async getContentByTags(parent: unknown, args: { tags: string[], paging: Reactory.Data.PagingRequest }, context: Reactory.Server.IReactoryContext) {
    const { tags, paging } = args;
    const contentService = getContentService(context);
    return contentService.getContentByTags(tags, paging);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryGetContentList")
  async getContentList(parent: unknown, args: { search: any, paging: Reactory.Data.PagingRequest }, context: Reactory.Server.IReactoryContext) {
    const { paging, search } = args;
    const contentService = getContentService(context);
    return contentService.listContent(search, paging);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactoryCreateContent")
  async createContent(parent: unknown, args: { createInput: ReactoryContentInput }, context: Reactory.Server.IReactoryContext) {
    const contentService = getContentService(context);
    return contentService.createContent(args.createInput);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactorySaveContent")
  async saveContent(parent: unknown, args: { reactoryInput: ReactoryContentInput }, context: Reactory.Server.IReactoryContext) {
    const contentService = getContentService(context);
    return contentService.updateContent(args.reactoryInput);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactorySaveContentTranslation")
  async saveContentTranslation(
    parent: unknown,
    args: { slug: string, translation: ReactoryContentTranslationInput },
    context: Reactory.Server.IReactoryContext
  ) {
    const contentService = getContentService(context);
    return contentService.saveContentTranslation(args.slug, args.translation);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactoryDeleteContentTranslation")
  async deleteContentTranslation(
    parent: unknown,
    args: { slug: string, lang: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const contentService = getContentService(context);
    return contentService.deleteContentTranslation(args.slug, args.lang);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactorySaveImageData")
  async saveImageData(parent: unknown, args: { image: Reactory.Service.IReactorySvgToImageArgs }, context: Reactory.Server.IReactoryContext) {
    const { image } = args;
    const contentService = getContentService(context);
    return contentService.saveImageData(image);
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("ReactoryContent", "id")
  async contentId(parent: Reactory.Models.IReactoryContentDocument, args: unknown, context: Reactory.Server.IReactoryContext) {
    return parent?.id || parent?._id?.toString();
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("ReactoryContent", "title")
  async contentTitle(parent: Reactory.Models.IReactoryContentDocument, args: unknown, context: Reactory.Server.IReactoryContext) {
    return parent?.title || parent?.slug;
  }

  /**
   * Content saved before the `format` field existed was authored through a
   * WYSIWYG editor, so it is HTML unless stated otherwise.
   */
  @roles(["USER", "ANON"], 'args.context')
  @property("ReactoryContent", "format")
  async contentFormat(parent: ReactoryContent) {
    return parent?.format || DEFAULT_CONTENT_FORMAT;
  }

  /**
   * The language the body was actually resolved into. Falls back to the source
   * locale so the client always has a concrete value to display.
   */
  @roles(["USER", "ANON"], 'args.context')
  @property("ReactoryContent", "resolvedLocale")
  async contentResolvedLocale(parent: ReactoryContent) {
    return parent?.resolvedLocale || parent?.locale || 'en';
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("ReactoryContent", "translations")
  async contentTranslations(parent: ReactoryContent) {
    return parent?.translations || [];
  }

  /**
   * Resolves the author of a translation. Translations written before author
   * tracking existed simply resolve to null.
   */
  @roles(["USER"], 'args.context')
  @property("ReactoryContentTranslation", "updatedBy")
  async translationUpdatedBy(
    parent: ReactoryContentTranslation,
    args: unknown,
    context: Reactory.Server.IReactoryContext
  ) {
    if (!parent?.updatedBy) return null;

    const userService = context.getService<Reactory.Service.IReactoryUserService>("core.UserService@1.0.0");
    const raw: any = parent.updatedBy;

    if (raw && typeof raw === 'object' && raw.email) return raw;

    const userId = raw?.id || raw?._id || raw;
    if (!userId) return null;

    try {
      return await userService.findUserById(userId);
    } catch (error) {
      context.log?.(`Could not resolve translation author ${userId}`, {}, 'warning');
      return null;
    }
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("ReactoryContent", "createdBy")
  async createdBy(parent: Reactory.Models.IReactoryContent, args: unknown, context: Reactory.Server.IReactoryContext) {
    const userService = context.getService<Reactory.Service.IReactoryUserService>("core.UserService@1.0.0");
    let user: any = parent?.createdBy;

    if (typeof user === 'string' || (user && user._bsontype === 'ObjectID') || (user && typeof user === 'object' && !user.email && (user.id || user._id))) {
      const userId = user.id || user._id || user;
      user = await userService.findUserById(userId);
    } else if (user && typeof user === 'object' && user.email) {
      const found = await userService.findUserWithEmail(user.email);
      if (found) user = found;
    }

    if (!user || (!user.id && !user._id)) {
      if (context.user && (context.user.id || context.user._id)) {
        user = context.user;
      } else if (context.partner?.email) {
        user = await userService.findUserWithEmail(context.partner.email);
      }
    }

    if (user) {
      const uObj = typeof user.toObject === 'function' ? user.toObject() : user;
      const userId = uObj.id || uObj._id?.toString() || '000000000000000000000000';
      return {
        ...uObj,
        id: userId,
        _id: userId,
      };
    }

    return {
      id: '000000000000000000000000',
      _id: '000000000000000000000000',
      email: 'system@reactory.net',
      firstName: 'System',
      lastName: 'User',
    };
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("ReactoryContent", "updatedBy")
  async updatedBy(parent: Reactory.Models.IReactoryContent, args: unknown, context: Reactory.Server.IReactoryContext) {
    const userService = context.getService<Reactory.Service.IReactoryUserService>("core.UserService@1.0.0");
    let user: any = parent?.updatedBy || parent?.createdBy;

    if (typeof user === 'string' || (user && user._bsontype === 'ObjectID') || (user && typeof user === 'object' && !user.email && (user.id || user._id))) {
      const userId = user.id || user._id || user;
      user = await userService.findUserById(userId);
    } else if (user && typeof user === 'object' && user.email) {
      const found = await userService.findUserWithEmail(user.email);
      if (found) user = found;
    }

    if (!user || (!user.id && !user._id)) {
      if (context.user && (context.user.id || context.user._id)) {
        user = context.user;
      } else if (context.partner?.email) {
        user = await userService.findUserWithEmail(context.partner.email);
      }
    }

    if (user) {
      const uObj = typeof user.toObject === 'function' ? user.toObject() : user;
      const userId = uObj.id || uObj._id?.toString() || '000000000000000000000000';
      return {
        ...uObj,
        id: userId,
        _id: userId,
      };
    }

    return {
      id: '000000000000000000000000',
      _id: '000000000000000000000000',
      email: 'system@reactory.net',
      firstName: 'System',
      lastName: 'User',
    };
  }
}

export default ReactoryContentResolver;
