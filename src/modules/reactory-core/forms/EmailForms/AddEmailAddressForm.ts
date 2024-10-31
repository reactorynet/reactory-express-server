import Reactory from '@reactory/reactory-core';



const $schema: Reactory.Schema.ISchema = {
    type: 'object',
    properties: {
        email: { type: 'string', format: 'email', title: "Email" },
        display: { type: 'string', title: "Name" }
    }
}

const AddEmailAddressForm: Reactory.Forms.IReactoryForm = {
    id: 'core.AddEmailAddressForm',
    name: 'AddEmailAddressForm',
    nameSpace: 'core',
    registerAsComponent: true,
    schema: $schema,
    uiSchema: {
        'ui:options': {
            submitIcon: 'add',
            submitProps: {
                variant: 'button'
            },
        },

        email: {
            'ui:options': {
                props: {
                    size: 'small',
                    toLowerCase: true
                },
                componentProps: {
                    submitOnEnter: true
                }
            }
        },
        display: {
            'ui:options': {
                props: {
                    size: 'small'
                },
                componentProps: {
                    submitOnEnter: true
                }
            }
        }
    },
    title: 'Add Email Address Widget',
    uiFramework: 'material',
    uiSupport: ['material'],
    version: '1.0.0',
};

export default AddEmailAddressForm;