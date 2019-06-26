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
      includeAvatar: false,
      partner,
      palette: partner.themeOptions.palette,
      colorSchemes: {
        primary: partner.colorScheme(),
        secondary: partner.colorScheme(partner.themeOptions.palette.secondary.main),
      },
    },
    delegate: {},
    assessors: [],
    assessments: [],
    survey,
    score: 0,
    organization: {},
    leadershipBrand: {},
    scale: { entries: [] },
    qualities: [],
    behaviours: [],
    developmentPlan: [],
    comments: [],
    ratings: [],
    charts: {
      individualRadar: null,
      avgRadar: null,
      behavourcharts: {

      },
      overallchart: null,
    },
  };

  try {
    reportData.delegate = await User.findById(reportData.survey.delegates.id(delegateId).delegate).then();
    logger.debug(`Found delegate ${reportData.delegate._id}`);
    reportData.organization = reportData.survey.organization;
    reportData.leadershipBrand = reportData.survey.leadershipBrand;
    reportData.qualities = reportData.survey.leadershipBrand.qualities;
    reportData.scale = await Scale.findById(reportData.leadershipBrand.scale).then();
    reportData.assessments = await Assessment.find({ delegate: reportData.delegate._id, survey: ObjectId(surveyId), _id: { $in: reportData.survey.delegates.id(delegateId).assessments } }).populate('assessor').then();
    logger.debug(`Found (${reportData.assessments.length}) assessments`);
    lodash.remove(reportData.assessments, a => a === null || a.complete === false);
    logger.debug(`(${reportData.assessments.length}) assessments after clean`);
    reportData.lowratings = (quality, bar = 2) => {
      return lodash.filter(reportData.ratings, (rating) => { return rating.qualityId.equals(quality._id) && rating.rating <= bar; });
    };

    reportData.ratings = lodash.flatMap(reportData.assessments, assessment => assessment.ratings);
    const otherassessments = lodash.filter(
      reportData.assessments,
      assessment => assessment.isSelfAssessment() === false,
    );

    reportData.ratingsExcludingSelf = lodash.flatMap(
      otherassessments,
      assessment => assessment.ratings,
    );

    reportData.ratingsSelf = lodash.flatMap(
      lodash.filter(
        reportData.assessments,
        assessment => assessment.isSelfAssessment() === false,
      ),
      assessment => assessment.ratings,
    );
  } catch (err) {
    logger.error('Error occured colating data', err);
  }


  reportData.assessors = lodash.filter(lodash.flatMap(reportData.assessments, assessment => assessment.assessor), assessor => !assessor._id.equals(reportData.delegate._id));
  logger.debug(`Assessors are ${reportData.assessors.map(a => `${a.firstName} `)}`);
  if (reportData.ratings.length === 0) {
    reportData.score = -1;
  } else {
    const totalAllRatings = lodash.sumBy(reportData.ratings, r => r.rating);
    reportData.score = Math.floor((totalAllRatings * 100) / (reportData.ratings.length * 5));
  }


  // render the charts
  const chartsFolder = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/charts/`;
  if (fs.existsSync(chartsFolder) === false) {
    fs.mkdirSync(chartsFolder, { recursive: true });
  }

  let chartResult = null;

  const { colorSchemes, palette } = reportData.meta;
  const qualitiesMap = reportData.qualities.map((quality, qi) => {
    const behaviourScores = quality.behaviours.map((behaviour, bi) => {
      logger.debug(`Calculating behaviour score ${quality.title} ==> ${behaviour.description}`);
      try {
        let scoreSelf = 0;
        let scoreAvgAll = 0;
        let scoreAvgOthers = 0;
        const individualScores = [];


        // get the score for all ratings (including self and others)
        let behaviorRatings = lodash.filter(
          reportData.ratings,
          rating => (
            rating.custom !== true &&
          quality._id.equals(rating.qualityId) &&
          behaviour._id.equals(rating.behaviourId)),
        );

        behaviorRatings.forEach((rating) => {
          scoreAvgAll += rating.rating;
          individualScores.push(rating.rating);
        });

        // get the avg
        scoreAvgAll /= behaviorRatings.length;


        // collect ratings excluding self
        behaviorRatings = lodash.filter(
          reportData.ratingsExcludingSelf,
          rating => (
            rating.custom !== true &&
          quality._id.equals(rating.qualityId) &&
          behaviour._id.equals(rating.behaviourId)),
        );

        behaviorRatings.forEach((rating, ri) => {
          scoreAvgOthers += rating.rating;
        });

        scoreAvgOthers /= behaviorRatings.length;

        const selfRating = lodash.filter(
          reportData.ratingsSelf,
          rating => (
            rating.custom !== true &&
          quality._id.equals(rating.qualityId) &&
          behaviour._id.equals(rating.behaviourId)),
        );

        scoreSelf = selfRating ? selfRating.rating : 0;

        return {
          behaviourIndex: bi + 1,
          behaviour,
          scoreSelf,
          scoreAvgAll,
          scoreAvgOthers,
          individualScores,
        };
      } catch (calcError) {
        logger.error('Error calculating score', calcError);

        return {
          behaviourIndex: bi + 1,
          behaviour,
          scoreSelf: 0,
          scoreAvgAll: 0,
          scoreAvgOthers: 0,
          individualScores: [],
        };
      }
    });

    const ratings = {
      all: lodash.filter(reportData.ratings, rating => quality._id.equals(rating.qualityId) && rating.custom !== true),
      self: lodash.filter(reportData.ratingsSelf, rating => quality._id.equals(rating.qualityId) && rating.custom !== true),
      others: lodash.filter(reportData.ratingsExcludingSelf, rating => quality._id.equals(rating.qualityId) && rating.custom !== true),
      low: reportData.lowratings(quality, 2),
      high: lodash.filter(reportData.ratings, rating => quality._id.equals(rating.qualityId) && rating.custom !== true && rating.rating >= 3),
      custom: lodash.filter(reportData.ratings, rating => quality._id.equals(rating.qualityId) && rating.custom === true),
    };

    const scoreByAssessor = (assessor) => {
      logger.debug(`Calculating Score ${assessor.firstName}`);
      const assessment = lodash.find(reportData.assessments, a => assessor._id.equals(a.assessor._id));
      if (assessment) {
        const assessorRatingsForQuality = lodash.filter(
          assessment.ratings,
          r => r.custom !== true && quality._id.equals(r.qualityId),
        );

        if (assessorRatingsForQuality) {
          let totalForQuality = 0;
          assessorRatingsForQuality.forEach((rating) => {
            totalForQuality += rating.rating;
          });

          totalForQuality /= assessorRatingsForQuality.length;
          logger.debug(`Calculating Score by assessor ${assessor.firstName} ${assessor.lastName} => ${totalForQuality}`);
          return totalForQuality;
        }
      }

      return -1;
    };


    return {
      index: qi,
      model: quality,
      behaviours: quality.behaviours,
      ordinal: quality.ordinal,
      color: colorSchemes.primary[colorSchemes.primary.length % (qi === 0 ? 1 : qi)],
      behaviourScores,
      avg: {
        self: lodash.sumBy(ratings.self, r => r.rating) / ratings.self.length,
        all: lodash.sumBy(ratings.all, r => r.rating) / ratings.all.length,
        others: lodash.sumBy(ratings.others, r => r.rating) / ratings.others.length,
      },
      ratings,
      scoreByAssessor: scoreByAssessor.bind(this),
    };
  });


  chartResult = await DefaultRadarChart({
    folder: chartsFolder,
    file: `spider-chart-all-${reportData.survey._id}.png`,
    canvas: true,
    height: 800,
    width: 800,
    mime: 'application/pdf',
    options: {
      scale: {
        // Hides the scale
        display: true,
      },
      title: {
        display: true,
        text: 'Individual Ratings',
      },
    },
    data: {
      labels: qualitiesMap.map(q => q.model.title),
      datasets: lodash.filter(
        reportData.assessors,
        (assessor) => {
          return assessor._id.equals(reportData.delegate._id) === false;
        },
      ).map((assessor, ai) => {
        logger.debug(`Creating Data Set Entry ${ai} -> ${assessor.firstName}`, colorSchemes);
        return {
          label: `Assessor ${ai + 1}`,
          data: qualitiesMap.map(q => q.scoreByAssessor(assessor)),
          backgroundColor: hex2RGBA(`#${colorSchemes.primary[ai]}`, 0.1),
          lineTension: 0.1,
          borderColor: `#${colorSchemes.primary[ai]}`,
          borderWidth: 2,
        };
      }),
    },
  }).then();
  logger.debug(`Radar Chart All Created: ${chartResult.file} `);

  chartResult = await DefaultRadarChart({
    folder: chartsFolder,
    file: `spider-chart-avg-${reportData.survey._id}.png`,
    width: 800,
    height: 800,
    canvas: false,
    mime: 'application/pdf',
    options: {
      scale: {
        // Hides the scale
        display: true,
        fontSize: 16,
      },
      title: {
        display: true,
        text: 'Self vs Peers',
      },
      legend: {
        labels: {
          // This more specific font property overrides the global property
          fontSize: 14,
        },
      },
    },
    data: {
      labels: qualitiesMap.map(q => q.model.title),
      datasets: [{
        label: 'Self',
        data: qualitiesMap.map(q => q.scoreByAssessor(reportData.delegate)),
        lineTension: 0.1,
        backgroundColor: hex2RGBA(palette.primary.main, 0.1),
        borderColor: palette.primary.main,
        borderWidth: 2,
      },
      {
        label: 'Peers Average',
        labels: qualitiesMap.map(q => q.model.title),
        data: qualitiesMap.map(q => q.avg.others),
        backgroundColor: hex2RGBA(palette.secondary.main, 0.1),
        lineTension: 0.1,
        borderColor: palette.secondary.main,
        borderWidth: 1,
      }],
    },
  }).then();
  logger.debug(`Radar Chart Avg Created: ${chartResult.file}`);


  const barchartPromises = qualitiesMap.map((quality) => {
    const datasets = reportData.assessors.map((assessor, ai) => {
      const assessment = lodash.find(reportData.assessments, a => assessor._id.equals(a.assessor._id));
      const qualityratings = lodash.filter(assessment.ratings, r => r.custom !== true && quality.model._id.equals(r.qualityId));
      return {
        label: `Assessor ${ai + 1}`,
        data: qualityratings.map(r => r.rating),
        backgroundColor: hex2RGBA(`#${colorSchemes.primary[ai % colorSchemes.primary.length]}`, 0.4),
        borderColor: hex2RGBA(`#${colorSchemes.primary[ai % colorSchemes.primary.length]}`, 1),
        borderWidth: 2,
      };
    });

    return DefaultBarChart({
      folder: chartsFolder,
      file: `bar-chart-${reportData.survey._id}-${quality.model._id}.png`,
      width: 1200,
      height: 400,
      mime: 'application/pdf',
      options: {
        title: {
          display: true,
          text: quality.model.title,
        },
      },
      data: {
        labels: quality.behaviours.map((b, bi) => `B${bi + 1}`),
        datasets,
      },
    });
  });

  const barchartResults = await Promise.all(barchartPromises).then();
  barchartResults.map(result => logger.debug(`Bar Chart ${result.file} created`));


  chartResult = await DefaultPieChart({
    folder: chartsFolder,
    file: `overall-score-card-${reportData.survey._id}.png`,
    width: 800,
    height: 800,
    mime: 'application/pdf',
    data: {
      datasets: [{
        data: [reportData.score, 100 - reportData.score],
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

  logger.debug(`PDF::Report Data Generated:\n ${JSON.stringify(reportData.assessors, null, 2)}`);

  return reportData;
};


export const pdfmakedefinition = (data, partner, user) => {
  logger.debug('Generating PDF definition');
  const scaleSegments = [];
  data.scale.entries.forEach((scale) => {
    scaleSegments.push({ text: `${scale.rating} - ${scale.description}`, style: ['default'] });
  });

  const { palette, includeAvatar = false } = data.meta;

  const tableLayoutOut = {
    fillColor: (rowIndex, node, columnIndex) => {
      logger.debug('PDF::Check table layout fill color', { rowIndex, node, columnIndex });
      return (rowIndex === 1) ? palette.primary.main : null;
    },
  };

  const qualitiesSection = [
    { text: '3. Qualities', style: ['header', 'primary'], pageBreak: 'before' },
    { text: 'The ratings for your different leadership behaviours have been combined to achieve an average rating for each Leadership Quality.', style: ['default'] },
    { text: '3.1 Individual Ratings', style: ['header', 'primary'] },
    { text: 'The chart below indicates the ratings submitted by the individual assessors.', style: ['default'] },
    {
      image: 'spiderChartAll',
      width: 400,
      height: 400,
      style: ['centerAligned'],
      margin: [0, 40],
    },
    { text: '3.2 Aggregate Ratings', style: ['header', 'primary'], pageBreak: 'before' },
    { text: 'The chart below indicates the combined ratings for all assessors.', style: ['default'] },
    {
      image: 'spiderChartAvg',
      width: 400,
      height: 400,
      style: ['centerAligned'],
      margin: [0, 40],
    },
  ];

  const behaviourSection = [
    { text: '4 Behaviours', style: ['header', 'primary'], pageBreak: 'before' },
    { text: 'The charts in this section indicate the ratings given by your assessors for each behaviour', style: ['default'] },
  ];


  data.qualities.forEach((quality, qi) => {
    behaviourSection.push({ text: `4.${qi + 1} ${quality.title}`, style: ['header', 'primary'], pageBreak: qi === 0 ? 'auto' : 'before' });

    quality.behaviours.forEach((behaviour, bi) => {
      behaviourSection.push({ text: `B${bi + 1} - ${behaviour.description}`, style: ['default'] });
    });

    behaviourSection.push({
      image: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) === true ?
        pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) :
        pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/bar_chart.png`),
      width: 500,
      height: 200,
    });

    const lowratingsForQuality = data.lowratings(quality, 2);

    if (lodash.isArray(lowratingsForQuality) === true && lowratingsForQuality.length > 0) {
      behaviourSection.push({ text: 'Start Behaviours', style: ['subheader', 'primary'] });
      behaviourSection.push({ text: 'You received low ratings for the behaviours below which means that your colleagues are not noticing these behaviours in the way you show up.', margin: [0, 5] });
      behaviourSection.push({ text: 'Pay special attention to developing and displaying these behaviours on a daily basis.' });

      quality.behaviours.forEach((behaviour) => {
        const lowratingsForBehaviour = lodash.filter(lowratingsForQuality, r => behaviour._id.equals(r.behaviourId));
        const lowRatingRowElements = lowratingsForBehaviour.map(r => [{ text: r.comment, style: ['default'] }]);
        if (lowRatingRowElements.length > 0) {
          behaviourSection.push({
            table: {
              // headers are automatically repeated if the table spans over multiple pages
              // you can declare how many rows should be treated as headers
              layout: 'towerstone',
              headerRows: 1,
              widths: ['*'],
              body: [
                [{
                  text: behaviour.description, fillColor: palette.primary.main, style: ['default'], color: '#fff',
                }],
                ...lowRatingRowElements,
              ],
            },
          });
        }
      });
    }

    const customLowRatingsForQuality = lodash.filter(data.lowratings(quality, 5), rating => rating.custom);
    behaviourSection.push({ text: 'Additional Comments', style: ['header', 'primary'] });

    behaviourSection.push({ text: 'The assessors have provided some additional behaviours and how it impacts others (them)', style: ['default'] });
    const customRowEntries = customLowRatingsForQuality.map(custom => [{ text: custom.behaviourText }, { text: custom.comment }]);
    behaviourSection.push({
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['*', '*'],
        // layout: 'towerstone',
        body: [
          [{
            text: 'Behaviour',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          },
          {
            text: 'How this impacts others',
            fillColor: palette.primary.main,
            style: ['default'],
            color: '#fff',
          }],
          ...customRowEntries,
        ],
      },
    });
  });


  const overallSection = [
    { text: '5 Overall', pageBreak: 'before', style: ['header', 'primary'] },
    { text: 'This is the result of averaging the behaviours within all the values, from each assessor, excluding your selfassessment.', style: ['default'] },
    {
      text: ['Your overall score for this assessment is'], style: ['subheader'], alignment: 'center', margin: [0, 40],
    },
    { text: `${data.score}%`, style: ['header', 'primary'], alignment: 'center' },
    {
      image: 'overallScoreChart', width: 350, height: 350, alignment: 'center', margin: [20, 40, 20, 40],
    },
  ];

  const developmentPlan = [
    { text: '6 Development Plan', pageBreak: 'before', style: ['header', 'primary'] },
    { text: '6.1 Reflection', style: ['subheader', 'primary'] },
    { text: 'The purpose of this assessment is to assist you in modelling the TowerStone Leadership Brand more effectively as a team. The development plan is designed to guide your reflection on the feedback, and then facilitate identifying actions for improvement.', style: ['default'] },
  ];


  const dottedText = '........................................................................................................................................';

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
    { text: '6.2 Next Actions', style: ['subheader', 'primary'], pageBreak: 'before' },
    {
      text: ['Your development as a team requires that you commit to specific actions that will initiate change in your ',
        `collective behaviour so that your colleagues see you modelling the ${data.organization.name} Leadership Brand.`],
      style: ['default'],
    },
    { text: 'Start', style: ['subheader', 'primary'] },
    { text: 'These are the leadership behaviours your assessors have said you are not currently displaying:', style: ['default'] },

    { text: 'Identify actions to start displaying these leadership behaviours:', style: ['default'] },
    {
      table: {
      // headers are automatically repeated if the table spans over multiple pages
      // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['*', 150, 150],
        layout: 'towerstone',
        body: [
          [
            {
              text: 'Action', fillColor: palette.primary.main, color: '#fff', style: ['default'],
            },
            {
              text: 'Outcome', fillColor: palette.primary.main, color: '#fff', style: ['default'],
            },
            {
              text: 'Deadline', fillColor: palette.primary.main, color: '#fff', style: ['default'],
            },
          ],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
          ['\n', '', ''],
        ],
      },
    },
  ];

  const acceptance = [
    { text: '7 Acceptance and Commitment', style: ['subheader', 'primary'], pageBreak: 'before' },
    { text: 'I accept and commit to addressing the feedback presented in this assessment, by taking the actions listed within the agreed timeframes.', style: ['default'] },
    { text: 'Signed: ................................     Date: ...................................................... ', margin: [0, 20], style: ['default'] },
    { text: 'Manager: ...............................     Date: ...................................................... ', margin: [0, 20], style: ['default'] },
  ];

  const facilitatornotes = [
    { text: '8. TowerStone facilitators notes', style: ['header', 'primary'], pageBreak: 'before' },
  ];

  for (let row = 0; row < 15; row += 1) {
    facilitatornotes.push({ text: dottedText, style: ['default'], lineHeight: 2 });
  }

  return {
    filename: `360° Leadership Assessment Report - ${data.delegate.firstName} ${data.delegate.lastName}.pdf`,
    info: {
      title: `360° Leadership Assessment Report - ${data.delegate.firstName} ${data.delegate.lastName}`,
      author: partner.name,
      subject: 'TowerStone Leadership Centre - 360° Leadership Assessment Report',
      keywords: 'Leadership Training Personal Growth',
    },
    content: [
      { text: '360° Leadership Assessment', style: ['title', 'centerAligned'], margin: [0, 90, 0, 20] },
      { text: `${data.delegate.firstName} ${data.delegate.lastName}`, style: ['header', 'centerAligned'], margin: [0, 15] },
      includeAvatar === true ?
        {
          image: 'delegateAvatar', width: 120, style: ['centerAligned'], margin: [0, 15],
        } : undefined,
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
      {
        qr: `${partner.siteUrl}/reports/towerstone/delegate-360-assessment/${data.survey._id}/${data.delegate._id}`,
        fit: '180',
        alignment: 'center',
        foreground: palette.primary.main,
        background: palette.primary.contrastText,
        margin: [0, 30],
      },
      {
        text: [
          'To view an online / updated version of this report,',
          { text: ' click on the link', link: `${partner.siteUrl}/reports/towerstone/delegate-360-assessment/${data.survey._id}/${data.delegate._id}`, bold: true },
          ' or scan the QR code above with your mobile device.'],
        italics: true,
        color: palette.primary.main,
        style: ['default', 'centered'],
      },
    ],
    header: (currentPage, pageCount) => {
      logger.debug(`Getting header for currentPage: ${currentPage} pageCount: ${pageCount}`);
      if (currentPage > 1) {
        return [
          {
            image: 'partnerAvatar', alignment: 'right', width: 32, margin: [0, 5, 15, 0],
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
            text: `Individual  Leadership Brand 360° Assessment for ${data.delegate.firstName} ${data.delegate.lastName} - ${data.meta.when.format('DD MMMM YYYY')}`,
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
      spiderChartAvg: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-avg-${data.survey._id}.png`) === true ? (`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-avg-${data.survey._id}.png`) : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/spider-chart-avg.png`),
      overallScoreChart: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/overall-score-card-${data.survey._id}.png`) === true ? `${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/overall-score-card-${data.survey._id}.png` : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/overall-score-chart.png`),
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
        margin: [0, 15],
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