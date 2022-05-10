import * as dotenv from 'dotenv';
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';
import Reactory from '@reactory/reactory-core';

import express from 'express';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import ejs from 'ejs';
import PDFDocument from 'pdfkit';
import { PNG } from 'pngjs';
import imageType from 'image-type';
import { isArray } from 'util';
import _, { find } from 'lodash';
import ApiError, { RecordNotFoundError } from '../exceptions';
import { forInStatement } from 'babel-types';
import ReactoryContext from '@reactory/server-core/apollo/ReactoryContextProvider';

const pdfmake = require('pdfmake/build/pdfmake');
const PdfPrinter = require('pdfmake/src/printer');

dotenv.config();
// import { isNil, isEmpty } from 'lodash';
// import ApiError, { UserExistsError, UserValidationError, OrganizationExistsError, UserNotFoundException, SystemError } from '../exceptions';

const {
  APP_SYSTEM_FONTS,
  APP_DATA_ROOT,
} = process.env;


const PdfComponents: Reactory.IReactoryPdfComponent[] = [];
modules.enabled.forEach((installedModule: Reactory.Server.IReactoryModule) => {
  try {
    if (installedModule.pdfs) {
      logger.debug(`♻ Adding PDF Report Generators for ${installedModule.name}`);
      installedModule.pdfs.forEach((pdfDef) => {
        PdfComponents.push(pdfDef);
      });
      logger.debug(`✔ Adding PDF Report Generators for ${installedModule.name} Done`);
    }
  } catch (moduleLoadError) {
    logger.error(`Could not load one or more PDF Generators for module ${installedModule.name}`);
  }
});


function createPdfBinary(pdfDoc, res, req) {
  logger.debug('createdPdfBinary called');

  const fontDescriptors = {
    Roboto: {
      normal: `${APP_DATA_ROOT}/fonts/verdana.ttf`,
      bold: `${APP_DATA_ROOT}/fonts/verdanab.ttf`,
      italics: `${APP_DATA_ROOT}/fonts/verdanai.ttf`,
      bolditalics: `${APP_DATA_ROOT}/fonts/verdanaz.ttf`,
    },
    Verdana: {
      normal: `${APP_DATA_ROOT}/fonts/verdana.ttf`,
      bold: `${APP_DATA_ROOT}/fonts/verdanab.ttf`,
      italics: `${APP_DATA_ROOT}/fonts/verdanai.ttf`,
      bolditalics: `${APP_DATA_ROOT}/fonts/verdanaz.ttf`,
    },
    Candara: {
      normal: `${APP_SYSTEM_FONTS}/Candara.ttf`,
      bold: `${APP_SYSTEM_FONTS}/Candarab.ttf`,
      italics: `${APP_SYSTEM_FONTS}/Candarai.ttf`,
      bolditalics: `${APP_SYSTEM_FONTS}/Candaraz.ttf`,
    },
  };

  logger.debug('Loading font descriptions', fontDescriptors);
  const printer = new PdfPrinter(fontDescriptors);
  const tableLayouts = pdfDoc.tableLayouts || {};
  const doc = printer.createPdfKitDocument(pdfDoc, { tableLayouts });
  res.set({
    'Content-Disposition': `${req.query.view || 'attachment'}; filename="${pdfDoc.filename}"`,
    'Content-Type': 'application/pdf',
  });
  doc.pipe(res);
  doc.end();
}

const pdfpng = (path) => {
  let buffer = readFileSync(path);
  const { mime } = imageType(buffer);
  if (mime === 'image/png') {
    const png = PNG.sync.read(buffer);
    if (png.interlace) {
      buffer = PNG.sync.write(png, { interlace: false });
    }
    return buffer;
  }

  return path;
};

/**
 * Shortcut to register serveral fonts with the document
 * @param {*} pdf document
 * @param {*} fonts
 */
const registerFonts = (pdf, fonts = []) => {
  if (pdf && _.isFunction(pdf.registerFont) && _.isArray(fonts)) {
    fonts.forEach((font) => {
      if (font.name && font.src && font.family && existsSync(font.src) === true) { pdf.registerFont(font.name, font.src, font.family); } else logger.warn(`Could not load font ${font.name || 'NO NAME!'}(${font.family || 'NO FONT FAMILY'})\tsrc: ${font.src || 'NO SOURCE'}`);
    });
  }
};


const renderTemplate = (template, properties = {}) => {
  logger.debug(`Rendering template ${template.view || template.name} - props`, Object.getOwnPropertyNames(properties));
  if (template && typeof template.content === 'string') {
    if (template.content.toString().indexOf('$ref://') === 0) {
      const filename = `${APP_DATA_ROOT}/pdf/reports/${template.content.replace('$ref://', '')}`;
      logger.info(`Loading template filename: ${filename}`);
      if (existsSync(filename)) {
        try {
          const templateString = readFileSync(filename).toString('utf8');
          return ejs.render(templateString, properties);
        } catch (renderErr) {
          logger.error('::TEMPLATE RENDER ERROR::', { renderErr });
          throw renderErr;
        }
      }
      throw new RecordNotFoundError('Filename for template not found', 'TEMPLATE_REF');
    } else {
      return ejs.render(template.content, properties);
    }
  }
  throw new ApiError(`Invalid type for template.content, expected string, but got ${typeof template.content}`);
};

const generate = async (props: any, res: any, usepdfkit = false, req: any) => {
  logger.info(`Generating Report ${props.definition.name || 'unnamed report'}`);
  const { data, definition } = props;
  const { partner, user } = req;
  // Create a document

  ;

  if (_.isFunction(definition.content) === true && usepdfkit === false) {
    try {
      const pdfdef = await definition.content(data, partner, user);
      createPdfBinary(pdfdef, res, req);
      logger.debug('Generating Report Using PDFMake');
    } catch (error) {
      logger.error('Error generating PDF details', error);
      res.status(503).send(error.message);
    }
  } else {
    logger.error('Generating Document using PDFkit --- DEPRECATE');
    const doc = new PDFDocument();

    if (definition.props.fonts) {
      registerFonts(doc, definition.props.fonts);
    }
    // Pipe its output somewhere, like to a file or HTTP response
    // See below for browser usage
    doc.pipe(res);
    const partnerLogo = `${partner.themeOptions.assets.logo.replace(process.env.CDN_ROOT, `${process.env.APP_DATA_ROOT}/`)}`;
    logger.info(`Partner logo resolved to: ${partnerLogo}`, definition);

    if (props.debug === true) {
      doc.font('courier')
        .fontSize(12)
        .text(JSON.stringify(props, 1));
    }


    const { elements } = definition;

    if (isArray(elements) === true) {
      logger.debug(`Document has ${elements.length} page definitions`);
      for (let pageIndex = 0; pageIndex < elements.length; pageIndex += 1) {
        logger.debug(`Generating Page ${pageIndex}`);
        const pageDefinition = elements[pageIndex];
        if (pageIndex > 0) {
          logger.debug('Adding new page', { pageIndex });
          let pageOptions = {};
          if (pageDefinition.props && pageDefinition.props.pageOptions) {
            pageOptions = { ...pageDefinition.props.pageOptions };
          }
          doc.addPage(pageOptions);
        }

        if (pageDefinition.elements && isArray(pageDefinition.elements) === true) {
          for (let contentIndex = 0; contentIndex < pageDefinition.elements.length; contentIndex += 1) {
            const contentElement = pageDefinition.elements[contentIndex];
            const templateProps = {
              __meta: {
                pageIndex,
                contentIndex,
                format: contentElement.format,
              },
              partner,
              context: {
                user,
                partner,
                env: process.env,
                doc, // some inception shit
              },
              data,
            };

            logger.debug(`Adding element: [${contentIndex}] to page: [${pageIndex}]`);
            const _props = contentElement.props;

            switch (contentElement.format) {
              case 'text': {
                let textOptions = {
                  lineGap: 5,
                };

                if (_.isObject(_props.options) === true) {
                  textOptions = _.merge(textOptions, _props.options);
                }

                doc.fillColor(ejs.render(_props.fillColor || 'black', templateProps))
                  .fontSize(_props.fontSize || 12)
                  .text(renderTemplate(
                    contentElement,
                    templateProps,
                  ), _props.x, _props.y);
                break;
              }
              case 'image': {
                let imagePath;
                logger.info(`Resolving image for ${contentElement.content}`, _props);
                try {
                  if (Object.getOwnPropertyNames(_props).indexOf('imagePath') >= 0) {
                    logger.debug(`Using props.imagePath to resolve image ${contentElement.props.imagePath}`);
                    imagePath = ejs.render(contentElement.props.imagePath, templateProps).trim();
                  } else if (typeof contentElement.content === 'string') {
                    logger.debug('Using contentElement.content to resolve image');
                    imagePath(renderTemplate(contentElement, templateProps).trim());
                  }
                  logger.debug(`Image path resolved to: ${imagePath}`);
                  if (typeof imagePath === 'string' && existsSync(imagePath) === true) {
                    logger.debug('Image exists');

                    doc.image(pdfpng(imagePath), _props.x, _props.y, {
                      height: _props.height || 120,
                      width: _props.width || undefined,
                      align: _props.align || 'center',
                      valign: _props.align || 'center',
                    });
                  } else {
                    doc.text(`Image: ${imagePath} does not exist`);
                  }
                } catch (imagePathResolveError) {
                  doc.text(`image could not be added ${imagePath} due to error ${imagePathResolveError.message}`);
                }
                break;
              }
              default: {
                doc.text(`IMAGE: ${renderTemplate(contentElement, templateProps)}`);
              }
            }
          }
        }
      }
    }

    doc.end();
  }
};

const router = express.Router();
router.options('/', (req, res) => {
  res.status(203).send('');
});

router.post('/:nameSpace/:name', async (req: any, res: any) => {

  let reportPdfComponent: Reactory.IReactoryPdfComponent = find(PdfComponents, { nameSpace: req.params.nameSpace, name: req.params.name });

  if (reportPdfComponent && reportPdfComponent.component) {
    try {
      generate({ data: { ...req.params, ...req.body }, definition: reportPdfComponent.component, debug: true }, res, false, req);
    } catch (pdfError) {
      logger.debug(`Error Generating The PDF ${pdfError.message}`, { pdfError })
      res.status(503).send(new ApiError(pdfError.message, pdfError));
    }
  } else {
    res.status(404).send(new RecordNotFoundError(`The report ${req.params.report}, was not found, please make sure you specified the correct report name`));
  }

});

router.get('/:nameSpace/:name', async (req, res) => {
  // const reportPath = `./reports/${req.params.nameSpace || 'core'}/${req.params.report || 'api-status'}.js`;


  let reportPdfComponent: Reactory.IReactoryPdfComponent = find(PdfComponents, { nameSpace: req.params.nameSpace, name: req.params.name });

  if (reportPdfComponent && reportPdfComponent.component) {
    try {
      debugger
      const context = await ReactoryContext(null, { user: req.user, partner: req.partner });
      const resolvedData = await reportPdfComponent.component.resolver(req.query, context).then();
      generate({ data: resolvedData, definition: reportPdfComponent.component }, res, false, req);
    } catch (pdfError) {
      logger.debug(`Error Generating The PDF ${pdfError.message}`, { pdfError });
      res.status(503).send(new ApiError(pdfError.message, pdfError));
    }
  } else {

    res.status(404).send(new RecordNotFoundError(`The report ${req.params.nameSpace}.${req.params.name}, was not found, please make sure you specified the correct report name`));
  }

});

router.get('/', (req: any, res) => {
  logger.info('Running GET for /pdf/');
  // return a test pdf page with instructions on how to use the api
  const { partner } = req;
  // Create a document
  const doc = new PDFDocument();

  // Pipe its output somewhere, like to a file or HTTP response
  // See below for browser usage
  doc.pipe(res);

  const partnerLogo = `${partner.themeOptions.assets.logo.replace(process.env.CDN_ROOT, `${process.env.APP_DATA_ROOT}/`)}`;
  logger.info(`Partner logo resolved to: ${partnerLogo}`);

  doc.image(pdfpng(partnerLogo), 160, 30, {
    height: 130,
    align: 'center',
    valign: 'center',
  });
  // Embed a font, set the font size, and render some text
  doc.fontSize(25)
    .text('Welcome to the PDF Lab', 100, 200);


  doc.fontSize(10).text('This endpoint supports POST only, pass your request /pdf/:nameSpace/:name/:?version');
  // Finalize PDF file
  doc.end();
});

export default router;
