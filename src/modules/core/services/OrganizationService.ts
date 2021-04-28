import { existsSync, mkdirSync, writeFileSync } from 'fs';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { Reactory } from '@reactory/server-core/types/reactory';
import Organization from '@reactory/server-core/models/schema/Organization';
import { OrganizationNotFoundError } from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';

class OrganizationService implements Reactory.Service.IReactoryOrganizationService {

  name: string = 'OrganizationService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  executionContext: Reactory.IReactoryContext;

  constructor(props: any, context: any) {
    this.executionContext = context;
  }

  async updateOrganizationLogo(organization: Reactory.IOrganizationDocument, imageData: string): Promise<Reactory.IOrganizationDocument> {
    try {

      const {
        APP_DATA_ROOT,
      } = process.env;

      const isPng = imageData.startsWith('data:image/png');
      const buffer = Buffer.from(imageData.split(/,\s*/)[1], 'base64');
      if (!existsSync(`${APP_DATA_ROOT}/organization`)) mkdirSync(`${APP_DATA_ROOT}/organization`);
      const path = `${APP_DATA_ROOT}/organization/${organization._id}/`;

      if (!existsSync(path)) mkdirSync(path);
      const filename = `${APP_DATA_ROOT}/organization/${organization._id}/logo_${organization._id}_default.${isPng === true ? 'png' : 'jpeg'}`;

      // if (isPng === true) {
      //  logger.info(`Converting logo for ${organization} from png to jpg`);
      //  pngToJpeg({ quality: 70 })(buffer).then(output => writeFileSync(filename, output));
      // } else writeFileSync(filename, buffer);

      writeFileSync(filename, buffer);
      return organization

    } catch (organizationLogoUpdate) {
      return organization;
    }
  }

  async setOrganization(id: string, updates: { name?: string; code?: string; color?: string; logo?: string; }): Promise<Reactory.IOrganizationDocument> {
    const _id = new ObjectId(id);
    const exists = await Organization.count({ _id }).then() === 1;

    if (exists === false) throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`);

    let organization: Reactory.IOrganizationDocument = await Organization.findById(_id).then();
    const inputData = {
      name: updates.name || organization.name,
      code: updates.code || organization.code,
    };

    if (updates.color) {
      organization.setSetting('color', { primary: updates.color, secondary: updates.color }, 'core.MaterialThemeColorPicker');
    }

    if (organization && organization._id) {
      organization.code = inputData.code;
      organization.name = inputData.name;

      if (updates.logo) {
        try {
          organization = await this.updateOrganizationLogo(organization, updates.logo);
        } catch (logoError) {
          logger.warn('Could not update the organization logo');
        }
      }
      organization.createdAt = organization.createdAt || moment().valueOf();
      organization.updatedAt = moment().valueOf();
      await organization.save().then();

      return organization;
    }
  }

  uploadOrganizationImage(id: string, file: Reactory.Service.FileUploadArgs, imageType: string): Promise<Reactory.IOrganizationDocument> {
    throw new Error('Method not implemented.');


    /*
      export const updateOrganizationLogo = (organization, imageData) => {
        try {
          const isPng = imageData.startsWith('data:image/png');
          const buffer = Buffer.from(imageData.split(/,\s*<<REMOVE>>/)[1], 'base64');
          if (!existsSync(`${APP_DATA_ROOT}/organization`)) mkdirSync(`${APP_DATA_ROOT}/organization`);
          const path = `${APP_DATA_ROOT}/organization/${organization._id}/`;
 
          if (!existsSync(path)) mkdirSync(path);
          const filename = `${APP_DATA_ROOT}/organization/${organization._id}/logo_${organization._id}_default.${isPng === true ? 'png' : 'jpeg'}`;
 
          // if (isPng === true) {
          //  logger.info(`Converting logo for ${organization} from png to jpg`);
          //  pngToJpeg({ quality: 70 })(buffer).then(output => writeFileSync(filename, output));
          // } else writeFileSync(filename, buffer);
 
          writeFileSync(filename, buffer);
          return `logo_${organization._id}_default.${isPng === true ? 'png' : 'jpeg'}`;
        } catch(organizationLogoUpdate) {
          logger.error('Could not update the company logo', organizationLogoUpdate);
          return null;
        }
      };
    */
  }

  get(id: string): Promise<Reactory.IOrganizationDocument> {
    throw new Error('Method not implemented.');
  }

  onStartup(): Promise<boolean> {
    // nothing to do
    logger.debug(`Core OrganizationService started 🟢`)
    return Promise.resolve(true);
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.executionContext;
  }

  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.executionContext = executionContext;
    return true;
  }
}

export const ReactoryOrganizationServiceDefinition: Reactory.IReactoryServiceDefinition = {
  id: 'core.OrganizationService@1.0.0',
  name: 'Reactory Organization',
  description: 'Default Organization Service.',
  dependencies: [],
  serviceType: 'Reactory.Service.IReactoryOrganizationService',
  service: (props: Reactory.IReactoryServiceProps, context: any) => {
    return new OrganizationService(props, context);
  }
}

export default ReactoryOrganizationServiceDefinition