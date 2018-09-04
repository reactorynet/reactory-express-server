import moment from 'moment';
import Admin from '../../../application/admin';
import { LeadershipBrand, Organization, User, Survey } from '../../../models'; 

export default {
  SurveyCalendarEntry: {
    title(sce) { return sce.title; },
    start(sce) { return sce.start; },
    end(sce) { return sce.end; },
    hasTask(sce) { return sce.hasTask; },
    taskResult(sce) { return sce.taskResult; },
    taskError(sce) { return sce.taskError; },
  },
  TimelineEntry: {
    when(sce) { return moment(sce.when); },
    eventType(sce) { return sce.eventType; },
    eventDetail(sce) { return sce.eventDetail; },
    who(sce) {
      if (sce.who) return User.findById(sce.who);
      return null;
    },
  },
  Survey: {
    id(obj) {
      return obj._id;
    },
    leadershipBrand(survey) {
      if (survey.leadershipBrand) return LeadershipBrand.findById(survey.leadershipBrand);
      return null;
    },
    organization(survey) {
      if (survey.organization) return Organization.findById(survey.organization);
      return null;
    },
    startDate(survey) {
      if (survey.startDate) return moment(survey.startDate);
      return null;
    },
    endDate(survey) {
      if (survey.endDate) return moment(survey.endDate);
      return null;
    },
    timeline(survey) {
      return survey.timeline;
    },
    calendar(survey) {
      return survey.calendar;
    },
  },
  Query: {
    surveysForOrganization(obj, { organizationId }) {
      return Admin.Survey.getSurveysForOrganization(organizationId);
    },
    surveyDetail(obj, { surveyId }) {
      return Survey.findById(surveyId);
    },
  },
  Mutation: {
    
  },
};
