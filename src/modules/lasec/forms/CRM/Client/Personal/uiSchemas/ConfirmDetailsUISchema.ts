import { Reactory } from '@reactory/server-core/types/reactory';
import { newClientGraphQL } from '../graphql';

const uiSchema: Reactory.IUISchema = {
    'ui:options': {
        componentType: "div",
        toolbarPosition: 'none',
        containerStyles: {
            padding: '0px',
            margin: '0px',
            paddingBottom: '8px'
        },
        style: {
            marginTop: '16px',
        },
        showSubmit: false,
        showRefresh: false,
    },
    'ui:titleStyle': {
        borderBottom: '2px solid #D5D5D5',
        paddingBottom: '10px',
        marginBottom: '30px'
    },
    'ui:field': 'GridLayout',
    'ui:grid-options': {
        containerStyles: {
            padding: '24px 24px 60px'
        }
    },
    'ui:grid-layout': [
        {
            clientTitle: { md: 6, sm: 12 },
            firstName: { md: 6, sm: 12 },
            lastName: { md: 6, sm: 12 },
            country: { md: 6, sm: 12 },
            accountType: { md: 6, sm: 12 },
            repCode: { md: 6, sm: 12 },
            style: { padding: '25px 32px 0 32px' }
        }
    ],
    clientTitle: {
        'ui:graphql': {
            name: 'LasecGetPersonTitleById',
            text: `query LasecGetPersonTitleById($id: String){
                LasecGetPersonTitleById(id: $id) {
                    id          
                    title
                }
            }`,
            variables: {
                'formData': 'id'
            },
            resultType: 'string',
            resultKey: 'title',
            resultMap: {
                'title': 'formData',
            },
        },
        'ui:widget': 'LabelWidget',
        'ui:options': {
            readOnly: true,
            format: '$LOOKUP$',
            variant: 'subtitle1',
            title: 'Title',
            titleProps: {
                style: {
                    display: 'content',
                    minWidth: '200px',
                    color: "#9A9A9A",
                }
            },
            bodyProps: {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                }
            },
        }
    },
    clientStatus: {
        'ui:widget': 'LabelWidget',
        'ui:options': {
            readOnly: true,
            format: '${formData}',
            variant: 'subtitle1',
            title: 'Client Status',
            titleProps: {
                style: {
                    display: 'content',
                    minWidth: '200px',
                    color: "#9A9A9A",
                }
            },
            bodyProps: {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                }
            },
        }
    },
    firstName: {
        'ui:widget': 'LabelWidget',
  
        'ui:options': {
            readOnly: true,
            format: '${formData}',
            variant: 'subtitle1',
            title: 'Firstname',
            titleProps: {
                style: {
                    display: 'content',
                    minWidth: '200px',
                    color: "#9A9A9A",
                }
            },
            bodyProps: {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                }
            }
        }
    },
    lastName: {
        'ui:widget': 'LabelWidget',
        'ui:options': {
            readOnly: true,
            component: "TextField",
            componentProps: {
                variant: "outlined"
            },
            format: '${formData}',
            variant: 'subtitle1',
            title: 'Last Name',
            titleProps: {
                style: {
                    display: 'content',
                    minWidth: '200px',
                    color: "#9A9A9A",
                }
            },
            bodyProps: {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                }
            }
        }
    },
    country: {
        'ui:widget': 'LabelWidget',
        'ui:options': {
            format: '${formData}',
            variant: 'subtitle1',
            title: 'Country',
            titleProps: {
                style: {
                    display: 'content',
                    minWidth: '200px',
                    color: "#9A9A9A",
                }
            },
            bodyProps: {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                }
            }
        }
    },
    accountType: {
        'ui:widget': 'LabelWidget',
        'ui:options': {
            readOnly: true,
            format: '${formData ? formData.toUpperCase() : "ACCOUNT TYPE" }',
            variant: 'subtitle1',
            title: 'Account Type',
            titleProps: {
                style: {
                    display: 'content',
                    minWidth: '200px',
                    color: "#9A9A9A",
                }
            },
            bodyProps: {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                }
            },
        }
    },
    repCode: {
        'ui:widget': 'LabelWidget',
        'ui:options': {
  
            readOnly: true,
            format: '${formData}',
            variant: 'subtitle1',
            title: 'Rep Code',
            titleProps: {
                style: {
                    display: 'content',
                    minWidth: '200px',
                    color: "#9A9A9A",
                }
            },
            bodyProps: {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                }
            },
        }
    },
};


export default uiSchema;