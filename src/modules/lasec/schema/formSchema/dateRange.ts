export default {
  type: "object",
  properties: {
    startDate: {
      type: "string",
      format: "date-time",
      title: "Start Date",
    },
    endDate: {
      type: "string",
      format: "date-time",
      title: "End Date"
    }
  }
};