import amq from '@reactory/server-core/amq';
import pdfRouter from '@reactory/server-core/pdf';
import resourcesRouter from '@reactory/server-core/resources'
import workflowRouter from '@reactory/server-modules/reactory-core/workflow';
import express from 'express';
//import flash from 'connect-flash';
import modules from '@reactory/server-core/modules';
import CDNRouter from './CDNRouter';
import HealthRouter from './HealthRouter';
import logger from '@reactory/server-core/logging';
import configureElectronClientServing from './ElectronClientServing';

const ConfigureRoutes = (app: express.Application) => {
  
  const routes: { [key: string]: express.Router } = {
    '/amq': amq.router,    
    '/pdf': pdfRouter,
    '/resources': resourcesRouter,
    // NOTE: there is deliberately no '/user' mount here. `src/useraccount/`
    // used to be mounted at '/user' and its handlers referenced an `Admin`
    // symbol that no longer existed, so POST /user/register and POST
    // /user/forgot threw ReferenceError while looking like live endpoints.
    // Self-registration and password reset live in exactly one place now:
    // modules/reactory-core/routes/useraccount/UserAccount.ts, mounted at
    // '/useraccount' by the reactory-core module route map.
    '/cdn': CDNRouter,
    '/health': HealthRouter
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

  // Must be registered after all API routes — its SPA fallback otherwise
  // shadows them. No-op unless REACTORY_RUNTIME=electron.
  configureElectronClientServing(app);
}

export default ConfigureRoutes;