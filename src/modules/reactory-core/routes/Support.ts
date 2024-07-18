import express from 'express';

const router: express.IRouter = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: false
});

router.get('/support', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { 
  res.redirect('/support/tickets');
});

router.get('/support/tickets', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { 
  req.accepts('html') ? res.render('support/tickets') : res.json({ message: 'Tickets' });
});

router.get('/support/tickets/:id', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

router.post('/support/tickets', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

router.put('/support/tickets/:id', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

router.delete('/support/tickets/:id', (req: Reactory.Server.ReactoryExpressRequest, res: express.Response) => { });

export default router;