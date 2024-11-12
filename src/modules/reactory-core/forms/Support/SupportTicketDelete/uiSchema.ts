import Reactory from '@reactory/reactory-core';

const uiSchema: Reactory.Schema.TServerUISchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.IFormUISchema> => { 
  let uiSchema: Reactory.Schema.IFormUISchema = {
    'ui:form': {
      submitIcon: 'delete',
    }
  }

  return uiSchema;
}

export const argsUiSchema = {
  title: ''
}

export default uiSchema;