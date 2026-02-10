import Reactory from '@reactory/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.ApplicationUsersToolbar@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../components/ApplicationUsersToolbar.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  }
];

export default modules;
