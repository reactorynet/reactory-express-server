import coreClis from './cli';
import coreResolvers from './resolvers';
import coreTypes from './graph/types';
import directives from './graph/directives';
import coreWorkflows from './workflows';
import coreForms from './forms';
import models from './models';
import coreServices from './services';
import routes from './routes';
import translations from './data/translations';
import Reactory from '@reactorynet/reactory-core';
import middleware from './middleware';

const ReactoryCoreModule: Reactory.Server.IReactoryModule = {
  id: 'reactory-core',
  nameSpace: 'core',
  version: '1.0.0',
  name: 'ReactoryServer',
  dependencies: [],
  priority: 0,
  graphDefinitions: {
    Resolvers: coreResolvers,
    Types: [...coreTypes],
    Directives: directives    
  },
  //@ts-ignore
  workflows: [...coreWorkflows],
  forms: [ ...coreForms ],
  services: [ ...coreServices ],
  translations: translations,
  models: [ ...models ],
  clientPlugins: [],
  serverPlugins: [],
  //@ts-ignore
  cli: [...coreClis],
  description: 'Reactory Core Module. The core module for the Reactory Server, providing essential services, models, and workflows.',
  grpc: null,
  passportProviders: [],
  pdfs: [],
  middleware,
  routes,
  featureFlags: [
    {
      id: 'workflow-editor-beta-ui',
      nameSpace: 'core',
      name: 'WorkflowEditorBetaUI',
      version: '1.0.0',
      title: 'Workflow Editor Beta UI',
      description: 'Enable the new beta user interface for the workflow editor with improved design and user experience',
      permissions: {
        viewer: ['USER', 'ADMIN'],
        editor: ['ADMIN'],
        admin: ['ADMIN']
      },
      form: 'core.WorkflowEditorFeatureFlagForm@1.0.0'
    },
    {
      id: 'workflow-advanced-features',
      nameSpace: 'core',
      name: 'WorkflowAdvancedFeatures',
      version: '1.0.0',
      title: 'Advanced Workflow Features',
      description: 'Enable advanced workflow features including conditional logic, loops, and complex branching',
      permissions: {
        viewer: ['USER', 'ADMIN'],
        editor: ['ADMIN'],
        admin: ['ADMIN']
      },
      form: 'core.WorkflowEditorFeatureFlagForm@1.0.0'
    },
    {
      id: 'workflow-collaboration',
      nameSpace: 'core',
      name: 'WorkflowCollaboration',
      version: '1.0.0',
      title: 'Workflow Collaboration',
      description: 'Enable real-time collaboration features for workflow editing with multiple users',
      permissions: {
        viewer: ['USER', 'ADMIN'],
        editor: ['ADMIN'],
        admin: ['ADMIN']
      },
      form: 'core.WorkflowEditorFeatureFlagForm@1.0.0'
    },
    {
      id: 'workflow-templates-beta',
      nameSpace: 'core',
      name: 'WorkflowTemplatesBeta',
      version: '1.0.0',
      title: 'Beta Workflow Templates',
      description: 'Access beta workflow templates with new patterns and use cases',
      permissions: {
        viewer: ['USER', 'ADMIN'],
        editor: ['ADMIN'],
        admin: ['ADMIN']
      },
      form: 'core.WorkflowEditorFeatureFlagForm@1.0.0'
    },
    {
      id: 'workflow-validation-experimental',
      nameSpace: 'core',
      name: 'WorkflowValidationExperimental',
      version: '1.0.0',
      title: 'Experimental Workflow Validation',
      description: 'Enable experimental workflow validation features including AI-powered validation and advanced error detection',
      permissions: {
        viewer: ['USER', 'ADMIN'],
        editor: ['ADMIN'],
        admin: ['ADMIN']
      },
      form: 'core.WorkflowEditorFeatureFlagForm@1.0.0'
    },
    {
      id: 'workflow-ai-assistance',
      nameSpace: 'core',
      name: 'WorkflowAIAssistance',
      version: '1.0.0',
      title: 'AI Workflow Assistance',
      description: 'Enable AI-powered assistance for workflow creation, optimization suggestions, and automated workflow generation',
      permissions: {
        viewer: ['USER', 'ADMIN'],
        editor: ['ADMIN'],
        admin: ['ADMIN']
      },
      form: 'core.WorkflowEditorFeatureFlagForm@1.0.0'
    },
    {
      id: 'forms-engine-v5',
      nameSpace: 'core',
      name: 'FormsEngineV5',
      version: '1.0.0',
      title: 'Forms Engine v5',
      description: 'Render forms via the new react-jsonschema-form v5 adapter (the "form-engine" track) instead of the legacy in-tree fork. Per-form override is also available via formDef.options.engine; this flag controls the global default for forms that do not pin themselves.',
      permissions: {
        viewer: ['USER', 'ADMIN', 'DEVELOPER'],
        editor: ['ADMIN', 'DEVELOPER'],
        admin: ['ADMIN']
      },
      form: 'core.WorkflowEditorFeatureFlagForm@1.0.0'
    }
  ]
};

export default ReactoryCoreModule