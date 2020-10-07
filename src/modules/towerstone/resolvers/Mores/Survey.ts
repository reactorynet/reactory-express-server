import moment, { Moment } from 'moment';
import co from 'co';
import lodash from 'lodash';
import Admin from '@reactory/server-core/application/admin';
import { queueSurveyEmails } from '@reactory/server-core/emails';
import {
  LeadershipBrand,
  Organization,
  User,
  Survey,
  Assessment,
  Notification,
  Organigram,
  Template,
} from '@reactory/server-core/models';
import { ObjectId } from 'mongodb';
import ApiError, { RecordNotFoundError } from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';
import {
  launchSurveyForDelegate,
  sendSurveyEmail,
  EmailTypesForSurvey,
  sendSurveyClosed
} from '@reactory/server-core/application/admin/Survey';
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone';
import { TowerStoneServicesMap } from "@reactory/server-modules/towerstone/services";
import LeadershipBrandFactory from '@reactory/server-modules/towerstone/data/Mores/LeadershipBrandFactory';
import { Model } from 'mongoose';

interface MoresAssessmentsCreateInput {
  title: string,  
  organizationId: ObjectId,
  surveyType: string | 'l360' | 'i360' | 'culture' | 'team180',
  startDate?: Moment,
  endDate?: Moment 
}

interface MoresAssessmentsDeleteSurveyInput {
  id: string | ObjectId,
  hard: boolean
}

const MoresAssessmentSurveyResolver = {

  Query: {

  },
  Mutation: {
    MoresAssessmentsPatchGeneratedLeadershipBrand: async (obj: any, args: any, info: any): Promise<TowerStone.ILeadershipBrand> => {
      const { moresLeadershipPatchArgs } = args;
      const { leadershipbrand_id, survey_type } = moresLeadershipPatchArgs;
      
      let brand: TowerStone.ILeadershipBrand = await LeadershipBrand.findById(leadershipbrand_id).then()


      return await LeadershipBrandFactory(brand.organization, survey_type , true).then();
    }, 
    MoresUpdateQuestionLibrary: async (obj: any, args: any, info: any): Promise<TowerStone.ISimpleResponse> => {

      const survey_types = ['i360', 'l360', 'team180', 'culture'];
      const { organization_id } = args;

      if(!organization_id) {
        return {
          success: false,
          message: 'No organization id provided',
        }
      }

      const organization = await Organization.findById( organization_id ).then();

      if(!organization) {
        return {
          success: false,
          message: 'No organization found with that id',
        }
      }


      await LeadershipBrandFactory(organization._id, 'i360' , true).then();
      await LeadershipBrandFactory(organization._id, 'l360' , true).then();
      await LeadershipBrandFactory(organization._id, 'team180' , true).then();
      await LeadershipBrandFactory(organization._id, 'culture' , true).then();

      return {
        success: true,
        message: `Mores Question Library Has been updated for ${organization.name}`, 
      };
    },
    MoresAssessementsCreateSurvey: async (obj: any, args: any, context: any, info: any): Promise<TowerStone.ISurveyDocument> => {
      
      const moresSurveyCreateArgs: MoresAssessmentsCreateInput  = args.moresSurveyCreateArgs;

      let surveyItem: TowerStone.ISurveyDocument = new Survey(moresSurveyCreateArgs) as TowerStone.ISurveyDocument;
      surveyItem.leadershipBrand = await LeadershipBrandFactory(moresSurveyCreateArgs.organizationId, moresSurveyCreateArgs.surveyType, true).then();
      surveyItem.startDate = moment().startOf('day').toDate()
      surveyItem.endDate = moment().add(1, 'month').endOf('day').toDate();
      surveyItem.status = 'new';
      surveyItem.mode = 'test';
      surveyItem.organization = await Organization.findById(moresSurveyCreateArgs.organizationId).then();
      await surveyItem.save().then();

      return surveyItem;
    },
    MoresAssessmentsDeleteSurvey: async (obj: any, args: any, context: any, info: any): Promise<TowerStone.ISurveyDocument> => {
      let surveyItem: TowerStone.ISurveyDocument = await Survey.findById(args.id as string).then() as TowerStone.ISurveyDocument;
      
      if(surveyItem) { 
        if(args.hard === true) {
          surveyItem.status = 'hard-deleted'
          surveyItem.remove();
        } else {
          surveyItem.status = 'soft-deleted'
          surveyItem.save().then()
        }
      } else {
        throw new RecordNotFoundError(`Could not locate the survey with the id ${args.id}`, 'Survey')
      }   

      return surveyItem
    }
  }
};


export default MoresAssessmentSurveyResolver;



