import rollup from 'rollup';


/**
 * This middleware is used to compile / load files from the folder where it is specified and provide 
 * a compiled version of the virtual file.
 * @param req 
 * @param res 
 * @param next 
 */
const ReactoryVirtualsMiddleware = (req: any, res: any, next: Function) => {  

  let bypass = false;
  if (req.originalUrl && req.originalUrl.toString().indexOf('/cdn/__virtuals__/')) {
    
  } else {
    if(next) {
      next();
    }
    return;
  }
  
}