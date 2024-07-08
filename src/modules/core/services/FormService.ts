import { isArray } from 'lodash';
import { roles } from '@reactory/server-core/authentication/decorators'
import Reactory from '@reactory/reactory-core';
import modules from '@reactory/server-core/modules';

class ReactoryFormService implements Reactory.Service.IReactoryFormService {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;
  fileService: Reactory.Service.IReactoryFileService;
  compiler: Reactory.Service.IReactoryModuleCompilerService;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;    
    this.props = props;
  }

  get(id: string): Promise<Reactory.Forms.IReactoryForm> {
    let _form: Reactory.Forms.IReactoryForm = null;
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.Forms.IReactoryForm, fidx: number) => {
          if (form && form.id === id) {
            let allow_form: boolean = true;
            if (form.roles && form.roles.length > 0) {
              form.roles.forEach((role: string) => {
                if (that.getExecutionContext().hasRole(role) === true) {
                  allow_form = true;
                }
              });
            }

            if (allow_form === true && form) {
              _form = form;
            }
          }
        });
      }
    });
    return Promise.resolve(_form);
  }

  async search(form: Partial<Reactory.Forms.IReactoryForm>, targetModule?: string, where?: Reactory.Service.FormStore[]): Promise<Reactory.Forms.IReactoryForm[]> {
    let _forms: Reactory.Forms.IReactoryForm[] = [];
    

    return _forms
  }

  //@roles(['ADMIN', 'USER', 'ANON'])
  list(): Promise<Reactory.Forms.IReactoryForm[]> {
    const _forms: Reactory.Forms.IReactoryForm[] = [];
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.Forms.IReactoryForm, fidx: number) => {
          if (form) {
            let allow_form: boolean = true;
            if (form.roles && form.roles.length > 0) {
              allow_form = false;
              form.roles.forEach((role: string) => {
                if (that.getExecutionContext().hasRole(role) === true) {
                  allow_form = true;
                }
              });
            }

            if (allow_form === true && form) {
              _forms.push(form);
            }
          } else {
            that.getExecutionContext().log(`NULL FORM ${module.name} - ${fidx}`, form, 'error', 'ReactoryFormResolver')
          }

        });
      }
    });

    return Promise.resolve(_forms);
  }

  globals(): Promise<Reactory.Forms.IReactoryForm[]> {
    const _forms: Reactory.Forms.IReactoryForm[] = [];
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.Forms.IReactoryForm, fidx: number) => {
          if (form && form.name.indexOf("$GLOBAL$") >= 0) {
            let allow_form: boolean = true;
            if (form.roles && form.roles.length > 0) {
              form.roles.forEach((role: string) => {
                if (that.getExecutionContext().hasRole(role) === true) {
                  allow_form = true;
                }
              });
            }

            if (allow_form === true && form) {
              _forms.push(form);
            }
          } else {
            that.getExecutionContext().log(`NULL FORM ${module.name} - ${fidx}`, form, 'error', 'ReactoryFormResolver')
          }
        });
      }
    });

    return Promise.resolve(_forms);
  }

  async save(form: Reactory.Forms.IReactoryForm, options?: { publish: boolean, git: Reactory.Git.GitOptions, module: string}): Promise<Reactory.Forms.IReactoryForm> {
    
    let $form: Reactory.Forms.IReactoryForm;

    if(form && form.id) {
      $form = await this.get(form.id);
    }

    return form;
  }

  delete(form: Reactory.Forms.IReactoryForm): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async getCompiledResourceForModule(module: Reactory.Forms.IReactoryFormModule): Promise<Reactory.Forms.IReactoryFormResource> {    
    return this.compiler.compileModule(module);
  }

  async getResources(form: Reactory.Forms.IReactoryForm): Promise<Reactory.Forms.IReactoryFormResource[]> {

    const resources: Reactory.Forms.IReactoryFormResource[] = [];
    const that = this;

    if(!form.uiResources) form.uiResources = [];
    form.uiResources.forEach((resource) => {
      resources.push(resource);
    });

    if (form.modules && form.modules.length > 0) {
      //use an async fuction generator to 
      //compile the item and add it to the 
      //resources list.
      async function* compiledResourcesGenerator() {
        for (let i: number = 0; i < form.modules.length; i++) {
          const module: Reactory.Forms.IReactoryFormModule = form.modules[i];
          const resource = await that.getCompiledResourceForModule(module).then();
          yield resource;
        }
      }

      for await (const resource of compiledResourcesGenerator()) {
        resources.push(resource);
      }
    }

    return resources;

  }

  onStartup(): Promise<any> {
    return Promise.resolve(true);
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

  setCompiler(compiler: Reactory.Service.IReactoryModuleCompilerService) {
    this.compiler = compiler;
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactoryFormService> = {
    id: 'core.ReactoryFormService@1.0.0',
    description: 'Reactory Form Service',
    nameSpace: 'core',
    name: 'ReactoryFormService',
    service: (props, context): ReactoryFormService => {
      return new ReactoryFormService(props, context)
    },
    dependencies: [
      {
        id: 'core.ReactoryFileService@1.0.0',
        alias: 'fileService'
      },
      {
        id: 'core.ReactoryModuleCompilerService@1.0.0',
        alias: 'compiler'
      },
    ],
  }
}

export default ReactoryFormService;