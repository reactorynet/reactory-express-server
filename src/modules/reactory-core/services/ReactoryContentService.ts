import Reactory from '@reactory/reactory-core';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import convertSvg from 'convert-svg-to-png';
import { roles } from '@reactory/server-core/authentication/decorators';
import { Content } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';
import { pathExistsSync } from 'fs-extra';

class ReactoryContentService implements Reactory.Service.IReactoryContentService {

  name: string;
  nameSpace: string;
  version: string;

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext
  fileService: Reactory.Service.IReactoryFileService;
  userService: Reactory.Service.IReactoryUserService;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  @roles(['USER'])
  getContentByTags(tags: string[], paging: Reactory.Data.PagingRequest): Promise<Reactory.Data.PagedDataResponse<Reactory.Models.IReactoryContent, String[]>> {
    throw new Error('Method not implemented.');
  }

  @roles(['USER', 'ANON'])
  async getContentBySlug(slug: string, basePath: string = "content/static-content"): Promise<Reactory.Models.IReactoryContent> {
    const result = await Content.findOne({ slug }).then();
    if (!result) {
      const { APP_DATA_ROOT } = process.env;
      //check if slug is a file with default value.
      if(pathExistsSync(path.join(APP_DATA_ROOT, basePath))) {
        const lang = this.context.i18n.language;
        let file = path.join(APP_DATA_ROOT, basePath,`${slug}.${lang.toLowerCase()}.html`);
        if(!existsSync(file)) {
          file = path.join(APP_DATA_ROOT, basePath, `${slug}.html`);
        }

        if(!existsSync(file)) {
          file = path.join(APP_DATA_ROOT, basePath, `${slug}.${lang.toLowerCase()}.md`);
          if(!existsSync(file)) {
            file = path.join(APP_DATA_ROOT, basePath, `${slug}.md`);
          }
        }

        if(existsSync(file)){
          const content = Buffer.from(readFileSync(file)).toString();
          let props: Partial<Reactory.Models.IReactoryContent> = {};
          if(existsSync(path.join(APP_DATA_ROOT, basePath,`${slug}.${lang.toLowerCase()}.props.json`))){
            props = JSON.parse(readFileSync(path.join(APP_DATA_ROOT, basePath, `${slug}.${lang.toLowerCase()}.props.json`)).toString());
          }
          else if(existsSync(path.join(APP_DATA_ROOT, basePath, `${slug}.props.json`))){
            props = JSON.parse(readFileSync(path.join(APP_DATA_ROOT, basePath, `${slug}.props.json`)).toString());
          }

          let systemUser = await this.userService.findUserWithEmail(this.context.partner.email)
          if(props.createdBy && (props.createdBy as Reactory.Models.IUser).email) {
            const user = await this.userService.findUserWithEmail((props.createdBy as Reactory.Models.IUser).email);
            if(user) {
              systemUser = user;
            }
          }
          return {
            slug,
            content,            
            title: slug,          
            createdAt: new Date(),
            createdBy: systemUser || this.context.user,
            updatedAt: new Date(),
            updatedBy: systemUser || this.context.user,
            published: true,            
            ...props
          }
        }
      }
    } else return result.toObject() as Reactory.Models.IReactoryContent;

    return null;
  }

  @roles(['USER'])
  async getContentById(id: string): Promise<Reactory.Models.IReactoryContent> {
    const result: Reactory.Models.IReactoryContentDocument = await Content.findById(id).then();
    return result;
  }

  @roles(['USER'])
  async getContentBySlugAndLocale(slug: string, locale: string): Promise<Reactory.Models.IReactoryContentDocument> {
    const result: Reactory.Models.IReactoryContentDocument = await Content.findOne({ slug, locale }).then();
    return result;
  }

  @roles(['USER'])
  async getContentByIdAndLocale(id: string, locale: string): Promise<Reactory.Models.IReactoryContent> {
    throw new Error('Method not implemented.');
  }

  @roles(['USER'])
  async getContentBySlugAndClient(slug: string, client: Reactory.Models.TReactoryClient): Promise<Reactory.Models.IReactoryContent> {
    const result: Reactory.Models.IReactoryContentDocument = await Content.findOne({ slug, client }).then();
    return result;
  }

  @roles(['USER'])
  async listContent<TQuery>(query: TQuery, paging: Reactory.Data.PagingRequest): Promise<Reactory.Data.PagedDataResponse<Reactory.Models.IReactoryContent, TQuery>> {
    const result = await Content.find({}).then();
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

  @roles(['USER'])
  async createContent(content: Reactory.Service.ReactoryContentInput): Promise<Reactory.Models.IReactoryContent> {    
    try {
      logger.debug('Reactory Create Content Starting: ', content);
      return await Content.findOneAndUpdate({ slug: content.slug }, {
        ...content,
        createdAt: new Date().valueOf(),
        updatedAt: new Date().valueOf(),
        createdBy: this.context.user._id,
        updatedBy: this.context.user._id
      }, { upsert: true }).then();
    } catch (error) {
      logger.debug('Reactory Create Content Error: ', error);
    }
  }

  @roles(['USER'])
  async updateContent(content: Reactory.Service.ReactoryContentInput): Promise<Reactory.Models.IReactoryContent> { 
    try {
      logger.debug('Reactory Update Content Starting: ', content);
      return null;      
    } catch (error) {
      logger.error('Reactory Update Content Error: ', error);
    }
  }

  @roles(['USER'])
  async saveImageData(image: Reactory.Service.IReactorySvgToImageArgs): Promise<Reactory.Service.IReactorySaveImageDataResponse> {
    const { folder, filename, svg, height = 2000, width = 2000 } = image;

    const result: Reactory.Service.IReactorySaveImageDataResponse = {
      pngURL: null,
      svgURL: null,
      success: false
    }

    // 
    try {
      //step check the folder        
      if (folder) {
        let fullpath = path.join(process.env.APP_DATA_ROOT, folder);
        let cdnpath = path.join(process.env.CDN_ROOT, folder);
        if (existsSync(fullpath) === false) mkdirSync(fullpath, { recursive: true });
        if (svg) {
          let svgfile = path.join(fullpath, `${filename}.svg`);
          writeFileSync(svgfile, svg);
          logger.debug(`Saved svg to ${svgfile}`)
          result.svgURL = path.join(cdnpath, `${filename}.svg`);
          let pngfile = path.join(fullpath, `${filename}.png`);
          result.success = true;

          try {
            await convertSvg(svgfile, { 
              width,
              height
            });
            logger.info(`Converted svg to ${pngfile}`)
            result.pngURL = path.join(cdnpath, `${filename}.png`);

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
    this.context = context
    return true;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this.fileService = fileService;
  }

  setUserService(userService: Reactory.Service.IReactoryUserService) {
    this.userService = userService;
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactoryContentService> = {
    id: "core.ReactoryContentService@1.0.0",
    nameSpace: "core",
    name: "ReactoryContentService",
    version: "1.0.0",
    description: "Service for managing content in the reactory system",
    service: (
      props: Reactory.Service.IReactoryServiceProps,
      context: Reactory.Server.IReactoryContext) => {
      return new ReactoryContentService(props, context);
    },
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService'},
      { id: 'core.UserService@1.0.0', alias: 'userService'},
    ],
    serviceType: 'data'
  };

}

export default ReactoryContentService;
31