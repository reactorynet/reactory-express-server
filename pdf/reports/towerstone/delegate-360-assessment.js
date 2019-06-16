import moment from 'moment';
import om from 'object-mapper';
import logger from '../../../logging';
import {
  Assessment,
  Survey,
  User,
  LeadershipBrand,
  Organization,
} from '../../../models';

const { APP_SYSTEM_FONTS, APP_DATA_ROOT } = process.env;

const resolveData = async ({ surveyId, delegateId }) => {
  logger.info(`Resolving data for delegate-360-assessment Survey: ${surveyId}  DelegateEntry: ${delegateId}`);
  // const assessment = await Assessment.findById(assessment_id).then();
  const { partner, user } = global;

  const survey = await Survey.findById(surveyId)
    .populate('organization')
    .populate('leadershipBrand')
    .then();

  const reportData = {
    meta: {
      author: `${partner.name}`,
      when: moment(),
      user,
      partner,
    },
    delegate: {},
    assessments: [],
    survey,
    organization: {},
    leadershipBrand: {},
    qualities: [],
    behaviours: [],
    developmentPlan: [],
    comments: [],
  };

  reportData.delegate = await User.findById(reportData.survey.delegates.id(delegateId).delegate).then();
  reportData.organization = reportData.survey.organization;
  reportData.leadershipBrand = reportData.survey.leadershipBrand;
  reportData.assessments = await Assessment.find({ _id: { $in: reportData.survey.delegates.id(delegateId).assesments } }).then();

  return reportData;
};


export const pdfmakedefinition = (data, partner, user) => ({
  info: {
    title: `360° Leadership Assessment Report - ${data.delegate.firstName} ${data.delegate.lastName}`,
    author: partner.name,
    subject: '360° Leadership Assessment Report',
    keywords: 'Leadership Training Personal Growth',
  },
  content: [
    { text: '360° Leadership Assessment', style: 'title' },
    { text: `${data.delegate.firstName} ${data.delegate.lastName}`, style: ['header', 'centerAligned'] },
    { text: `${data.meta.when.format('YYYY-MM-DD')}`, style: ['header', 'centerAligned'] },
  ],
  header: (currentPage, pageCount) => {
    logger.debug(`Getting header for currentPage: ${currentPage} pageCount: ${pageCount}`);
    if (currentPage > 0) {
      return [
        { text: 'Report', align: 'right' },
      ];
    }
    return [];
  },
  footer: (currentPage, pageCount, pageSize) => {
    logger.debug(`Getting footer for ${currentPage}, ${pageCount} ${pageSize}`);
    if (currentPage > 0) {
      return [
        { text: `${currentPage}/${pageCount}`, align: 'right' },
      ];
    }
    return [];
  },
  images: {
    organizationLogo: `${APP_DATA_ROOT}/organization/${data.organization._id}/${data.organization.logo}`,
    partnerLogo: `${APP_DATA_ROOT}/themes/${partner.key}/images/logo.png`,
  },
  styles: {
    default: {
      fontSize: 11,
      font: 'Verdana',
    },
    title: {
      fontSize: 24,
      bold: true,
      fillColor: partner.themeOptions.palette.primary1Color,
    },
    header: {
      fontSize: 18,
      bold: true,
    },
    subheader: {
      fontSize: 14,
      bold: true,
    },
    quote: {
      fontSize: 11,
      italics: true,
      fillColor: partner.themeOptions.palette.primary1Color,
    },
    centerAligned: {
      align: 'center',
    },
  },
});

const reportTemplate = {
  enabled: true,
  view: 'delegate-360-assessment',
  kind: 'pdf',
  format: 'pdf',
  name: 'TowerStone Leadership Centre 360 Assessment Report',
  content: pdfmakedefinition,
  resolver: resolveData,
  props: {
    meta: {
      title: '${data.delegate.firstName} ${data.delegate.lastName} ${data.survey.title} Report',
      author: '${data.applicationTitle}',
    },
    fonts: {
      Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italics: 'fonts/Roboto-Italic.ttf',
        bolditalics: 'fonts/Roboto-MediumItalic.ttf',
      },
      /*
      Roboto: {
        normal: `${APP_DATA_ROOT}/fonts/Roboto-Regular.ttf`,
        bold: `${APP_DATA_ROOT}/fonts/Roboto-Medium.ttf`,
        italics: `${APP_DATA_ROOT}/fonts/Roboto-Italic.ttf`,
        bolditalics: `${APP_DATA_ROOT}/fonts/Roboto-MediumItalic.ttf`,
      },
      */
      /*
      Verdana: {
        normal: `${APP_SYSTEM_FONTS}/verdana.ttf`,
        bold: `${APP_SYSTEM_FONTS}/verdana.ttf`,
        bolditalics: `${APP_SYSTEM_FONTS}/verdana.ttf`,
        italics: `${APP_SYSTEM_FONTS}/verdana.ttf`,
      }, */
    },
    defaultFont: 'Verdana',
    fontSize: 12,
  },
  // for reports elements with translate to pages
  elements: [
    {
      enabled: true,
      view: 'delegate-360-assessment/cover-page',
      kind: 'page',
      name: 'Cover page',
      format: 'pdf',
      props: {
        index: 0,
        footer: null,
        displayPageHeader: false,
        pageOptions: {},
      },
      elements: [
        {
          kind: 'content',
          format: 'text',
          name: 'Report Title',
          view: 'delegate-360-assessment/cover-page/title',
          content: '360° Leadership Assessment',
          props: {
            index: 0,
            fontSize: 24,
            y: 200,
            options: {
              width: 500,
              align: 'center',
            },
          },
        },
        {
          kind: 'content',
          format: 'text',
          name: 'Report Subtitle',
          view: 'delegate-360-assessment/cover-page/subtitle',
          content: '\n<%=data.delegate.firstName %> <%=data.delegate.lastName %>\n<%=data.organization.name %>\n\n<%=data.meta.when.format(\'YYYY-MM-DD\') %>',
          props: {
            index: 1,
            fontSize: 18,
            options: {
              width: 500,
              align: 'center',
            },
          },
        },
        {
          kind: 'content',
          format: 'image',
          name: 'Organization Logo',
          view: 'delegate-360-assessment/cover-page/organization-logo',
          // we can put the url in the content of the image
          content: 'Organization Logo',
          props: {
            index: 2,
            // we can set the image path override and use the content as a label?
            imagePath: '<%=context.env.APP_DATA_ROOT + "/organization/" + data.organization._id + "/" + data.organization.logo%>',
            // width, height
            width: 280,
            x: 150,
            y: 340,
          },
        },
        {
          kind: 'content',
          format: 'image',
          name: 'Partner Logo',
          view: 'delegate-360-assessment/cover-page/partner-logo',
          // we can put the url in the content of the image
          content: 'Partner Logo',
          props: {
            index: 2,
            // we can set the image path override and use the content as a label?
            imagePath: '<%=context.env.APP_DATA_ROOT + "/themes/" + partner.key + "/images/logo.png"%>',
            // width, height
            width: 360,
            x: 120,
            y: 580,
          },
        },
      ],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/introduction',
      kind: 'page',
      name: '<%=pageIndex%> Introduction',
      format: 'text',
      props: {
        index: 1,
      },
      elements: [
        {
          enabled: true,
          view: 'delegate-360-assessment/introduction/h1',
          kind: 'content',
          format: 'text',
          content: '1. Introduction',
          props: {
            index: 1,
            fillColor: '<%=partner.themeOptions.palette.primary1Color%>',
          },
        },
        {
          enabled: true,
          view: 'delegate-360-assessment/introduction/p[0]',
          kind: 'content',
          format: 'text',
          content: '<%=data.delegate.firstName%>, this report compares the results of your self-assessment, with those of the colleagues who assessed you. These assessors include the person you report to and randomly selected colleagues from the list you submitted.\n\nYou have been assessed against the <%=data.organization.name%> values and supporting leadership behaviours for all <%=data.organization.name%> employees.',
          props: {
            index: 1,
            options: {
              align: 'justify',
            },
          },
        },
        {
          view: 'delegate-360-assessment/introduction/quote[0]',
          format: 'text',
          kind: 'content',
          content: '\n\nWe choose to enable duties, reunions, adventures, dreams and aspirations. Moving travellers throughout the globe via land, sea, air and beyond, ensuring each journey is an experience – a positive moment.',
          props: {
            index: 2,
            fillColor: '<%=partner.themeOptions.palette.primary1Color%>',
            options: {
              align: 'center',
              width: 400,
            },
          },
        },
        {
          view: 'delegate-360-assessment/introduction/p[1]',
          format: 'text',
          kind: 'content',
          content: '\n\nThe values form the foundation of your desired culture at <%=data.organization.name%> and in order to build this culture, you as leaders must intentionally live out the values by displaying the supporting behaviours. In this way, you will align your people to the purpose and strategy of <%=data.organization.name%>.',
          props: {
            index: 3,
            options: {
              align: 'justify',
            },
          },
        },
        {
          view: 'delegate-360-assessment/introduction/quote[1]',
          format: 'text',
          kind: 'content',
          content: '\n\n"You cannot manage what you cannot measure"',
          props: {
            index: 4,
            options: {
              align: 'center',
            },
          },
        },
      ],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/qualities',
      kind: 'page',
      format: 'pdf',
      props: {
        index: 2,
      },
      elements: [],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/qualities-individual',
      kind: 'page',
      format: 'pdf',
      props: {
        index: 3,
      },
      elements: [],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/qualities-aggregate',
      kind: 'page',
      format: 'pdf',
      props: {
        index: 4,
      },
      elements: [],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/behaviours',
      kind: 'page',
      format: 'pdf',
      props: {
        index: 5,
      },
      elements: [],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/development-plan',
      kind: 'page',
      format: 'pdf',
      props: {
        index: 6,
      },
      elements: [],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/acceptance',
      kind: 'page',
      format: 'pdf',
      props: {
        index: 7,
      },
      elements: [],
    },
    {
      enabled: true,
      view: 'delegate-360-assessment/notes',
      kind: 'page',
      format: 'pdf',
      props: {
        index: 8,
      },
      elements: [],
    },
  ],
};


export default reportTemplate;
