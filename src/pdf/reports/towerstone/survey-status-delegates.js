import moment from 'moment';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import { readFileSync, existsSync } from 'fs';
import { PNG } from 'pngjs';
import imageType from 'image-type';
import path from 'path';
import lodash from 'lodash';
import { hex2RGBA } from '../../../utils/colors';
import om from 'object-mapper';
import logger from '../../../logging';

import { DefaultBarChart } from '../../../charts/barcharts';
import { DefaultRadarChart } from '../../../charts/radialcharts';
import { DefaultPieChart } from '../../../charts/pie';

import {
  Assessment,
  Survey,
  User,
  Scale,
} from '../../../models';
import { isArray } from 'util';

const { APP_DATA_ROOT } = process.env;

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

const greyscalePng = (path, outpath) => {
  fs.createReadStream(path)
    .pipe(new PNG({
        colorType: 0
    }))
    .on('parsed', function() {          
        this.pack().pipe(fs.createWriteStream(outpath));
    });
}

const resolveData = async ({ surveyId, delegateId }) => {
  logger.info(`Resolving data for Survey Status Survey: ${surveyId}`);
  const { partner, user } = global;

  const survey = await Survey.findById(surveyId)
    .populate('organization')
    .populate('leadershipBrand')
    .populate('delegates.delegate')
    .populate('delegates.assessments')            
    .then();

  logger.info(`Resolved Survey ${survey.delegates.length}`)

  const reportData = {
    meta: {
      author: `${partner.name}`,
      when: moment(),
      user,
      includeAvatar: false,
      partner,
      palette: partner.themeOptions.palette,
      colorSchemes: {
        primary: [ '0A2D51', 'E6A70F', '58595B', '83257C', '3C6899', '3C6899', ...partner.colorScheme() ], 
        secondary: partner.colorScheme(partner.themeOptions.palette.secondary.main),        
      },
    },
    survey,
    delegates: lodash.orderBy(survey.delegates, [ e => e.delegate.lastName, e => e.delegate.firstName], ['asc', 'asc']),
    emails: [],
    timeline: survey.timeline,
    organization: {},
    leadershipBrand: {},
    scale: { entries: [] },
    qualities: [],
    behaviours: [],
    ratings: [],
    charts: {
      timelineChart: null,
      activityFactor: null,
      completedPie: null,      
    },
  };

  try {
    reportData.organization = reportData.survey.organization;
    reportData.leadershipBrand = reportData.survey.leadershipBrand;
    reportData.qualities = reportData.survey.leadershipBrand.qualities;
    reportData.scale = await Scale.findById(reportData.leadershipBrand.scale).then();
    reportData.assessments = await Assessment.find({
      survey: ObjectId(surveyId),       
      })
      .populate('assessor')
      .populate('delegate')
      .then();

    reportData.assessments = lodash.groupBy(reportData.assessments, a => a.delegate._id);

    logger.debug(`Found (${reportData.assessments.length}) assessments`);   
  } catch (err) {
    logger.error('Error occured colating data', err);
  }  
  // render the charts
  const chartsFolder = `${APP_DATA_ROOT}/survey/${reportData.survey._id}/charts/`;
  if (fs.existsSync(chartsFolder) === false) {
    fs.mkdirSync(chartsFolder, { recursive: true });
  }

  let chartResult = null;

  const { colorSchemes, palette } = reportData.meta; 
  
  const launched = lodash.filter(reportData.delegates, { status: 'launched' });
  logger.debug(`Counted ${launched.length} delegates for this survey`)
  const totalDelegates = reportData.delegates.length
  const percentLaunched = Math.floor(launched.length * 100) / totalDelegates;
  
  reportData.stats = {
    launched,
    totalDelegates,
    percentLaunched
  }

  chartResult = await DefaultPieChart({
    folder: chartsFolder,
    file: `overall-launched-card-${reportData.survey._id}.png`,
    width: 800,
    height: 800,
    mime: 'application/pdf',
    data: {
      datasets: [{
        data: [percentLaunched, 100 - percentLaunched],
        backgroundColor: [
          hex2RGBA(`${partner.themeOptions.palette.primary.main}`, 0.5),
          'rgba(255,255,255,0)',
        ],
        borderColor: [
          `${partner.themeOptions.palette.primary.main}`,
          'rgba(255,255,255,0)',
        ],
        borderWidth: [
          1, 0,
        ],
      }],
    },
  }).then();
  logger.debug(`Overall Score Chart Created: ${chartResult.file}`, chartResult);
  
  logger.debug(`PDF::Report Data Generated:`);

  return reportData;
};


export const pdfmakedefinition = (data, partner, user) => {
  logger.debug('Generating PDF definition');
  const scaleSegments = [];
  data.scale.entries.forEach((scale) => {
    if(scale.rating > 0) {
      scaleSegments.push({ text: `${scale.rating} - ${scale.description}`, style: ['default'] });
    }    
  });

  const { palette, includeAvatar = false } = data.meta;

  const tableLayoutOut = {
    fillColor: (rowIndex, node, columnIndex) => {
      logger.debug('PDF::Check table layout fill color', { rowIndex, node, columnIndex });
      return (rowIndex === 1) ? palette.primary.main : null;
    },
  };


  greyscalePng(
    `${APP_DATA_ROOT}/organization/${data.organization._id}/${data.organization.logo}`, 
    `${APP_DATA_ROOT}/organization/${data.organization._id}/greyscale_${data.organization.logo}`
    );

  const coverpage = [
    { text: 'Survey Status Report', style: ['title', 'centerAligned'], margin: [0, 90, 0, 20] },
    { text: `${data.survey.title}`, style: ['header', 'centerAligned'], margin: [0, 15] }, 
    {
      image: 'organizationLogo', width: 240, style: ['centerAligned'], margin: [0, 30, 0, 50],
    },
  ];

  const overview = [
    {
      text: '1. Overview', newPage: 'before', style: ['header', 'primary'], pageBreak: 'before',
    },
    {
      text: [
        `This report provides a detailed view of the survey ${data.survey.title}. The purpose of this report is to provide`,
        ' the facilitator or client liaison to get a detail view of assessments and delegate statusses.',
        'The report is broken down into a high level overview, providing an overall completion graph'
      ],
      style: ['default']
    },
    {
      image: 'overallLaunchedChart', width: 240, style: ['centerAligned'], margin: [0, 30, 0, 50],
    },
    {
      text: `Of the ${data.delegates.length} delegates ${Math.floor(data.stats.percentLaunched)}% have nominated peers and have launched assessments.`,  style: ['centerAligned'], margin: [0, 30, 0, 50]
    },
  ];


  const delegateRows = data.delegates.map((entry, index) => {    
    return [{ text: `${index + 1}.) ${entry.delegate.fullName(true)}`, style: ['default'] }, { text: entry.status, style: ['default'] }];
  });
  

  const delegates = [
    {
      text: '2. Delegates', newPage: 'before', style: ['header', 'primary'], pageBreak: 'before',
    },
    {
      text: 'Below is a table that indicates delegates who have been invited to participate but have not nominated any assessors.', style: ['default']
    },
    {
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['*', 80],
        // layout: 'towerstone',
        body: [
          [{
            text: 'Delegate',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          },
          {
            text: 'Status',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          }],
          ...delegateRows          
        ],       
      },
    }
  ];

  const delegateAssessmentTable = (delegateEntry) => {

    if(delegateEntry.status === 'launched' && delegateEntry.assessments.length > 0) {
      const assessments = data.assessments[delegateEntry.delegate._id];
      let assessorRows = [];
      if(isArray(assessments)) {
        assessorRows = assessments.map((assessment, index) => {
          return [
            { text: `${assessment.assessor ? assessment.assessor.fullName(false) : 'No Assessor'}`, style: ['default'] },
            { text: `${assessment ? assessment.complete : 'ASSESSMENT IS NULL'}`, style: ['default'] }]          
        });  
      }
      
      return {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['*', 60],
        // layout: 'towerstone',
        body: [
          [{
            text: 'Assessor',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          },
          {
            text: 'Complete',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          }],
          ...assessorRows          
        ],       
      };
    } else {
      return {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 0,
        widths: ['*'],
        // layout: 'towerstone',
        body: [
          [{
            text: 'Not Ready - Peers not select / confirmed',            
            style: ['default'],
            color: '#000',
          }],          
        ],       
      };
    }
  };
  
  const assessmentRows = data.delegates.map((entry, index) => {    
    return [
      { text: `${index + 1}.) ${entry.delegate.fullName(true)}`, style: ['default'] }, 
      // { text: entry.assessments.length, style: ['default'] },
      { table: delegateAssessmentTable(entry) },
      { text: entry.status, style: ['default'] }];
  })

  const assessments = [
    {
      text: '3. Assessments', newPage: 'before', style: ['header', 'primary'], pageBreak: 'before',
    },
    {
      text: 'Below is a table that indicates the completion status per delegate for the assessments.'
    },
    {
      table: {
        headerRows: 1,
        widths: [200, 250, 60],
        // layout: 'towerstone',
        body: [
          [{
            text: 'Delegate',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          },
          {
            text: 'Assessors',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff'
          },
          {
            text: 'Status',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          }],
          ...assessmentRows           
        ],
      },
    }
  ];

  return {
    filename: `Survey Assessment Status Report - ${data.survey.title}.pdf`,
    info: {
      title: `Survey Assessment Status Report - ${data.survey.title}.pdf`,
      author: partner.name,
      subject: 'TowerStone Leadership Centre - Survey Status Report',
      keywords: 'Leadership Training Personal Growth',
    },
    content: [
      ...coverpage,
      ...overview,
      ...delegates,
      ...assessments                         
    ],
    header: (currentPage, pageCount) => {
      logger.debug(`Getting header for currentPage: ${currentPage} pageCount: ${pageCount}`);
      if (currentPage > 1) {
        return [
          {
            image: 'partnerAvatar', alignment: 'right', width: 25, margin: [0, 5, 15, 0],
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
            alignment: 'center',
            fontSize: 8,
            margin: [20, 0, 20, 0],
          },
          {
            text: `Survey Status Report - ${data.meta.when.format('DD MMMM YYYY')}`,
            fontSize: 8,
            alignment: 'center',
            margin: [5, 5],
          },
        ];
      }
      return [];
    },
    images: {
      organizationLogo: pdfpng(data.organization.name.indexOf('TowerStone') === 0 ? `${APP_DATA_ROOT}/organization/${data.organization._id}/${data.organization.logo}` : `${APP_DATA_ROOT}/organization/${data.organization._id}/greyscale_${data.organization.logo}`),
      partnerLogo: pdfpng(`${APP_DATA_ROOT}/themes/${partner.key}/images/logo.png`),
      partnerAvatar: pdfpng(`${APP_DATA_ROOT}/themes/${partner.key}/images/avatar.png`),
      overallLaunchedChart: existsSync(`${APP_DATA_ROOT}/survey/${data.survey._id}/charts/overall-launched-card-${data.survey._id}.png`) === true ? `${APP_DATA_ROOT}/survey/${data.survey._id}/charts/overall-launched-card-${data.survey._id}.png` : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/overall-score-chart.png`),
    },
    pageMargins: [40, 60, 40, 60],
    /**
     *
     * Font sizes:
     * First-level heading (i.e. 1,2,3...) - 12pt
     * Second-level heading (i.e. 1.1, 1.2,...) - 11pt
     * Third-level heading (without numbers in this case) 10pt
     * Body text should all be 10pt
     * First-level headings need two line spaces before and two after. Other headings need two line spaces before and one after.
     *
     */
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
        margin: [0, 15, 0, 30],
      },
      subheader: {
        fontSize: 11,
        bold: true,
        font: 'Verdana',
        margin: [0, 15],
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
    tableLayoutOut: {
      towerstone: tableLayoutOut,
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
      title: 'Survey Status Report',
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
  elements: [ ],
};


export default reportTemplate;
