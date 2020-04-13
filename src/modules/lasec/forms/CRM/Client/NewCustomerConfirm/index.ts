import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql from './graphql';
import LasecPersonalForm, { confirmUiSchema as PersonalDisplayUISchema } from '../Personal/';
import LasecContactForm, { displayUiSchema as ContactDisplauUISchema } from '../Contact';
import LasecJobDetailForm, { displayUiSchema as JobDetailUISchema } from '../JobDetail';
import LasecCRMCustomerLookupForm from '../../Customer/Lookup';
import LasecCRMCustomerAddress, {  ReadOnlyUiSchema as CustomerAddressUISchema } from '../../Customer/Address';
import LasecCRMDocuments from '../Documents';

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CONFIRM & SAVE',
      activeColor: 'primary',
      selectSchemaId: 'edit'
    },
    style:{
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      personal: { md: 12 },
      contact: { md: 12 },      
      jobDetail: { md: 12 },      
    },
    {
      customer: { md: 12 },      
    },
    {
      address: { md: 12 },      
    },
    {
      uploadedDocuments: {md: 12}
    }
  ],
  personal: PersonalDisplayUISchema,
  contact: ContactDisplauUISchema,
  jobDetail: JobDetailUISchema,  
  address: CustomerAddressUISchema,
  uploadedDocuments: LasecCRMDocuments.ConfirmUiSchema,
};


const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    id: {
      type: 'string',
    },
    personal: LasecPersonalForm.schema,
    contact: LasecContactForm.schema,
    jobDetail: LasecJobDetailForm.schema,
    customer: LasecCRMCustomerLookupForm.schema,
    address: LasecCRMCustomerAddress.schema,
    uploadedDocuments: LasecCRMDocuments.schema
  }
};





schema.title = "CONFIRM & SAVE"

const LasecCRMNewCustomerConfirm: Reactory.IReactoryForm = {
  id: 'LasecCRMNewCustomerConfirm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Confirm New Client',
  tags: ['Confirm New Client'],
  registerAsComponent: true,
  name: 'LasecCRMNewCustomerConfirm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql,
  uiSchema: displayUiSchema,
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'CONFIRM & SAVE ',
      icon: 'list',
      uiSchema: displayUiSchema,
    },   
  ],  
};

export default LasecCRMNewCustomerConfirm;
