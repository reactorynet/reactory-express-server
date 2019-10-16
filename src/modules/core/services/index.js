import moment from "moment";
//custom services to be expressed here
export default [
  {
    id: 'core.hallo-world@1.0.0',
    name: "Reactory Hallo World Service",
    description: "Provides a Hallo World Server side response",
    service: (props, context)=>{
      return `Hallo World ${moment().format('YYYY-MM-DD')}`;
    },
  }
];