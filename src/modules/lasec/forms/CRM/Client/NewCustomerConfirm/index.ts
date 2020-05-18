import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql from './graphql';
import LasecPersonalForm, { confirmUiSchema as PersonalDisplayUISchema } from '../Personal/';
import LasecContactForm, { newConfirmSchema as ContactDisplayUISchema } from '../Contact';
import LasecJobDetailForm, { ConfirmUiSchema as JobDetailUISchema } from '../JobDetail';
import LasecCRMCustomerLookupForm, { CustomerConfirmUISchema  } from '../../Customer/Lookup';
import LasecCRMOrganizationLookupForm, { ConfirmNewUISchema as OrganizationConfirmUISchema  } from '../../Organization/Lookup';
import LasecCRMCustomerAddress, {  ReadOnlyUiSchema as CustomerAddressUISchema } from '../../Customer/Address';
import LasecCRMDocuments from '../Documents';

const displayUiSchema: any = {
  'ui:options': {
    submitProps: {
      variant: 'button',
      text: 'CONFIRM & SAVE',
      color: 'primary',      
      iconAlign: 'left'
    },
    componentType: "div",
    toolbarPosition: 'bottom',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
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
      personalDetails: { xs: 12, sm: 12, md: 12, lg: 12 },
      contactDetails: { xs: 12, sm: 12, md: 12, lg: 12 },
      jobDetails: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
    {
      customer: { xs: 12, sm: 12, md: 12, lg: 12 },
      organization: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
    {
      address: { xs: 12,  sm: 12, md: 12, lg: 12 },
    },
    {
      uploadedDocuments: { xs: 12,  sm: 12, md: 12, lg: 12 }
    }
  ],
  personalDetails: PersonalDisplayUISchema,
  contactDetails: ContactDisplayUISchema,
  jobDetails: JobDetailUISchema,  
  address: CustomerAddressUISchema,
  customer: CustomerConfirmUISchema,
  organization: OrganizationConfirmUISchema,
  uploadedDocuments: { 
    ...LasecCRMDocuments.ConfirmUiSchema,    
  },
};

displayUiSchema.uploadedDocuments.query = 'PagedNewCustomerDocuments';


const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    id: {
      type: 'string',
    },
    $uploadContext: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    personalDetails: { ...LasecPersonalForm.schema, title: 'PERSONAL INFO' },
    contactDetails: { ...LasecContactForm.schema },
    jobDetails: LasecJobDetailForm.schema,
    customer: {      
      ...LasecCRMCustomerLookupForm.schema,
      title: 'SELECTED CUSTOMER',
    },
    organization: {
      ...LasecCRMOrganizationLookupForm.schema,
      title: 'SELECTED ORGANIZATION'
    },
    address: LasecCRMCustomerAddress.schema,
    uploadedDocuments: { 
      ...LasecCRMDocuments.DocumentFormSchema,
      title: 'FILES TO ATTACH TO CLIENT',      
    },
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
      id: 'new',
      title: 'NEW',
      key: 'new',
      description: 'CONFIRM & SAVE ',
      icon: 'list',
      uiSchema: displayUiSchema,
    },   
  ],
  widgetMap: [
    { widget: 'LasecUserTitleWidget', componentFqn: 'lasec-crm.LasecUserTitleWidget@1.0.0' }
  ],
  defaultFormValue: {   
  }  
};

export default LasecCRMNewCustomerConfirm;
