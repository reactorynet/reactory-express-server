import { Reactory } from "@reactory/server-core/types/reactory";

const $uiSchema = {
    'ui:options': {
        showSubmit: false,
        showToolbar: false,
    },
    filename: {        
        'ui:widget': 'ReactoryDropZoneWidget',
        'ui:options': {
            style: {
    
            },
            ReactoryDropZoneProps: {
                text: `Drop files here, or click to select files to upload`,
                accept: ['text/html', 'text/text', 'application/xml', 'application/pdf'],
                uploadOnDrop: true,
                mutation: {
                    name: 'LasecUploadDocument',
                    text: `mutation LasecUploadDocument($file: Upload!, $uploadContext: String){
                            LasecUploadDocument(file: $file, uploadContext: $uploadContext) {
                                id
                                filename
                                link
                                mimetype
                                size
                            }
                        }`,
                    variables: {
                        'uploadContext': '${props.email_type}::${props.quote_id}::${props.user_id}::file-attachments',
                    },
                    onSuccessEvent: {
                        name: 'onChange',
                        via: 'form',
                    }
                },
                iconProps: {
                    icon: 'upload',
                    color: 'secondary'
                },
                labelProps: {
                    style: {
                        display: 'block',
                        paddingTop: '95px',
                        height: '200px',
                        textAlign: 'center',
                    }
                },
                style: {
                    minHeight: `200px`,
                    outline: '1px dashed #E8E8E8'
                }
            },
        },
    },
};

const $schema = {
    type: "object",
    properties: {
        filename: {
            type: 'string',
            title: 'File'
        }
    }
};

const QuoteEmailAttachmentWidget: Reactory.IReactoryForm = {
    id: "lasec-crm.QuoteEmailAttachmentWidget",
    name: "QuoteEmailAttachmentWidget",
    nameSpace: "lasec-crm",
    registerAsComponent: true,
    schema: $schema,
    uiSchema: $uiSchema,
    title: 'Quote Email Attachment Widget',
    uiFramework: 'material',
    uiSupport: ['material'],
    version: '1.0.0',    
};


export default QuoteEmailAttachmentWidget;