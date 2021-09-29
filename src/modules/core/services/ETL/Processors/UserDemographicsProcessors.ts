'use strict';
import { Reactory } from '@reactory/server-core/types/reactory';
import { MutationResult, QueryResult, IUserImportStruct } from './types';
import { execml, execql } from '@reactory/server-core/graph/client';
import { forEach } from 'lodash';



const OrganizationDemographicsEnabledQuery = `query MoresGetOrgnizationDemographicsSetting($id: String!){
      MoresGetOrganizationDemographicsSetting(id: $id) {
        age
        gender
        race
        position
        region
        operationalGroup
        businessUnit
        teams
      }
    }`;

const SetUserDemographicsMutation = `mutation MoresUpdateUserDemographic($input: UserDemographicInput!) {
  MoresUpdateUserDemographic(input: $input) {
    user {
      id      
    }
    organization {
      id
      name
    }
    businessUnit {
      id
      name
    }
    team {
      id
      title
    }
    age 
    ageGroup {
      id
      title
      ageStart
      ageEnd
    }
    race {
      id
      title
    }
    gender {
      id
      title
    }
    position {
      id
      title
    }
    operationalGroup {
      id
      title
    }
  }
}`;

class UserDemographicsProcessor implements Reactory.IProcessor {

  context: Reactory.IReactoryContext;

  name: string = "UserDemographicsProcessor";
  nameSpace: string = "core";
  version: string = "1.0.0";

  props: any;

  fileService: Reactory.Service.IReactoryFileService;
  packageManager: Reactory.IReactoryImportPackageManager;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
    this.fileService = props.$dependencies.fileService
    this.packageManager = props.packman;
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }


  mutate = async (mutation: string, variables: any = {}): Promise<MutationResult> => {
    try {
      const { data, errors = [] } = await execml(mutation, variables, {}, this.context.user, this.context.partner).then();
      if (errors.length > 0) {
        this.context.log(`Errors in mutation or document`, { errors }, 'error', 'UserDemographicsProcessor')
      }
      return {
        data,
        errors: errors.map((e) => e.message)
      }
    } catch (mutationError) {
      this.context.log(`Error with mutaation`, { error: mutationError }, 'error', 'UserDemographicsProcessor')
      return {
        data: null,
        errors: [mutationError.message]
      }
    }

  };

  query = async (query: string, variables: any = {}): Promise<QueryResult> => {
    try {
      const { data, errors = [] } = await execql(query, variables, { fetchPolicy: 'network-only' }, this.context.user, this.context.partner).then();
      return {
        data,
        errors: errors.map(e => e.message)
      }
    } catch (e) {
      return {
        data: null,
        errors: [e.message]
      }
    }
  }

  getOrganizationDemographics = async (organization_id: string): Promise<QueryResult> => {

    return await this.query(OrganizationDemographicsEnabledQuery, { id: organization_id }).then();
  }

  /**
   * 
   * @param params - paramters can include row offset
   */
  async process(params: Reactory.IProcessorParams, nextProcessor?: Reactory.IProcessor): Promise<any> {

    const { offset = 0, file, import_package, process_index = 0, next, input = [], preview = false, processors = [] } = params;
    const that = this;
    const colors = that.context.colors;
    let output: any[] = [...input];



    let new_output = [];

    async function* synchronizeDemographics() {
      for (let i: number = 0; i < output.length; i++) {

        const import_struct: IUserImportStruct = output[i];

        if (preview === false && import_struct.user.email.indexOf('ERR') < 0) {

          const variables: any = {
            input: {
              userId: import_struct.user.id,
              organisationId: import_package.organization._id,
              dob: import_struct.demographics.dob,
              gender: import_struct.demographics.gender,
              race: import_struct.demographics.race,
              region: import_struct.demographics.region,
              operationalGroup: import_struct.demographics.operationalGroup,
              team: import_struct.demographics.team,
              businessUnit: import_struct.demographics.businessUnit
            }
          };

          that.context.log(colors.debug(`Preparing Mutation #${i} for user ${import_struct.user.email}`), {}, 'debug', 'UserDemographicsProcessor');
          try {
            const result = await that.mutate(SetUserDemographicsMutation, variables);

            import_struct.demographic_result = result;

            if (import_struct.demographic_result.errors && import_struct.demographic_result.errors.length > 0) {
              that.context.log(colors.warn(`Mutation #${i} for user ${import_struct.user.email} contains errors`), { errors: import_struct.demographic_result.errors }, 'warning');
              import_struct.demographics.id = 'ERROR'
            } else {
              if (import_struct.demographic_result.data.MoresUpdateUserDemographic) {
                that.context.log(colors.green(`Mutation for demographics for user ${import_struct.user.email} OKAY`));
              } else {
                import_struct.errors.push(`Error while processing user demographic data ${import_struct.user.email}`);
              }
            }

            setTimeout(function* (){
              yield import_struct;
            }, 100)
                        
          } catch (err) {
            import_struct.demographic_result = {
              errors: [err]
            }
            yield import_struct;
          }
        }
      }

      return;
    }

    for await (const user_import of synchronizeDemographics()) {
      new_output.push(user_import);
    }

    let $next: Reactory.IProcessor = this.packageManager.getNextProcessor();

    output = new_output;

    if ($next !== null && $next.process) {
      output = await $next.process({ input: output, file, import_package, process_index: process_index + 1 }).then();
    }

    return output;

  }


  static dependencies: ['core.ReactoryFileService@1.0.0'];
  static reactory = {
    id: 'core.UserFileImportProcessDemographics@1.0.0',
    name: 'Reactory User File Import Demographics',
    description: 'Reactory Service for importing demographics.',
    dependencies: [{ id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserDemographicsProcessor(props, context);
    }
  };
}

export default UserDemographicsProcessor;