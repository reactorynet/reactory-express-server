
import { Reactory } from '@reactory/server-core/types/reactory';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import version from './version';
import modules from './modules';

const SupportForm: Reactory.IReactoryForm = {
  id: `core.SupportForm@${version}`,
  schema,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  graphql,
  uiResources: [],
  helpTopics: ['help-logging-a-support-ticket'],
  title: "Reactory Support Form",
  registerAsComponent: true,
  widgetMap: [
    { componentFqn: 'core.SupportTicketStatusComponent@1.0.0', widget: 'SupportTicketStatusWidget' }
  ],
  nameSpace: "core",
  name: "SupportForm",  
  version,
  modules
}

export default SupportForm;