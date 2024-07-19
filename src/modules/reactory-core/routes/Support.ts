import { count } from 'console';
import express from 'express';

const router: express.IRouter = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: false
});

router.get('/', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { 
  res.redirect('/tickets');
});

router.get('/tickets', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { 
  const accepts = req.header('Accept') || 'html';
  
  const { 
    page = 1,
    limit = 10,
    sort = 'asc',
    filter = 'all'    
  } = req.params;

  const { getService } = req.context;
  const tickets: Reactory.Models.IReactorySupportTicket[] = [];

  switch (accepts) { 
    case 'html':
    case 'text/html':
    case 'application/html':
    case 'application/xhtml':
      res.render('support/tickets', { tickets, page, limit, sort, filter });
      break;
    case 'application/json':
    case 'application/json-patch+json':
    case 'application/vnd.api+json':
    case 'json':
      res.json({ tickets, page, pages: Math.ceil(tickets.length / limit), limit, sort, filter });
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