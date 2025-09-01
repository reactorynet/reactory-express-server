import amq from '@reactory/server-core/amq';
import pdfRouter from '@reactory/server-core/pdf';
import resourcesRouter from '@reactory/server-core/resources'
import userAccountRouter from '@reactory/server-core/useraccount';;
import workflowRouter from '@reactory/server-core/workflow';
import express from 'express';
//import flash from 'connect-flash';
import modules from '@reactory/server-core/modules';
import CDNRouter from './CDNRouter';
import logger from '@reactory/server-core/logging';

const ConfigureRoutes = (app: express.Application) => {
  
  const routes: { [key: string]: express.Router } = {
    '/amq': amq.router,    
    '/pdf': pdfRouter,
    '/resources': resourcesRouter,
    '/user': userAccountRouter,
    '/workflow': workflowRouter,
    '/cdn': CDNRouter
  };

  // app.use(flash());
  
  modules.enabled.forEach((module) => { 
    if(module.routes && Object.keys(module.routes).length > 0) {
      Object.keys(module.routes).forEach((route) => {
        routes[route] = module.routes[route];
      });
    }
  });

  Object.keys(routes).forEach((route) => {
    logger.debug(`🔀 route handler: ${route} configured`);
    app.use(route, routes[route]);
  });
}

export default ConfigureRoutes;