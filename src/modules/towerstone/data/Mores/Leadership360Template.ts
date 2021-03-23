import { ObjectID } from "mongodb";
import moment from "moment";
import { Reactory } from "types/reactory";

const MORES_ASSESSMENT_LEADERSHIP360_BRAND_TITLE = "Leadership 360";
const MORES_ASSESSMENT_INDIVIDUAL360_BRAND_TITLE = "Individual 360";
const MORES_ASSESSMENT_CULTURE_BRAND_TITLE = "Culture Survey";
const MORES_ASSESSMENT_TEAM180_BRAND_TITLE = "Team 180";

export const Indvidual360Template = (organizationId: string | ObjectID, scaleId: string | ObjectID, user: Reactory.IUserDocument) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_INDIVIDUAL360_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "createdAt": moment(),
  "updatedAt": moment(),
  "createdBy": user._id,
  "qualities": [
    {
      "_id": new ObjectID(),

      "title": "My Space",
      "description": "My Space - how do I belong?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "My Space",
      "chart_color": "#9ECE1C",

      "ordinal": 0,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} listens to and respects others’ needs and opinions.",
          "description": "${employee.firstName} cares about others.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I care",
          "chart_color": "#9ECE1C",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} continually looks to build new skills and learn from others.",
          "description": "${employee.firstName} wants to learn.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I want to learn",
          "chart_color": "#9ECE1C",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is committed to the roles and responsibilities for a purposeful career.",
          "description": "${employee.firstName} wants to grow.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I want to grow",
          "chart_color": "#9ECE1C",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "My Team - how do we support each other?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#3F9FB1",

      "ordinal": 1,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} sets clear expectations and feedback lines with colleagues.",
          "description": "I value ${employee.firstName}'s communication skills.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I communicate\nclearly",
          "chart_color": "#3F9FB1",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} makes time to support and encourage others. ",
          "description": "${employee.firstName} trusts me. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I show trust",
          "chart_color": "#3F9FB1",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} deals with conflict quickly, openly and respectfully.",
          "description": "${employee.firstName} respects others' differences.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I respect others",
          "chart_color": "#3F9FB1",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Our Culture - how do we behave?",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is a proud ambassador of the ${survey.organization.name} brand.",
          "description": "${employee.firstName}'s passion inspires me.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I love our brand",
          "chart_color": "#FECC34",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s daily actions uphold the values and behaviours expected of all ${survey.organization.name} employees.",
          "description": "${employee.firstName} sets an example for us.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I set an\nexample",
          "chart_color": "#FECC34",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} respects and recognises the time and efforts of others.",
          "description": "${employee.firstName} appreciates my efforts.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I appreciate\nothers",
          "chart_color": "#FECC34",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Our Results - how do we take ownership?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#7695A2",

      "ordinal": 3,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is goal-driven, professional and efficient. ",
          "description": "${employee.firstName} cares about quality results. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I deliver results",
          "chart_color": "#7695A2",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} delivers on deadlines and commitments. ",
          "description": "${employee.firstName} keeps promises. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I keep\npromises",
          "chart_color": "#7695A2",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} delivers beyond expectations to get the job done.",
          "description": "${employee.firstName} goes the extra mile.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I do more",
          "chart_color": "#7695A2",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Our Growth - how do we learn and innovate?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#50783F",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} speaks up when there is a red flag.",
          "description": "${employee.firstName} challenges the status quo.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I speak up",
          "chart_color": "#50783F",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} responds to new opportunities proactively and quickly.",
          "description": "${employee.firstName} loves a new challenge.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I love a\nchallenge",
          "chart_color": "#50783F",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is not afraid to try a new risky idea.",
          "description": "${employee.firstName} learns from mistakes.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I take risks",
          "chart_color": "#50783F",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Our Purpose - how are we fulfilled?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#990000",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} contributes to the vision, values and strategic goals of ${survey.organization.name}. ",
          "description": "${employee.firstName} is an active participant in ${survey.organization.name}'s future. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I live our\nfuture",
          "chart_color": "#990000",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s personal purpose and values are aligned to ${survey.organization.name}’s purpose and brand promise.",
          "description": "${employee.firstName} loves working here.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I love what I do",
          "chart_color": "#990000",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s contribution to ${survey.organization.name} enhances our standing as a responsible corporate citizen. ",
          "description": "${employee.firstName} helps us make a difference. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I make a\ndifference",
          "chart_color": "#990000",

          "ordinal": 2
        },
      ]
    }],
});

export const Leadership360Template = (organizationId: string | ObjectID, scaleId: string | ObjectID, user: Reactory.IUserDocument) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_LEADERSHIP360_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "createdAt": moment(),
  "updatedAt": moment(),
  "createdBy": user._id,
  "qualities": [
    {
      "_id": new ObjectID(),

      "title": "My Space",
      "description": "My Space - how do I belong?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#9ECE1C",

      "ordinal": 0,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} regularly checks in with team members to ensure their needs are addressed. ",
          "description": "${employee.firstName} cares for us. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I care",
          "chart_color": "#9ECE1C",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} makes time to coach, mentor and encourage ongoing training for team members.",
          "description": "${employee.firstName} helps us invest in our future.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I coach",
          "chart_color": "#9ECE1C",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} ensures role clarity and a well-defined career path for team members.",
          "description": "${employee.firstName} wants team members to be excited about the opportunities that lie ahead.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I grow my\npeople",
          "chart_color": "#9ECE1C",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "My Team - how do we support each other?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#3F9FB1",

      "ordinal": 1,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is rigorous about communication within and between teams, ensuring everyone knows how to support each other.",
          "description": "There is no confusion about who does what.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I align my\nteams",
          "chart_color": "#3F9FB1",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} consistently expresses faith in team members’ abilities.",
          "description": "${employee.firstName} trusts and believes in us.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I trust my\nteams",
          "chart_color": "#3F9FB1",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} deals with conflict quickly, openly and respectfully.",
          "description": "${employee.firstName} respects and values our input.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I respect my\npeople",
          "chart_color": "#3F9FB1",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Our Culture - how do we behave?",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is passionate about ${survey.organization.name}.",
          "description": "${employee.firstName} inspires us.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I inspire my\npeople",
          "chart_color": "#FECC34",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} upholds the values and behaviours expected of all ${survey.organization.name} employees.",
          "description": "${employee.firstName} leads by example.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I lead by\nexample",
          "chart_color": "#FECC34",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is quick to recognise and praise great work.",
          "description": "${employee.firstName} brings us along for the journey.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I recognise\ngood work",
          "chart_color": "#FECC34",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Our Results - how do we take ownership?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#7695A2",

      "ordinal": 3,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is relentless in driving the actions needed to achieve our goals.",
          "description": "${employee.firstName} achieves results.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I drive results",
          "chart_color": "#7695A2",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} shows consistent discipline in meetings, feedback and following up on commitments.",
          "description": "${employee.firstName} holds self and others to their promises.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I drive\nownership",
          "chart_color": "#7695A2",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} tackles challenges head-on, always looking for better solutions.",
          "description": "${employee.firstName} does whatever it takes to get the job done.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I do what it\ntakes",
          "chart_color": "#7695A2",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Our Growth - how do we learn and innovate?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "Our Growth",
      "chart_color": "#50783F",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} regularly reads, does market research and shares new information.",
          "description": "${employee.firstName} stays ahead of the game.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I stay ahead",
          "chart_color": "#50783F",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is quick to identify and respond to new opportunities.",
          "description": "${employee.firstName} is an innovator.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I drive new\nchallenges",
          "chart_color": "#50783F",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} is driven by opportunity and is not afraid to make mistakes.",
          "description": "${employee.firstName} takes smart risks.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I take smart\nrisks",
          "chart_color": "#50783F",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Our Purpose - how are we fulfilled?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "Our Purpose",
      "chart_color": "#990000",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} sets clear direction, always communicating where we are and where we are going. ",
          "description": "${employee.firstName} leads us to a better future. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I lead our\nfuture",
          "chart_color": "#990000",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName}’s personal essence and contribution are in sync with ${survey.organization.name}’s purpose and vision.",
          "description": "${employee.firstName} belongs here.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I love what\nI do",
          "chart_color": "#990000",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${employee.firstName} believes in leading ${survey.organization.name} as an active participant in the future of our society and planet.",
          "description": "${employee.firstName} makes a difference.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I make a\ndifference",
          "chart_color": "#990000",

          "ordinal": 2
        },
      ]
    }],
});

export const CultureLeadershipTemplate = (organizationId: string | ObjectID, scaleId: string | ObjectID, user: Reactory.IUserDocument) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_CULTURE_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "createdAt": moment(),
  "updatedAt": moment(),
  "createdBy": user._id,
  "qualities": [
    {
      "_id": new ObjectID(),

      "title": "My Space",
      "description": "My Space - how do I belong?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#9ECE1C",

      "ordinal": 0,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "My personal needs and opinions are heard and respected.",
          "description": "I feel cared for.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I feel cared for",
          "chart_color": "#9ECE1C",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "Training and personal development is encouraged.",
          "description": "I have opportunity to learn.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I can learn",
          "chart_color": "#9ECE1C",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "I clearly understand my role and career path.",
          "description": "I have opportunity to grow.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I can grow",
          "chart_color": "#9ECE1C",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "My Team",
      "description": "My Team - how do we support each other?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#3F9FB1",

      "ordinal": 1,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "Team communication and role clarity is effective.",
          "description": "We all know who is doing what.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We are aligned",
          "chart_color": "#3F9FB1",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "My colleagues trust and encourage me to do my best for the business.",
          "description": "We have each other's backs.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We trust",
          "chart_color": "#3F9FB1",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We encourage healthy conflict through open and honest dialogue.",
          "description": "We respect each other's differences.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We respect others",
          "chart_color": "#3F9FB1",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Culture",
      "description": "Our Culture - how do we behave?",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "We are proud ambassadors of the ${survey.organization.name} brand.",
          "description": "We love our brand.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We love our brand",
          "chart_color": "#FECC34",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "Our daily actions uphold ${survey.organization.name}’s values, brand and stakeholder promises.",
          "description": "Our culture is alive and healthy.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "Our culture is\nalive",
          "chart_color": "#FECC34",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We respect and appreciate the time and efforts of others.",
          "description": "Our culture is inclusive; it belongs to all of us.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We are included",
          "chart_color": "#FECC34",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Results",
      "description": "Our Results - how do we take ownership?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#7695A2",

      "ordinal": 3,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "We are goal-driven, professional and efficient.",
          "description": "We care about quality results.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We deliver\nresults",
          "chart_color": "#7695A2",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "We hold ourselves and each other accountable.",
          "description": "We stick to our promises and deadlines.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We keep\npromises",
          "chart_color": "#7695A2",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We take initiative to get things done.",
          "description": "We go the extra mile.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We do more",
          "chart_color": "#7695A2",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Growth",
      "description": "Our Growth - how do we learn and innovate?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#50783F",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "We proactively address red flags.",
          "description": "We speak up when something needs to change.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We speak up",
          "chart_color": "#50783F",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "We respond quickly to challenges and opportunities.",
          "description": "We love a new challenge.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We love a\nchallenge",
          "chart_color": "#50783F",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "We encourage new ideas, even if they are risky.",
          "description": "We are not afraid to learn from our mistakes.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We take risks",
          "chart_color": "#50783F",

          "ordinal": 2
        },
      ]
    },
    {
      "_id": new ObjectID(),
      "title": "Our Purpose",
      "description": "Our Purpose - how are we fulfilled?",

      "assessor_title": "",
      "assessor_description": "",

      "delegate_title": "",
      "delegate_description": "",

      "chart_title": "",
      "chart_color": "#990000",

      "ordinal": 4,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "I know how to contribute to ${survey.organization.name}’s vision, values and strategy.",
          "description": "I believe in ${survey.organization.name}’s future. ",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I believe in our\nfuture",
          "chart_color": "#990000",

          "ordinal": 0
        },
        {
          "_id": new ObjectID(),
          "title": "I am inspired by ${survey.organization.name}’s purpose, brand and promise to our stakeholders.",
          "description": "I love working at ${survey.organization.name}.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "I love what I do",
          "chart_color": "#990000",

          "ordinal": 1
        },
        {
          "_id": new ObjectID(),
          "title": "${survey.organization.name} is a responsible corporate citizen, making a positive contribution to society and the planet.",
          "description": "We make a difference.",

          "assessor_title": "",
          "assessor_description": "",

          "delegate_title": "",
          "delegate_description": "",

          "chart_title": "We make a\ndifference",
          "chart_color": "#990000",

          "ordinal": 2
        },
      ]
    }],
});

export const TeamLeadership180Template = (organizationId: string | ObjectID, scaleId: string | ObjectID, user: Reactory.IUserDocument) => ({
  "_id": new ObjectID(),
  "organization": new ObjectID(organizationId),
  "title": MORES_ASSESSMENT_TEAM180_BRAND_TITLE,
  "description": "",
  "scale": new ObjectID(scaleId),
  "createdBy": user._id,
  "qualities": [
    {
      "_id": new ObjectID(),

      "title": "My Space",
      "description": "My Space - how do I belong?",

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
          "description": "They care for others.",

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
          "description": "They encourage learning.",

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
          "description": "They enable other teams to contribute and grow.",

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
      "description": "My Team - how do we support each other?",

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
          "description": "Our two teams work as one.",

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
          "description": "They trust us.",

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
          "title": "The ${survey.delegateTeamName} encourages mutual respect and healthy debate to resolve our differences.",
          "description": "They respect and value our input.",

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
      "description": "Our Culture - how do we behave?",
      "ordinal": 2,
      "behaviours": [
        {
          "_id": new ObjectID(),
          "title": "We are proud to be colleagues of the ${survey.delegateTeamName}.",
          "description": "They are dedicated to ${survey.organization.name}'s brand.",

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
          "description": "They are a shining example for us to follow.",

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
          "description": "We win together.",

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
      "description": "Our Results - how do we take ownership?",

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
          "description": "They deliver results.",

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
          "title": "The ${survey.delegateTeamName} honours their commitments timeously.",
          "description": "They deliver on their promises.",

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
          "description": "They take initiative.",

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
      "description": "Our Growth - how do we learn and innovate?",

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
          "description": "They speak up to set things right.",

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
          "description": "They love a new challenge.",

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
          "description": "They believe that 'good enough' is not good enough.",

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
      "description": "Our Purpose - how are we fulfilled?",

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
          "description": "They believe in our future.",

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
          "description": "They love their work.",

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
          "description": "They make a difference.",

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

