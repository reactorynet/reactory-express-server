import express from 'express';
import modules from '@reactory/server-core/modules';
const ConfigureViews = (reactoryExpress: express.Application): void => { 
  let viewFolders: string[] = [];

  modules.enabled.forEach((module) => { 
    const viewFolder = module.path + '/views';
  });
  reactoryExpress.set('view engine', 'ejs');
  
  reactoryExpress.set('views', 'src/express/views');
  

};