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
    id: 'core.ApplicationCard@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../widgets/ApplicationCard.${fileType}`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.ContentWidget@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.ContentWidget.${fileType}`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
];

export default modules;