import amq from '@reactory/server-core/amq';
import froala from '@reactory/server-core/froala';
import pdf from '@reactory/server-core/pdf';
import resources from '@reactory/server-core/resources'
import userAccount from '@reactory/server-core/useraccount';;
import workflow from '@reactory/server-core/workflow';
import bodyParser from 'body-parser';
import express from 'express';
import flash from 'connect-flash';
import passport from 'passport';

const ConfigureRoutes = (app: express.Application) => { 
  app.use(userAccount);
  app.use('/froala', froala);
  app.use('/deliveries', froala);
  app.use('/pdf', passport.authenticate(
    ['jwt'], { session: false }),
    bodyParser.urlencoded({ extended: true }), pdf);
  app.use('/resources', resources);
  app.use('/workflow', workflow);
  app.use('/amq', amq.router);
  app.use(flash());
  app.use('/cdn',
    passport.authenticate(['jwt', 'anonymous'], { session: false }),
    bodyParser.urlencoded({ extended: true }),
    express.static(process.env.APP_DATA_ROOT));
  
}

export default ConfigureRoutes;