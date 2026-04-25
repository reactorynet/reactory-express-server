import Express from 'express';
import http from 'http';
import logger from '@reactory/server-core/logging';
import FileSSEEndpoints from '@reactory/server-modules/reactory-core/routes/FileSSEEndpoints';

const FileSSEMiddleware = async (
  app: Express.Application,
  _httpServer: http.Server,
) => {
  try {
    FileSSEEndpoints.setupRoutes(app);
    logger.info('[FileSSEMiddleware] File SSE routes registered');
  } catch (err: any) {
    logger.error(`[FileSSEMiddleware] Failed to register File SSE routes: ${err?.message}`);
  }
};

const FileSSEMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  nameSpace: 'core',
  name: 'FileSSEMiddleware',
  version: '1.0.0',
  description: 'Registers SSE endpoints for the <File /> live editor.',
  component: FileSSEMiddleware,
  ordinal: 20,
  type: 'configuration',
  async: true,
};

export default FileSSEMiddlewareDefinition;
