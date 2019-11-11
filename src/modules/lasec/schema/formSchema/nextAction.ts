// Quote reminder content goes here

export default {
  type: "object",
  title: "Next Action",
  properties: {
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
        "medium",
        "low",
      ],
    }
  }
};