import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

/**
 * Build a form module definition from a source file on disk.
 *
 * The absolute path is passed through to the compiler as
 * `compilerOptions.sourcePath`, which is what lets the module compiler ship the
 * entry file's local import graph. Without it the compiler synthesises a single
 * `entry.tsx` from `src` and drops every sibling file, so any relative import
 * of a *runtime* value (e.g. `./bulkActionTheme`) fails to bundle with
 * "Could not resolve './x'". Type-only imports are erased by babel/tsc and are
 * unaffected - which is why the widgets that only import `./types` worked.
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
  widgetModule('core.SupportStatusWidget@1.0.0', '../../Widgets/core.SupportTicketStatusWidget.tsx'),
  widgetModule('core.SupportTicketInfoPanel@1.0.0', '../../Widgets/core.SupportTicketInfoPanel.tsx'),
  widgetModule('core.SupportTicketDetailPanel@1.0.0', '../../Widgets/core.SupportTicketDetailPanel.tsx'),
  widgetModule('core.SupportTicketOverview@1.0.0', '../../Widgets/core.SupportTicketOverview.tsx'),
  widgetModule('core.SupportTicketComments@1.0.0', '../../Widgets/core.SupportTicketComments.tsx'),
  widgetModule('core.SupportTicketAttachments@1.0.0', '../../Widgets/core.SupportTicketAttachments.tsx'),
  widgetModule('core.SupportTicketActivity@1.0.0', '../../Widgets/core.SupportTicketActivity.tsx'),
  widgetModule('core.SupportTicketRelated@1.0.0', '../../Widgets/core.SupportTicketRelated.tsx'),
  widgetModule('core.SupportTicketAIAction@1.0.0', '../../Widgets/core.SupportTicketAIAction.tsx'),
  widgetModule('core.SupportTicketsToolbar@1.0.0', '../components/SupportTicketsToolbar.tsx'),
  widgetModule('core.BulkStatusChangeAction@1.0.0', '../../Widgets/core.BulkStatusChangeAction.tsx'),
  widgetModule('core.BulkAssignAction@1.0.0', '../../Widgets/core.BulkAssignAction.tsx'),
  widgetModule('core.BulkTagAction@1.0.0', '../../Widgets/core.BulkTagAction.tsx'),
  widgetModule('core.BulkDeleteAction@1.0.0', '../../Widgets/core.BulkDeleteAction.tsx'),
  widgetModule('core.ExportAction@1.0.0', '../../Widgets/core.ExportAction.tsx'),
  widgetModule('core.SupportTicketWorkflow@1.0.0', '../../Widgets/core.SupportTicketWorkflow.ts', 'ts'),
];

export default modules;
