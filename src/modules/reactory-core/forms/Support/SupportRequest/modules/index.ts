import Reactory from '@reactory/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const { 
  NODE_ENV
} = process.env;
const relativePath = `../../Widgets/core.SupportTicketStatusWidget.tsx`;
const src = fileAsString(path.resolve(__dirname, relativePath));

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.SupportStatusWidget@1.0.0',
    src,
    compiler: 'rollup',
    fileType: 'tsx'
  }
];

export default modules;