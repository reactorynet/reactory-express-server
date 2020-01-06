// Quote reminder content goes here

export default {
  type: "object",
  title: "Next Action",
  properties: {
    id: {
      type: "string",
      title: "Id"
    },
    itemType: {
      type: "string",
      title: "Item being referenced",
      enum: [
        "quote",
        "invoice",
        "task",
        "other"
      ]
    },
    itemReference: {
      type: "string",
      title: "Reference",
    },
    next: {
      type: "string",
      format: "date-time",
      title: "When is the next action due"
    },
    actionType: {
      type: "string",
      title: "Action type"
    },
    actioned: {
      type: "boolean",
      title: "Actioned"
    },
    via: {
      type: "array",
      title: "Action via",
      items: {
        type: "string",
        title: "Action via"
      }
    },
    who: {
      type: "array",
      title: "Who",
      items: {
        type: "object",
        title: "Action via",
        properties: {
          id: {
            type: 'string',
            title: 'User Id'
          },
          firstName: {
            type: 'string',
            title: 'First Name'
          },
          lastName: {
            type: 'string',
            title: 'Last Name'
          },
        }
      }
    },
    quote: {
      type: "object",
      title: "Quote",
      properties: {
        id: {
          type: 'string',
          title: 'Quote Id'
        },
        code: {
          type: 'string',
          title: 'Quote Code'
        }
      }
    },
    text: {
      type: "string",
      title: "Action Text"
    },
    importance: {
      type: "string",
      title: "Importance",
      enum: [
        "critical",
        "high",
        "normal",
        "medium",
        "low",
      ],
    }
  }
};
