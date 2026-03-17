import express from 'express';
import passport from 'passport';
import bodyParser from 'body-parser';
import os from 'os';
import path from 'path';

const router: express.IRouter = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: false
});


// [DESKTOP OVERRIDE]: Serve local home folder files if requested via CDN
router.use('/profiles/:userId/home', (req, res, next) => {
  if (process.env.IS_DESKTOP_INSTALL === "true") {
    const desktopRoot = process.env.REACTOR_DESKTOP_ROOT ? path.join(os.homedir(), process.env.REACTOR_DESKTOP_ROOT) : os.homedir();
    const rootFolder = process.env.REACTOR_HOME_PATH || desktopRoot;
    
    // req.path will be the remainder of the URL after '/profiles/:userId/home'
    // e.g. if original URL is '/cdn/profiles/123/home/Desktop/file.txt', req.path is '/Desktop/file.txt'
    express.static(rootFolder)(req, res, next);
  } else {
    next();
  }
});

router.use('/',
  passport.authenticate(['jwt', 'anonymous'], { session: false }),
  bodyParser.urlencoded({ extended: true }),
  express.static(process.env.APP_DATA_ROOT));

export default router;