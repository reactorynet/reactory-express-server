import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.WorkflowDetailsPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowDetailsPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
];

export default modules;