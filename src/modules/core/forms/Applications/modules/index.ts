import Reactory from '@reactory/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.ApplicationCard@1.0.0',
    src: fileAsString(require.resolve('../widgets/ApplicationCard.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.ContentWidget@1.0.0',
    src: fileAsString(require.resolve('../../Widgets/core.ContentWidget.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  }, 
];

export default modules;