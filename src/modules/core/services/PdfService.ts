import { Reactory } from '@reactory/server-core/types/reactory';
//@ts-ignore
import PdfPrinter from 'pdfmake/src/printer';

//const PdfPrinter = require('pdfmake/src/printer');

const {
  APP_SYSTEM_FONTS,
  APP_DATA_ROOT,
} = process.env;


class PdfService implements Reactory.Service.IReactoryPdfService {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.IReactoryContext

  props: Reactory.IReactoryServiceProps

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.props = props;
    this.context = context;
  }


  createPdfBinary(definition: any, stream: WritableStream) {
    this.context.log('Generating PDF')

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

    const printer = new PdfPrinter(fontDescriptors);
    const tableLayouts = definition.tableLayouts || {};
    const doc = printer.createPdfKitDocument(definition, { tableLayouts });
    
    if(!stream) {
      this.context.$response.set({
        'Content-Disposition': `${this.context.$request.query.view || 'attachment'}; filename="${definition.filename}"`,
        'Content-Type': 'application/pdf',
      });
      doc.pipe(this.context.$response);
    } else {
      doc.pipe(stream);
    }
    
    doc.end();
  }

  generate(definition: any, stream: any): Promise<any> {
    this.createPdfBinary(definition, stream);
    return Promise.resolve(true);
  }

  pdfDefinitions(): Reactory.IReactoryPdfComponent {
    throw new Error('Method not implemented.');
  }

  onStartup(): Promise<boolean> {
    this.context.log(`PdfService ${this.context.colors.green('STARTUP OKAY')}`)
    return Promise.resolve(true);
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  static reactory: Reactory.IReactoryServiceDefinition = {
    id: 'core.PdfService@1.0.0',
    name: 'PDF Rendering Service',
    description: 'A basic PDF rendering service that will render PDFs using PDF make',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new PdfService(props, context);
    },
    dependencies: [

    ]
  }
}

export default PdfService;