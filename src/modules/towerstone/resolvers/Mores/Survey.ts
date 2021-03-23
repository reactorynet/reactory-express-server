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
import { Reactory } from '@reactory/server-core/types/reactory';
import { EVENTS_TO_TRACK } from 'modules/towerstone/models/Survey';

interface MoresAssessmentsSurveyCreateInput {
  title: string,
  organizationId: ObjectId,
  surveyType: string | 'l360' | 'i360' | 'culture' | 'team180',
  delegateTeamName?: string,
  assessorTeamName?: string,
  startDate?: Moment,
  endDate?: Moment,
  status?: string,
  mode?: string,
};

interface MoresAssessmentsSurveyUpdateInput {
  title?: string,
  startDate?: Date,
  endDate?: Date,
  status?: string,
  mode?: string,
  delegateTeamName?: string,
  assessorTeamName?: string,
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


      return await LeadershipBrandFactory(brand.organization, survey_type, true).then();
    },
    MoresUpdateQuestionLibrary: async (obj: any, args: any, info: any): Promise<TowerStone.ISimpleResponse> => {

      const survey_types = ['i360', 'l360', 'team180', 'culture'];
      const { organization_id } = args;

      if (!organization_id) {
        return {
          success: false,
          message: 'No organization id provided',
        }
      }

      const organization = await Organization.findById(organization_id).then();

      if (!organization) {
        return {
          success: false,
          message: 'No organization found with that id',
        }
      }


      await LeadershipBrandFactory(organization._id, 'i360', true).then();
      await LeadershipBrandFactory(organization._id, 'l360', true).then();
      await LeadershipBrandFactory(organization._id, 'team180', true).then();
      await LeadershipBrandFactory(organization._id, 'culture', true).then();

      return {
        success: true,
        message: `Mores Question Library Has been updated for ${organization.name}`,
      };
    },
    MoresAssessementsCreateSurvey: async (obj: any, args: any, context: Reactory.IReactoryContext, info: any): Promise<TowerStone.ISurveyDocument> => {

      debugger
      const moresSurveyCreateArgs: MoresAssessmentsSurveyCreateInput = args.moresSurveyCreateArgs;

      let surveyItem: TowerStone.ISurveyDocument = new Survey(moresSurveyCreateArgs) as TowerStone.ISurveyDocument;
      surveyItem.leadershipBrand = await LeadershipBrandFactory(moresSurveyCreateArgs.organizationId, moresSurveyCreateArgs.surveyType, true, context.user).then();
      surveyItem.startDate = moment(moresSurveyCreateArgs.startDate).startOf('day').valueOf()
      surveyItem.endDate = moment(moresSurveyCreateArgs.endDate).add(1, 'month').endOf('day').valueOf();
      surveyItem.status = 'new';
      surveyItem.mode = 'test';
      surveyItem.organization = await Organization.findById(moresSurveyCreateArgs.organizationId).then();

      await surveyItem.addTimelineEntry(EVENTS_TO_TRACK.SURVEY_UDPDATED, `Survey "${surveyItem.title}" created`, context.user.id, true).then();

      return surveyItem;
    },
    MoresAssessmentsUpdateSurvey: async (obj: any, args: { id: string, surveyData: MoresAssessmentsSurveyUpdateInput }, context: Reactory.IReactoryContext, info: any): Promise<TowerStone.ISurveyDocument> => {
      const { surveyData, id } = args;

      let event_detail_message = '';

      let surveyItem: TowerStone.ISurveyDocument = await Survey.findById(id).then();

      let isDirty = false;

      if (surveyItem.title !== surveyData.title) {
        event_detail_message = `${event_detail_message}Title changed from ${surveyItem.title} to ${surveyData.title}\n`;
        surveyItem.title = surveyData.title;
        isDirty = true;
      }

      if (surveyItem.delegateTeamName !== surveyData.delegateTeamName) {
        event_detail_message = `${event_detail_message}Delegate Team Name changed from ${surveyItem.delegateTeamName} to ${surveyData.delegateTeamName}\n`;
        surveyItem.delegateTeamName = surveyData.delegateTeamName;
        isDirty = true;
      }

      if (surveyItem.assessorTeamName !== surveyData.assessorTeamName) {
        event_detail_message = `${event_detail_message}Assessor Team Name changed from ${surveyItem.assessorTeamName} to ${surveyData.assessorTeamName}\n`;
        surveyItem.assessorTeamName = surveyData.assessorTeamName;
        isDirty = true;
      }

      if (surveyData.startDate && moment(surveyItem.startDate).isSame(moment(surveyData.startDate)) === false) {
        event_detail_message = `${event_detail_message}Start date changed from ${moment(surveyItem.startDate).format('YYYY/MM/DD')} to ${moment(surveyData.startDate).format('YYYY/MM/DD')}\n`;
        surveyItem.startDate = moment(surveyData.startDate || surveyItem.startDate).startOf('day').valueOf();
        isDirty = true;
      }

      if (surveyData.endDate && moment(surveyItem.endDate).isSame(moment(surveyData.endDate)) === false) {
        event_detail_message = `${event_detail_message}End date changed from ${moment(surveyItem.endDate).format('YYYY/MM/DD')} to ${moment(surveyData.endDate).format('YYYY/MM/DD')}\n`;
        surveyItem.endDate = moment(surveyData.endDate || surveyItem.endDate).endOf('day').valueOf();
        isDirty = true;
      }

      if (surveyData.status !== surveyItem.status) {
        event_detail_message = `${event_detail_message}Status changed from ${surveyItem.status} to ${surveyData.status}\n`
        surveyItem.status = surveyData.status || surveyItem.status;
        isDirty = true;
      }

      if (surveyData.mode !== surveyItem.mode) {
        event_detail_message = `${event_detail_message}Mode changed from ${surveyItem.mode} to ${surveyData.mode}\n`
        surveyItem.mode = surveyData.mode || surveyItem.mode;
        isDirty = true;
      }

      if (isDirty === true) {
        surveyItem.addTimelineEntry(EVENTS_TO_TRACK.SURVEY_UDPDATED, event_detail_message, context.user.id, true);
      }

      return surveyItem;
    },
    MoresAssessmentsDeleteSurvey: async (obj: any, args: any, context: any, info: any): Promise<TowerStone.ISurveyDocument> => {
      let surveyItem: TowerStone.ISurveyDocument = await Survey.findById(args.id as string).then() as TowerStone.ISurveyDocument;

      if (surveyItem) {
        if (args.hard === true) {
          surveyItem.status = 'removed'
          surveyItem.remove();
        } else {
          surveyItem.status = 'deleted'
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



