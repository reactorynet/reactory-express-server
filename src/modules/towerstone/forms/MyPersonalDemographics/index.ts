import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const MoresMyPersonalDemographics: Reactory.IReactoryForm = {
  id: 'MoresMyPersonalDemographics',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: '',
  tags: ['Mores', 'My Personal Demographics'],
  registerAsComponent: true,
  name: 'MoresMyPersonalDemographics',
  nameSpace: 'mores',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  defaultFormValue: {
    id: 'drew1234',
  },
  widgetMap: [],
};

export default MoresMyPersonalDemographics;
