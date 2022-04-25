/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Reactory } from '@reactory/server-core/types/reactory';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const MoresPluginForm: Reactory.IReactoryForm = {
    id: 'ReactoryCorePluginForm',
    uiFramework: 'material',
    uiSupport: ['material'],
    uiResources: [
        {
            id: 'reactory.core',
            name: 'reactory.core',
            type: 'script',
            uri: `${ENVIRONMENT.CDN_ROOT}plugins/reactory-client-core/lib/reactory.client.core.js`,
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
    components: ['reactory-core.ReactoryCoreClientPlugin.@1.0.0'],
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
        plugin: 'plugins/mores/lib/reactory.plugin.mores.js',
    },
};

export default MoresPluginForm;
