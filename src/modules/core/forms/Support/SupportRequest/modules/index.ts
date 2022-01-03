import { Reactory } from '@reactory/server-core/types/reactory';
import { fileAsString } from '@reactory/server-core/utils/io';

const modules: Reactory.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.SupportStatusWidget@1.0.0',
    src: fileAsString(require.resolve('../../Widgets/core.SupportTicketStatusWidget.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportStatusWidget@1.0.0',
    src: fileAsString(require.resolve('../../Widgets/core.SupportTicketStatusWidget.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  }
];

export default modules;