'use strict';
import { Reactory } from '@reactory/server-core/types/reactory'
import { cloneDeep } from 'lodash';
import { DocumentFormSchema } from './shared/DocumentFormSchema';
import DocumentGridWidget from './shared/DocumentMaterialTableWidgetSchema';
import { EditUiSchema } from './EditClientDocuments';
import graphql from './graphql';
import { defaultUiResources } from '../../../uiResources';

const viewSchema = cloneDeep<Reactory.ISchema>(DocumentFormSchema);
export const ViewSchema = viewSchema;

//Schema for display purposes, should not support upload
export const ViewUiSchema: any = {
  'ui:options': {
    componentType: 'div',
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit',
      style: {
        position: 'absolute',
        top: '-20px',
        right: 0,
      }
    },
    showSchemaSelectorInToolbar: false,
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
    {
      uploadedDocuments: { xs: 12, sm: 12, md: 12, lg: 12 },
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  id: {
    'ui:widget': 'HiddenWidget',
    hidden: true
  },
  uploadedDocuments: { ...DocumentGridWidget }
};

export const ConfirmUiSchema: any = {
  'ui:options': {
    componentType: 'div',
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      uploadedDocuments: { md: 12 },
    }
  ],

  uploadedDocuments: {
    ...DocumentGridWidget,
    'ui:options': { 
      ...DocumentGridWidget['ui:options'], 
      query: 'PagedNewCustomerDocuments',
      variables: {      
        'formData.paging': 'paging',              
        'formContext.$formData.uploadContext': 'uploadContexts',
      },      
    }
  }
};

export const LasecCRMViewClientDocuments: Reactory.IReactoryForm = {
  id: 'LasecCRMViewClientDocuments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [...defaultUiResources],
  title: 'CRM Client Documents',
  tags: ['CRM Client Documents'],
  registerAsComponent: true,
  // name: 'LasecCRMClientDocuments',
  name: 'LasecCRMViewClientDocuments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: { ...ViewSchema },
  graphql,
  uiSchema: { ...ViewUiSchema },
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'View Documents',
      icon: 'list',
      uiSchema: { ...ViewUiSchema }
    },
    {
      id: 'edit',
      title: 'Edit',
      key: 'edit',
      description: 'Edit Documents',
      icon: 'edit',
      uiSchema: { ...EditUiSchema }
    },
  ],
};
