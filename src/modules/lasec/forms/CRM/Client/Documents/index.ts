'use strict';
import { DocumentSchema } from './shared/DocumentSchema';
import { DocumentFormSchema } from './shared/DocumentFormSchema';
//Schema for display purposes, should not support upload
import { ViewSchema, ViewUiSchema, ConfirmUiSchema, LasecCRMViewClientDocuments } from './ViewClientDocuments';
import { EditSchema, EditUiSchema, LasecCRMEditClientDocuments } from './EditClientDocuments';
import { NewSchema, NewUiSchema, LasecCRMNewClientDocuments } from './NewClientDocuments';
import { Reactory } from 'types/reactory';

//Display for schema for new document uploads
export interface LasecClientDocumentExport {
  //Confirm Ui Schema
  ConfirmUiSchema: Reactory.ISchema,
  //Root Document Schema
  DocumentSchema: Reactory.ISchema,
  //Base Document Form Schema
  DocumentFormSchema: Reactory.ISchema,
  //View Document Schema
  ViewSchema: Reactory.ISchema,
  //View Ui Schema
  ViewUiSchema: any,
  //View Reactory Form Definition
  LasecCRMViewClientDocuments: Reactory.IReactoryForm,

  //Edit Document Schema
  EditSchema: Reactory.ISchema,
  //Edit Ui Schema
  EditUiSchema: any,
  //Edit Reactory Form Definition
  LasecCRMEditClientDocuments: Reactory.IReactoryForm,

  //New Document Schema
  NewSchema: Reactory.ISchema,
  //New Document UiSchema
  NewUiSchema: any,

  LasecCRMNewClientDocuments: Reactory.IReactoryForm,
};

const LasecClientDocuments: LasecClientDocumentExport = {
  

  DocumentSchema,
  DocumentFormSchema,  
  
  ViewSchema,
  ViewUiSchema,
  LasecCRMViewClientDocuments,

  EditSchema,
  EditUiSchema,
  LasecCRMEditClientDocuments,

  ConfirmUiSchema,
  NewSchema,
  NewUiSchema,
  LasecCRMNewClientDocuments,
};

export default LasecClientDocuments