import who from './who';
import nextAction from './nextAction';
import dateRange from './dateRange';
import { ISchema, IArraySchema, IObjectSchema } from '@reactory/server-core/schema';

const nextActionSimple: ISchema = {
  type: "string",
  title: "Next action",
  description: "Next Action",
  default: "None",
};

const nextActions : IArraySchema = {
    type: 'array',
    title: "List of items",
    items: { ...nextAction }
}


const nextActionComplex: IObjectSchema = {
  type: "object",
  title: "Next Actions",
  description: "List of next actions for ${owner}",
  properties: {
    filter: {
      type: "object",
      title: "Next Actions Filter",
      properties: {
        dateRange,
        actioned: {
          type: "boolean",
          title: "Actioned",
          description: "Is Actioned?",
          default: false, 
        },
        actionType: {
          type: "string",
          title: "Action Type",
          default: "follow-up-call",
          enum: [
            "follow-up-call",
            "send-email",
            "client-visit",
            "other"
          ]
        }
      }
    },
    owner: {
      ...who,
      title: "Owner for the next actions list",      
    },
    nextActions
  }
}

export default nextActionComplex;