
import { ObjectID } from "bson";
import Mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { Moment } from "moment";

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

  export interface IBehaviour {
    id: string | ObjectID
    title: string
    description: string
    ordinal: number

    assessor_title: string
    assessor_description: string
    
    delegate_title: string
    delegate_description: string

    chart_title: string
    chart_color: string    
    options?: any
  }

  export interface IQuality {
    id: string | ObjectID
    title: string
    description: string
    ordinal: number

    assessor_title: string
    assessor_description: string
    
    delegate_title: string
    delegate_description: string

    chart_title: string
    chart_color: string

    behaviours: Array<IBehaviour>
    
    options?: any
  }
  
  export interface ILeadershipBrand {    
    title: string
    key: string
    description: string
    organization: any
    ratingScale?: IRatingScale
    qualities: Array<IQuality>
  }

  export interface ILeadershipBrandDocument extends Mongoose.Document, ILeadershipBrand { }

  export interface CopyLeadershipBrandParams {
    targetOrganizationId: string
    sourceLeadershipBrandId: string
    targetTitle: string
  }

  export interface ICopyLeadershipBrandParams {
    input: CopyLeadershipBrandParams
  }

  export interface ISurveyEmailTemplate {
    id: string
    key: string    
    activity: string
    subject: string
    body: string
    surveyType: string
    engine: string
    target: string,
    description?: string
  }

  export interface ISurveyTemplates {
    assessorTemplates?: Array<ISurveyEmailTemplate>,
    delegateTemplates?: Array<ISurveyEmailTemplate>,
    generalTemplates?:  Array<ISurveyEmailTemplate>
  }

  export interface ISurvey {
    title: string,
    status: string,
    surveyType: string,
    organization: Reactory.IOrganization,
    leadershipBrand?: ILeadershipBrand 
    assessorTeamName?: string,
    delegateTeamName?: string,
    mode?: String,
    startDate: Date,
    endDate: Date,
    timeline: any[],
    calendar: any[],
    delegates: any[],
    templates: ISurveyTemplates
    addTimelineEntry( eventType: string, eventDetail: string, who: ObjectID, save: boolean): Promise<void> 
  }

  export interface ISurveyDocument extends Mongoose.Document, ISurvey { }

  export interface ITowerStoneSurveyService {
    get(id: string): Promise<ISurveyDocument>
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
    send: (survey: ISurvey, activity: string, target: string, users: Reactory.IUser[], properties: any ) => Promise<IEmailSendResult>
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