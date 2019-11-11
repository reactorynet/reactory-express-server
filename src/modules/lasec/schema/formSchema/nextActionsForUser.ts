import who from './who';
import nextAction from './nextAction';
import dateRange from './dateRange';

export default {
  definitions: {
    who,
    nextAction,
    dateRange,
  },
  type: "object",
  title: "Next Actions",
  description: "List of next actions for ${owner.fullName}",
  properties: {
    filter: {
      title: "Next Actions Filter",
      properties: {
        dateRange: {
          $ref: "#definitions/dateRange"
        },
        actioned: {
          type: "boolean",
          default: false, 
        },
        actionType: {
          type: "string",
          title: "Action Type",
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
      type: 'object',
      title: "Owner for the next actions list",
      $ref: '#/definitions/who'
    },
    nextActions: {
      type: 'array',
      title: "List of items",
      items: {
        $ref: "#/definitions/nextAction",
      }
    }
  }
};