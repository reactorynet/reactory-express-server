import Reactory from '@reactory/reactory-core';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';

const CreateUserForApplication: Reactory.Forms.IReactoryForm = {
  id: 'core.CreateUserForApplication@1.0.0',
  schema,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  graphql,
  uiResources: [],
  title: 'Create User for Application',
  registerAsComponent: true,
  nameSpace: 'core',
  name: 'CreateUserForApplication',
  version: '1.0.0',
};

export default CreateUserForApplication;
