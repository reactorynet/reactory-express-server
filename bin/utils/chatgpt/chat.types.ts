import { ChatCompletionResponseMessage, OpenAIApi } from "openai"



export type ChatState = {
  started: Date
  apiKey: string
  apiOrg: string
  modelId: string
  history: ChatCompletionResponseMessage[]
  ai: OpenAIApi
}


export interface QuestionHandlerResponse {
  next: IQuestion | null,
  state: ChatState
}

export interface IQuestion {
  id?: number,
  when?: Date,
  question: string,
  response?: string,
  output?: unknown,
  valid?: boolean,
  handler: (response: string, state: ChatState) => Promise<QuestionHandlerResponse>
}

export interface IQuestionGroup {
  [key: string | symbol]: IQuestion,
}

export interface IQuestionCollection {
  [key: string | symbol]: IQuestionGroup
}