import Reactory from '@reactory/reactory-core';
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
  {
    compilerOptions: {},
    id: 'core.WorkflowOverview@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowOverview.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.WorkflowInstanceHistory@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowInstanceHistory.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.WorkflowErrors@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowErrors.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.WorkflowSchedule@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowSchedule.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.WorkflowLaunch@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowLaunch.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.WorkflowConfiguration@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.WorkflowConfiguration.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.WorkflowManager@1.0.0',
    src: fileAsString(require.resolve('../../Widgets/core.WorkflowManager.ts')),
    compiler: 'rollup',
    fileType: 'ts'
  },
  {
    compilerOptions: {},
    id: 'core.WorkflowRegistryToolbar@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../components/WorkflowRegistryToolbar.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.BulkActivateAction@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.BulkActivateAction.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.BulkDeactivateAction@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.BulkDeactivateAction.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.BulkExecuteAction@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.BulkExecuteAction.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.BulkTagAction@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.BulkTagAction.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.BulkDeleteAction@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../../Widgets/core.BulkDeleteAction.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  }
];

export default modules;
