import moment from 'moment';
import fs from 'fs';
import path from 'path';
import om from 'object-mapper';
import logger from '../../../logging';
import { readFileSync, existsSync } from 'fs';
import { PNG } from 'pngjs';
import imageType from 'image-type';
import { DefaultBarChart } from '../../../charts/barcharts';
import { DefaultRadarChart } from '../../../charts/radialcharts';

import {
  Assessment,
  Survey,
  User,
  LeadershipBrand,
  Organization,
  Scale,
} from '../../../models';

const { APP_SYSTEM_FONTS, APP_DATA_ROOT } = process.env;

const pdfpng = (path) => {
  let buffer = readFileSync(path);
  const { mime } = imageType(buffer);
  if (mime === 'image/png') {
    const png = PNG.sync.read(buffer);
    if (png.interlace) {
      buffer = PNG.sync.write(png, { interlace: false });
    }
    return buffer;
  }

  return path;
};

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
    score: 78,
    organization: {},
    leadershipBrand: {},
    scale: { entries: [] },
    qualities: [],
    behaviours: [],
    developmentPlan: [],
    comments: [],
  };

  reportData.delegate = await User.findById(reportData.survey.delegates.id(delegateId).delegate).then();
  reportData.organization = reportData.survey.organization;
  reportData.leadershipBrand = reportData.survey.leadershipBrand;
  reportData.qualities = reportData.leadershipBrand.qualities;
  reportData.scale = await Scale.findById(reportData.leadershipBrand.scale).then();
  reportData.assessments = await Assessment.find({ _id: { $in: reportData.survey.delegates.id(delegateId).assesments } }).then();

  // make charts
  const chartsFolder = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/charts/`;
  if (fs.existsSync(chartsFolder) === false) {
    fs.mkdirSync(chartsFolder, { recursive: true });
  }

  let chartResult = null;
  if (!fs.existsSync(path.join(chartsFolder, `spider-chart-all-${reportData.survey._id}.png`))) {
    chartResult = await DefaultRadarChart({ folder: chartsFolder, file: `spider-chart-all-${reportData.survey._id}.png` }).then();
    logger.debug(`Radar Chart All Created: ${chartResult.file}`, chartResult);
  }

  if (!fs.existsSync(path.join(chartsFolder, `spider-chart-avg-${reportData.survey._id}.png`))) {
    chartResult = await DefaultRadarChart({ folder: chartsFolder, file: `spider-chart-avg-${reportData.survey._id}.png` }).then();
    logger.debug(`Radar Chart Avg Created: ${chartResult.file}`, chartResult);
  }


  const barchartPromises = reportData.qualities.map((quality) => {
    if (!fs.existsSync(path.join(chartsFolder, `bar-chart-${reportData.survey._id}-${quality._id}.png`))) {
      return DefaultBarChart({ folder: chartsFolder, file: `bar-chart-${reportData.survey._id}-${quality._id}.png` }).then();
    }

    return new Promise((resolve) => { resolve(`bar-chart-${reportData.survey._id}-${quality._id}.png exists`); });
  });

  const barchartResults = await Promise.all(barchartPromises).then();
  barchartResults.map(result => logger.debug(`Bar Chart ${result.file} created`));

  return reportData;
};


export const pdfmakedefinition = (data, partner, user) => {
  const scaleSegments = [];
  data.scale.entries.forEach((scale) => {
    scaleSegments.push({ text: `${scale.rating} - ${scale.description}`, style: ['default'] });
  });

  const qualitiesSection = [
    { text: '3. Qualities', style: ['header', 'primary'], pageBreak: 'before' },
    { text: 'The ratings for your different leadership behaviours have been combined to achieve an average rating for each Leadership Quality.', style: ['default'] },
    { text: '3.1 Individual Ratings', style: ['header', 'primary'] },
    { text: 'The chart below indicates the ratings submitted by the individual assessors.', style: ['default'] },
    { image: 'spiderChartAll', width: 400, style: ['centerAligned'] },
    { text: '3.1 Aggregate Ratings' },
    { text: 'The chart below indicates the combined ratings for all assessors.', style: ['default'] },
    { image: 'spiderChartAvg', width: 400, style: ['centerAligned'] },
  ];

  const behaviourSection = [
    { text: '4 Behaviours', style: ['header', 'primary'], pageBreak: 'before' },
    { text: 'The charts in this section indicate the ratings given by your assessors for each behaviour', style: ['default'] },
  ];


  data.qualities.forEach((quality, qi) => {
    behaviourSection.push({ text: `4.${qi + 1} ${quality.title}`, style: ['header', 'primary'] });
    quality.behaviours.forEach((behaviour, bi) => {
      behaviourSection.push({ text: `B${bi + 1} - ${bi.description}`, style: ['default'] });
    });

    behaviourSection.push({
      image: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) === true ?
        pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) :
        pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/bar_chart.png`),
    });

    behaviourSection.push({ text: 'Start Behaviours', style: ['default'] });

    behaviourSection.push({ text: 'You received low ratings for the behaviours below - this means the assessors don \'t see you demonstrating these behaviours at all - time to get started on these!' });

    behaviourSection.push({
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['auto'],

        body: [
          ['Behaviour Title'],
          ['Feedback Entry'],
        ],
      },
    });

    behaviourSection.push({ text: 'Stop Behaviours', style: ['header', 'primary'] });

    behaviourSection.push({ text: 'The assessors have identified some limiting behaviours they would like you to work at stopping - presented below with individual motivations.', style: ['default'] });

    behaviourSection.push({
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['auto'],

        body: [
          ['Behaviour Title'],
          ['Feedback Entry'],
        ],
      },
    });
  });


  const overallSection = [
    { text: '5 Overall', pageBreak: 'before', style: ['header', 'primary'] },
    { text: `Your overall score for this assessment is: ${data.score}%`, style: ['default'] },
    { text: 'This is the result of averaging the behaviours within all the values, from each assessor, excluding your selfassessment.', style: ['default'] },
  ];

  const developmentPlan = [
    { text: '6 Development Plan', pageBreak: 'before', style: ['header', 'primary'] },
    { text: '6.1 Reflection', style: ['subheader', 'primary'] },
    { text: 'The purpose of this assessment is to assist you in modelling the TowerStone Leadership Brand more effectively as a team. The development plan is designed to guide your reflection on the feedback, and then facilitate identifying actions for improvement.', style: ['default'] },
  ];

  const dottedText = '....................................................................................................................................................................................';

  [
    '1. How aligned are your expectations to the feedback you received from your assessors, and why?',
    '2. How intentional are you about leading by example?',
    '3. How does this feedback help you in your leadership capacity to support the TowerStone strategic objectives?',
    '4. To what extent do you regard your team as an asset, and why?',
    '5. What can you do to build trust within your team?',
  ].forEach((question) => {
    developmentPlan.push({ text: question, style: ['default'] });
    developmentPlan.push({ text: dottedText, style: ['default'] });
    developmentPlan.push({ text: dottedText, style: ['default'] });
    developmentPlan.push({ text: dottedText, style: ['default'] });
  });

  const nextactions = [
    { text: '6.2 Next Actions', style: ['subheader', 'primary'] },
    { text: `Your development as a team requires that you commit to specific actions that will initiate change in your collective behaviour so that your colleagues see you modelling the ${data.organization.name} Leadership Brand.`, style: ['default'] },
    { text: 'Start', style: ['default', 'primary'] },
    { text: 'These are the leadership behaviours your assessors have said you are not currently displaying:', style: ['default'] },
    { text: 'TABLE ENTRIES' },
    { text: 'Identify actions to start displaying these leadership behaviours:', style: ['default'] },
    {
      table: {
      // headers are automatically repeated if the table spans over multiple pages
      // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['auto', 100, 100],

        body: [
          ['Action', 'Outcome', 'Deadline'],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
        ],
      },
    },
  ];

  const acceptance = [
    { text: '6.2 Next Actions' },
    { text: 'I accept and commit to addressing the feedback presented in this assessment, by taking the actions listed within the agreed timeframes.' },
    { text: 'Signed: ......................................................     Date: ...................................................... ' },
    { text: 'Manager: .....................................................     Date: ...................................................... ' },
  ];

  const facilitatornotes = [

  ];

  for (let row = 0; row < 10; row += 1) {
    facilitatornotes.push({ text: dottedText });
  }

  return {
    info: {
      title: `360° Leadership Assessment Report - ${data.delegate.firstName} ${data.delegate.lastName}`,
      author: partner.name,
      subject: '360° Leadership Assessment Report',
      keywords: 'Leadership Training Personal Growth',
    },
    content: [
      { text: '360° Leadership Assessment', style: ['title', 'centerAligned'], margin: [0, 80, 0, 20] },
      { text: `${data.delegate.firstName} ${data.delegate.lastName}`, style: ['header', 'centerAligned'], margin: [0, 15] },
      {
        image: 'delegateAvatar', width: 120, style: ['centerAligned'], margin: [0, 15],
      },
      { text: `${data.organization.name}`, style: ['header', 'centerAligned'] },
      {
        image: 'organizationLogo', width: 240, style: ['centerAligned'], margin: [0, 30, 0, 50],
      },
      {
        image: data.organization.name.indexOf('TowerStone') > -1 ? 'partnerAvatar' : 'partnerLogo', width: 80, style: ['centerAligned'], margin: [0, 60],
      },
      {
        text: '1. Introduction', newPage: 'before', style: ['header', 'primary'], pageBreak: 'before',
      },
      {
        text: [
          `${data.delegate.firstName}, this report compares the results of your self-assessment, with those of the colleagues who assessed you.\n\n`,
          'These assessors include the person you report to and randomly selected colleagues from the list you submitted.',
          `You have been assessed against the ${data.organization.name} values and supporting leadership beahviours for all ${data.organization.name} employees.`,
        ],
        style: ['default'],
      },
      {
        text: `${data.leadershipBrand.description.replace('\r', ' ')}`,
        style: ['default', 'quote', 'centerAligned'],
        margin: [5, 5],
      },
      {
        text: [
          `The values form the foundation of your desired culture at ${data.organization.name} and in order to build this culture, you as leaders must`,
          `intentionally live out the values by displaying the supporting behaviours. In this way, you will align your people to the purpose and strategy of ${data.organization.name}.`,
        ],
        style: ['default'],
      },
      {
        text: '"You cannot manage what you cannot measure"',
        style: ['default', 'quote', 'centerAligned'],
        margin: [5, 5],
      },
      {
        text: ['The TowerStone Leadership Assessment is a tool that provides insight to track your behavioural growth as you seek',
          'to align yourself with the TowerStone values. It is now your responsibility to use this feedback to improve your ability',
          `to (a) model these behaviours and (b) coach the next levels of leadership to align to the ${data.organization.name} values. Please`,
          'consider the feedback carefully before completing the Personal Development Plan that follows the assessment',
          'results.'],
        style: ['default'],
      },
      { text: '2. Rating Scale', style: ['header', 'primary'] },
      { text: 'The feedback you have received is in the context of the following rating scale:', style: ['default'] },
      ...scaleSegments,
      ...qualitiesSection,
      ...behaviourSection,
      ...overallSection,
      ...developmentPlan,
      ...nextactions,
      ...acceptance,
      ...facilitatornotes,
    ],
    header: (currentPage, pageCount) => {
      logger.debug(`Getting header for currentPage: ${currentPage} pageCount: ${pageCount}`);
      if (currentPage > 1) {
        return [
          {
            image: 'partnerAvatar', alignment: 'right', width: 36, margin: [0, 5, 15, 0],
          },
        ];
      }
      return [];
    },
    footer: (currentPage, pageCount, pageSize) => {
      logger.debug(`Getting footer for ${currentPage}, ${pageCount} ${pageSize}`);
      if (currentPage > 1) {
        return [
          {
            text: [
              '©TowerStone is registered with the Department of Higher Education and Training as a private higher education institution under the Higher Education Act, No. 101 of 1997. ',
              'Registration Certificate no. 2009/HE07/010.',
            ],
            alignment: 'justify',
            fontSize: 8,
            margin: [5, 5],
          },
          {
            text: `Individual 360° for ${data.delegate.firstName} ${data.delegate.lastName}`,
            fontSize: 8,
            alignment: 'center',
            margin: [5, 5],
          },
          {
            text: `${data.meta.when.format('DD MMMM YYYY')}`,
            fontSize: 8,
            alignment: 'center',
            margin: [5, 5],
          },
        ];
      }
      return [];
    },
    images: {
      organizationLogo: pdfpng(`${APP_DATA_ROOT}/organization/${data.organization._id}/${data.organization.logo}`),
      partnerLogo: pdfpng(`${APP_DATA_ROOT}/themes/${partner.key}/images/logo.png`),
      partnerAvatar: pdfpng(`${APP_DATA_ROOT}/themes/${partner.key}/images/avatar.png`),
      delegateAvatar: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/profile_${data.delegate._id}_default.jpeg`) === true ? `${APP_DATA_ROOT}/profiles/${data.delegate._id}/profile_${data.delegate._id}_default.jpeg` : pdfpng(`${APP_DATA_ROOT}/profiles/default/default.png`),
      spiderChartAll: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-all-${data.survey._id}.png`) === true ? pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-all-${data.survey._id}.png`) : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/spider-chart-all.png`),
      spiderChartAvg: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-avg-${data.survey._id}.png`) === true ? pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-avg-${data.survey._id}.png`) : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/spider-chart-avg.png`),
    },
    pageMargins: [40, 60, 40, 60],
    styles: {
      normal: {
        font: 'Verdana',
      },
      default: {
        fontSize: 10,
        font: 'Verdana',
        alignment: 'justify',
        margin: [0, 0, 10, 0],
        lineHeight: 1.5,
        bold: false,
        italics: false,
      },
      title: {
        fontSize: 24,
        bold: true,
        font: 'Verdana',
      },
      primary: {
        color: partner.themeOptions.palette.primary1Color,
      },
      header: {
        fontSize: 12,
        bold: true,
        font: 'Verdana',
        margin: [0, 15],
      },
      subheader: {
        fontSize: 10,
        bold: true,
        font: 'Verdana',
      },
      quote: {
        fontSize: 11,
        font: 'Verdana',
        italics: true,
        color: partner.themeOptions.palette.primary1Color,
      },
      centerAligned: {
        alignment: 'center',
      },
      justified: {
        alignment: 'justify',
      },
    },
  };
};

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
