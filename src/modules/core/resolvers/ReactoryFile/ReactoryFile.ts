import { Reactory } from '@reactory/server-core/types/reactory';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'

@resolver
class ReactoryFile {  

  @property("ReactoryFile", "size")
  async getFileSize(file: Reactory.IReactoryFileModel, params: any, context: Reactory.IReactoryContext) {
    context.log("ReactoryFile.size", {}, "debug",  "ReactoryFile.ts" )
    if(file.size  && file.size > 0) return file.size;
    
    const fileService = context.getService("core.ReactoryFileService@1.0.0") as Reactory.Service.IReactoryFileService;
    return fileService.getFileSize(file);
  }  
}


export default ReactoryFile;