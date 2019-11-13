export default {
  type: "object",
  title: "Date Range",
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