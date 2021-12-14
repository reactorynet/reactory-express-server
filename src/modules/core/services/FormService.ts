import { isArray } from 'lodash';
import { Reactory } from '@reactory/server-core/types/reactory';
import modules from '@reactory/server-core/modules';

/**
 * Service class that provides access to forms for the logged in user
 */
class ReactoryFormService implements Reactory.Service.IReactoryFormService {  
  
  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.IReactoryContext;
  props: Reactory.IReactoryServiceProps;

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
          } else {
            that.getExecutionContext().log(`NULL FORM ${module.name} - ${fidx}`, form, 'error', 'ReactoryFormResolver')
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
  
  static reactory: Reactory.IReactoryServiceDefinition = {
    id: 'core.ReactoryFormService@1.0.0',
    description: 'Reactory Form Service',
    name: 'ReactoryFormService',
    service: (props, context) => {
      return new ReactoryFormService(props, context)
    }
  }
}

export default ReactoryFormService;