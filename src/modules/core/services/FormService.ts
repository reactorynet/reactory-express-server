import fs from 'fs';
import path from 'path';
import Rollup from 'rollup';
import { forEach, isArray, takeRight } from 'lodash';
import { Reactory } from '@reactory/server-core/types/reactory';
import modules from '@reactory/server-core/modules';
import { resolveInclude } from 'ejs';
import messages from 'bot/sparky/messages';
import { cwd } from 'process';





class ReactoryFormService implements Reactory.Service.IReactoryFormService {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.IReactoryContext;
  props: Reactory.IReactoryServiceProps;
  fileService: Reactory.Service.IReactoryFileService;
  compiler: Reactory.Service.IReactoryModuleCompilerService;

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.context = context;    
    this.props = props;
  }

  get(id: string): Promise<Reactory.IReactoryForm> {
    let _form: Reactory.IReactoryForm = null;
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.IReactoryForm, fidx: number) => {
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

  list(): Promise<Reactory.IReactoryForm[]> {
    const _forms: Reactory.IReactoryForm[] = [];
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.IReactoryForm, fidx: number) => {
          if (form) {
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

  globals(): Promise<Reactory.IReactoryForm[]> {
    const _forms: Reactory.IReactoryForm[] = [];
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.IReactoryForm, fidx: number) => {
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

  save(form: Reactory.IReactoryForm, user_options?: any): Reactory.IReactoryForm {
    throw new Error('Method not implemented.');
  }

  delete(form: Reactory.IReactoryForm): boolean {
    throw new Error('Method not implemented.');
  }

  async getCompiledResourceForModule(module: Reactory.IReactoryFormModule): Promise<Reactory.IReactoryFormResource> {    
    return this.compiler.compileModule(module);
  }

  async getResources(form: Reactory.IReactoryForm): Promise<Reactory.IReactoryFormResource[]> {

    const resources: Reactory.IReactoryFormResource[] = [];
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
          const module: Reactory.IReactoryFormModule = form.modules[i];
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

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  setExecutionContext(context: Reactory.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this.fileService = fileService;
  }

  setCompiler(compiler: Reactory.Service.IReactoryModuleCompilerService) {
    this.compiler = compiler;
  }

  static reactory: Reactory.IReactoryServiceDefinition = {
    id: 'core.ReactoryFormService@1.0.0',
    description: 'Reactory Form Service',
    name: 'ReactoryFormService',
    service: (props, context) => {
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