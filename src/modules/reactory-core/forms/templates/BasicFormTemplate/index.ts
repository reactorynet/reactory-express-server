
import Reactory from '@reactory/reactory-core';
import schema, { argsSchema } from './schema';
import uiSchema, { argsUiSchema } from './uiSchema';
import graphql from './graphql';
import version from './version';
import modules from './modules';

const Form: Reactory.Forms.IReactoryForm = {
  id: ``,
  nameSpace: "",
  name: "",
  version,
  title: "",  
  description: '',
  icon: 'dynamic_form',
  avatar: '',
  registerAsComponent: true,
  
  schema,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  uiSchemas: [],
  argsSchema,
  argsUiSchema,
  argsComponentFqn: null,
  
  dependencies: [],
  exports: [],
  backButton: true,
  graphql,
  uiResources: [],
  helpTopics: [],
  widgetMap: [
    // add custom widget maps
  ],
  
  modules
}

export default Form;