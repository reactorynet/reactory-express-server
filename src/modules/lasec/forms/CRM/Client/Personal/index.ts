import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import { AccountTypeDropdownUISchema } from '../../../widgets'
import graphql, { newClientGraphQL } from './graphql';

import ViewUISchema from './uiSchemas/ViewCustomerUISchema';
import NewUISchema from './uiSchemas/NewCustomerUISchema';
import EditUISchema from './uiSchemas/ExistingCustomerUISchema';
import ConfirmDetailsUISchema from './uiSchemas/ConfirmDetailsUISchema';

export const PersonalFormUiSchemas: { ViewUISchema: Reactory.IUISchema, NewUISchema: Reactory.IUISchema, EditUISchema: Reactory.IUISchema, ConfirmDetailsUISchema: Reactory.IUISchema } = {
  ViewUISchema,
  NewUISchema,
  EditUISchema,
  ConfirmDetailsUISchema
};


const schema: Reactory.ISchema = { ...ClientSchema };
schema.required = ["firstName", "lastName", "country"];
schema.title = "PERSONAL DETAILS"

const LasecCRMPersonalInformationForm: Reactory.IReactoryForm = {
  id: 'LasecCRMPersonalInformation',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMPersonalInformation',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql,
  widgetMap: [
    {
      componentFqn: 'core.ConditionalIconComponent',
      widget: 'ConditionalIcon'
    }
  ],
  uiSchema: ViewUISchema,
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'View Client Details',
      icon: 'list',
      uiSchema: ViewUISchema,
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Edit Client Details',
      icon: 'view_module',
      uiSchema: EditUISchema,
    },
    {
      id: 'new',
      title: 'New',
      key: 'new',
      description: 'Capture Personal Details',
      icon: 'view_module',
      uiSchema: NewUISchema,
    },
    {
        id: 'confirm',
        title: 'Confirm',
        key: 'confirm',
        description: 'Confirm Client Details',
        icon: 'view_module',
        uiSchema: ConfirmDetailsUISchema,
    }
  ],
  defaultFormValue: {},
  defaultUiSchemaKey: 'display',
};

export default LasecCRMPersonalInformationForm;