
import { ObjectID } from "bson";
import Mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { Moment } from "moment";
import { Reactory } from "@reactory/server-core/types/reactory";

declare namespace TowerStone {

  export interface ISimpleResponse {
    success: boolean,
    message: String
  }

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

  export interface IRatingEntry {
    qualityId: ObjectId,
    quality?: IQuality,
    behaviourId: ObjectId,
    behaviour?: IBehaviour,
    ordinal: Number,
    comment: String,
    custom: Boolean,
    behaviourText: String,
    behaviourDescription: String,
    updatedAt: Date
  }

  export interface IAssessment {
    organization: Reactory.IOrganization,
    client: Reactory.IReactoryClient,
    delegate: Reactory.IUserDocument,
    team?: String,
    assessor: Reactory.IUserDocument,
    survey: ISurveyDocument,
    deleted: boolean,
    complete: boolean,
    ratings: IRatingEntry[]

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
    generalTemplates?: Array<ISurveyEmailTemplate>
  }



  export interface ISurveyDelegateEntry extends Mongoose.Document {
    delegate: Reactory.IUserDocument,
    notifications: Reactory.INotification[],
    assessments: IAssessment[],
    launched: Boolean,
    complete: Boolean,
    removed: Boolean,
    message: String,
    team?: String,
    lastAction: String,
    status: String,
    updatedAt: Date | Number,
    createdAt: Date | Number,
    peers: Reactory.IOrganigramDocument,
    organigram: Reactory.IOrganigramDocument,
    actions: [
      {
        action: String,
        when: Date | Number,
        result: String,
        who: Reactory.IUserDocument
      },
    ],
  }

  export interface IDelegateEntryDataStruct {
    entryData: { id: ObjectID; delegate: Reactory.IUserDocument; notifications: any[]; assessments: any[]; launched: boolean; complete: boolean; removed: boolean; message: string; lastAction: string; status: string; actions: [...]; updatedAt: number; createdAt: number; };
    complete: boolean;
    entry: ISurveyDelegateEntry,
    entryIdx: number,
    message: String,
    error: boolean,
    success: boolean,
    patch: boolean
  }

  export interface ISurvey {
    id?: any,
    title: string,
    status: string,
    surveyType: string | '180' | '360' | 'plc' | 'custom' | 'l360' | 'i360' | 'culture' | 'team180' | 'other',
    organization: Reactory.IOrganizationDocument,
    leadershipBrand?: TowerStone.ILeadershipBrand,
    assessorTeamName?: string,
    delegateTeamName?: string,
    mode?: String,
    startDate: Date | Moment | string | number,
    endDate: Date | Moment | string | number,
    timeline: any[],
    calendar: any[],
    delegates: any,
    templates: TowerStone.ISurveyTemplates
    addTimelineEntry(eventType: string, eventDetail: string, who: ObjectID, save: boolean): Promise<void>
  }

  export interface ISurveyStatistics {
    id: any,
    launched: number,
    $survey?: ISurvey | ISurveyDocument,
    $assessments?: IAssessment[]
    peersConfirmed?: number,
    complete: number,
    delegates: number
    nominationsComplete?: number,
    pendingInvites?: number,
    started?: number,
    daysRunning?: number
    daysLeft?: number
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
    partner: Reactory.IReactoryClient
    user: Reactory.IUser
  }

  export interface ITowerStoneSetTemplatesParameters {
    id: string
    templates: TowerStone.ISurveyTemplates
  }

  export interface ITowerStoneEmailService {
    send: (survey: ISurvey, activity: string, target: string, users: Reactory.IUser[], properties: any) => Promise<IEmailSendResult>
    templates: (survey: ISurvey) => Promise<TowerStone.ISurveyTemplates>
    patchTemplates: (survey: ISurvey, templates: TowerStone.ISurveyTemplates) => Promise<TowerStone.ISurveyTemplates>
  }

  export interface ITowerStoneEmailServiceProvider {
    (props: ITowerStoneServiceParameters, context: any): ITowerStoneEmailService
  }

  export interface ITowerStoneSurveyServiceProvider {
    (props: ITowerStoneServiceParameters, context: any): ITowerStoneSurveyService
  }
}
