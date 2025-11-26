import { ApolloServer, ApolloServerOptions } from "@apollo/server";
import { expressMiddleware, ExpressContextFunctionArgument } from "@apollo/server/express4"
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { GraphQLSchema, validateSchema } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import passport from 'passport';
import bodyParser from 'body-parser';
import busboy from 'busboy';
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

    // Helper function to create file stream
    const createFileStream = (buffer: Buffer) => {
      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      return stream;
    };

    // Helper function to set nested property
    const setNestedProperty = (obj: any, path: string, value: any) => {
      const pathParts = path.split('.');
      let target = obj;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!target[pathParts[i]]) {
          target[pathParts[i]] = {};
        }
        target = target[pathParts[i]];
      }
      
      target[pathParts[pathParts.length - 1]] = value;
    };

    // Helper function to process file mapping
    const processFileMapping = (req: any, fields: any, files: any) => {
      if (!fields.map) return;
      
      const map = JSON.parse(fields.map);
      logger.debug('File mapping debug:', { 
        map, 
        fileKeys: Object.keys(files),
        mapKeys: Object.keys(map)
      });
      
      for (const [key, paths] of Object.entries(map)) {
        logger.debug(`Processing map entry: ${key} -> ${JSON.stringify(paths)}`);
        
        let fileToUse = files[key];
        
        // If the expected key doesn't exist, try to find the file by other means
        if (!fileToUse) {
          logger.warn(`File with key '${key}' not found. Available keys:`, Object.keys(files));
          
          // Try to use the first available file as a fallback
          const availableKeys = Object.keys(files);
          if (availableKeys.length > 0) {
            const fallbackKey = availableKeys[0];
            fileToUse = files[fallbackKey];
            logger.info(`Using fallback file with key '${fallbackKey}' for map key '${key}'`);
          } else {
            logger.error('No files available for mapping');
            continue;
          }
        }
        
        const filePaths = Array.isArray(paths) ? paths : [paths];
        filePaths.forEach((path: string) => {
          const fileObject = {
            filename: fileToUse.filename,
            mimetype: fileToUse.mimeType,
            encoding: fileToUse.encoding,
            buffer: fileToUse.buffer,
            createReadStream: () => createFileStream(fileToUse.buffer),
            // Add additional properties that GraphQL Upload scalar might expect
            fieldName: key,
            originalName: fileToUse.filename,
            size: fileToUse.buffer.length
          };
          
          logger.debug(`Setting file at path: ${path}`, { 
            filename: fileObject.filename,
            mimetype: fileObject.mimetype,
            size: fileObject.size
          });
          setNestedProperty(req.body, path, fileObject);
        });
      }
    };

    // Custom multipart handler using busboy
    const multipartHandler = (req: any, res: any, next: any) => {
      if (!req.headers['content-type']?.includes('multipart/form-data')) {
        next();
        return;
      }

      const bb = busboy({ headers: req.headers });
      const fields: any = {};
      const files: any = {};
      
      bb.on('field', (name, val) => {
        fields[name] = val;
      });
      
      bb.on('file', (name, file, info) => {
        const { filename, encoding, mimeType } = info;
        const chunks: any[] = [];
        
        file.on('data', (data: any) => {
          chunks.push(data);
        });
        
        file.on('end', () => {
          files[name] = {
            filename,
            encoding,
            mimeType,
            buffer: Buffer.concat(chunks)
          };
        });
      });
      
      bb.on('finish', () => {
        try {
          logger.debug('Multipart request received:', {
            fields: Object.keys(fields),
            files: Object.keys(files),
            operations: fields.operations ? 'present' : 'missing',
            map: fields.map ? 'present' : 'missing'
          });

          // Parse GraphQL operation from 'operations' field
          if (fields.operations) {
            req.body = JSON.parse(fields.operations);
            logger.debug('Parsed GraphQL operation:', {
              query: req.body.query ? 'present' : 'missing',
              variables: req.body.variables || 'none'
            });
          }
          
          // Process file mapping
          processFileMapping(req, fields, files);
          
          // Debug the final request body
          logger.debug('Final request body after file mapping:', {
            hasQuery: !!req.body.query,
            hasVariables: !!req.body.variables,
            variableKeys: req.body.variables ? Object.keys(req.body.variables) : [],
            fileVariable: req.body.variables?.file ? {
              hasFilename: !!req.body.variables.file.filename,
              hasMimetype: !!req.body.variables.file.mimetype,
              hasCreateReadStream: typeof req.body.variables.file.createReadStream === 'function'
            } : 'not present'
          });
          
          req.files = files;
          next();
        } catch (error) {
          logger.error('Error parsing multipart GraphQL request:', error);
          res.status(400).json({ error: 'Invalid multipart GraphQL request' });
        }
      });
      
      req.pipe(bb);
    };

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
      throw schemaError;
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
        // Handle file uploads FIRST - this processes multipart/form-data
        multipartHandler,
        // Then handle other body types
        bodyParser.urlencoded({ extended: true }),
        bodyParser.json({
          limit: process.env.MAX_FILE_UPLOAD || '20mb',
        }),
        // Then authenticate
        passport.authenticate(['jwt'], 
        { session: false }),
        // Finally process GraphQL
        expressMiddleware(apolloServer, {
          context: async ({ req, res }: ExpressContextFunctionArgument) => {
            //@ts-ignore
            const _req = req as Reactory.Server.ReactoryExpressRequest;            
            if(!_req.context) _req.context = await ReactoryContextProvider(null,{});
            return _req.context;
            },
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