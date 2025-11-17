import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'

@resolver
class ReactoryContentResolver {

  resolver: any

  @roles(["USER", "ANON"], 'args.context')
  @query("ReactoryGetContentBySlug")
  async getContentBySlug(parent: unknown, args: { slug: string, options?: { basePath: string } }, context: Reactory.Server.IReactoryContext) {
    const { slug, options } = args;
    const contentService: Reactory.Service.IReactoryContentService = context.getService<Reactory.Service.IReactoryContentService>("core.ReactoryContentService@1.0.0");
    return contentService.getContentBySlug(slug, options?.basePath || "content/static-content");
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryGetContentById")
  async getContentById(parent: unknown, args: { id: string }, context: Reactory.Server.IReactoryContext) {
    const { id } = args;
    const contentService = context.getService<Reactory.Service.IReactoryContentService>("core.ReactoryContentService@1.0.0");
    return contentService.getContentById(id);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryGetContentByTags")
  async getContentByTags(parent: unknown, args: { tags: string[], paging: Reactory.Data.PagingRequest }, context: Reactory.Server.IReactoryContext) {
    const { tags, paging } = args;
    const contentService = context.getService<Reactory.Service.IReactoryContentService>("core.ReactoryContentService@1.0.0");
    return contentService.getContentByTags(tags, paging);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryGetContentList")
  async getContentList(parent: unknown, args: { search: any, paging: Reactory.Data.PagingRequest }, context: Reactory.Server.IReactoryContext) {
    const { paging, search } = args;
    const contentService = context.getService<Reactory.Service.IReactoryContentService>("core.ReactoryContentService@1.0.0");
    return contentService.listContent(search, paging);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactoryCreateContent")
  async createContent(parent: unknown, args: { createInput: Reactory.Service.ReactoryContentInput }, context: Reactory.Server.IReactoryContext) {    
    const contentService = context.getService<Reactory.Service.IReactoryContentService>("core.ReactoryContentService@1.0.0");
    return contentService.createContent(args.createInput);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactorySaveImageData")
  async saveImageData(parent: unknown, args: { image: Reactory.Service.IReactorySvgToImageArgs }, context: Reactory.Server.IReactoryContext) {
    const { image } = args;
    const contentService = context.getService<Reactory.Service.IReactoryContentService>("core.ReactoryContentService@1.0.0");
    return contentService.saveImageData(image);
  }

  @roles(["USER"], 'args.context')
  @property("ReactoryContent", "id")
  async contentId(parent: Reactory.Models.IReactoryContentDocument, args: unknown, context: Reactory.Server.IReactoryContext) {
    return parent?.id || parent._id?.toString();
  }

  @roles(["USER"], 'args.context')
  @property("ReactoryContent", "title")
  async contentTitle(parent: Reactory.Models.IReactoryContentDocument, args: unknown, context: Reactory.Server.IReactoryContext) {
    return parent?.title || parent?.slug;
  }
}

export default ReactoryContentResolver;