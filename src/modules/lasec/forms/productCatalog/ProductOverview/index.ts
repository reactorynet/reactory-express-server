import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecCMSProductCatalogForm: Reactory.IReactoryForm = {
  id: 'LasecProductOverviewTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Overview',
  tags: ['CMS Product Overview'],
  registerAsComponent: true,
  name: 'LasecProductOverviewTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  widgetMap: [],
  // defaultFormData: {
  //   products: [
  //     { name: 'Product 1' },
  //     { name: 'Product 2' },
  //   ]
  // }
};

export default LasecCMSProductCatalogForm;
