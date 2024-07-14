import logger from '@reactory/server-core/logging';
import express from 'express';

const ReactoryErrorHandler = (err: Error, req: Express.Request, res: Response, next: Function) => { 
  logger.error(`Express Error Handler`, { err: req });
  // @ts-ignore
  if (res.headersSent === true) {
    return next(err)
  }
  // @ts-ignore
  res.status(500);
  // @ts-ignore
  res.render('error', { error: err })
};

export default ReactoryErrorHandler;