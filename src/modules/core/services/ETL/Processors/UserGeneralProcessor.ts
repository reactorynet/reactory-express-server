
'use strict';

import { Reactory } from '@reactory/server-core/types/reactory';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { execml, execql } from '@reactory/server-core/graph/client';
import iz from '@reactory/server-core/utils/validators';

interface ITimelineEntry {
  when: Date,
  text: string
}


interface IStepResult {
  success: boolean,
  message: string
}

interface IUserImportStruct {
  rid: number,
  row_data: string[],
  validated: boolean,
  processed: boolean,
  errors: string[],
  action_taken: string | "ADDED" | "UPDATED" | "DISABLED",

  timeline: ITimelineEntry[],

  onboarding_promise: Promise<any>,
  onboarding_result?: {
    data?: {
      createUser?: {
        id: string,
        firstName: string,
        lastName: string,
        email: string
      }
    },
    errors?: any[]
  },

  demographic_promise: Promise<any>,
  demographic_result?: {
    data?: {
      userDemographics?: {
        id: string
        gender: string
        dob: Date,
        position: string,
        jobTitle: string
      }
    }
  },

  disable_promise: Promise<any>,
  disable_promise_result?: IStepResult,

  user: {
    id?: string,
    firstName: string,
    lastName: string,
    email: string,
    businessUnit?: string
    avatar?: string
    authProvider: string | "reactory" | "microsoft" | "google" | "facebook" | "linkedin"
  },

  demographics: {
    gender: string,
    dob?: Date,
    region?: string,
    businessUnit?: string,
    position?: string,
    jobTitle?: string
  }
  [key: string]: any
}

interface MutationResult { data?: any, errors?: string[] };

class UserFileImportProcessGeneral implements Reactory.IProcessor {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  fileService: Reactory.Service.IReactoryFileService = null;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  mutate = async (mutation: string, variables: any = {}): Promise<MutationResult> => {
    const { data, errors } = await execml(mutation, variables, {}, this.context.user, this.context.partner).then();
    debugger;
    return {
      data,
      errors: errors.map((e) => e.message)
    }
  };

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }

  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this.fileService = fileService;
  }



  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any, nextProcessor?: Reactory.IProcessor): Promise<any> {
    debugger
    const { processors = [], offset = 0, file, import_package, process_index, next, input = [], preview = false } = params;
    const that = this;

    let output: IUserImportStruct[] = [];

    input.forEach((row_data: string[], rid: number) => {
      /**
        Employee #,First Name,Preferred Name,Last Name,email address,Gender,Birth Date,Job Title,Reporting to,Position/Level,Region,Legal entity,Department
        
        0 => EA003, 1 => Tochukwu, 2 =>  Tochukwu, 3 => Iwuora, 4 => tochukwu@entersekt.com, 5=> Male, 6 => 23-Apr-85, 7=> Pre-sales Solutions Lead, 8 => Mzukisi Rusi, 9 => Professional, 10 => Lagos, 11 => Entersekt Africa Ltd,CSO Team
        
        F0011,Anneri,Anneri,Nieuwoudt,anneri@entersekt.com,Female,28-Jun-85,Finance Manager,Dian Gerber,Professional,Stellenbosch,Entersekt (Pty) Ltd,Finance and Legal
        GER002,Melanie,Melanie,Maier,melanie@entersekt.com,Female,04-Oct-88,Director Channel Partnerships Europe,Frans Labuschagne,Professional,Munich,Entersekt Europe Coöperatief U.A.,CSO Team
        ITL004,Willem,Tom,de Waal,tom@entersekt.com,Male,08-Dec-62,Senior Solutions Architect,Simon Rodway,Professional,Utrecht,Entersekt Europe Coöperatief U.A.,CSO Team
        ITL006,Frans,Frans,Labuschagne,frans@entersekt.com,Male,26-Dec-66,Country Manager: UK & Ireland,Dewald Nolte,Senior Management,London,Entersekt Europe Coöperatief U.A.,CSO Team
        ITL008,Janine,Janine,Willems,janine@entersekt.com,Female,23-Oct-82,Key Accounts Manager,Frans Labuschagne,Professional,Utrecht,Entersekt Europe Coöperatief U.A.,CSO Team
       */



      const user_entry: IUserImportStruct = {
        rid,
        row_data: row_data,
        validated: false,
        processed: false,
        action_taken: null,
        errors: [],
        timeline: [
          { when: new Date(), text: `Initial destructuring of data` },
        ],

        onboarding_promise: null,
        onboarding_result: null,

        demographic_promise: null,
        demographic_result: null,

        disable_promise: null,
        disable_promise_result: null,

        user: {
          id: null,
          firstName: row_data[1],
          lastName: row_data[3],
          email: iz.email(row_data[4]) === true ? row_data[4] : `ERR_${row_data[4]}`,
          businessUnit: row_data[11],
          authProvider: "REACTORY"
        },

        demographics: {
          gender: row_data[5],
          dob: moment(row_data[6]).toDate(),
          region: row_data[10],
          businessUnit: row_data[11],
          position: row_data[9],
          jobTitle: row_data[7]
        }

      };

      output.push(user_entry);
    });

    const create_user_mutation = `
  mutation CreateUserMutation($input: CreateUserInput!, $organizationId: String!){
    createUser(input: $input, organizationId: $organizationId){
      id
      firstName
      lastName
      email
    }
  }
`;

    output.forEach(async (import_struct: IUserImportStruct, index: number) => {
      try {
        that.context.log(`Preparing Mutation #${index} for user ${import_struct.user.email}`);
        if (preview === false) {
          const variables: any = { input: import_struct.user, organizationId: import_package.organization._id };
          delete variables.input.id;
          import_struct.onboarding_result = await this.mutate(create_user_mutation, variables).then();
          debugger
          
          if (import_struct.onboarding_result.data.createUser && import_struct.onboarding_result.data.createUser.id) {
            import_struct.user.id = import_struct.onboarding_result.data.createUser.id;
          } else {
            import_struct.errors.push(`Error while creating / updating the user ${import_struct.user.email}`);
          }
        } else {
          import_struct.user.id = 'PREVIEW_ID'
        }
      } catch (mutationError) {
        debugger
        that.context.log(`Error processing import ${mutationError.message}`, { error: mutationError }, 'error', 'UserGeneralProcessor')
        import_struct.errors.push(`Error while creating / updating the user ${import_struct.user.email} ${mutationError.message}`);
      }
    });

    //create promises 

    //3. update processor state and hand off to next processor

    let $next: Reactory.IProcessor = null;
    debugger
    if (nextProcessor && nextProcessor.process) {
      $next = nextProcessor;
    }

    if ($next === null && next && next.serviceFqn) {
      $next = this.context.getService(next.serviceFqn);
    }

    if ($next === null && processors.length > process_index + 1) {
      $next = this.context.getService(processors[process_index + 1].serviceFqn);
    }

    if ($next !== null && $next.process) {
      output = await $next.process({ input: output, file, import_package, process_index: process_index + 1 }).then();
    }

    return output;
  }


  static reactory = {
    id: 'core.UserFileImportProcessGeneral@1.0.0',
    name: 'Reactory User File Import General Information',
    description: 'Reactory Service for importing the general information.',
    dependencies: ['core.ReactoryFileService@1.0.0'],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserFileImportProcessGeneral(props, context);
    }
  }

}

export default UserFileImportProcessGeneral;
