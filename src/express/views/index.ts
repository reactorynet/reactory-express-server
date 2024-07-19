import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';
import express from 'express';
import fs from 'fs';
import path from 'path';
const ConfigureViews = (reactoryExpress: express.Application): void => {
  let root = process.cwd();
  const appFolder = process.env.NODE_ENV !== 'development' ? 'app' : 'src'
  const DEFAULT_VIEWS = path.join(root, appFolder, 'express/views');
  let viewFolders: string[] = [DEFAULT_VIEWS];

  modules.enabled.forEach((module: Reactory.Server.IReactoryModule) => {
    const viewFolder = path.join(root, appFolder, 'modules', module.id, 'views');
    if(fs.existsSync(viewFolder)) {
      viewFolders.push(viewFolder);
    }
  });
  reactoryExpress.set('view engine', 'ejs');
  reactoryExpress.set('views', viewFolders);
  logger.debug(`✅ View folders configured: ${viewFolders.join(', ')}`);
};

export default ConfigureViews;