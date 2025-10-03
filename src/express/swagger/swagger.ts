
import path from 'path';
import fs from 'fs';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import ReactoryModules from '@reactory/server-core/modules';
import yaml from 'js-yaml';
import logger from '@reactory/server-core/logging';

const apis: string[] = [];
const ext = process.env.NODE_ENV === 'development' ? 'ts' : 'js';
let schemas: any = {};
let components: any = {};
let paths: any = {};
let securitySchemes: any = {};
let parameters: any = {
  'x-client-key': {
    in: 'header',
    name: 'x-client-key',
    required: true,
    schema: {
      type: 'string',
    },
    description: 'Client / Tenant key'      
  },
  'x-client-pwd': {
    in: 'header',
    name: 'x-client-pwd',
    required: true,
    schema: {
      type: 'string',
    },
    description: 'Client / Tenant Password'      
  },
}

const getFiles = (dir: string): string[] => { 
  const files: fs.Dirent[] = fs.readdirSync(dir, { 
    withFileTypes: true,
    encoding: 'utf-8' 
  });
  
  logger.info(`Found ${files.length} files in ${dir}`);
  const returnFiles: string[] = [];
  files.forEach((file: fs.Dirent) => {
    const filepath = path.join(dir, file.name);
    if(file.isDirectory()) {
      logger.info(`Found directory: ${file.name}`);
      returnFiles.push(...getFiles(filepath));
    } else {
      if (file.name.endsWith(ext)) {
        returnFiles.push(filepath);
      } else if (filepath.endsWith('schema.json')) {
        logger.info(`Found schema file: ${filepath}`); 
        let schemaText = "";
        try {
          // read the schema file and add it to the schemas object            
          try {
            schemaText = fs.readFileSync(filepath).toString();            
          } catch (fileReadError) {
            logger.error(`Error reading schema file: ${filepath}`, fileReadError);
          }
          const schema = JSON.parse(schemaText);
          // get the file name without the extension and path
          const name = file.name.split('/').pop().split('.').shift();
          // add the schema to the schemas object
          schemas[name] = schema;     
        } catch (schemaError) { 
          logger.error(`Error parsing schema file: ${filepath} \n ${schemaText}`, schemaError);
        }
      } else if (/swag\.ya?ml$|swagger\.ya?ml$/.test(filepath)) {
        logger.info(`Found swagger file: ${filepath}`);
        let content = "";
        try {
          content = fs.readFileSync(filepath).toString();
        } catch (error) {
          logger.error(`Error reading swagger file: ${filepath}`, error);
        }
        if (content != "") {          
          try {
            const configItem: any = yaml.load(content, { json: true, schema: yaml.JSON_SCHEMA });
            if (configItem?.paths) {
              paths = { ...paths, ...configItem.paths };
            }
            if (configItem?.schemas) {
              schemas = { ...schemas, ...configItem.schemas };
            }
            if (configItem?.securitySchemes) {
              securitySchemes = { ...securitySchemes, ...configItem?.securitySchemes }
            } 
          } catch (yamlError) {
            logger.error(`Error parsing swagger file: ${filepath} \n ${content}`, yamlError);
          }
        }
      }
    }
  });

  return returnFiles;
};

ReactoryModules.enabled.forEach((module) => { 
  if(module.routes && Object.keys(module.routes).length > 0) {
    Object.keys(module.routes).forEach((route) => {
      // Get the root path of the module
      const rootPath = path.resolve(`./${process.env.APPLICATION_ROOT || 'src'}/modules/` + module.id + '/routes/');
      if (!fs.existsSync(rootPath)) {
        logger.error(`Path ${rootPath} does not exist`);
        return;
      }
      // get all the files in the routes directory and subdirectories
      apis.push(...getFiles(rootPath));
    });
  }
});


// Define Swagger options
export const swaggerOptions: swaggerJSDoc.Options = {
  swaggerDefinition: {
    openapi: '3.0.0', // Specify the OpenAPI version
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: `API documentation for ${process.env.SERVER_ID}`,
    },
    tags: [
      {
        name: 'API',
        description: 'API documentation',
        externalDocs: {
          url: 'https://swagger.io',
          description: 'Find more info here',
        }
      },
    ],
    servers: [
      {
        url: process.env.API_URI_ROOT || 'http://localhost:4000',
      },
    ],
    paths,
    components: {
      parameters,
      schemas,
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // Optional: Specifies the format for the bearer token
          description: 'Enter your Bearer token in the format `Bearer <token>`',
        },
        ...securitySchemes
      },
    }
  },
  apis
};

// Initialize swagger-jsdoc
export const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const SwaggerUi = swaggerUi;
