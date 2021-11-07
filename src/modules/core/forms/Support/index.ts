
import { Reactory } from '@reactory/server-core/types/reactory';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import version from './version';
import { fileAsString } from 'utils/io';

const SupportForm: Reactory.IReactoryForm = {
  id: `core.SupportForm@${version}`,
  schema,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  graphql,
  uiResources: [
    {
      id: `core.SupportFormController.${version}`,
      name: `core.SupportFormController.${version}`,
      type: 'script',
      uri: `${process.env.CDN_ROOT}__virtuals__/core.SupportFormController.${version}.js`,
    }
  ],
  title: "Reactory Support Form",
  registerAsComponent: true,
  nameSpace: "core",
  name: "SupportForm",
  version,
  modules: [
    { 
      id: `core.SupportFormController.${version}`,
      compiler: 'rollup',
      src: fileAsString(require.resolve(`./modules/core.SupportFormController.${version}.ts`)),
      compilerOptions: null,
    }
  ]
}

export default SupportForm;