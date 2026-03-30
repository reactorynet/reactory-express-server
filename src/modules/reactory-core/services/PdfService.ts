import Reactory from '@reactorynet/reactory-core';

/**
 * @deprecated Use pdf-manager.PdfService@1.0.0 from the reactory-pdf-manager module instead.
 * This service is kept for backward compatibility and delegates to the new PdfService.
 */
class PdfService implements Partial<Reactory.Service.IReactoryPdfService> {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  private getNewService(): Reactory.Service.IReactoryPdfService {
    return this.context.getService('pdf-manager.PdfService@1.0.0') as Reactory.Service.IReactoryPdfService;
  }

  async generate(definition: any, stream?: any): Promise<any> {
    this.context.log('core.PdfService is deprecated - delegating to pdf-manager.PdfService', 'warn');
    const newService = this.getNewService();
    return newService.generate(definition, stream);
  }

  onStartup(): Promise<void> {
    this.context.log('core.PdfService is deprecated. Use pdf-manager.PdfService@1.0.0 instead.', 'warn');
    return Promise.resolve();
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition<PdfService> = {
    id: 'core.PdfService@1.0.0',
    nameSpace: 'core',
    name: 'PdfService',
    version: '1.0.0',
    serviceType: 'pdf',
    description: '@deprecated - Use pdf-manager.PdfService@1.0.0 instead',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext): PdfService => {
      return new PdfService(props, context);
    },
    dependencies: [],
  };
}

export default PdfService;
