import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

/**
 * Build a form module definition from a source file on disk.
 *
 * The absolute path is passed through to the compiler as
 * `compilerOptions.sourcePath` so the module compiler can resolve the entry
 * file's local import graph (e.g. `./types`) and ship those includes alongside
 * the entry when it bundles the module.
 */
const widgetModule = (
  id: string,
  relativePath: string,
  fileType: 'tsx' | 'ts' = 'tsx',
): Reactory.Forms.IReactoryFormModule => {
  const sourcePath = path.resolve(__dirname, relativePath);
  return {
    id,
    src: fileAsString(sourcePath),
    compiler: 'rollup',
    fileType,
    compilerOptions: { sourcePath },
  };
};

const modules: Reactory.Forms.IReactoryFormModule[] = [
  widgetModule('core.WorkflowDetailsPanel@1.0.0', '../../Widgets/core.WorkflowDetailsPanel.tsx'),
  widgetModule('core.WorkflowOverview@1.0.0', '../../Widgets/core.WorkflowOverview.tsx'),
  widgetModule('core.WorkflowInstanceHistory@1.0.0', '../../Widgets/core.WorkflowInstanceHistory.tsx'),
  widgetModule('core.WorkflowDataViewer@1.0.0', '../../Widgets/core.WorkflowDataViewer.tsx'),
  widgetModule('core.WorkflowInstanceInspector@1.0.0', '../../Widgets/core.WorkflowInstanceInspector.tsx'),
  widgetModule('core.WorkflowErrors@1.0.0', '../../Widgets/core.WorkflowErrors.tsx'),
  widgetModule('core.WorkflowSchedule@1.0.0', '../../Widgets/core.WorkflowSchedule.tsx'),
  widgetModule('core.WorkflowLaunch@1.0.0', '../../Widgets/core.WorkflowLaunch.tsx'),
  widgetModule('core.WorkflowConfiguration@1.0.0', '../../Widgets/core.WorkflowConfiguration.tsx'),
  widgetModule('core.WorkflowYamlView@1.0.0', '../../Widgets/core.WorkflowYamlView.tsx'),
  widgetModule('core.WorkflowManager@1.0.0', '../../Widgets/core.WorkflowManager.ts', 'ts'),
];

export default modules;