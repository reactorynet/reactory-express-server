import * as fs from 'fs';
import { ReadLine } from "readline";
import { ChatCompletionResponseMessage, Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import { ChatState, IQuestion, IQuestionCollection, QuestionHandlerResponse } from "../chat.types";
import { 
  handleUserResponse, 
  handleChatCompletionResponse,
} from '../macro'

export const SYSTEM_INITIALIZER_MESSAGE: ChatCompletionResponseMessage = {
  role: 'user',
  content: fs.readFileSync(`${process.cwd()}/bin/utils/chatgpt/questions/initializer.md`, 'utf-8').toString(), 
};

const INITIAL_CHAT_STATE: ChatState = {
  modelId: process.env.OPENAI_MODEL_ID || '',
  started: new Date(),
  history: [
    SYSTEM_INITIALIZER_MESSAGE
  ],
  apiKey: process.env.OPENAI_API_KEY || '',
  apiOrg: process.env.OPENAI_ORG || '',
  ai: new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG,
  })),
}

// Move this to a separate function
function createPrompt(modelId: string, message: string, history: any[]): CreateChatCompletionRequest {
  let messages = [
    ...history,
    {
      role: 'assistant',
      content: message,
    },
  ];

  return {
    model: modelId,
    messages: messages,
  };
}

// Move this to a separate function
async function getAIResponse(ai: OpenAIApi, prompt: CreateChatCompletionRequest): Promise<ChatCompletionResponseMessage> {
  try {
    const aiResponse = await ai.createChatCompletion(prompt);
    const parsed = await handleChatCompletionResponse(aiResponse.data, prompt);
    const { choices } = parsed;
    return choices[0].message;
  } catch (error) {
    console.error(`Error getting AI response: ${error}`);
    return  { 
      role: 'assistant',
      content:  "I'm sorry, I couldn't process that. Could you please rephrase or try again later?"
    };
  }
}

// Prune the history to respect OpenAI API limits
function pruneHistory(history: any[]): any[] {
  const MAX_TOKENS = 4096;  // You may need to adjust this according to OpenAI's limits
  let totalTokens = 0;

  // Reverse history so that we start counting from the most recent messages
  const reversedHistory = [...history].reverse();

  const prunedHistory = reversedHistory.filter((message) => {
    totalTokens += message.content.split(' ').length; // Approximate token count
    return totalTokens <= MAX_TOKENS;
  });

  // Return it to the original order
  return prunedHistory.reverse();
}

export const ChatFactory = (rl: ReadLine, state: ChatState = INITIAL_CHAT_STATE): IQuestion => {

  let question = state.history.length === 1 ? 
    'Hi, how can we build better applications today with reactory?' : 'What else can I help you with?'; 

  const {
    modelId,
    started,
    ai
  } = state;

  // Prune history before passing to createPrompt
  // let history = pruneHistory(state.history);

  let prompt = createPrompt(modelId, question, state.history);

  return {
    question,
    handler: async (response, state) => {

      const processedResponse = await handleUserResponse(response);
      const userResponse = {
        role: 'user',
        content: processedResponse,
      };
      // Add the user's response to the messages
      prompt.messages.push(userResponse);
      
      // Add the old chat's history to the new chat's state
      const prunedHistory = pruneHistory(state.history);
      const nextState = { ...state }
      nextState.history = prunedHistory;
      state.history.push(userResponse);

      // Get AI's response
      const message = await getAIResponse(ai, prompt);

      // Add the AI's response to the chat history
      nextState.history.push(message);

      rl.write(`
    Reactor: ${message.content}
  `);

      return {
        next: ChatFactory(rl, nextState),
        state: nextState,
      }
    },
  };
};
