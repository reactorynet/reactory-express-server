'use strict'
import fs from 'fs';
import moment from 'moment';
import cors from 'cors';
import path from 'path';
import https from 'https';
// @ts-ignore
import sslrootcas from 'ssl-root-cas/latest';
import express, { Application, NextFunction } from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import passport from 'passport';
import i18nextHttp from 'i18next-http-middleware';
import { ApolloServer, ApolloServerExpressConfig, makeExecutableSchema, SchemaDirectiveVisitor } from 'apollo-server-express';
import flash from 'connect-flash';
import mongooseConnection from '@reactory/server-core/models/mongoose';
import corsOptions from '@reactory/server-core/express/cors';
import configureMiddleWare from '@reactory/server-core/middleware';
import userAccountRouter from '@reactory/server-core/useraccount';
import froala from '@reactory/server-core/froala';
import resources from '@reactory/server-core/resources';
import typeDefs from '@reactory/server-core/models/graphql/types';
import resolvers from '@reactory/server-core/models/graphql/resolvers';
import directiveProviders from '@reactory/server-core/models/graphql/directives';
import { ConfigureAuthentication } from '@reactory/server-core/authentication';
import workflow, { workflowRunner, WorkFlowRunner } from '@reactory/server-core/workflow';
import pdf from '@reactory/server-core/pdf';
import amq from '@reactory/server-core/amq';
import startup from '@reactory/server-core/utils/startup';
import logger from '@reactory/server-core/logging';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import resolveUrl from '@reactory/server-core/utils/url/resolve';
import colors from 'colors/safe';
import http from 'http';
import { GraphQLSchema } from 'graphql';
import i18n from '@reactory/server-core/express/i18n';

// set theme
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});


const {
  APP_DATA_ROOT,
  APP_SYSTEM_FONTS,
  MONGOOSE,
  MONGO_USER,
  MONGO_PASSWORD,
  API_PORT = 4000,
  SERVER_IP,
  API_URI_ROOT,
  CDN_ROOT,
  MODE,
  NODE_ENV = 'development',
  DOMAIN_NAME,
  SECRET_SAUCE,
  SERVER_ID,
  MAX_FILE_UPLOAD = '20mb',
  DEVELOPER_ID,
  SYSTEM_USER_ID = 'not-set',
  MAIL_REDIRECT_ADDRESS
} = process.env as Reactory.Server.ReactoryEnvironment;

/**
 * Helper function to hide text we don't want to log to 
 * output or log files.
 * @param text 
 * @returns 
 */
const hideText = (text: string = '') => {
  let asterisks = '';
  for (let ai: number = 0; ai < text.length - 2; ai += 1) {
    asterisks = `${asterisks}*`;
  }
  return `${text.substr(0, 1)}${asterisks}${text.substr(text.length - 1, 1)}}`;
};


/**
 * The main function to start reactory server. 
 */
export const ReactoryServer = async (): Promise<{ 
  app: Application, 
  server: http.Server,
  apolloServer: ApolloServer,
  workflowHost: WorkFlowRunner,
  stop: () => void
}> => {

  let reactoryExpress: Application;

  let mongoose_result = null;

  const ca = sslrootcas.create();
  https.globalAgent.options.ca = ca;

  const packageJson = require(`${process.cwd()}/package.json`);

  try {
    mongoose_result = await mongooseConnection();
    logger.debug('✅Connection to mongoose complete');
  } catch (error) {
    logger.error(colors.red(`
  ################################################
  💥Could not connect to mongoose - shutting down
  server process. Check if the configuration 
  settings below are correct and whether your user 
  mongo db account exists on the target database
  ################################################
  db: ${MONGOOSE}
  user: ${MONGO_USER || '!!NOT-SET!!'}
  pass: ${MONGO_PASSWORD ? hideText(MONGO_PASSWORD) : '!!NOT-SET!!'}
  err: ${error.message}
  ################################################
  `));
    process.exit(0);
  }

  process.on('unhandledRejection', (error) => {
    // Will print "unhandledRejection err is not defined"
    logger.error('unhandledRejection', error);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    workflowRunner.stop();
    logger.info('Shutting Down Reactory Server');
    process.exit(0);
  });

  let asciilogo = `Reactory Server version : ${packageJson.version} - start ${moment().format('YYYY-MM-dd HH:mm:ss')}`;

  if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`)) {
    const logo = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`, { encoding: 'utf-8' });
    asciilogo = `${asciilogo}\n\n${logo}`;
  }

  const ENV_STRING_DEBUG = `
Environment Settings: 
  NODE_ENV: ${NODE_ENV}
  SERVER_ID: ${SERVER_ID || 'reactory.local'}
  APP_DATA_ROOT: ${APP_DATA_ROOT}
  APP_SYSTEM_FONTS: ${APP_SYSTEM_FONTS}
  API_PORT: ${API_PORT}
  API_URI_ROOT: ${API_URI_ROOT}
  CDN_ROOT: ${CDN_ROOT}
  DOMAIN_NAME: ${DOMAIN_NAME}
  MODE: ${MODE}
  MONGOOSE: ${MONGOOSE}
  MAX_FILE_UPLOAD (size): ${MAX_FILE_UPLOAD} !NOTE! This affects all file uploads.
  MAIL_REDIRECT_ADDRESS: ${MAIL_REDIRECT_ADDRESS}
`;

  logger.info(ENV_STRING_DEBUG);

  const queryRoot = '/api';
  const resourcesPath = '/cdn';
  const publicFolder = path.join(__dirname, 'public');

  let apolloServer: ApolloServer = null;
  let graphcompiled: boolean = false;
  let graphError: String = '';

  let expressServer: http.Server = null;

  reactoryExpress = express();

  reactoryExpress.on('error', (app) => {
    logger.error(`Application reported error`);
  });

  process.once('SIGUSR2', function () {
    if (expressServer) {
      logger.debug(colors.magenta('Interrupt Received, restarting'));
      expressServer.close(() => {
        process.kill(process.pid, 'SIGUSR2')
      })
    }
  })

  process.on("SIGINT", () => {
    if (expressServer) {
      console.log('Shutting down server');
      expressServer.close(() => {
        process.exit(0);
      })
    }
  });


  reactoryExpress.use((err: Error, req: any, res: any, next: NextFunction) => {
    logger.error(`Express Error Handler`, { err });
    if (res.headersSent) {
      return next(err)
    }
    res.status(500)
    res.render('error', { error: err })
  });
      
  reactoryExpress.use('*', cors(corsOptions));
  configureMiddleWare(reactoryExpress);
  reactoryExpress.use(i18nextHttp.handle(i18n));
  reactoryExpress.use(
    queryRoot,
    passport.authenticate(['jwt'], 
    { session: false }), 
    bodyParser.urlencoded({ extended: true }),
    bodyParser.json({
      limit: MAX_FILE_UPLOAD,
    }),
  );

  try {

    let $schema: GraphQLSchema = makeExecutableSchema({
      resolverValidationOptions : { 
        requireResolversForResolveType: false 
      },
      typeDefs,
      resolvers,
    });

    directiveProviders.forEach((provider) => {
      try {
        logger.info(`Processing schema directive: "@${provider.name}"`);
        $schema = provider.transformer($schema);
      } catch (directiveErr) {
        logger.error(`Error adding directive ${provider.name}`);
      }
    });

    
    const expressConfig: ApolloServerExpressConfig = {
      logger: logger,
      schema: $schema,
      context: async (options: any) => { 
        const req = options.req;
        if(req.context) return req.context;
        else {
          return await ReactoryContextProvider(null, {});
        }
      },
      uploads: {
        maxFileSize: 20000000,
        maxFiles: 10,
      },
    };

    apolloServer = new ApolloServer(expressConfig);
    graphcompiled = true;
    logger.info('Graph Schema Compiled, starting express');
  } catch (schemaCompilationError) {
    if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`) === true) {
      const error = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`, { encoding: 'utf-8' });
      logger.error(`\n\n${error}`);
    }

    graphError = `Error compiling the graphql schema ${schemaCompilationError.message}`;
    logger.error(graphError);
  }

  reactoryExpress.set('trust proxy', NODE_ENV === 'development' ? 0 : 1);  
  reactoryExpress.use(bodyParser.urlencoded({ extended: false }));
  reactoryExpress.use(bodyParser.json({ limit: MAX_FILE_UPLOAD }));

  if (apolloServer) {
    apolloServer.applyMiddleware({ app: reactoryExpress, path: queryRoot });
  } else {
    if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`) === true) {
      const error = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`, { encoding: 'utf-8' });
      logger.error(`\n\n${error}`);
    }
    logger.error(`Error compiling the graphql schema: apolloServer instance is null!`);
  }


  amq.raiseSystemEvent('server.startup.begin', {});

  if (SYSTEM_USER_ID === 'not-set') {
    logger.warn(colors.yellow("SYSTEM_USER_ID env variable is not set - please configure in env variables"));
  }

  // TODO: Werner Weber - Update the start result object to contain
  // more useful information about the server environment, configuration
  // output.
  try {
    const context = await startup();
    ConfigureAuthentication(reactoryExpress);
    reactoryExpress.use(userAccountRouter);
    // TODO: Werner Weber - Update the route configuration to use the
    // load the routes from the modules and the core.
    // i.e. 
    // RouteConfig.Configure(reactoryExpress);
    // see ticket https://github.com/reactorynet/reactory-express-server/issues/15
    reactoryExpress.use('/froala', froala);
    reactoryExpress.use('/deliveries', froala);
    reactoryExpress.use('/workflow', workflow);
    reactoryExpress.use('/resources', resources);
    reactoryExpress.use('/pdf', passport.authenticate(
      ['jwt'], { session: false }),
      bodyParser.urlencoded({ extended: true }), pdf);
    //reactoryExpress.use('/excel', ExcelRouter);

    reactoryExpress.use('/amq', amq.router);
    reactoryExpress.use(flash());
    reactoryExpress.use(resourcesPath,
      passport.authenticate(['jwt', 'anonymous'], { session: false }),
      bodyParser.urlencoded({ extended: true }),
      express.static(APP_DATA_ROOT || publicFolder));

    const startExpressServer = (): Promise<http.Server> => {
      return new Promise((resolve, reject) => {
        expressServer = reactoryExpress.listen(typeof API_PORT === "string" ? parseInt(API_PORT) : API_PORT, SERVER_IP, () => {
          logger.info(`\n\n${asciilogo}\n\n`);
          if (graphcompiled === true) {
            const graphql_api_root = resolveUrl(API_URI_ROOT, queryRoot);

            logger.info(colors.green(`✅ Running a GraphQL API server at ${graphql_api_root}`));
          }
          else logger.info(colors.yellow(`🩺 GraphQL API not available - ${graphError}`));

          logger.info(colors.green('✅ System Initialized/Ready, enabling app'));

          global.REACTORY_SERVER_STARTUP = new Date();
          amq.raiseSystemEvent('server.startup.complete');
          resolve(expressServer);
        }).on("error", (err) => {
          logger.error(colors.red("Could not successfully start the express server"), err);
          reject(err);
        });
      });
    };

    const stopServer = () => { 
      if(expressServer) { 
        expressServer.close(() => {
          logger.info('Express Server Stopped');
        });
      }
      if(workflowRunner) {
        workflowRunner.stop();
        logger.info('Workflow Host Stopped');
      }
      if(mongoose_result) {
        mongoose_result.connection.close();
        logger.info('Mongoose Connection Closed');
      }
    };

    try {
      await startExpressServer();
    } catch (error) {
      logger.error(colors.red('Could not start the express server'), error);
      process.exit(-1);
    }
    
    return { 
      app: reactoryExpress,
      server: expressServer,
      apolloServer,
      workflowHost: workflowRunner,
      stop: stopServer
    }
  } catch (startupError) {
    logger.error(colors.red('Server was unable to start successfully.'), startupError);
    process.exit(-1);
  }
}