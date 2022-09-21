import Reactory from '@reactory/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.SupportStatusWidget@1.0.0',
    src: fileAsString(require.resolve('../../Widgets/core.SupportTicketStatusWidget.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketWorkflow@1.0.0',
    src: fileAsString(require.resolve('../../Widgets/core.SupportTicketWorkflow.ts')),
    compiler: 'rollup',
    fileType: 'ts'
  }
];

export default modules;