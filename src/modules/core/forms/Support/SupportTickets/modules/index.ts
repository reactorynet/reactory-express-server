import Reactory from '@reactory/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const { 
  NODE_ENV
} = process.env;
const fileType = NODE_ENV === 'development' ? 'tsx' : 'js';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.SupportStatusWidget@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketStatusWidget.${fileType}`)),
    compiler: 'rollup',
    fileType
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketInfoPanel@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketInfoPanel.${fileType}`)),
    compiler: 'rollup',
    fileType
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketWorkflow@1.0.0',
    src: fileAsString(require.resolve('../../Widgets/core.SupportTicketWorkflow')),
    compiler: 'rollup',
    fileType: NODE_ENV === 'development' ? 'ts' : 'js'
  }
];

export default modules;