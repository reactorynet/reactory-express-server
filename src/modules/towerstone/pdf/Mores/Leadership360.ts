
import moment from 'moment';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import { resolve as resolvePath } from 'path';
import { readFileSync, existsSync } from 'fs';
import { PNG } from 'pngjs';
import svg_to_png from 'svg-to-png';
import imageType from 'image-type';
import lodash from 'lodash';
import { hex2RGBA } from '@reactory/server-core/utils/colors';
import om from 'object-mapper';
import logger from '@reactory/server-core/logging';

import { DefaultBarChart } from '@reactory/server-core/charts/barcharts';
import { DefaultRadarChart } from '@reactory/server-core/charts/radialcharts';
import { DefaultPieChart } from '@reactory/server-core/charts/pie';
import { DefaultPolarAreaChart } from '@reactory/server-core/charts/polararea';

import {
  Assessment,
  Survey,
  User,
  Scale,
  Content
} from '@reactory/server-core/models';

import {
  Cache
} from '@reactory/server-modules/core/models';
import { TowerStone } from 'modules/towerstone/towerstone';
import { fileAsString } from 'utils/io';

const { APP_DATA_ROOT } = process.env;

const badref = `${APP_DATA_ROOT}/themes/mores/images/badref.png`;
const oneview_svg = `${APP_DATA_ROOT}/themes/mores/images/one_view_l360.svg`;
const oneview_png_folder = `${APP_DATA_ROOT}/themes/mores/images/`;
const oneview_png = `${oneview_png_folder}one_view_l360.png`;


const pdfpng = (path) => {
  let buffer = null;
  let returnpath = path;
  try {
    buffer = readFileSync(path);
  } catch (fileError) {
    logger.error(`🚩 Error reading file ${path}`, fileError);
    returnpath = resolvePath(badref);
    buffer = readFileSync(returnpath);
  }

  try {
    const { mime } = imageType(buffer);
    if (mime === 'image/png') {
      const png = PNG.sync.read(buffer);
      if (png.interlace) {
        buffer = PNG.sync.write(png, { interlace: false });
      }
      return buffer;
    }
  } catch (buffErr) {
    logger.error(`🚩 Error processing image ${path}`, fileError);
    returnpath = badref;
  }


  return returnpath;
};

const sectionIndex = ['A','B','C','D', 'E', 'F'];

const greyscalePng = (path, outpath) => {
  fs.createReadStream(path)
    .pipe(new PNG({
      colorType: 0
    }))
    .on('parsed', function () {
      this.pack().pipe(fs.createWriteStream(outpath));
    });
};


const resolveData = async ({ surveyId, delegateId }) => {
  logger.info(`Resolving data for MoresIndividual360 Survey: ${surveyId}  DelegateEntry: ${delegateId}`);
  // const assessment = await Assessment.findById(assessment_id).then();

  try {
    const { partner, user } = global;

    const survey = await Survey.findById(surveyId)
      .populate('organization')
      .populate('leadershipBrand')
      .then();


    if (survey === null || survey === undefined) return null;


    const reportData = {
      meta: {
        author: `${partner.name}`,
        when: moment(),
        user,
        includeAvatar: false,
        partner,
        palette: partner.themeOptions.palette,
        colorSchemes: {
          primary: partner.colorScheme(partner.themeOptions.palette.primary.main),
          secondary: partner.colorScheme(partner.themeOptions.palette.secondary.main),
          palette: partner.themeOptions.palette,
        },
      },
      employeeDemographics: {
        pronoun: null
      },
      key: `mores.survey@${surveyId}/${delegateId}/report-data`,
      delegate: {},
      employee: {}, //alias for delegate
      assessors: [],
      assessments: [],
      qualityComments: [],
      qualityActions: [],
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

    let maxRating = 5;   

    try {
      reportData.delegate = await User.findById(reportData.survey.delegates.id(delegateId).delegate).then();
      reportData.employee = reportData.delegate;
      logger.debug(`Found delegate ${reportData.delegate._id}`);
      reportData.organization = reportData.survey.organization;
      reportData.leadershipBrand = reportData.survey.leadershipBrand;
      reportData.qualities = reportData.survey.leadershipBrand.qualities;
      reportData.scale = await Scale.findById(reportData.leadershipBrand.scale).then();

      try {
        maxRating = reportData.scale.maxRating();
        logger.debug(`Max Rating ==> ${maxRating}`)
      } catch (err) {
        //could not get max via scale
        logger.error('Could not get max rating from scale', err);
      }

      reportData.assessments = await Assessment.find({
        delegate: reportData.delegate._id,
        survey: ObjectId(surveyId),
        _id: {
          $in: reportData.survey.delegates.id(delegateId).assessments
        },
        complete: true,
      }).populate('assessor')
        .populate('delegate').then();

      let commentKeys: string[] = [];
      let recommendationKeys: string[] = [];

      reportData.qualities.forEach((quality: TowerStone.IQuality, qi: number) => {
        recommendationKeys.push(`mores-survey-${survey.id}-section_${quality.id}-AdminCustomAction`)
        reportData.assessments.forEach((assessment: TowerStone.IAssessment, ai: number) => {
          commentKeys.push(`mores-survey-${survey.id}-assessment_${assessment.id}-section_${quality.id}-assessor_${assessment.assessor.id}-CustomComment`)          
        })      
      })
        
      reportData.qualityComments = await Content.find({
        slug: {
          $in: commentKeys
        }
      }).then();

      reportData.qualityActions = await Content.find({
        slug: {
          $in: recommendationKeys
        }
      }).then();

      logger.debug(`Found (${reportData.assessments.length}) assessments`);
      lodash.remove(reportData.assessments, a => a === null || a.complete === false);
      logger.debug(`(${reportData.assessments.length}) assessments after clean`);
      reportData.lowratings = (quality, bar = 2) => {
        return lodash.filter(reportData.ratings, (rating) => { return rating.qualityId.equals(quality._id) && rating.rating <= bar; });
      };

      reportData.ratings = lodash.flatMap(reportData.assessments, assessment => {
        return assessment.ratings.map((rating) => {
          rating.assessor = assessment.assessor;
          return rating;
        });
      });
      const otherassessments = lodash.filter(
        reportData.assessments,
        assessment => assessment.delegate._id.equals(assessment.assessor._id) === false,
      );

      reportData.ratingsExcludingSelf = lodash.flatMap(
        otherassessments,
        (assessment) => {
          return assessment.ratings.map((rating) => {
            rating.assessor = assessment.assessor;
            return rating;
          })
        });

      reportData.ratingsSelf = lodash.flatMap(
        lodash.filter(
          reportData.assessments,
          assessment => assessment.delegate._id.equals(assessment.assessor._id) === true,
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
      const totalAllRatings = lodash.sumBy(reportData.ratingsExcludingSelf, r => r.rating);
      reportData.score = Math.floor((totalAllRatings * 100) / (reportData.ratingsExcludingSelf.length * maxRating));
    }


    // render the charts
    const chartsFolder = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/charts/`;
    if (fs.existsSync(chartsFolder) === false) {
      fs.mkdirSync(chartsFolder, { recursive: true });
    }

    let chartResult = null;

    const { colorSchemes, palette } = reportData.meta;
    const qualitiesMap: any[] = [];
    reportData.qualities.forEach((quality, qi) => {
      const behaviourScores = quality.behaviours.map((behaviour: TowerStone.IBehaviour, bi: number) => {
        logger.debug(`Calculating behaviour score ${quality.title} ==> ${lodash.template(behaviour.description)(reportData)}`);
        let scoreSelf = 0;
        let scoreAvgAll = 0;
        let scoreAvgOthers = 0;
        let behaviorRatings = [];
        const individualScores: any[] = [];
        try {

          // get the score for all ratings (including self and others)
          logger.debug('Filtering ratings by quality and behaviour id');
          behaviorRatings = lodash.filter(
            reportData.ratings,
            rating => (
              rating.custom !== true &&
              quality._id.equals(rating.qualityId) &&
              behaviour._id.equals(rating.behaviourId)),
          );


          logger.debug('Summing ratings');
          behaviorRatings.forEach((rating) => {
            logger.debug(`Adding rating by ${rating.assessor.firstName}`);
            scoreAvgAll += rating.rating;
            individualScores.push(rating.rating);
          });

          // get the avg
          scoreAvgAll /= behaviorRatings.length;
          logger.debug(`Average for all calculated ${scoreAvgAll}`);

          // collect ratings excluding self
          logger.debug('Filtering for average for peers');
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

          scoreAvgOthers = scoreAvgOthers / behaviorRatings.length;
          logger.debug(`Average for all peers ${scoreAvgOthers}`);

          const selfRating = lodash.filter(
            reportData.ratingsSelf,
            rating => (
              rating.custom !== true &&
              quality._id.equals(rating.qualityId) &&
              behaviour._id.equals(rating.behaviourId)),
          );

          scoreSelf = lodash.isArray(selfRating) === true && selfRating.length >= 1 ? selfRating[0].rating : 0;
          logger.debug(`Score for self ${scoreSelf}`);

          return {
            behaviourIndex: bi + 1,
            behaviour,
            scoreSelf,
            scoreAvgAll,
            scoreAvgOthers,
            individualScores,
          };
        } catch (calcError) {
          logger.error(`Error calculating score "${calcError.message}"`, calcError);

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

      const scoreByBehaviour = (behaviour: TowerStone.IBehaviour) => {
        return 3.2
      };
         
      qualitiesMap.push({
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
        scoreByBehaviour: scoreByBehaviour.bind(this),
      });      
    });
  
    logger.debug(`qualitiesMap created`);

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
          lineTension: 0,          
          borderColor: palette.primary.main,
          borderWidth: 2,
        },
        {
          label: 'Peers Average',
          labels: qualitiesMap.map(q => q.model.title),
          data: qualitiesMap.map(q => q.avg.others),          
          lineTension: 0,
          borderColor: palette.secondary.main,
          borderWidth: 2,
        }],
      },
    }).then();
    logger.debug(`Radar Chart Avg Created: ${chartResult.file}`);


    const barchartPromises = qualitiesMap.map((quality: TowerStone.IQuality, qi: number) => {

      const datasets = []
      
      /*
      reportData.assessors.map((assessor, ai) => {
        const qualityratings = quality.ratings.others;
        return {
          label: `Assessor ${ai + 1}`,
          data: lodash.sortBy(lodash.filter(qualityratings, rating => rating.assessor._id === assessor._id), 'ordinal').map(r => r.rating),
          backgroundColor: hex2RGBA(`#${colorSchemes.primary[ai % colorSchemes.primary.length]}`, 0.4),
          borderColor: hex2RGBA(`#${colorSchemes.primary[ai % colorSchemes.primary.length]}`, 1),
          borderWidth: 2,
        };
      });
      */
      const selfQualityratings = lodash.filter(reportData.ratingsSelf, r => r.custom !== true && quality.model._id.equals(r.qualityId));

      datasets.push({
        data: selfQualityratings.map(rating => rating.rating),
        label: 'Self',
        //type: 'line',
        backgroundColor: hex2RGBA(`${colorSchemes.palette.secondary.main}`, 1),
        borderColor: reportData.meta.palette.primary.main,
        borderWidth: 2,
        lineTension: 0,
      });


      datasets.push({
        data: quality.behaviourScores.map(behaviourScore => {
          return behaviourScore.scoreAvgOthers
        }),
        label: 'Avg. Peers',
        backgroundColor: hex2RGBA(`${colorSchemes.palette.error.main}`, 1),
        //type: 'line',
        borderColor: reportData.meta.palette.primary.main,        
        borderWidth: 2,
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
          labels: quality.behaviours.map((b, bi) => `${sectionIndex[qi]}${bi + 1}`),
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
    
    Cache.setItem(reportData.key, reportData, 60);

    return reportData;
  } catch (unhandledException) {
    logger.error(`An unhandled error occured processing the PDF ${unhandledException.message}`, unhandledException);
    return null;
  }
};


const definition = (data, partner, user) => {
  logger.debug('Generating PDF definition For Mores Assessment Leadership 360 Report');


  const scaleSegments = [];
  const isPlcReport = data.survey.surveyType === 'plc';

  data.scale.entries.forEach((scale) => {
    if (scale.rating > 0) {
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


  const coverPage = [
    {
      image: 'partnerLogo', width: 250, style: ['centerAligned'], margin: [0, 0, 0, 20],
    },
    { text: 'Leadership 360° Assessment', style: ['title', 'centerAligned'], margin: [0, 10, 0, 10] },
    { text: `${data.delegate.firstName} ${data.delegate.lastName}`, style: ['header', 'centerAligned', 'secondary'], margin: [0, 5] },
    { text: `${data.organization.name}`, style: ['header', 'centerAligned', 'secondary'] },
    {
      image: 'organizationLogo', width: 150, style: ['centerAligned'], margin: [0, 30, 0, 30],
    },
    {
      toc: {
        // title: { text: 'Sections', style: ['subheader', 'secondary'] },
        //textMargin: [0, 0, 0, 0],
        //textStyle: {italics: true},
        numberStyle: { bold: true }
      }
    },
    /*
    { text: `Section A: Welcome .................................................................... 2`, style: ['default']},
    { text: `Section B: Dashboard .................................................................. 5`, style: ['default']},
    { text: `Section C: Detailed Results ........................................................... 7`, style: ['default']},
    { text: `Section D: Areas to Watch ............................................................. 13`, style: ['default']},
    { text: `Section E: My Growth Plan ............................................................. 14`, style: ['default']},
    */
  ]


  const introductionSection = [
    {
      text: 'Section A: Welcome', newPage: 'before', style: ['header', 'secondary'], pageBreak: 'before',
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 5, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
    },
    {
      text: `${data.delegate.firstName}, report presents the results of your individual self-assessment compared with the feedback from nominated ACME Corporation colleagues who assessed you.\n`,
      style: ['default'],
    },
    {
      text: 'How to use this Report',
      style: ['subheader', 'primary']
    },
    {
      text: [
        'The Mores Leadership 360° Assessment provides insight to help you grow and model behaviours that will best serve your leadership needs.\n',
        'This report consists of the following sections:\n'
      ],
      style: ['default'],
    },
    {
      image: 'sectionOverview', width: 500, style: ['centerAligned'], margin: [0, 30, 0, 50],
    },
    {
      text: 'Make your growth plan a living document through daily reflection and weekly review. Consider how to use feedback from your teams and colleagues to enrich this process.',
      style: ['default', 'italic']
    },
    {
      text: 'The TowerStone Leadership Essentials© Model',
      style: ['subheader', 'primary']
    },
    {
      text: `Informed by decades of experience and timeless leadership theory, the TowerStone Leadership Essentials© model distils the individual and organisational competencies that leaders care about most. It is designed to be practical and applies to leadership in any situation or organisation.`,
      style: ['default'],
    },
    {
      text: 'The model was designed using inputs from leading-edge theory:',
      style: ['default'],
    },
    {
      ul: [
        {
          text: `Ken Wilber's Integral Framework©`,
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            {
              text: `- The four lenses of human experience (individual and collective; visible behaviours and invisible motives)`,
              style: ['default'],
            },
          ]
        },
      ],
    },
    {
      ul: [
        {
          text: `Maslow’s Hierarchy of Needs/ The Barrett Model™`,
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            `- Our lower-level needs driven by fear.`,
            `- Our need to learn and adapt.`,
            `- Our higher-level needs based on purpose.`
          ],
          style: ['default'],
        },
      ],
    },
    {
      ul: [
        {
          text: `Dr David Rock’s SCARF© Approach`,
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            {
              text: [
                `- Using the neuroscience of minimising threat and maximising reward for relationship building.\n`,
              ],
              style: ['default'],
            }
          ],
        },
      ],
    },
    {
      ul: [
        {
          text: `Covey’s Tree of Trust©`,
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            `- Building competence.`,
            `- Embracing character.`,
          ],
          style: ['default'],
        },
      ],
    },

    {
      text: 'The Mores Leadership Assessment© Framework',
      style: ['subheader', 'primary'],
      newPage: 'before'
    },

    {
      text: `Covering the full spectrum of human needs – from self-development to organisational purpose – the Mores Assessment framework comprises six elements with three questions per element.`,
      style: ['default'],
    },
    {
      text: [
        `Questions are designed to elicit both  perspectives.`,
        { text: `head (factual/impersonal)`, style: ['default', 'primary'] },
        ' and ',
        { text: 'heart (emotive/personal)', style: ['default', 'secondary'] },
        ' perspectives.'
      ],
      style: ['default']
    },
    {
      text: `Average ratings for the 18 questions are mapped across the six elements with a summary score per element as per the sample below.`,
      style: ['default']
    },
    {
      image: 'individualHoneycomb', width: 350, style: ['centerAligned'], margin: [0, 30, 0, 50],
    },       
  ];

  const scaleSection: any[] = [
    {
      newPage: 'before',
      text: 'The Rating Scale',
      style: ['header', 'primary'],
      margin: [0, 30, 0, 30]
    },
    { text: 'The five-point rating scale measures how strongly participants agree or disagree with a behavioural statement, including the typical emotion associated with that rating:', style: ['default'] },
  ];

  [
    { id: 1, title: 'Strongly Disagree ', heart: "(I'm out the door)", head: `“I’m fed up and want you to know that”` },
    { id: 2, title: 'Disagree ', heart: "(One foot in, one foot out the door)", head: `“I’m frustrated and things need to change now”` },
    { id: 3, title: 'Neutral ', heart: "(I don’t know where the door is)", head: `“I either don’t care or can’t comment””` },
    { id: 4, title: 'Agree ', heart: "(We need new doors to open)", head: `“We are doing well and there’s room for improvement”` },
    { id: 5, title: 'Strongly Agree ', heart: "(We need to build new doors)", head: `“Let’s look for new challenges”` }
  ].forEach((rating) => {
    scaleSection.push(
      {
        text: [
          { text: `${rating.id}.  `, style: ['default', 'bold'], margin: [10, 10, 5, 0] },
          { text: rating.title, style: ['default', 'bold'] },
          { text: rating.heart, style: ['default', 'italic', 'secondary'], margin: [40, 10, 5, 0] },
        ]
      });

    scaleSection.push({
      text: rating.head,
      style: ['default', 'primary']
    })
  });

  scaleSection.push({
    text: 'Consider the following when reviewing the results:',
    style: ['default']
  });

  scaleSection.push({
    image: 'ratingScale', 
    width: 150, aligntment: 'right', margin: [0, 30, 0, 50]
  });

  scaleSection.push({
    text: [
      { text: '• Low ratings (1 or 2): ', style: ['default'], bold: true },
      `There is negativity and frustration, yet the respondent cares enough to give you an honest opinion i.e. engagement level is strong and your focus should be on these responses first.`
    ],
    style: ['default']
  });

  scaleSection.push({
    text: [
      { text: '• Mid-range rating (3): ', style: ['default'], bold: true },
      `The ‘OK’ response is a red flag as it could indicate a low level of engagement, mediocrity (comfort zone) or inconsistent behaviours.`
    ],
    style: ['default']
  });

  scaleSection.push({
    text: [
      { text: 'High ratings (4 or 5): ', style: ['default'], bold: true },
      `This indicates high levels of engagement and buy-in. However, avoid complacency and keep working on your strengths.`
    ],
    style: ['default']
  });

  const dashboardChartSize = 60;
  const dashboardChartMargin = 5;

  /*
        {
          image: 'overallScoreChart', 
          width: dashboardChartSize, 
          height: dashboardChartSize, 
          alignment: 'left', 
          margin: [20, dashboardChartMargin, 20, dashboardChartMargin],
        },

        {
          image: 'overallScoreChart', 
          width: dashboardChartSize, 
          height: dashboardChartSize, 
          alignment: 'left', 
          margin: [20, dashboardChartMargin, 20, dashboardChartMargin],
        },

        
        { text: "Your Score", style: ['default', 'primary'], alignment: 'left' },


        { text: 'Comparison per Section', style: ['subheader', 'primary'], alignment: 'right', margin: [0, -1*(dashboardChartSize+dashboardChartMargin), 0, 0], },
      
      {
        image: 'spiderChartAvg',
        width: dashboardChartSize,
        height: dashboardChartSize,
        alignment: 'right',
        margin: [0, -1*(dashboardChartSize+dashboardChartMargin), 0, 0],
      },

      */


  const qualitiesSection = [
    {
      text: 'Section B: Dashboard', style: ['header', 'secondary'], pageBreak: 'before',
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 10, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
    },
    {      
      margin: [0, -20, 0, 0 ],
      table: {
        widths: [250, 250],
        //headerRows: ,
        // dontBreakRows: true,
        // keepWithHeaderRows: 1,
        body: [
          [{
            text: 'Overall Score',
            style: ['subheader', 'primary'],
            alignment: 'center',
            border: [false, false, false, false]
          },
          {
            text: 'Comparison per Section',
            style: ['subheader', 'primary'],
            alignment: 'center',
            border: [false, false, false, false]
          },
          ],
          [            
            {
              alignment: 'center',
              border: [false, false, false, false],
              margin: [30, 0, 0, 30],
              table: {
                widths: ['auto'],
                body: [
                  [
                    {
                      image: 'overallScoreChart',
                      height: dashboardChartSize,
                      width: dashboardChartSize,
                      margin: [20, dashboardChartMargin, 20, dashboardChartMargin],
                      alignment: 'center',
                      border: [false, false, false, false]
                    },
                  ],
                  [
                    {
                      text: "Raters's average score",
                      style: ['default', 'primary'],
                      alignment: 'center',
                      fontSize: 8,
                      border: [false, false, false, false]
                    },
                  ],
                  [
                    {
                      image: 'overallScoreChart',
                      height: dashboardChartSize,
                      width: dashboardChartSize,
                      margin: [20, dashboardChartMargin, 20, dashboardChartMargin],
                      alignment: 'center',
                      border: [false, false, false, false]
                    },                    
                  ],
                  [
                    {
                      text: "Your score",
                      style: ['default', 'primary'],
                      alignment: 'center',
                      fontSize: 8,
                      border: [false, false, false, false]
                    },                    
                  ],
                ]
              }
            },              
            {
              image: 'spiderChartAvg',
              height: 200,
              width: 200,
              margin: [20, dashboardChartMargin, 20, dashboardChartMargin],
              alignment: 'center',
              border: [false, false, false, false]
            }
          ],                    
        ]
      }
    },
    {
      text: "One View",
      style: ['subheader', 'primary'],
      margin: [0, -20, 0, 0]
    },
    {
      image: 'individualHoneycomb',
      height: 350,
      width: 350,
      style: ['centerAligned'],
      margin: [20, 10, 20, 10],
    },
    {
      text: "Priority Behaviours", style: ['header', 'primary'],
      newPage: 'before'
    },
    {
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['auto', 10, 'auto'],
        body: [
          [
            {
              text: 'New Habit', fillColor: palette.secondary.main, color: '#fff', style: ['default'], alignment: 'center', bold: true,
            },
            {
              text: '', style: ['default'], border: [false, false, false, false],
            },
            {
              text: 'Lowest Rated Behaviors', fillColor: palette.error.main, color: '#fff', style: ['default'], alignment: 'center', bold: true,
            },
          ],
          [
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
            {
              text: '', border: [false, false, false, false]
            },
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
          ],
          [
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
            {
              text: '', border: [false, false, false, false]
            },
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
          ],
          [
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
            {
              text: '', border: [false, false, false, false]
            },
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
          ],
          [
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
            {
              text: '', border: [false, false, false, false]
            },
            {
              text: [
                `F2`,
                `Jane’s personal purpose and values are aligned to ACME Corporation’s purpose and brand promise.`,
                `Jane loves what she does. (4.3)`
              ]
            },
          ],
        ],
      }
    }
  ];

  const behaviourSection: any[] = [
    {
      text: 'Section C: Detailed Results', style: ['header', 'primary'], pageBreak: 'before',
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 10, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
      margin: [0, 10, 0, 0]
    },
    { text: 'Individual Ratings per behaviour.', style: ['default', 'primary'],  margin: [0, 10, 0, 0] },
  ];


  

  data.qualities.forEach((quality: TowerStone.IQuality, qi: number) => {
    behaviourSection.push({ text: `${quality.title}`, style: ['subheader', 'secondary'],   margin: [0, 10, 0, 0],  pageBreak: qi === 0 ? 'auto' : 'before' });
    behaviourSection.push({ text: `${quality.description}`,  style: ['subheader', 'primary'],   margin: [0, 10, 0, 0], italics: true });

    
    behaviourSection.push({
      image: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) === true ?
        pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) :
        pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/bar_chart.png`),
      width: 500,
      height: 200,
    });

    quality.behaviours.forEach((behaviour: TowerStone.IBehaviour, bi: number) => {
      behaviourSection.push({ text: [`${sectionIndex[qi]}${bi + 1}`, { text: `${lodash.template(behaviour.title)(data)}`, style: ['primary'] }], style: ['default'] });
      behaviourSection.push({ text: `${lodash.template(behaviour.description)(data)}`, style: ['default', 'secondary'], italics: true });
    });

    behaviourSection.push({
      table: {
        body: [
          [
            { 
              image: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}-counts.png`) === true ?
              pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}-counts.png`) :
              pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/bar_chart.png`),
              width: 300,
              height: 200,
            },
            {
              table: {
                body: [
                  [
                    { text: 'lorem ipsum dollar sit amet'}
                  ],
                  [
                    { text: 'lorem ipsum dollar sit amet'}
                  ],
                  [
                    { text: 'lorem ipsum dollar sit amet'}
                  ]
                ]
              }
            }
          ]
        ]
      }      
    });
    

    const lowratingsForQuality = data.lowratings(quality, 2);

    if (lodash.isArray(lowratingsForQuality) === true && lowratingsForQuality.length > 0) {
      behaviourSection.push({ text: 'Start Behaviours', style: ['default', 'primary'], margin: [0, 10, 0, 5], bold: true });
      behaviourSection.push({ text: 'You received low ratings for the behaviours below which means that your colleagues are not noticing these behaviours in the way you show up.', style: ['default'], margin: [0, 5] });
      behaviourSection.push({ text: 'Pay special attention to developing and displaying these behaviours on a daily basis.\n\n', style: ['default'] });

      quality.behaviours.forEach((behaviour) => {
        const lowratingsForBehaviour = lodash.filter(lowratingsForQuality, r => r.custom !== true && behaviour._id.equals(r.behaviourId));
        const lowRatingRowElements = lowratingsForBehaviour.map(r => [{ text: r.comment ? r.comment : 'No comment available', style: ['default'] }]);
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
                  text: lodash.template(behaviour.description)(data), fillColor: palette.primary.main, style: ['default'], color: '#fff', bold: true
                }],
                ...lowRatingRowElements,
              ],
            },
          });
        }
      });
    }

    const customLowRatingsForQuality = lodash.filter(data.lowratings(quality, 5), rating => rating.custom && lodash.isEmpty(rating.behaviourText) === false);
    if (customLowRatingsForQuality.length > 0) {
      behaviourSection.push({ text: 'Additional Comments', style: ['default', 'primary'], bold: true, margin: [0, 0, 0, 10], pageBreak: 'before' });
      behaviourSection.push({ text: `The assessors have provided some the following additional behaviour${customLowRatingsForQuality.length > 1 ? 's' : ''} and how it impacts others (them).`, style: ['default'], margin: [0, 0, 0, 15] });

      let customRowEntries = customLowRatingsForQuality.map(custom => [{ text: custom.behaviourText, style: ['default'] }, { text: custom.rating === 0 ? 'N/A' : custom.rating, style: ['default'] }, { text: custom.comment || '(No comment provided)', style: ['default'] }]);
      if (customRowEntries.length > 0) {

      }
      behaviourSection.push({
        table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: ['*', 50, '*'],
          // layout: 'towerstone',
          body: [
            [{
              text: 'Behaviour',
              fillColor: palette.primary.main,
              style: ['default'],
              color: '#fff',
              bold: true,
            },
            {
              text: 'Rating',
              fillColor: palette.primary.main,
              style: ['default'],
              color: '#fff',
              bold: true,
            },
            {
              text: 'How this impacts others',
              fillColor: palette.primary.main,
              style: ['default'],
              color: '#fff',
              bold: true,
            }],
            ...customRowEntries,
          ],
        },
      });
    }
  });


  const overallSection = [
    {
      text: 'Section D: Areas to Watch', pageBreak: 'before', style: ['header', 'primary'],
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 10, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
    },
    { text: 'This is the result of averaging the behaviours within all the values as per the ratings from each assessor, excluding your self-assessment.', style: ['default'] },
    {
      text: ['Your overall score for this assessment is'], style: ['subheader'], alignment: 'center', margin: [0, 40],
    },
    { text: `${data.score}%`, style: ['header', 'primary'], alignment: 'center' },    
  ];


  const developmentPlan = [
    {
      text: 'Section E: My Growth Plan', pageBreak: 'before', style: ['header', 'primary'],
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 10, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
    },
    { text: 'My Personal Brand', style: ['subheader', 'primary'] },
    {
      image: 'personalBrand', width: 500, alignment: 'center', margin: [20, 40, 20, 40],
    },
    {
      text: 'Complete yours below or by using our app.'
    },

    {
      image: 'personalBrandEmpty', width: 500, alignment: 'center', margin: [20, 40, 20, 40],
    },

    {
      text: 'My New Habits', style: ['subheader', 'primary']
    },
    {
      text: [
        {
          text: 'Tips:\n', bold: true, italics: true
        },
        `● List all the behaviours you want to change in line with the Personal brand you envisioned for yourself.\n`,
        `● Choose the ONE that is the most important for now and practice it for at least three weeks until it becomes a subconscious habit.\n`,
        `● Set yourself daily reminders to reflect on the new habit:\n`,
        `      - Morning: “What do I need to do differently today?”\n
                 - Midday: “How am I doing so far?”\n
                 - Evening: “How did I do today?”\n`,
        `● Ask for feedback on progress before deciding to move on to the next habit.\n`
      ]
    },

    {
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: ['150', '150'],
        layout: 'towerstone',
        body: [
          [
            {
              text: 'New Habit', fillColor: palette.secondary.main, color: '#fff', style: ['default'], bold: true,
            },
            {
              text: 'How will this help me?', fillColor: palette.secondary.main, color: '#fff', style: ['default'], bold: true,
            },
          ],
          ['\n', '\n'],
          ['\n', '\n'],
          ['\n', '\n'],
          ['\n', '\n'],
          ['\n', '\n'],
          ['\n', '\n'],
          ['\n', '\n'],
          ['\n', '\n'],
          ['\n', '\n'],
        ],
      },
    },

    {
      text: 'Next Actions', style: ['subheader', 'primary'],
      newPage: 'before'
    },
    {
      text: [
        {
          text: 'Tips:\n', bold: true, italics: true
        },
        `● Keep to SMART principles: specific, measurable and realistic with deadlines.\n`,
        `● Consider feedback before deciding to cross a task off.\n`,
      ],
      style: ['default']
    },

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
              text: 'Action', fillColor: palette.secondary.main, color: '#fff', style: ['default'], bold: true,
            },
            {
              text: 'Who?', fillColor: palette.secondary.main, color: '#fff', style: ['default'], bold: true,
            },
            {
              text: 'When?', fillColor: palette.secondary.main, color: '#fff', style: ['default'], bold: true,
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




  greyscalePng(
    `${APP_DATA_ROOT}/organization/${data.organization._id}/${data.organization.logo}`,
    `${APP_DATA_ROOT}/organization/${data.organization._id}/greyscale_${data.organization.logo}`
  );


  const partnerGreyScaleLogoPath = `${APP_DATA_ROOT}/themes/${partner.key}/images/greyscale_logo.png`;

  if (fs.existsSync(partnerGreyScaleLogoPath) === false) {
    greyscalePng(
      `${APP_DATA_ROOT}/themes/${partner.key}/images/logo.png`,
      partnerGreyScaleLogoPath
    );
  }

  return {
    filename: `Mores Leadership 360° Assessment Report - ${data.delegate.firstName} ${data.delegate.lastName}.pdf`,
    info: {
      title: `Mores Leadership 360° Assessment Report - ${data.delegate.firstName} ${data.delegate.lastName}`,
      author: partner.name,
      subject: 'Mores Assessment - Leadership 360° Assessment Report',
      keywords: 'Leadership Training Personal Growth',
    },
    content: [
      ...coverPage,
      ...introductionSection,
      ...scaleSection,
      ...qualitiesSection,
      ...behaviourSection,
      ...overallSection,
      ...developmentPlan,
      /*{
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
      */
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
              'Mores Assessments©',
            ],
            alignment: 'center',
            fontSize: 8,
            margin: [20, 0, 20, 0],
          },
          {
            text: `${data.organization.name}: Individual 360° Assessment for ${data.delegate.firstName} ${data.delegate.lastName} - ${data.meta.when.format('DD MMMM YYYY')}`,
            fontSize: 8,
            alignment: 'center',
            margin: [5, 5],
          },
          {
            text: [
              `${currentPage} of ${pageCount}`,
            ],
            alignment: 'center',
            fontSize: 8,
            margin: [20, 0, 20, 0],
          },
        ];
      }
      return [];
    },
    images: {
      //organizationLogo: pdfpng(data.organization.name.indexOf('TowerStone') === 0 ? `${APP_DATA_ROOT}/organization/${data.organization._id}/${data.organization.logo}` : `${APP_DATA_ROOT}/organization/${data.organization._id}/greyscale_${data.organization.logo}`),
      organizationLogo: pdfpng(`${APP_DATA_ROOT}/organization/${data.organization._id}/${data.organization.logo}`),
      partnerLogo: pdfpng(`${APP_DATA_ROOT}/themes/${partner.key}/images/logo.png`),
      partnerLogoGreyScale: pdfpng(partnerGreyScaleLogoPath),
      partnerAvatar: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/avatar.png`),
      moresCycle: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/mores-cycle.png`),
      personalBrand: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/personal-brand.png`),
      personalBrandEmpty: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/personal-brand-empty.png`),
      sectionOverview: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/section-overview.png`),
      ratingScale: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/rating_scale.png`),
      individualHoneycomb: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/one_view_l360.png`),
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
        fontSize: 16,
        bold: true,
        font: 'Verdana',
      },
      primary: {
        color: partner.themeOptions.palette.primary1Color,
      },
      secondary: {
        color: partner.themeOptions.palette.secondary.main,
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


const component = {
  enabled: true,
  view: 'MoresLeadership360',
  kind: 'pdf',
  format: 'pdf',
  name: 'Mores Assessment Leadership 360 Report',
  content: definition,
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
    },
    defaultFont: 'Verdana',
    fontSize: 12,
  },
}

export default component;