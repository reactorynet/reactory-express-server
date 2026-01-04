import Reactory from '@reactory/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

/**
 * Modules for the Application dashboard form. These are custom widgets/panels
 * that will be loaded and compiled at runtime to render each tab's content.
 */
const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'reactory.ApplicationOverviewPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationOverviewPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationSettingsPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationSettingsPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationUsersPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationUsersPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationOrganizationsPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationOrganizationsPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationRolesPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationRolesPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationThemesPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationThemesPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationStatisticsPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationStatisticsPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationRoutesPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationRoutesPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'reactory.ApplicationMenusPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../widgets/ApplicationMenusPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
];

export default modules;

