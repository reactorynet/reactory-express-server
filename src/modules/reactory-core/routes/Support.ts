import { registerDefaultScheme } from '@grpc/grpc-js/build/src/resolver';
import express from 'express';
import passport from 'passport';

const router: express.IRouter = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: false
});

router.get('/', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { 
  res.redirect('/tickets');
});

/**
 * Retrieve a list of support tickets. 
 */
router.get('/tickets', 
  passport.authenticate('jwt', {session: false}),
    async (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { 
  const accepts = req.header('Accept') || 'html';
  
  const { 
    page = 1,
    limit = 10,
    sort = 'asc',
    status    
  } = req.params as unknown as {
    page: number,
    limit: number,
    sort: 'asc' | 'desc',
    status: 'all' | 'open' | 'closed' | 'pending' | 'resolved'
  };

  const { getService } = req.context;
  const supportService: Reactory.Service.TReactorySupportService = getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
  const result = await supportService.pagedRequest({
  }, {
    page: page,
    pageSize: limit
  }).then();

  switch (accepts) { 
    case 'html':
    case 'text/html':
    case 'application/html':
    case 'application/xhtml':
      res.render('support/tickets', { 
        tickets: result.tickets, 
        paging: result.paging 
      });
      break;
    case 'application/json':
    case 'application/json-patch+json':
    case 'application/vnd.api+json':
    case 'json':
      res.json({ 
        tickets: result.tickets, 
        paging: result.paging 
      });
      break;
    case 'text':
    case 'text/plain':
    case 'text/*':
      res.send('Tickets');
      break;
    default:
      res.status(406).send('Not Acceptable');
      break;
  }
});

router.get('/tickets/:id', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

router.post('/tickets', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

router.put('/tickets/:id', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

router.delete('/tickets/:id', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

export default router;