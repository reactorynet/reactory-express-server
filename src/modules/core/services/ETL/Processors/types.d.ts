
export interface ITimelineEntry {
  when: Date,
  text: string
}


export interface IStepResult {
  success: boolean,
  message: string
}

export interface IUserImportStruct {
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
    id?: string,
    gender: string,
    dob?: Date,
    region?: string,
    businessUnit?: string,
    position?: string,
    jobTitle?: string,
    team?: string
  }
  [key: string]: any
}

export interface MutationResult { data?: any, errors?: string[] }

export interface QueryResult { data?: any, errors?: string[] }