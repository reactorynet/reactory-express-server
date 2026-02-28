import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'core.ApplicationOrganizationsToolbar@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../components/ApplicationOrganizationsToolbar.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.OrganizationDetailsPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../components/OrganizationDetailsPanel.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.OrganizationOverviewTab@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../components/OrganizationOverviewTab.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.OrganizationBusinessUnitsTab@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../components/OrganizationBusinessUnitsTab.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'core.OrganizationTeamsTab@1.0.0',
    src: fileAsString(path.resolve(__dirname, `../components/OrganizationTeamsTab.tsx`)),
    compiler: 'rollup',
    fileType: 'tsx'
  }
];

export default modules;
