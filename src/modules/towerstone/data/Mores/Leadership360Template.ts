import { ObjectID } from "mongodb";
import moment from "moment";

const MORES_ASSESSMENT_LEADERSHIP360_BRAND_TITLE = "Leadership 360";
const MORES_ASSESSMENT_INDIVIDUAL360_BRAND_TITLE = "Individual 360";
const MORES_ASSESSMENT_CULTURE_BRAND_TITLE = "Culture Survey";
const MORES_ASSESSMENT_TEAM180_BRAND_TITLE = "Team 180";

export const Indvidual360Template = (organizationId: string | ObjectID, scaleId: string | ObjectID) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_INDIVIDUAL360_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "createdAt": moment(),
  "updatedAt": moment(),
  "qualities": [
    {
      "_id": new ObjectID(),
      "title": "My Space",
      "description": "",
      "ordinal": 0,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 1,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Logic and Reason",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Make your message believable",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 3,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",          
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    }],
});

export const Leadership360Template = (organizationId: string | ObjectID, scaleId: string | ObjectID) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_LEADERSHIP360_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "createdAt": moment(),
  "updatedAt": moment(),
  "qualities": [
    {
      "_id": new ObjectID(),
      "title": "My Space",
      "description": "",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 0,

      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 3,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Logic and Reason",
      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Make your message believable",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 5,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",          
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 6,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    }],
});



export const CultureLeadershipTemplate = (organizationId: string | ObjectID, scaleId: string | ObjectID) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_CULTURE_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "createdAt": moment(),
  "updatedAt": moment(),
  "qualities": [
    {
      "_id": new ObjectID(),
      "title": "My Space",
      "description": "",
      "ordinal": 0,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 1,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Logic and Reason",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Make your message believable",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 3,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",          
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    }],
});

export const TeamLeadership180Template = (organizationId: string | ObjectID, scaleId: string | ObjectID) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_TEAM180_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "qualities": [
    {
      "_id": new ObjectID(),
      "title": "My Space",
      "description": "",
      "ordinal": 0,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 1,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Logic and Reason",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Make your message believable",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 3,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",          
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Touch their hearts",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "runtime",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}",
          "description": "${employee.firstName}",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    }],  
  "createdAt": moment(),
  "updatedAt": moment(),
})

