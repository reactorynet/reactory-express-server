import logger from '@reactory/server-core/logging';
import Reactory from '@reactorynet/reactory-core';
import express from 'express';
import ApiError, { RecordNotFoundError } from '../exceptions';
import { ReactoryContext } from '@reactory/server-core/context';

const router = express.Router();

router.options('/', (req, res) => {
  res.status(203).send('');
});

/**
 * Generate a PDF from a registered component using POST data.
 */
router.post('/:nameSpace/:name', async (req: any, res: any) => {
  try {
    const context = await ReactoryContext(null, { user: req.user, partner: req.partner });
    const pdfService = context.getService<Reactory.Service.IReactoryPdfService>('pdf-manager.PdfService@1.0.0');
    const component = pdfService.getComponent(req.params.nameSpace, req.params.name);

    if (!component || !component.component) {
      res.status(404).send(
        new RecordNotFoundError(
          `PDF component ${req.params.nameSpace}.${req.params.name} not found`,
        )
      );
      return;
    }

    const data = { ...req.params, ...req.body };
    const definition = await component.component.content(data, context);
    await pdfService.generateToResponse(definition);
  } catch (err) {
    logger.error(`Error generating PDF: ${err.message}`, { error: err });
    res.status(503).send(new ApiError(err.message, err));
  }
});

/**
 * Generate a PDF from a registered component using query parameters.
 * The component's resolver is called first to fetch data.
 */
router.get('/:nameSpace/:name', async (req: any, res: any) => {
  try {
    const context = await ReactoryContext(null, { user: req.user, partner: req.partner });
    const pdfService = context.getService<Reactory.Service.IReactoryPdfService>('pdf-manager.PdfService@1.0.0');
    const component = pdfService.getComponent(req.params.nameSpace, req.params.name);

    if (!component || !component.component) {
      res.status(404).send(
        new RecordNotFoundError(
          `PDF component ${req.params.nameSpace}.${req.params.name} not found`,
        )
      );
      return;
    }

    let data = req.query;
    if (component.component.resolver) {
      data = await component.component.resolver(req.query, context);
    }

    const definition = await component.component.content(data, context);
    await pdfService.generateToResponse(definition);
  } catch (err) {
    logger.error(`Error generating PDF: ${err.message}`, { error: err });
    res.status(503).send(new ApiError(err.message, err));
  }
});

/**
 * Status endpoint listing available PDF components.
 */
router.get('/', async (req: any, res: any) => {
  try {
    const context = await ReactoryContext(null, { user: req.user, partner: req.partner });
    const pdfService = context.getService<Reactory.Service.IReactoryPdfService>('pdf-manager.PdfService@1.0.0');
    const components = pdfService.getRegisteredComponents();

    res.json({
      status: 'ok',
      message: 'PDF API - POST or GET to /pdf/:nameSpace/:name to generate a PDF',
      components: components.map(c => ({
        nameSpace: c.nameSpace,
        name: c.name,
        version: c.version,
        description: c.component.description,
        enabled: c.component.enabled,
      })),
    });
  } catch (err) {
    logger.error(`Error listing PDF components: ${err.message}`, { error: err });
    res.status(503).send(new ApiError(err.message, err));
  }
});

export default router;
