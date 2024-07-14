import { ApolloServer, ApolloServerOptions } from "@apollo/server";
import { expressMiddleware, ExpressMiddlewareOptions, ExpressContextFunctionArgument } from "@apollo/server/express4"
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { GraphQLSchema } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import passport from 'passport';
import bodyParser from 'body-parser';
import typeDefs from '@reactory/server-core/models/graphql/types';
import resolvers from '@reactory/server-core/models/graphql/resolvers';
import directiveProviders from '@reactory/server-core/models/graphql/directives';
import http from 'http';
import express from 'express';
import logger from '@reactory/server-core/logging';
import ReactoryContextProvider from "context/ReactoryContextProvider";


const ReactoryGraphMiddleware = async (app: express.Application, httpServer: http.Server) => { 
  
    const {
      NODE_ENV,
      APP_DATA_ROOT
    } = process.env;

    let schema: GraphQLSchema = null;
    
    let graphcompiled: boolean = false;
    let graphError: String = '';

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
      logger.error(`Error compiling the schema: ${schemaError.message}`);
    }
    
    directiveProviders.forEach((provider) => {
      try {
        logger.info(`Processing schema directive: "@${provider.name}"`);
        schema = provider.transformer(schema);
      } catch (directiveErr) {
        logger.error(`Error adding directive ${provider.name}`);
      }
    });
  
    
    const expressConfig: ApolloServerOptions<Reactory.Server.IReactoryContext> = {
      logger: logger,
      schema: schema,
      csrfPrevention: true,
      apollo: {
        graphId: 'reactory',
        graphVariant: 'default',
      },
      cache: 'bounded',
      nodeEnv: NODE_ENV,
      introspection: NODE_ENV === 'development' ? true : false,
      includeStacktraceInErrorResponses: NODE_ENV === 'development' ? true : false,
      allowBatchedHttpRequests: true,
      persistedQueries: false,
      typeDefs: typeDefs,
      resolvers: resolvers,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
      ],
    };
  
    try {
      const apolloServer = new ApolloServer(expressConfig);
      await apolloServer.start();

      app.use(
        '/api',
        passport.authenticate(['jwt'], 
        { session: false }),
        expressMiddleware(apolloServer, {
          context: async ({ req, res }: ExpressContextFunctionArgument) => {
            //@ts-ignore
            if(!req.context) req.context = await ReactoryContextProvider(null,{});
            return req.context;
            },
        }), 
        bodyParser.urlencoded({ extended: true }),
        bodyParser.json({
          limit: process.env.MAX_FILE_UPLOAD || '20mb',
        }),
      );

      logger.info('✅ Apollo server stared OKAY');
    } catch (apolloStarterror) {     
      logger.error(`Error starting the apollo server: ${apolloStarterror.message}`);
    }
}

export default ReactoryGraphMiddleware;