import { Reactory } from '@reactory/server-core/types/reactory';
import { fileAsString } from '@reactory/server-core/utils/io';

const modules: Reactory.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.SupportTicketsController@1.0.0',
    src: fileAsString(require.resolve('./core.SupportTicketsController.1.0.0.ts')),
    compiler: 'rollup',
  }
];

export default modules;