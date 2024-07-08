'use strict';
import Reactory from '@reactory/reactory-core';
import { MutationResult, QueryResult, IUserImportStruct } from './types';
import { execml, execql } from '@reactory/server-core/graph/client';
import { BusinessUnit, UserDemographic, Region, Team } from '@reactory/server-modules/core/models'
import Demographic from '@reactory/server-modules/core/models/demographics/Demographic';
import { find } from 'lodash';
import e from 'connect-flash';


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

class UserDemographicsProcessor implements Reactory.Service.IProcessor {

  context: Reactory.Server.IReactoryContext;

  name: string = "UserDemographicsProcessor";
  nameSpace: string = "core";
  version: string = "1.0.0";

  props: any;

  fileService: Reactory.Service.IReactoryFileService;
  packageManager: Reactory.IReactoryImportPackageManager;
  organizationService: Reactory.Service.IReactoryOrganizationService;
  userService: Reactory.Service.IReactoryUserService;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.props = props;
    this.fileService = props.$dependencies.fileService;
    this.organizationService = props.$dependencies.organizationService;
    this.userService = props.$dependencies.userService;
    this.packageManager = props.packman;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
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
  async process(params: Reactory.Models.IProcessorParams, nextProcessor?: Reactory.Service.IProcessor): Promise<any> {

    const { offset = 0, file, import_package, process_index = 0, next, input = [], preview = false, processors = [] } = params;
    const that = this;
    const colors = that.context.colors;
    let output: any[] = [...input];



    const { organization } = import_package;


    const all_regions: Reactory.IRegionDocument[] = await Region.find({ organization: organization._id }).then();
    const all_demographics: Reactory.IDemographicDocument[] = await Demographic.find({ organization: organization._id }).then();
    const all_business_units: Reactory.IBusinessUnitDocument[] = await BusinessUnit.find({ organization: organization._id }).then();
    const all_teams: Reactory.ITeamDocument[] = await Team.find({ organization: organization._id }).then();

    async function* synchronizeBusinessUnits() {
      for (let i: number = 0; i < output.length; i++) {
        const import_struct: IUserImportStruct = output[i];
        const { demographics } = import_struct;
        if (preview === false) {
          let $business_unit = null;// await that.organizationService.findBusinessUnit(organization._id, demographics.businessUnit);
          $business_unit = find(all_business_units, { name: demographics.businessUnit.trim() })

          if ($business_unit === null || $business_unit === undefined) {
            that.context.log(`Business unit ${demographics.businessUnit} not found creating new entry`, {}, 'debug', 'UserDemographicsProcessor');
            $business_unit = await that.organizationService.createBusinessUnit(organization._id, demographics.businessUnit.trim());  
            all_business_units.push($business_unit);
          } else {
            that.context.log(`Business unit ${demographics.businessUnit} found`, {}, 'debug', 'UserDemographicsProcessor')
          }
          
          if($business_unit._id) {
            demographics.businessUnit = $business_unit._id;
          }                       
          yield $business_unit;          
        } else {
          yield `Not synchronizing ${demographics.businessUnit}`;
        }
      }
      return;
    }

    for await (const $business_unit of synchronizeBusinessUnits()) {
      if (typeof $business_unit === "string") {
        that.context.log($business_unit, {}, 'debug');
      } else {
        if ($business_unit.name) that.context.log(`sycnchronized business unit ${$business_unit.name}`, {}, 'debug');
      }
    }


    async function* synchronizeTeams() {
      for (let i: number = 0; i < output.length; i++) {
        const import_struct: IUserImportStruct = output[i];
        const { demographics } = import_struct;
        if (preview === false) {
          let $team = null;
          //await that.organizationService.findTeam(organization._id, demographics.team);
          $team = find(all_teams, (t) =>  t.name.trim() === demographics.team.trim() )
          if ($team === null || $team === undefined) {
            that.context.log(`Team ${demographics.team} not found creating new entry`, {}, 'debug, "UserDemographicsProcessior');
            $team = await that.organizationService.createTeam(organization._id, demographics.team.trim());
            all_teams.push($team);
          }
          
          if($team._id) demographics.team = $team._id;

          yield $team;
          
        } else {
          yield `Not synchronizing ${import_struct.demographics.team}`;
        }
      }

      return;
    }

    for await (const $team of synchronizeTeams()) {
      if (typeof $team === "string") {
        that.context.log($team, {}, 'debug');
      } else {
        if ($team.name) that.context.log(`sycnchronized team ${$team.name}`, {}, 'debug');
      }
    }


    async function* synchronizeGenders() {

      for (let i: number = 0; i < output.length; i++) {
        const import_struct: IUserImportStruct = output[i];
        const { demographics } = import_struct;
        if (preview === false && demographics.gender) {

          let $gender = find(all_demographics, { type: 'gender', key: demographics.gender.toLowerCase() });
          

          if ($gender === null || $gender === undefined) {
            $gender = new Demographic({
              organization: organization,
              type: 'gender',
              key: demographics.gender.toLowerCase(),
              title: demographics.gender,
            });

            await $gender.save().then()

            all_demographics.push($gender);
          }

          
          if ($gender._id) demographics.gender = $gender._id;

          yield $gender;
        } else {
          yield `Not synchronizing GENDER: ${demographics.gender || "NONE AVAILABLE"}`;
        }
      }
    }

    for await (const $genders of synchronizeGenders()) {
      if (typeof $genders === "string") {
        that.context.log($genders, {}, 'debug');
      } else {
        if ($genders.title) that.context.log(`sycnchronized gender ${$genders.title}`, {}, 'debug');
      }
    }

    async function* synchronizeRace() {

      for (let i: number = 0; i < output.length; i++) {
        const import_struct: IUserImportStruct = output[i];
        const { demographics } = import_struct;
        if (preview === false && demographics.race) {

          let $race = find(all_demographics, { type: 'race', key: demographics.race.toLowerCase() });
          if ($race === null || $race === undefined) {
            $race = new Demographic({
              organization: organization,
              type: 'race',
              key: demographics.race.toLowerCase(),
              title: demographics.race,
            });

            await $race.save().then()

            all_demographics.push($race);                        

          } 
          
          if($race && $race._id) demographics.race = $race._id;
          
          yield $race;


        } else {
          yield `Not synchronizing RACE: ${demographics.race}`;
        }
      }

    }

    for await (const $race of synchronizeRace()) {
      if (typeof $race === "string") {
        that.context.log($race, {}, 'debug');
      } else {
        if ($race.title) that.context.log(`Synchronized race ${$race.title}`, {}, 'debug');
      }
    }

    async function* synchronizePosition() {
      for (let i: number = 0; i < output.length; i++) {
        const import_struct: IUserImportStruct = output[i];
        const { demographics } = import_struct;
        if (preview === false && demographics.position) {

          let $position = find(all_demographics, { type: 'position', key: demographics.position.toLowerCase() });
          if ($position === null || $position === undefined) {
            $position = new Demographic({
              organization: organization,
              type: 'position',
              key: demographics.position.toLowerCase(),
              title: demographics.position,
            });

            await $position.save().then()

            all_demographics.push($position);

          }

          if($position && $position._id) demographics.position = $position._id

          yield $position;
        } else {
          yield `Not synchronizing POSITION: ${demographics.position}`;
        }
      }
    }

    for await (const $position of synchronizePosition()) {
      if (typeof $position === "string") {
        that.context.log($position, {}, 'debug');
      } else {
        if ($position.title) that.context.log(`Sycchronized position ${$position.title}`, {}, 'debug');
      }
    }


    async function* synchronizeOperationalGroup() {      
      for (let i: number = 0; i < output.length; i++) {
        const import_struct: IUserImportStruct = output[i];
        const { demographics } = import_struct;
        if (preview === false && demographics.operationalGroup) {
          let $operationalGroup = find(all_demographics, (e) => e.type === 'operationalgroup' && e.key === demographics.operationalGroup.toLowerCase() );
          if ($operationalGroup === null || $operationalGroup === undefined) {
            $operationalGroup = new Demographic({
              organization: organization,
              type: 'operationalgroup',
              key: demographics.operationalGroup.toLowerCase(),
              title: demographics.operationalGroup,
            });

            await $operationalGroup.save().then()

            all_demographics.push($operationalGroup);

            
          }           
          if ($operationalGroup && $operationalGroup._id) demographics.operationalGroup = $operationalGroup._id
          yield $operationalGroup;
        } else {
          yield `Not synchronizing Operational Group: ${demographics.operationalGroup || "NONE DEFINED"}`;
        }
      }
    }

    for await (const $operationalGroup of synchronizeOperationalGroup()) {
      if (typeof $operationalGroup === "string") {
        that.context.log($operationalGroup, {}, 'debug');
      } else {
        if ($operationalGroup.title) that.context.log(`Synchronized operational group ${$operationalGroup.title}`, {}, 'debug');
      }
    }


    async function* synchronizeRegions() {
      for (let i: number = 0; i < output.length; i++) {
        const import_struct: IUserImportStruct = output[i];
        const { demographics } = import_struct;
        if (preview === false && demographics.region) {
          const key = `${demographics.region.toLowerCase().trim()}::${organization._id}`;
          let $region: Reactory.IRegionDocument = find(all_regions, (r) =>  r.key === key);
          if ($region === null || $region === undefined) {
            $region = new Region({
              organization: organization._id,
              key: key,
              title: demographics.region,
            });

            await $region.save().then()

            all_regions.push($region);            
          } 

          if ($region && $region._id) demographics.region = $region._id

          yield $region;

        } else {
          yield `Not synchronizing RACE: ${demographics.race || "NOT DEFINED"}`;
        }
      }
    }

    for await (const $regions of synchronizeRegions()) {
      if (typeof $regions === "string") {
        that.context.log($regions, {}, 'debug');
      } else {
        if ($regions) that.context.log(`Synchronized region ${$regions.title}`, {}, 'debug');
      }
    }


    let new_output = [];

    async function* synchronizeDemographics() {
      for (let i: number = 0; i < output.length; i++) {

        const import_struct: IUserImportStruct = output[i];

        if (preview === false && import_struct.user.email.indexOf('ERR') < 0) {

          const variables = {
            userId: import_struct.user.id,
            organisationId: import_package.organization._id,
            dob: import_struct.demographics.dob,
            gender: import_struct.demographics.gender,
            race: import_struct.demographics.race,
            region: import_struct.demographics.region,
            position: import_struct.demographics.position,
            operationalGroup: import_struct.demographics.operationalGroup,
            team: import_struct.demographics.team,
            businessUnit: import_struct.demographics.businessUnit
          };

          that.context.log(colors.debug(`Updating User Demograhics #${i} for user ${import_struct.user.email}`), {}, 'debug', 'UserDemographicsProcessor');          

          try {

            //@ts-ignore
            const result: Reactory.IUserDemographicDocument = await that.userService.setUserDemographics(
              variables.userId,
              variables.organisationId,
              null,
              variables.dob,
              variables.businessUnit,
              variables.gender,
              variables.operationalGroup,
              variables.position,
              variables.race,
              variables.region,
              variables.team
            );  // await that.mutate(SetUserDemographicsMutation, variables);

            //@ts-ignore
            import_struct.demographic_result = { data: { MoresUpdateUserDemographic: result }, errors: [] };

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

            setTimeout(function* () {
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

    let $next: Reactory.Service.IProcessor = this.packageManager.getNextProcessor();

    output = new_output;

    if ($next !== null && $next.process) {
      output = await $next.process({ input: output, file, import_package, process_index: process_index + 1 }).then();
    }

    return output;

  }


  static dependencies: ['core.ReactoryFileService@1.0.0'];
  static reactory = {
    id: 'core.UserFileImportProcessDemographics@1.0.0',
    nameSpace: 'core',
    name: 'UserFileImportProcessDemographics',
    version: '1.0.0',
    description: 'Reactory Service for importing demographics.',
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' },
      { id: "core.OrganizationService@1.0.0", alias: 'organizationService' },
      { id: "core.UserService@1.0.0", alias: 'userService' }
    ],
    serviceType: 'data',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
      return new UserDemographicsProcessor(props, context);
    }
  };
}

export default UserDemographicsProcessor;