import express from 'express';
import passport from 'passport';
import bodyParser from 'body-parser';

const router: express.IRouter = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: false
});

router.use('/',
  passport.authenticate(['jwt', 'anonymous'], { session: false }),
  bodyParser.urlencoded({ extended: true }),
  express.static(process.env.APP_DATA_ROOT));

export default router;