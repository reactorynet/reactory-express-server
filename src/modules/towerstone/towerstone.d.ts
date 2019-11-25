import { Reactory } from "types/reactory";
import { ObjectID } from "bson";

declare namespace TowerStone {

  export interface IRatingScaleEntry {
    rating: number,
    description: string
  }

  export interface IRatingScale {
    id: string
    key: string,
    title: string
    entries: Array<IRatingScaleEntry>
  }
  
  export interface ILeadershipBrand {
    id: string
    title: string
    description: string,
    ratingScale?: IRatingScale
  }

  export interface ISurveyEmailTemplate {
    id: string
    key: string
    activity: string
    subject: string
    body: string
    surveyType: string
    engine: string
    target: string
  }

  export interface ISurveyTemplates {
    assessorTemplates?: Array<ISurveyEmailTemplate>,
    delegateTemplates?: Array<ISurveyEmailTemplate>,
  }

  export interface ISurvey {
    id: string,
    _id: ObjectID
    title: string,
    status: string,
    surveyType: string,
    organization: Reactory.IOrganization,
    leadershipBrand?: ILeadershipBrand 
    startDate: Date,
    endDate: Date,
    timeline: any[],
    calendar: any[],
    delegates: any[],
    templates: ISurveyTemplates
  }

  export interface ITowerStoneSurveyService {
    get(id: string): Promise<ISurvey>
  }

  export interface IEmailSendResult {
    sent: number,
    failed: number,
    errors?: Error[] 
  }

  export interface ITowerStoneServiceParameters {
    partner: Reactory.IPartner
    user: Reactory.IUser
  }

  export interface ITowerStoneSetTemplatesParameters {
    id: string
    templates: ISurveyTemplates
  }
  
  export interface ITowerStoneEmailService {
    send: (survey: ISurvey, action: string) => Promise<IEmailSendResult>
    templates: (survey: ISurvey) => Promise<ISurveyTemplates>
    patchTemplates: (survey: ISurvey, templates: ISurveyTemplates) => Promise<ISurveyTemplates>  
  }

  export interface ITowerStoneEmailServiceProvider {
    ( props: ITowerStoneServiceParameters, context: any ) : ITowerStoneEmailService
  }

  export interface ITowerStoneSurveyServiceProvider {
    ( props: ITowerStoneServiceParameters, context:  any ) : ITowerStoneSurveyService
  }
}