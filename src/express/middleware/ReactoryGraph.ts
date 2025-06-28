import { ApolloServer, ApolloServerOptions } from "@apollo/server";
import { expressMiddleware, ExpressContextFunctionArgument } from "@apollo/server/express4"
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { GraphQLSchema } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import passport from 'passport';
import bodyParser from 'body-parser';
import typeDefs from '@reactory/server-core/models/graphql/types';
import resolvers from '@reactory/server-core/models/graphql/resolvers';
import directiveProviders from '@reactory/server-core/models/graphql/directives';
import plugins from '@reactory/server-core/models/graphql/plugins';
import http from 'http';
import express from 'express';
import logger from '@reactory/server-core/logging';
import ReactoryContextProvider from "@reactory/server-core/context/ReactoryContextProvider";



const ReactoryGraphMiddleware = async (app: express.Application, httpServer: http.Server) => { 
  
    const {
      NODE_ENV,
    } = process.env;

    let schema: GraphQLSchema = null;  
    try {
      schema = makeExecutableSchema({
        resolverValidationOptions : { 
          requireResolversForResolveType: 'ignore',
          requireResolversForArgs: 'ignore',
          requireResolversForNonScalar: 'ignore',
          requireResolversToMatchSchema: 'warn',
        },
        typeDefs,
        resolvers,
      });
    } catch (schemaError) { 
      logger.error(`Error compiling the schema: ${schemaError.message}`, schemaError);
    }
    
    directiveProviders.forEach((provider) => {
      try {
        logger.info(`Processing schema directive: "@${provider.name}"`);
        schema = provider.transformer(schema);
      } catch (directiveErr) {
        logger.error(`Error adding directive ${provider.name}`, directiveErr);
      }
    });
      
    const expressConfig: ApolloServerOptions<Reactory.Server.IReactoryContext> = {
      logger: logger,
      schema: schema,
      csrfPrevention: true,
      apollo: {
        graphId: process.env.APPLICATION_ID || 'reactory',
        graphVariant: 'default',
      },
      cache: 'bounded',
      nodeEnv: NODE_ENV,
      introspection: NODE_ENV === 'development',
      includeStacktraceInErrorResponses: NODE_ENV === 'development',
      allowBatchedHttpRequests: true,
      persistedQueries: false,      
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        ...plugins,
      ],
    };
  
    try {
      const apolloServer = new ApolloServer(expressConfig);
      await apolloServer.start();

      app.use(
        '/graph',
        passport.authenticate(['jwt'], 
        { session: false }),
        expressMiddleware(apolloServer, {
          context: async ({ req, res }: ExpressContextFunctionArgument) => {
            //@ts-ignore
            const _req = req as Reactory.Server.ReactoryExpressRequest;            
            if(!_req.context) _req.context = await ReactoryContextProvider(null,{});
            return _req.context;
            },
        }), 
        bodyParser.urlencoded({ extended: true }),
        bodyParser.json({
          limit: process.env.MAX_FILE_UPLOAD || '20mb',
        }),
      );

      logger.info('✅ Apollo server started OKAY');
    } catch (apolloStarterror) {
      logger.error('❌ Apollo server FAILED to start', apolloStarterror);      
    }
}

const ReactoryGraphMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = { 
  nameSpace: "core",
  name: "ReactoryGraphMiddleware",
  version: "1.0.0",
  description: "Middleware for setting up the graphql server",
  component: ReactoryGraphMiddleware,
  ordinal: -60,
  type: 'configuration',
  async: true
};

export default ReactoryGraphMiddlewareDefinition;