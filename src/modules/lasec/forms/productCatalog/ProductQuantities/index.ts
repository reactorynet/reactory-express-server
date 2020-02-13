import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';

const LasecCMSProductQuantities: Reactory.IReactoryForm = {
  id: 'LasecProductQuantityTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Detail',
  tags: ['CMS Product Detail'],
  registerAsComponent: true,
  name: 'LasecProductQuantityTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
  ],
  defaultFormValue: {
    // locations: [
    //   { warehouse: 'Johannesburg', qtyAvailable: 10, qtyOnHand: 3, qtyOnBO: 12, total: 50 },
    //   { warehouse: 'Cape Town', qtyAvailable: 10, qtyOnHand: 3, qtyOnBO: 12, total: 50 },
    //   { warehouse: 'Bloemfontein', qtyAvailable: 10, qtyOnHand: 3, qtyOnBO: 12, total: 50 },
    //   { warehouse: 'Worchester', qtyAvailable: 10, qtyOnHand: 3, qtyOnBO: 12, total: 50 },
    //   { warehouse: 'Durban', qtyAvailable: 10, qtyOnHand: 3, qtyOnBO: 12, total: 50 },
    // ]
  },
};

export default LasecCMSProductQuantities;
