/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import Reactory from '@reactorynet/reactory-core';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';

/**
 * This form is used to register the core plugin.
 */
const CorePluginForm: Reactory.Forms.IReactoryForm = {
    id: 'ReactoryCorePluginForm',
    uiFramework: 'material',
    uiSupport: ['material'],
    /**
     * This is the list of resources that are required to render the form. 
     * The resources are loaded in the order they are listed. The ReactoryAPI 
     * loader will load the resources only if they haven't been loaded before. 
     * It uses the id to determine if the resource has been loaded before.
     */
    uiResources: [
        {
            id: 'reactory.core',
            name: 'reactory.core',
            type: 'script',
            uri: safeCDNUrl('plugins/reactory-client-core/lib/reactory.client.core.js'),
        },
    ],
    title: 'Reactory Core Global Form',
    tags: ['Reactory Core'],
    schema: {
        type: 'object',
        properties: {
            plugin: {
                title: 'Plugin',
                type: 'string',
            },
        },
    },
    registerAsComponent: true,
    name: '$GLOBAL$ReactoryCorePluginForm',
    nameSpace: 'reactory',
    version: '1.0.0',
    roles: ['USER', 'ANON'],
    className: '',
    uiSchema: {
        'ui:options': {
            hidden: true,
            showSubmit: false,
            style: {
                display: 'none',
                height: '0px',
            },
        },
        plugin: {
            'ui:widget': 'HiddenWidget',
        },
    },
    defaultFormValue: {
        plugin: 'plugins/reactory-client-core/lib/reactory.client.core.js',
    },
};

export default CorePluginForm;
