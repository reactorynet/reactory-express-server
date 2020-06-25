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
  "createdBy": global.user._id,
  "qualities": [
    {
      "_id": new ObjectID(),
      
      "title": "My Space",
      "description": "My Space - How do I belong?",
      
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
          "title": "${employee.firstName} listens to and respects others’ needs and opinions.",
          "description": "${employee.firstName} listens to and respects others’ needs and opinions.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "care",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} continually looks to build new skills and learn from others.",
          "description": "${employee.firstName} continually looks to build new skills and learn from others.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Skills development",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is committed to ${employeeDemographics.pronoun || 'their'} roles, responsibilities and career path.",
          "description": "${employee.firstName} is committed to ${employeeDemographics.pronoun || 'their'} roles, responsibilities and career path.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Growth",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "My Team - How do we support each other",

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
          "title": "${employee.firstName} sets clear expectations and feedback lines with ${employeeDemographics.pronoun || 'their'} colleagues.",
          "description": "${employee.firstName} sets clear expectations and feedback lines with ${employeeDemographics.pronoun || 'their'} colleagues.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Communication",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} makes time to support and encourage ${employeeDemographics.pronoun || 'their'} team members. ",
          "description": "${employee.firstName} makes time to support and encourage ${employeeDemographics.pronoun || 'their'} team members. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Trust",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} deals with conflict quickly, openly and respectfully.",
          "description": "${employee.firstName} deals with conflict quickly, openly and respectfully.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Conflict Management",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Our Culture - How do we behave",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is proud to be a Brand Ambassador for ${survey.organization.name}.",
          "description": "${employee.firstName} is proud to be a Brand Ambassador for ${survey.organization.name}.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Brand Ambassadorship",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s daily actions uphold the values and behaviours expected of all ${survey.organization.name} employees.",
          "description": "${employee.firstName}’s daily actions uphold the values and behaviours expected of all ${survey.organization.name} employees.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Living the brand",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} respects and recognises the time and efforts of ${employeeDemographics.pronoun || 'their'} colleagues.",
          "description": "${employee.firstName} respects and recognises the time and efforts of ${employeeDemographics.pronoun || 'their'} colleagues.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Respect",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Our Results - How do we take ownership",

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
          "title": "${employee.firstName} is goal-driven, professional and efficient. ",          
          "description": "${employee.firstName} is goal-driven, professional and efficient. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Results",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is professional, disciplined and takes ownership of ${employeeDemographics.pronoun || 'their'} commitments. ",
          "description": "${employee.firstName} is professional, disciplined and takes ownership of ${employeeDemographics.pronoun || 'their'} commitments. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Ownership",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} delivers beyond expectations to get the job done.",
          "description": "${employee.firstName} delivers beyond expectations to get the job done.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Initiative",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Our growth - How do we learn and innovate",

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
          "title": "${employee.firstName} speaks up when there is a red flag.",
          "description": "${employee.firstName} speaks up when there is a red flag.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Proactivity",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} responds to new opportunities proactively and quickly.",
          "description": "${employee.firstName} responds to new opportunities proactively and quickly.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Agility",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is not afraid to try a new risky idea.",
          "description": "${employee.firstName} is not afraid to try a new risky idea.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Innnovation",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Our purpose - How are we fulfilled",

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
          "title": "${employee.firstName} understands the vision, values and strategic goals of ${survey.organization.name}. ",
          "description": "${employee.firstName} understands the vision, values and strategic goals of ${survey.organization.name}. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Alignment",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s personal purpose and values are aligned to ${survey.organization.name}’s purpose and brand promise.",
          "description": "${employee.firstName}’s personal purpose and values are aligned to ${survey.organization.name}’s purpose and brand promise.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Engagement",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s contribution to ${survey.organization.name} enhances our standing as a responsible corporate citizen. ",
          "description": "${employee.firstName}’s contribution to ${survey.organization.name} enhances our standing as a responsible corporate citizen. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Social Responsibility",
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
      "description": "My Space - How do I belong?",
      
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
          "title": "${employee.firstName} regularly checks in with ${employeeDemographics.pronoun || 'their'} people to ensure their needs are addressed. ",
          "description": "${employee.firstName} regularly checks in with ${employeeDemographics.pronoun || 'their'} people to ensure their needs are addressed. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "care",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} makes time to coach, mentor and encourage ongoing training for ${employeeDemographics.pronoun || 'their'} people.",
          "description": "${employee.firstName} makes time to coach, mentor and encourage ongoing training for ${employeeDemographics.pronoun || 'their'} people.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Skills development",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} ensures role clarity and a well-defined career path for ${employeeDemographics.pronoun || 'their'} people.",
          "description": "${employee.firstName} ensures role clarity and a well-defined career path for ${employeeDemographics.pronoun || 'their'} people.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Growth",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "My Team - How do we support each other",

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
          "title": "${employee.firstName} is rigorous about communication within and between ${employeeDemographics.pronoun || 'their'} teams, ensuring everyone knows how to support each other.",
          "description": "${employee.firstName} is rigorous about communication within and between ${employeeDemographics.pronoun || 'their'} teams, ensuring everyone knows how to support each other.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Communication",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} openly communicates ${employeeDemographics.pronoun || 'their'} expectations and faith in people’s ability to deliver.",
          "description": "${employee.firstName} openly communicates ${employeeDemographics.pronoun || 'their'} expectations and faith in people’s ability to deliver.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Trust",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} deals with conflict quickly, openly and respectfully.",
          "description": "${employee.firstName} deals with conflict quickly, openly and respectfully.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Conflict Management",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Our Culture - How do we behave",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is passionate about ${survey.organization.name}.",
          "description": "${employee.firstName} is passionate about ${survey.organization.name}.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Brand Ambassadorship",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} upholds the values and behaviours expected of all ${survey.organization.name} employees.",
          "description": "${employee.firstName} upholds the values and behaviours expected of all ${survey.organization.name} employees.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Living the brand",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is relentless in driving the actions needed to achieve our goals.",
          "description": "${employee.firstName} is quick to recognise and praise great work.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Respect",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Our Results - How do we take ownership",

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
          "title": "${employee.firstName} shows consistent discipline with meetings, feedback and following up.",          
          "description": "${employee.firstName} shows consistent discipline with meetings, feedback and following up.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Results",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} tackles challenges head-on, always looking for better solutions.",
          "description": "${employee.firstName} tackles challenges head-on, always looking for better solutions.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Ownership",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} delivers beyond expectations to get the job done.",
          "description": "${employee.firstName} delivers beyond expectations to get the job done.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Initiative",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Our growth - How do we learn and innovate",

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
          "title": "${employee.firstName} regularly reads, does market research and shares new information.",
          "description": "${employee.firstName} regularly reads, does market research and shares new information.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Proactivity",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is quick to identify and respond to new opportunities.",
          "description": "${employee.firstName} is quick to identify and respond to new opportunities.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Agility",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is not afraid to try a new risky idea.",
          "description": "${employee.firstName} is not afraid to try a new risky idea.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Innovation",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Our purpose - How are we fulfilled",

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
          "title": "${employee.firstName} understands the vision, values and strategic goals of ${survey.organization.name}. ",
          "description": "${employee.firstName} understands the vision, values and strategic goals of ${survey.organization.name}. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Alignment",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s personal essence and contribution are in sync with ${survey.organization.name}’s purpose and vision.",
          "description": "${employee.firstName}’s personal essence and contribution are in sync with ${survey.organization.name}’s purpose and vision.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Engagement",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} believes in leading ${survey.organization.name} as an active participant in the future of our society and planet.",
          "description": "${employee.firstName} believes in leading ${survey.organization.name} as an active participant in the future of our society and planet.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Social Responsibility",
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
      "description": "My Space - How do I belong?",
      
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
          "title": "My personal needs and opinions are heard and respected",
          "description": "My personal needs and opinions are heard and respected",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "care",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "Training and personal development is encouraged.",
          "description": "Training and personal development is encouraged.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Skills development",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "I clearly understand my role and career path.",
          "description": "I clearly understand my role and career path.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Growth",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "My Team - How do we support each other",

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
          "title": "${employee.firstName} deals with conflict quickly, openly and respectfully.",
          "description": "${employee.firstName} deals with conflict quickly, openly and respectfully.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Communication",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "My colleagues trust and encourage me to do my best for the business.",
          "description": "My colleagues trust and encourage me to do my best for the business.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Trust",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We encourage healthy conflict through open and honest dialogue.",
          "description": "We encourage healthy conflict through open and honest dialogue.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Conflict Management",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Our Culture - How do we behave",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "We are proud to be part of ${survey.organization.name}.",
          "description": "We are proud to be part of ${survey.organization.name}.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Brand Ambassadorship",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "Our daily actions uphold ${survey.organization.name}’s values, brand and stakeholder promises.",
          "description": "Our daily actions uphold ${survey.organization.name}’s values, brand and stakeholder promises.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Living the brand",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We are goal-driven, professional and efficient.",
          "description": "We are goal-driven, professional and efficient.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Respect",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Our Results - How do we take ownership",

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
          "title": "We are goal-driven, professional and efficient.",          
          "description": "We are goal-driven, professional and efficient.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Results",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "We hold ourselves and each other accountable",
          "description": "We hold ourselves and each other accountable",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Ownership",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We take initiative to get things done.",
          "description": "We take initiative to get things done.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Initiative",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Our growth - How do we learn and innovate",

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
          "title": "We proactively share information and red flags",
          "description": "We proactively share information and red flags",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Proactivity",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "We are agile and relevant",
          "description": "We are agile and relevant",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Agility",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We encourage new ideas, even if they are risky.",
          "description": "We encourage new ideas, even if they are risky.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Innnovation",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Our purpose - How are we fulfilled",

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
          "title": "${survey.organization.name}’s vision, values and strategic goals are clearly communicated to all.",
          "description": "${survey.organization.name}’s vision, values and strategic goals are clearly communicated to all. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Alignment",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "I am inspired by ${survey.organization.name}’s purpose, brand and promise to our stakeholders.",
          "description": "I am inspired by ${survey.organization.name}’s purpose, brand and promise to our stakeholders.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Engagement",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "Organisation] is a responsible corporate citizen, making a positive contribution to society and the planet.",
          "description": "Organisation] is a responsible corporate citizen, making a positive contribution to society and the planet.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Social Responsibility",
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
      "description": "My Space - How do I belong?",
      
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
          "title": "The ${survey.delegateTeamName} listens to and respects our needs and opinions.",
          "description": "The ${survey.delegateTeamName} listens to and respects our needs and opinions.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "care",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} actively shares knowledge and teaches us as needed.",
          "description": "The ${survey.delegateTeamName} actively shares knowledge and teaches us as needed.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Skills development",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} brings value and new opportunities to us.",
          "description": "The ${survey.delegateTeamName} brings value and new opportunities to us.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Growth",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "My Team - How do we support each other",

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
          "title": "We clearly understand roles and communication lines between our two teams.",
          "description": "We clearly understand roles and communication lines between our two teams.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Communication",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} supports us to do our best.",
          "description": "The ${survey.delegateTeamName} supports us to do our best.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Trust",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} encourages healthy debate to air and resolve our differences.",
          "description": "The ${survey.delegateTeamName} encourages healthy debate to air and resolve our differences.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Conflict Management",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Our Culture - How do we behave",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "We are proud to be colleagues of the ${survey.delegateTeamName}.",
          "description": "We are proud to be colleagues of the ${survey.delegateTeamName}.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Brand Ambassadorship",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} sets the standard for how we live ${survey.organization.name}’s brand. ",
          "description": "The ${survey.delegateTeamName} sets the standard for how we live ${survey.organization.name}’s brand.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Living the brand",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} recognises and praises our efforts.",
          "description": "The ${survey.delegateTeamName} recognises and praises our efforts.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Respect",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Our Results - How do we take ownership",

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
          "title": "The ${survey.delegateTeamName} has a focused and professional work ethic, driven by clear goals and targets.",          
          "description": "The ${survey.delegateTeamName} has a focused and professional work ethic, driven by clear goals and targets.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Results",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} honours their commitments professionally and timeously.",
          "description": "The ${survey.delegateTeamName} honours their commitments professionally and timeously.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Ownership",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} supports us without being asked.",
          "description": "The ${survey.delegateTeamName} supports us without being asked.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Initiative",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Our growth - How do we learn and innovate",

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
          "title": "The ${survey.delegateTeamName} is quick to spot a challenge and find a solution.",
          "description": "The ${survey.delegateTeamName} is quick to spot a challenge and find a solution.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Proactivity",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} takes on new initiatives with energy and speed.",
          "description": "The ${survey.delegateTeamName} takes on new initiatives with energy and speed.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Agility",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} dedicates time to creative thinking and brainstorming.",
          "description": "The ${survey.delegateTeamName} dedicates time to creative thinking and brainstorming.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Innnovation",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Our purpose - How are we fulfilled",

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
          "title": "The ${survey.delegateTeamName} is clear about their contribution to ${survey.organization.name}’s vision, values and strategy.",
          "description": "The ${survey.delegateTeamName} is clear about their contribution to ${survey.organization.name}’s vision, values and strategy.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Alignment",
          "chart_color": "runtime",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName} is inspired by their contribution to ${survey.organization.name}’s future.",
          "description": "The ${survey.delegateTeamName} is inspired by their contribution to ${survey.organization.name}’s future.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Engagement",
          "chart_color": "runtime",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "The ${survey.delegateTeamName}’s contribution to ${survey.organization.name} enhances our standing as a responsible corporate citizen.",
          "description": "The ${survey.delegateTeamName}’s contribution to ${survey.organization.name} enhances our standing as a responsible corporate citizen.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Social Responsibility",
          "chart_color": "runtime",

          "ordinal": 2
        },
      ]
    }],
});

