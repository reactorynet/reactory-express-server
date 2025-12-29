import Reactory from '@reactory/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.SupportStatusWidget@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketStatusWidget.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketInfoPanel@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketInfoPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketDetailPanel@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketDetailPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketOverview@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketOverview.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketComments@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketComments.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketAttachments@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketAttachments.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketActivity@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketActivity.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketRelated@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../../Widgets/core.SupportTicketRelated.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.SupportTicketsToolbar@1.0.0',
    src:  fileAsString(path.resolve(__dirname, `../components/SupportTicketsToolbar.tsx`)),
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