
'use strict';

import { Reactory } from '@reactory/server-core/types/reactory';
import { ObjectId } from 'mongodb';
import moment, { isMoment } from 'moment';
import { execml, execql } from '@reactory/server-core/graph/client';
import iz from '@reactory/server-core/utils/validators';
import { MutationResult, IUserImportStruct } from './types';

class UserFileImportProcessGeneral implements Reactory.IProcessor {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  fileService: Reactory.Service.IReactoryFileService = null;

  clazz: string = "UserFileImportProcessGeneral";

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  mutate = async (mutation: string, variables: any = {}): Promise<MutationResult> => {
    try {
      const { data, errors = [] } = await execml(mutation, variables, {}, this.context.user, this.context.partner).then();
      return {
        data,
        errors: errors.map((e) => e.message)
      }
    } catch (mutationError) {
      return {
        data: null,
        errors: [mutationError.message]
      }
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
    const { processors = [], offset = 0, file, import_package, process_index, next, input = [], preview = false } = params;
    const that = this;

    const colors = that.context.colors;

    let output: IUserImportStruct[] = [];

    input.forEach((row_data: string[], rid: number) => {
      /**
        Employee #, Preferred Name, Last Name, Work Email, Gender, Birth Date, Position/Level, Region, Legal entity, Department, Functional Team
        
        0 EA003 
        1 Tochukwu,
        2 Iwuora,
        3 tochukwu@entersekt.com,
        4 Male
        5 23 Apr 1985, ==> DOB
        6 Professional => Position
        7 Lagos, ==> Region
        8 Entersekt Africa Ltd, ==> Legal Entity
        9 Commercial, ==> Business Unit
        10 Customer Success ==> team

        
       */

      const dob = () => {
        try {
          if (row_data[5]) {
            let m = moment(row_data[5])
            if (m.isValid() === true) {
              return m.toDate()
            }
            debugger
            return new Date()
          }
        } catch (e) {
          return new Date()
        }
      }


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
          lastName: row_data[2],
          email: iz.email(row_data[3]) === true ? row_data[3] : `ERR_EMAIL_${row_data[3]}`,
          businessUnit: row_data[10],
          authProvider: "REACTORY"
        },



        demographics: {
          gender: row_data[4],
          dob: dob(),
          region: row_data[7],
          businessUnit: row_data[9],
          position: row_data[6],
          jobTitle: row_data[6],
          team: row_data[10],
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


    const promises = output.map((import_struct: IUserImportStruct, index: number) => {

      return new Promise((resolve) => {

        that.context.log(colors.debug(`Starting Mutation #${index} for user ${import_struct.user.email}`), {}, 'debug', 'UserGeneralProcessor');
        if (preview === false && import_struct.user.email.indexOf('ERR') < 0) {
          const variables: any = { input: import_struct.user, organizationId: import_package.organization._id };
          delete variables.input.id;

          that.mutate(create_user_mutation, variables).then((result) => {

            import_struct.onboarding_result = result;

            if (import_struct.onboarding_result.errors && import_struct.onboarding_result.errors.length > 0) {
              that.context.log(colors.warn(`Mutation #${index} for user ${import_struct.user.email} contains errors`), { errors: import_struct.onboarding_result.errors }, 'warning');
              import_struct.user.id = 'ERROR'
            } else {
              if (import_struct.onboarding_result.data.createUser && import_struct.onboarding_result.data.createUser.id) {
                import_struct.user.id = import_struct.onboarding_result.data.createUser.id;
              } else {

                import_struct.errors.push(`Error while creating / updating the user ${import_struct.user.email}`);
              }
            }

            resolve(import_struct);
          }).catch((err) => {
            that.context.log(colors.error(`Error processing import ${err.message}`), { error: err }, 'error', 'UserGeneralProcessor')
            import_struct.errors.push(`Error while creating / updating the user ${import_struct.user.email} ${err.message}`);

            resolve(import_struct);
          });

        } else {
          import_struct.user.id = 'PREVIEW_ID'
          resolve(import_struct);
        }
        
      });
    })

    output = await Promise.all(promises).then();

    //create promises 

    that.context.log(`Processed all general data`, {}, 'debug', 'UserGeneralProcessor')

    //3. update processor state and hand off to next processor

    debugger

    let $next: Reactory.IProcessor = null;
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
      that.context.log(`Executing next processor in execution chain`, {}, 'debug', 'UserGeneralProcessor');
      output = await $next.process({ 
        input: output, 
        file, 
        import_package, 
        processors,
        next: processors.length >= process_index + 1 ? processors[process_index + 1] : null,
        process_index: process_index + 1
       }).then();
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
