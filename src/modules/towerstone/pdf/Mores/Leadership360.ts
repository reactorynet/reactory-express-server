
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
import { Reactory } from '@reactory/server-core/types/reactory';
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone';

import { Chart, ChartLegendLabelItem } from 'chart.js'
import { SURVEY_EVENTS_TO_TRACK } from '@reactory/server-core/models/index';

import { partnerStyles } from './styles';
import { numberWords, graph_palette, graph_label_color } from './constants'

const { APP_DATA_ROOT } = process.env;

const badref = `${APP_DATA_ROOT}/themes/mores/images/badref.png`;
const oneview_svg = `${APP_DATA_ROOT}/themes/mores/images/one_view_l360.svg`;
const oneview_png_folder = `${APP_DATA_ROOT}/themes/mores/images/`;
const oneview_png = `${oneview_png_folder}one_view_l360.png`;

interface ChartJSDataLabelContext {
  active: boolean,
  chart: any,
  dataIndex: number,
  dataset: any,
  datasetIndex: number
}

const graph_red = '#841F27'
const graph_green = '#7D983C'

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

const sectionIndex = ['A', 'B', 'C', 'D', 'E', 'F'];

const greyscalePng = (path, outpath) => {
  fs.createReadStream(path)
    .pipe(new PNG({
      colorType: 0
    }))
    .on('parsed', function () {
      this.pack().pipe(fs.createWriteStream(outpath));
    });
};


const resolveData = async ({ surveyId, delegateId, print_scores, context }) => {
  logger.info(`Resolving data for MoresIndividual360 Survey: ${surveyId}  DelegateEntry: ${delegateId} Print SCores ${print_scores}`);
  // const assessment = await Assessment.findById(assessment_id).then();

  try {
    const { partner, user } = context;

    logger.info(`GLOBAL DATA - USER ${JSON.stringify(user)}  PARTNER: ${partner}`);

    const survey: TowerStone.ISurveyDocument = await Survey.findById(surveyId)
      .populate('organization')
      .populate('leadershipBrand')
      .then();


    if (survey === null || survey === undefined) return null;


    const reportData = {
      print_scores,
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
      employee: {},
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
      qualitiesMap: [],
      behaviours: [],
      developmentPlan: [],
      comments: [],
      recommendations: [],
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

      if (survey) survey.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.REPORT_GENERATED, `Leadership 360 report generated by ${user.firstName} ${user.lastName}.`, user._id, true);

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

      let comments: any = [];
      let recommendations: any[] = [];

      reportData.qualities.forEach((quality: TowerStone.IQuality, qi: number) => {
        recommendations.push({ quality: quality.id, key: `mores-survey-${survey._id}-section_${quality.id}-AdminCustomAction`, recommentdation: null });
        reportData.assessments.forEach((assessment: TowerStone.IAssessment, ai: number) => {
          comments.push({
            quality: quality.id,
            key: `mores-survey-${survey._id}-assessment_${assessment._id}-section_${quality.id}-assessor_${assessment.assessor._id}-CustomComment`,
            content: null
          });
        });
      });



      let qualityComments = await Content.find({
        slug: {
          $in: comments.map((comment: any) => comment.key)
        }
      }).then();

      comments.forEach((comment) => {
        comment.content = lodash.find(qualityComments, { slug: comment.key })
      })

      comments = lodash.filter(comments, c => c.content !== null || c.content !== undefined)
      comments = lodash.filter(comments, c => c.content && c.content.content && c.content.content.trim() !== '')
      let qualityActions = await Content.find({
        slug: {
          $in: recommendations.map((recommendation) => recommendation.key)
        }
      }).then();

      recommendations.forEach((recommendation) => {
        recommendation.recommendation = lodash.find(qualityActions, { slug: recommendation.key })
      })

      recommendations = lodash.filter(recommendations, r => r.recommendation !== null && r.recommendation !== undefined)

      reportData.comments = comments;
      reportData.recommendations = recommendations;

      logger.debug(`Found (${reportData.assessments.length}) assessments, (${reportData.comments.length}) comments and (${reportData.recommendations.length}) recommendations`);

      lodash.remove(reportData.assessments, a => a === null || a.complete === false);
      logger.debug(`(${reportData.assessments.length}) assessments after clean`);
      reportData.lowratings = (quality, bar = 2) => {
        return lodash.filter(reportData.ratings, (rating) => { return rating.qualityId.equals(quality._id) && rating.rating <= bar; });
      };

      reportData.ratings = lodash.flatMap(reportData.assessments, assessment => {
        return assessment.ratings.map((rating) => {
          rating.assessor = assessment.assessor;
          rating.delegate = assessment.delegate;
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
            rating.delegate = assessment.delegate;
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
      const totalSelfRatings = lodash.sumBy(reportData.ratingsSelf, r => r.rating);
      reportData.score = Math.floor((totalAllRatings * 100) / (reportData.ratingsExcludingSelf.length * maxRating));
      reportData.scoreSelf = Math.floor((totalSelfRatings * 100) / (reportData.ratingsSelf.length * maxRating));
    }


    const user_folder = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/`;

    if (fs.existsSync(user_folder) === false) {
      fs.mkdirSync(user_folder);
    }


    const user_charts_folder = `${user_folder}charts/`
    if (fs.existsSync(user_charts_folder) === false) {
      fs.mkdirSync(user_charts_folder);
    }


    let user_one_view_svg = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/charts/one_view_${reportData.survey._id}.svg`;
    let user_one_view_path = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/charts/`;
    let user_one_view_png = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/charts/one_view_${reportData.survey._id}.png`;
    //1. copy template svg to user profile
    if (fs.existsSync(oneview_svg) === true && fs.existsSync(user_one_view_svg) === false) {
      //`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/one_view_${data.survey._id}.png`
      fs.copyFileSync(oneview_svg, user_one_view_svg);
    }

    if (existsSync(user_one_view_svg) === true) {
      reportData.one_view_svg = fs.readFileSync(user_one_view_svg).toString();

      svg_to_png.convert(user_one_view_svg, user_one_view_path, { defaultWidth: '2000px', defaultHeight: '2000px' }).then((result) => {
        logger.info(`✅Converted user one view svg to ${user_one_view_png}`)
      }).catch((convertErr: Error) => {
        logger.error(`💥Could not convert ${user_one_view_svg} to ${user_one_view_png}`, convertErr)
      })
    }


    // render the charts
    const chartsFolder = `${APP_DATA_ROOT}/profiles/${reportData.delegate._id}/charts/`;
    if (fs.existsSync(chartsFolder) === false) {
      fs.mkdirSync(chartsFolder, { recursive: true });
    }

    let chartResult = null;

    const { colorSchemes, palette } = reportData.meta;
    const qualitiesMap: any[] = [];
    const all_behaviour_scores: any[] = [];

    reportData.qualities.forEach((quality, qi) => {
      const behaviourScores = quality.behaviours.map((behaviour: TowerStone.IBehaviour, bi: number) => {
        logger.debug(`Calculating behaviour score ${quality.title} ==> ${lodash.template(behaviour.description)(reportData)}`);
        let scoreSelf = 0;
        let scoreAvgAll = 0;
        let scoreAvgOthers = 0;
        let behaviorRatings = [];
        let countByScore = [0, 0, 0, 0, 0]
        let countByScoreOthers = [0, 0, 0, 0, 0]
        let countByScoreSelf = [0, 0, 0, 0, 0]
        let titleContent = `${lodash.template(behaviour.title)(reportData)}`
        let descriptionContent = `${lodash.template(behaviour.description)(reportData)}`

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

            if (rating.rating >= 1) {
              countByScore[rating.rating - 1] += 1;
            }
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
            countByScoreOthers[rating.rating - 1] += 1;
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

          reportData.ratingsSelf.forEach((rating) => {
            countByScoreSelf[rating.rating - 1] += 1
          })

          logger.debug(`Score for self ${scoreSelf}`);

          return {
            behaviourIndex: bi + 1,
            behaviour,
            scoreSelf,
            scoreAvgAll,
            scoreAvgOthers,
            individualScores,
            countByScore,
            countByScoreSelf,
            countByScoreOthers,
            titleContent,
            descriptionContent,
            backgroundColor: graph_palette[bi],
            color: graph_label_color[bi],
            key: `${sectionIndex[qi]}${bi + 1}`
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
            countByScoreOthers,
            countByScoreSelf,
            color: graph_label_color[bi],
            backgroundColor: graph_palette[bi],
            titleContent,
            descriptionContent,
            countByScore,
            key: `${sectionIndex[qi]}${bi + 1}`
          };
        }
      });

      all_behaviour_scores.push(...behaviourScores)

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

    reportData.qualitiesMap = qualitiesMap;
    logger.debug(`qualitiesMap created`);

    let labels = qualitiesMap.map((q, qidx) => `${sectionIndex[qidx]}. ${q.model.title}`)
    let personalScores = qualitiesMap.map(q => parseFloat(q.scoreByAssessor(reportData.delegate).toFixed(2)));
    let othersScores = qualitiesMap.map(q => parseFloat(q.avg.others).toFixed(2));

    let taken = lodash.pullAt(labels, [0, 1])
    labels = [...labels, ...taken];

    taken = lodash.pullAt(personalScores, [0, 1])
    personalScores = [...personalScores, ...taken];

    taken = lodash.pullAt(othersScores, [0, 1])
    othersScores = [...othersScores, ...taken];

    reportData.all_behaviour_scores = all_behaviour_scores;
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
          fontSize: 28,
          ticks: {
            min: 0,
            max: 5,
            stepSize: 1,
            suggestedMin: 0,
            suggestedMax: 5,
            fontSize: 28,
          },
          beginAtZero: true,
          pointLabels: {
            fontSize: 28
          },
          angleLines: {
            lineWidth: 3
          },
          gridLines: {
            circular: true,
            color: '#8C8C8C',
          }
        },
        title: {
          display: false,
        },
        legend: {
          position: 'bottom',
          align: 'end',
          labels: {
            // This more specific font property overrides the global property
            fontSize: 24,
            usePointStyle: true,
          },
        },
      },
      data: {
        labels: labels,
        datasets: [{
          label: 'Your score ',
          fontSize: 28,
          data: personalScores,
          lineTension: 0,
          borderColor: '#587444',
          fill: false,
          borderWidth: 5,
          pointRadius: 6,
          datalabels: {
            color: '#587444',
            display: false,
            font: {
              size: 24
            }
          }
        },
        {
          label: `Raters' average`,
          labels: labels,
          data: othersScores,
          fontSize: 28,
          fill: false,
          lineTension: 0,
          borderColor: '#9A0000',
          borderWidth: 5,
          pointRadius: 6,
          datalabels: {
            display: false,
            color: '#9A0000',
            font: {
              size: 24
            }
          }
        }],
      },
    }).then();
    logger.debug(`Radar Chart Avg Created: ${chartResult.file}`);
    let barchartPromises = qualitiesMap.map((quality: TowerStone.IQuality, qi: number) => {

      const datasets = []

      const selfQualityratings = lodash.filter(reportData.ratingsSelf, r => r.custom !== true && quality.model._id.equals(r.qualityId));

      datasets.push({
        data: selfQualityratings.map(rating => rating.rating),
        label: 'Your score',
        fontSize: 16,
        //type: 'line',
        //barThickness: 20,
        backgroundColor: graph_green,
        borderColor: graph_green,
        borderWidth: 2,
        datalabels: {
          anchor: 'end',
          clamp: true,
          align: 'bottom',
          offset: 4,
          color: '#fff',
          font: {
            size: 24,
            style: 'bold'
          }
        }
      });


      datasets.push({
        data: quality.behaviourScores.map(behaviourScore => {
          return parseFloat(behaviourScore.scoreAvgOthers).toFixed(1)
        }),
        label: 'Raters\' avg.',
        backgroundColor: graph_red,
        //type: 'line',
        borderColor: graph_red,
        borderWidth: 2,
        //barThickness: 20,
        datalabels: {
          anchor: 'end',
          clamp: true,
          align: 'bottom',
          offset: 4,
          color: '#fff',
          font: {
            size: 24,
            style: 'bold',
            weight: 'bold',
          }
        }
      });


      return DefaultBarChart({
        folder: chartsFolder,
        file: `bar-chart-${reportData.survey._id}-${quality.model._id}.png`,
        width: 1200,
        height: 600,
        mime: 'application/pdf',
        options: {
          title: {
            display: true,
          },
          legend: {
            labels: {
              fontSize: 24,
              fontStyle: 'bold',
            },
            position: 'bottom',
            align: 'center'
          },
          scales: {
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Score',
                fontSize: 24,
                fontStyle: 'bold',
              },
              ticks: {
                suggestedMin: 0,
                suggestedMax: 5,
                stepSize: 1,
                min: 0,
                max: 5,
                fontSize: 24,
                fontStyle: 'bold',
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: '',
                fontSize: 24,
                fontStyle: 'bold',
              },
              ticks: {
                fontSize: 24,
                fontStyle: 'bold',
              }
            }],
          }
        },
        data: {
          labels: quality.behaviours.map((b, bi) => `${sectionIndex[qi]}${bi + 1}. ${b.chart_title.replace('\n', ' ')}`),
          datasets,
        },
      });
    });

    let barchartResults = await Promise.all(barchartPromises).then();
    barchartResults.map(result => logger.debug(`Bar Chart ${result.file} created`));


    /**
     *  Behaviour Counting / Group By Charts
     *
     */

    barchartPromises = qualitiesMap.map((quality: TowerStone.IQuality, qi: number) => {

      let datasets: any[] = [];
      quality.behaviourScores.forEach((behaviourScore: any, bidx: number) => {
        logger.debug(`Color Selection For ${behaviourScore.key}, COUNT: ${behaviourScore.countByScore}, COLOR: ${behaviourScore.countByScore === 0 ? "#000000" : behaviourScore.color}`)
        datasets.push({
          data: behaviourScore.countByScoreOthers,
          label: `${behaviourScore.key}. ${behaviourScore.behaviour.chart_title.replace('\n', ' ')}`,
          borderWidth: 2,
          lineTension: 0,
          fontSize: 24,
          backgroundColor: behaviourScore.backgroundColor || '#FFCC33',
          datalabels: {
            clamp: true,
            align: (context: ChartJSDataLabelContext) => {
              var index = context.dataIndex;
              var value = context.dataset.data[index];
              return value > 0 ? 'bottom' : 'top'
            },
            anchor: 'end',
            color: (context: ChartJSDataLabelContext) => {
              var index = context.dataIndex;
              var value = context.dataset.data[index];
              return value <= 0 ? '#000000' : '#FFFFFF'

            },
            font: {
              size: 24,
              style: 'bold'
            }
          }
        })
      });



      return DefaultBarChart({
        folder: chartsFolder,
        file: `bar-chart-${reportData.survey._id}-${quality.model._id}-counts.png`,
        width: 1200,
        height: 600,
        mime: 'application/pdf',
        options: {
          title: {
            display: false,
            fontSize: 48
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              fontSize: 24,
              fontStyle: 'bold'
            },
          },
          scales: {
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Count',
                fontSize: 24,
                fontStyle: 'bold',
              },
              ticks: {
                stepSize: 1,
                fontSize: 24,
                fontStyle: 'bold',
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Rating',
                fontSize: 24,
                fontStyle: 'bold',
              },
              ticks: {
                fontSize: 24,
                fontStyle: 'bold',
              }
            }],
          }
        },
        data: {
          labels: ['1', '2', '3', '4', '5'],
          datasets,
        },
      });
    });

    barchartResults = await Promise.all(barchartPromises).then();
    barchartResults.map(result => logger.debug(`Bar Chart COUNTS ${result.file} created`));


    chartResult = await DefaultPieChart({
      folder: chartsFolder,
      file: `overall-score-${reportData.survey._id}-others.png`,
      width: 800,
      height: 800,
      mime: 'application/pdf',
      data: {
        datasets: [{
          data: [reportData.score, 100 - reportData.score],
          backgroundColor: [
            `#841F27`,
            'rgba(255,255,255,0)',
          ],
          borderColor: [
            `#841F27`,
            'rgba(255,255,255,0)',
          ],
          borderWidth: [
            1, 0,
          ],
        }],
      },
    }).then();
    logger.debug(`Overall Score Chart Created: ${chartResult.file}`, chartResult);


    chartResult = await DefaultPieChart({
      folder: chartsFolder,
      file: `overall-score-${reportData.survey._id}-self.png`,
      width: 800,
      height: 800,
      mime: 'application/pdf',
      data: {
        datasets: [{
          data: [reportData.scoreSelf, 100 - reportData.scoreSelf],
          backgroundColor: [
            `#7D983C`,
            'rgba(255,255,255,0)',
          ],
          borderColor: [
            `#7D983C`,
            'rgba(255,255,255,0)',
          ],
          borderWidth: [
            1, 0,
          ],
        }],
      },
    }).then();
    logger.debug(`Overall Self Chart Created: ${chartResult.file}`, chartResult);


    Cache.setItem(reportData.key, reportData, 60);

    return reportData;
  } catch (unhandledException) {
    logger.error(`An unhandled error occured processing the PDF ${unhandledException.message}`, unhandledException);
    return null;
  }
};

export const MoresLeadership360DataResolver = resolveData;

const pdfDefinition = (data: any, partner: Reactory.IReactoryClient, user: Reactory.IUser) => {
  logger.debug(`Generating PDF definition For Mores Assessment Leadership 360 Report using partner ${partner.key} and user ${user.email}`);

  const scaleSegments = [];
  const { palette } = data.meta;
  const cpr = { text: '©', style: ['superscript'], fontFeatures: ['sups'] };
  let coverPage = [];
  let qualitiesSection = [];

  try {

    data.scale.entries.forEach((scale) => {
      if (scale.rating > 0) {
        scaleSegments.push({ text: `${scale.rating} - ${scale.description}`, style: ['default'] });
      }
    });

  } catch (error) {
    logger.error(`🚩 Error getting scale segments ${error.message}`, error)
  }



  const tableLayoutOut = {
    fillColor: (rowIndex: number, node: any, columnIndex: any) => {
      return (rowIndex === 1) ? palette.primary.main : null;
    },
  };

  coverPage = [
    {
      image: 'partnerLogo', width: 215, style: ['centerAligned'], margin: [0, 0, 0, 0]
    },
    { text: 'Leadership 360° Assessment Report', style: ['title', 'centerAligned'], margin: [0, 18, 0, 20] },
    {
      text: `${data.delegate.firstName} ${data.delegate.lastName}`,
      style: ['header', 'centerAligned', 'secondary'],
      margin: [0, 0]
    },
    { text: `${data.organization.name}`, style: ['header', 'centerAligned', 'secondary'], margin: [0, 30, 0, 0] },
    { text: `${moment().format('MMMM YYYY')}`, style: ['header', 'centerAligned', 'secondary', 'subheader2'], margin: [0, 15, 0, 320] },
    { text: 'In association with', style: ['default', 'centerAligned'], margin: [0, 0, 0, 20] },
    {
      image: 'towerstoneLogoGreyScale', width: 180, style: ['centerAligned'],
    },
    { text: 'Table of Contents', style: ['subheader', 'primary'], pageBreak: 'before' },
    {
      toc: {
        numberStyle: { bold: true }
      }
    },
  ]


  const introductionSection = [
    {
      text: 'Section A: Welcome', style: ['header', 'secondary'], pageBreak: 'before',
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 5, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
    },
    {
      text: [
        `${data.delegate.firstName ? data.delegate.firstName.trim() : 'Anon'}, this report presents the results of your individual self-assessment compared with the feedback from `,
        { text: `${numberWords[data.assessors.length] || data.assessors.length}`, bold: true },
        ` nominated ${data.survey.organization.name} colleagues who assessed you.\n`,
      ],
      style: ['default'],
    },
    {
      text: 'How to use this Report',
      style: ['subheader', 'primary']
    },
    {
      text: [
        'The Mores Leadership 360° Assessment provides insight to help you grow and model behaviours that will best serve your leadership needs. ',
        'This report consists of the following sections:\n'
      ],
      style: ['default'],
    },
    {
      image: 'sectionOverview', width: 300, style: ['centerAligned'], margin: [0, 20, 0, 20],
    },
    {
      text: 'Make your growth plan a living document through daily reflection and weekly review. Consider how to use feedback from your teams and colleagues to enrich this process.',
      style: ['default', 'italic']
    },
    {
      text: ['The TowerStone Leadership Essentials', cpr, ' Model'],
      style: ['subheader', 'primary']
    },
    {
      text: [
        `Informed by decades of experience and timeless leadership theory, the TowerStone Leadership Essentials`,
        cpr,
        ' Model distils the individual and organisational competencies that leaders care about most. It is designed to be practical and applies to leadership in any situation or organisation.'
      ],
      style: ['default'],
    },
    {
      text: 'The model was designed using inputs from leading-edge theory:',
      style: ['default'],
    },
    {
      ul: [
        {
          text: [`Ken Wilber's Integral Framework`, cpr],
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            {
              text: [
                `- The four lenses of human experience\n`,
                { text: `  (individual and collective; visible behaviours and\n`, preserveLeadingSpaces: true },
                { text: `  invisible motives).`, preserveLeadingSpaces: true }
              ],
            },
          ],
          style: ['default', 'sublist'],
        },
      ],
    },
    {
      ul: [
        {
          text: `Maslow’s Hierarchy of Needs/The Barrett Model™`,
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            `- Our lower-level needs driven by fear.`,
            `- Our need to learn and adapt.`,
            `- Our higher-level needs based on purpose.`
          ],
          style: ['default', 'sublist'],
        },
      ],
    },
    {
      ul: [
        {
          text: [`Dr David Rock’s SCARF`, cpr, ' Approach'],
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            {
              text: [
                `- Using the neuroscience of minimising threat\n`,
                { text: `  and maximising reward for relationship building.`, preserveLeadingSpaces: true },
              ],
            }
          ],
          style: ['default', 'sublist'],
        },
      ],
    },
    {
      ul: [
        {
          text: [`Covey’s Tree of Trust`, cpr],
          style: ['default'],
        },
        {
          type: 'none',
          ul: [
            `- Building competence.`,
            `- Embracing character.`,
          ],
          style: ['default', 'sublist'],
        },
      ],
    },

    {
      image: 'moresCycle',
      width: 200,
      margin: [300, -230, 0, 0]
    },

    {
      text: 'The Mores Leadership Assessment Framework',
      style: ['subheader', 'primary'],
      pageBreak: 'before'
    },

    {
      text: `Covering the full spectrum of human needs – from self-development to organisational purpose – the Mores Assessments framework comprises six elements with three questions per element.`,
      style: ['default'],
    },
    {
      text: [
        `Questions are designed to elicit both perspectives `,
        { text: `head (factual/impersonal)`, style: ['default', 'primary'] },
        ' and ',
        { text: 'heart (emotive/personal)', style: ['default', 'secondary'] },
        ' perspectives.'
      ],
      style: ['default']
    },
    {
      image: 'moresHoneycomb', width: 300, style: ['centerAligned'], margin: [0, 20, 0, 20],
    },
    {
      text: `Average ratings for the 18 questions are mapped across the six elements with a summary score per element as per the sample below.`,
      style: ['default']
    },
    {
      image: 'individualHoneycomb', width: 300, style: ['centerAligned'], margin: [0, 20, 0, 20],
    },
  ];

  const scaleSection: any[] = [
    {
      pageBreak: 'before',
      text: 'The Rating Scale',
      style: ['subheader', 'primary'],
    },
    { text: 'The 5-point rating scale measures how strongly participants agree or disagree with a behavioural statement, including the typical emotion associated with that rating:', style: ['default'] },
  ];

  [
    { id: 1, title: 'Strongly Disagree ', heart: "(I'm out the door)", head: `“I’m fed up and want you to know that”` },
    { id: 2, title: 'Disagree ', heart: "(One foot in, one foot out the door)", head: `“I’m frustrated and things need to change now”` },
    { id: 3, title: 'Neutral ', heart: "(I don’t know where the door is)", head: `“I either don’t care or can’t comment”` },
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
      style: ['default', 'primary'],
      margin: [18, 0, 0, 0]
    })
  });

  scaleSection.push({
    image: 'ratingScale',
    width: 140, aligntment: 'right', margin: [350, -180, 0, 50]
  });

  scaleSection.push({
    text: 'Consider the following when reviewing the results:',
    style: ['default']
  });

  scaleSection.push({

    ul: [
      {
        text: [
          { text: 'Low ratings (1 or 2): ', style: ['default'], bold: true },
          `There is negativity and frustration, yet the respondent cares enough to give you an honest opinion i.e. engagement level is strong and your focus should be on these responses first.`
        ]
      },
      {
        text: [
          { text: 'Intermediate ratings (3): ', style: ['default'], bold: true },
          `The ‘OK’ response is a red flag as it could indicate a low level of engagement, mediocrity (comfort zone) or inconsistent behaviours.`
        ]
      },
      {
        text: [
          { text: 'High ratings (4 or 5): ', style: ['default'], bold: true },
          `This indicates high levels of engagement and buy-in. However, avoid complacency and keep working on your strengths.`
        ]
      }
    ],
    style: ['default']
  });

  const dashboardChartSize = 65;
  const dashboardChartMargin = 5;

  const sorted_scores = lodash.sortBy(data.all_behaviour_scores, ['scoreAvgOthers']);

  sorted_scores.forEach((sc) => {
    logger.debug(`Sorted Score => `, sc)
  })

  const new_habit_list: any[] = [];


  let idx = sorted_scores.length - 1;
  do {
    logger.debug(`SORTED SCORE ENTRY HIGH -> `, sorted_scores[idx])
    new_habit_list.push({
      behaviour: {
        key: sorted_scores[idx].key,
        title: sorted_scores[idx].titleContent,
        description: `${sorted_scores[idx].descriptionContent} (${parseFloat(sorted_scores[idx].scoreAvgOthers).toFixed(1)})`
      }
    });

    idx -= 1;
  } while (idx >= sorted_scores.length - 5)

  const lowest_rated_list: any[] = [];

  for (let idx = 0; idx < 5; idx++) {
    lowest_rated_list.push({
      behaviour: {
        key: sorted_scores[idx].key,
        title: sorted_scores[idx].titleContent,
        description: `${sorted_scores[idx].descriptionContent} (${parseFloat(sorted_scores[idx].scoreAvgOthers).toFixed(1)})`
      }
    })
  }

  try {
    qualitiesSection = [
      {
        text: 'Section B: Dashboard', style: ['header', 'secondary'], pageBreak: 'before',
        tocItem: true,
        tocStyle: { italics: false, fontSize: 10 },
        tocMargin: [0, 10, 0, 0],
        tocNumberStyle: { italics: true, fontSize: 10 },
      },
      {
        margin: [0, 0, 0, 0],
        table: {
          widths: [250, 250],
          //headerRows: ,
          // dontBreakRows: true,
          // keepWithHeaderRows: 1,
          body: [
            [
              {
                text: 'Overall Score',
                style: ['subheader', 'primary'],
                alignment: 'left',
                border: [false, false, false, false],
                margin: [20, 0, 0, 10]
              },
              {
                text: 'Comparison per Section',
                style: ['subheader', 'primary'],
                alignment: 'center',
                border: [false, false, false, false],
                margin: [20, 0, 0, 10]
              },
            ],
            [
              {
                alignment: 'left',
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
                        margin: [0, dashboardChartMargin, 0, dashboardChartMargin],
                        alignment: 'center',
                        border: [false, false, false, false]
                      },
                    ],
                    [
                      {
                        text: [{ text: `${((data.score / 100) * 5).toFixed(1)}`, fontSize: 9 }, { text: '/5', fontSize: 7 }],
                        margin: [2, -50, 0, 0],
                        alignment: 'center',
                        border: [false, false, false, false]
                      }
                    ],
                    [
                      {
                        text: `Raters' average score`,
                        style: ['default', 'primary'],
                        alignment: 'center',
                        fontSize: 8,
                        border: [false, false, false, false]
                      },
                    ],
                    [
                      {
                        image: 'overallScoreSelf',
                        height: dashboardChartSize,
                        width: dashboardChartSize,
                        margin: [0, dashboardChartMargin, 0, dashboardChartMargin],
                        alignment: 'center',
                        border: [false, false, false, false]
                      },
                    ],
                    [
                      {
                        text: [{ text: `${((data.scoreSelf / 100) * 5).toFixed(1)}`, fontSize: 9 }, { text: '/5', fontSize: 7 }],
                        margin: [2, -50, 0, 0],
                        alignment: 'center',
                        border: [false, false, false, false]
                      }
                    ],
                    [
                      {
                        text: `Your score`,
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
                height: 210,
                width: 210,
                margin: [0, -20, 10, dashboardChartMargin],
                alignment: 'center',
                border: [false, false, false, false]
              }
            ],
          ]
        }
      },
      {
        text: "One View",
        margin: [0, -15, 0, 15],
        style: ['subheader', 'primary', 'centerAligned'],
      },

      {
        image: "oneViewUser",
        //svg: data.one_view_svg,
        width: 370,
        style: ['centerAligned'],
        margin: [0, 0, 0, 0],
      },

      {
        text: "Priority Behaviours", style: ['subheader', 'primary'],
        pageBreak: 'before'
      },
      {
        table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: [240, 10, 240],
          body: [
            [
              {
                text: [
                  { text: 'Highest Rated Behaviours\n', color: '#fff', style: ['default'], alignment: 'center', bold: true, },
                  //You are doing well here (average score in brackets).  How best can you lead, mentor and coach using these strengths?
                  { text: 'How best can you lead, mentor and coach using these strengths?', italics: true, color: '#fff', style: ['default'], alignment: 'center' }
                ],
                fillColor: palette.secondary.main,
                borderColor: palette.secondary.main
              },
              {
                text: '', style: ['default'], border: [false, false, false, false],
              },
              {
                text: [
                  { text: 'Lowest Rated Behaviours\n', fillColor: '#841F27', color: '#fff', style: ['default'], alignment: 'center', bold: true },
                  //You are doing well here (average score in brackets).  How best can you lead, mentor and coach using these strengths?
                  { text: 'What new habits and next actions need focus now?', italics: true, color: '#fff', style: ['default'], alignment: 'center' }
                ],
                fillColor: '#841F27',
                borderColor: '#841F27'
              },
            ],
            [
              {
                table: {
                  body: [
                    ...new_habit_list.map((entry, idx) => {
                      return [
                        {
                          text: [
                            { text: `${entry.behaviour.key}\n`, style: ['default'], alignment: 'left', margin: [5, 5, 5, 15], bold: true },
                            { text: `${entry.behaviour.title}\n`, style: ['default', 'primary'], lineHeight: 1.2, alignment: 'left', margin: [5, 5, 15, 5] },
                            { text: `${entry.behaviour.description}\n\n`, style: ['default', 'secondary'], lineHeight: 1.2, alignment: 'left', margin: [25, 5, 15, 10], italics: true },
                          ],
                          border: [false, false, false, false],
                        }
                      ];
                    })
                  ]
                }
              },
              {
                text: '', style: ['default'], border: [false, false, false, false],
              },
              {
                table: {
                  body: [
                    ...lowest_rated_list.map((entry, idx) => {
                      return [
                        {
                          text: [
                            { text: `${entry.behaviour.key}\n`, style: ['default'], alignment: 'left', margin: [5, 5, 5, 15], bold: true },
                            { text: `${entry.behaviour.title}\n`, style: ['default', 'primary'], lineHeight: 1.2, alignment: 'left', margin: [5, 5, 5, 5] },
                            { text: `${entry.behaviour.description}\n\n`, style: ['default', 'secondary'], lineHeight: 1.2, alignment: 'left', margin: [25, 5, 5, 10], italics: true },
                          ],
                          border: [false, false, false, false],
                        }
                      ];
                    })
                  ]
                }
              },
            ],
          ],
        }
      }
    ];
  } catch (qualitiesSectionError) {
    logger.debug('Error generating Qualities Section', qualitiesSectionError)
  }

  logger.debug('Qualities Section:', qualitiesSection);

  const behaviourSection: any[] = [
    {
      text: 'Section C: Detailed Results', style: ['header', 'secondary'], pageBreak: 'before',
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 10, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
    },
  ];


  data.qualities.forEach((quality: TowerStone.IQuality, qi: number) => {
    let section_content = {
      text: [
        { text: `${sectionIndex[qi]}. ${quality.description}`, style: ['subheader', 'primary'] }
      ],
    };

    if (qi > 0) {
      section_content.pageBreak = 'before';
      section_content.margin = [0, 16.5, 0, 15];
    }

    behaviourSection.push(section_content);
    behaviourSection.push({ text: `Comparison per question`, style: ['default'], fontSize: 12, fontColor: '#838383', margin: [0, 10, 20, 10] })
    behaviourSection.push({
      image: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) === true ?
        pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}.png`) :
        pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/bar_chart.png`),
      width: 360,
      alignment: 'left',
      margin: [0, 15]
    });

    quality.behaviours.forEach((behaviour: TowerStone.IBehaviour, bi: number) => {
      behaviourSection.push({
        text: [
          `${sectionIndex[qi]}${bi + 1}`,
        ],
        lineHeight: 1.2, style: ['default']
      });
      behaviourSection.push({ text: `${lodash.template(behaviour.title)(data)}`, style: ['default', 'primary'], lineHeight: 1.2 })
      behaviourSection.push({ text: `${lodash.template(behaviour.description)(data)}`, style: ['default', 'secondary'], lineHeight: 1.2, italics: true, margin: [0, 0, 0, 7] });
    });


    behaviourSection.push({ text: `Count of ratings per question`, style: ['default'], fontSize: 12, fontColor: '#838383', margin: [0, 10, 20, 10], border: [false, false, false, false] });
    behaviourSection.push({
      image: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}-counts.png`) === true ?
        pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/bar-chart-${data.survey._id}-${quality._id}-counts.png`) :
        pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/bar_chart.png`),
      width: 360,
      alignment: 'left',
      margin: [0, 15]
    });



    behaviourSection.push({ text: 'What They Said About You', style: ['primary', 'subheader'], italics: true, pageBreak: 'before' });

    let sectionComments: any[] = [];

    data.comments.forEach((comment) => {
      if (comment.quality === quality.id && comment.content && comment.content.content) {
        sectionComments.push({ text: `"${comment.content.content.trim()}"`, style: ['default'], margin: [0, 0, 0, 15], })
      }
    });

    if (sectionComments.length > 0) {
      behaviourSection.push(...sectionComments);
    } else {
      behaviourSection.push({ text: `No comments.`, style: ['default'], fontSize: 10 })
    }


    behaviourSection.push(
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: [
                  { text: 'Notes', bold: true },
                  ' (Next Actions and new Habits)'],
                fontSize: 11,
                style: ['primary'],
                italics: true,
                margin: [-3, 0, 0, 0],
                border: [false, false, false, false]
              }
            ],
            ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => [
              { text: '\n\n', border: [false, false, false, true] }
            ]),
          ]
        },
        border: [false, false, false, false],
        margin: [0, 50, 0, 10]
      }
    );


  });


  let recommendation_rows: any[] = [];

  data.qualities.forEach((quality, qi) => {

    let next_habits = { text: '' };
    let next_actions = { text: '' };

    const convertTextToListOrText = (content: any): any => {

      return { text: content, style: ['default'] }
    }

    const quality_recommendation = lodash.find(data.recommendations, { quality: quality.id });
    if (quality_recommendation && quality_recommendation.recommendation && quality_recommendation.recommendation.content) {
      let working_str = quality_recommendation.recommendation.content;
      if (`${working_str}`.trim() !== "") {
        if (working_str.indexOf("\n==\n") >= 0) {
          let habits_actions = working_str.split("\n==\n");
          if (habits_actions.length === 2) {
            next_habits = convertTextToListOrText(habits_actions[0]);
            next_actions = convertTextToListOrText(habits_actions[1]);
          } else {
            next_habits = convertTextToListOrText(habits_actions);
          }

          const row = [
            //{ text: quality.title, fillColor: '#7D993C', color: '#FFF' },
            next_habits,
            next_actions
          ]

          recommendation_rows.push(row);
          //return row;

        }
      }
    }
  })

  const overallSection = [
    {
      text: 'Section D: Areas to Watch', pageBreak: 'before', style: ['header', 'secondary'],
      tocItem: true,
      tocStyle: { italics: false, fontSize: 10 },
      tocMargin: [0, 10, 0, 0],
      tocNumberStyle: { italics: true, fontSize: 10 },
    },
    // {
    //   text: [{ text: 'Note:', italics: true }, 'Suggestions are for lowest rated behaviours listed in Section B.'],
    //   style: ['primary'],
    //   fontSize: 8
    // },
    {
      table: {
        widths: [250, 250],
        body: [
          [
            { text: 'New Habits to Consider', style: ['default'], fillColor: '#52687B', color: '#FFF', bold: true, margin: [0, 5, 0, 3], },
            { text: 'New Actions to Consider', style: ['default'], fillColor: '#52687B', color: '#FFF', bold: true, margin: [0, 5, 0, 3] }
          ],
          [
            '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
            '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n'
          ]
        ]
      }
    }
  ];


  const developmentPlan = [
    {
      text: 'Section E: My Growth Plan', pageBreak: 'before', style: ['header', 'secondary'],
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
      text: 'Complete yours on the next page.',
      style: ['default'],
      fontSize: 10
    },

    {
      image: 'personalBrandEmpty', width: 500, alignment: 'center', margin: [20, 120, 20, 40],
    },

    {
      text: 'My New Habits', style: ['subheader', 'primary'], pageBreak: 'before'
    },
    {
      text: 'Tips:\n\n', bold: true, italics: true,
      style: ['default'],
    },
    {
      ul: [
        `List all the behaviours you want to change in line with the Personal Brand you envisioned for yourself.`,
        `Choose the ONE that is the most important for now and practise it for at least three weeks until it becomes a subconscious habit.`,
        `Set yourself daily reminders to reflect on the new habit:`,
        {
          ul: [
            `- Morning: “What do I need to do differently today?”`,
            `- Midday: “How am I doing so far?”`,
            `- Evening: “How did I do today?”`,
          ],
          type: 'none',
          margin: [-12.5, 5, 0, 5]
        },
        `Ask for feedback on progress before deciding to move on to the next habit.`
      ],
      style: ['default'],
    },

    {
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: [250, 250],
        layout: 'towerstone',
        body: [
          [
            {
              text: 'New Habit', fillColor: palette.secondary.main, color: '#fff', style: ['default'], bold: true, margin: [0, 5, 0, 3]
            },
            {
              text: 'How will this help me?', fillColor: palette.secondary.main, color: '#fff', style: ['default'], bold: true, margin: [0, 5, 0, 3]
            },
          ],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
          ['\n\n', ''],
        ],
      },
    },
    {
      text: 'Next Actions', style: ['subheader', 'primary'],
      pageBreak: 'before'
    },
    {
      text: [
        {
          text: 'Tips:\n\n', bold: true, italics: true
        },
      ],
      style: ['default'],
    },
    {
      ul: [
        `Keep to SMART principles: specific, measurable and realistic with deadlines.`,
        `Consider feedback before deciding to cross a task off.`,
      ],
      style: ['default'],
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
              text: 'Action',
              fillColor: palette.secondary.main,
              color: '#fff',
              style: ['default'],
              bold: true,
              margin: [0, 5, 0, 3]
            },
            {
              text: 'Who?',
              fillColor: palette.secondary.main,
              color: '#fff',
              style: ['default'],
              bold: true,
              margin: [0, 5, 0, 3]
            },
            {
              text: 'When?',
              fillColor: palette.secondary.main,
              color: '#fff',
              style: ['default'],
              bold: true,
              margin: [0, 5, 0, 3]
            },
          ],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
          ['\n\n\n', '', ''],
        ],
      },
    },

  ];

  const cellprops = {
    style: ['default'], fontSize: 8
  }

  const debug_section = [
    { text: 'Appendix A - Score Data', style: ['header', 'secondary'], pageBreak: 'before' },
    {
      table: {
        body: [
          [
            { text: 'Section', ...cellprops },
            { text: 'Scores', ...cellprops },
            { text: 'Avg Other', ...cellprops },
            { text: 'Avg All', ...cellprops },
            { text: 'Avg Self', ...cellprops }
          ],
          ...data.qualitiesMap.map((q, qi) => [
            { text: `Section: ${q.model.title}`, ...cellprops },
            {
              table:
              {
                body: [
                  [
                    { text: 'Key', ...cellprops },
                    { text: 'Avg Others', ...cellprops },
                    { text: 'Avg All', ...cellprops },
                    { text: 'Self', ...cellprops },
                    { text: '1s', ...cellprops },
                    { text: '2s', ...cellprops },
                    { text: '3s', ...cellprops },
                    { text: '4s', ...cellprops },
                    { text: '5s', ...cellprops },
                  ],
                  ...q.behaviourScores.map((b, bi) => [
                    { text: b.key, ...cellprops },
                    { text: parseFloat(b.scoreAvgOthers).toFixed(2), ...cellprops },
                    { text: parseFloat(b.scoreAvgAll).toFixed(2), ...cellprops },
                    { text: parseFloat(b.scoreSelf).toFixed(2), ...cellprops },
                    { text: `${b.countByScore[0]}`, ...cellprops },
                    { text: `${b.countByScore[1]}`, ...cellprops },
                    { text: `${b.countByScore[2]}`, ...cellprops },
                    { text: `${b.countByScore[3]}`, ...cellprops },
                    { text: `${b.countByScore[4]}`, ...cellprops }

                  ])
                ]
              }
            },
            { text: parseFloat(q.avg.others).toFixed(2), ...cellprops },
            { text: parseFloat(q.avg.all).toFixed(2), ...cellprops },
            { text: parseFloat(q.avg.self).toFixed(2), ...cellprops },
          ]),
          [
            { text: '', ...cellprops },
            { text: 'Totals', ...cellprops },
            { text: `Avg Others ${parseFloat(lodash.sum(data.qualitiesMap.map((q) => q.avg.others)) / data.qualitiesMap.length).toFixed(2)}`, ...cellprops },
            { text: `Avg All ${parseFloat(lodash.sum(data.qualitiesMap.map((q) => q.avg.all)) / data.qualitiesMap.length).toFixed(2)}`, ...cellprops },
            { text: `Avg Self ${parseFloat(lodash.sum(data.qualitiesMap.map((q) => q.avg.self)) / data.qualitiesMap.length).toFixed(2)}`, ...cellprops },
          ]
        ]
      }
    }
  ]


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
      // ...debug_section
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
              'Mores Assessments',
            ],
            alignment: 'center',
            fontSize: 8,
            margin: [20, 0, 20, 0],
          },
          {
            text: `${data.organization.name}: Leadership 360° Assessment Report for ${data.delegate.firstName.trim()} ${data.delegate.lastName.trim()} - ${data.meta.when.format('DD MMMM YYYY')}`,
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
      towerstoneLogo: pdfpng(`${APP_DATA_ROOT}/themes/towerstone/images/logo.png`),
      towerstoneLogoGreyScale: pdfpng(`${APP_DATA_ROOT}/themes/towerstone/images/greyscale_logo.png`),
      partnerLogoGreyScale: pdfpng(partnerGreyScaleLogoPath),
      partnerAvatar: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/avatar.png`),
      moresCycle: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/mores-cycle.png`),
      personalBrand: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/personal-brand.png`),
      personalBrandEmpty: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/personal-brand-empty.png`),
      sectionOverview: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/section-overview.png`),
      ratingScale: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/rating_scale.png`),
      moresHoneycomb: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/individual360_honeycomb.png`),
      individualHoneycomb: pdfpng(`${APP_DATA_ROOT}/themes/mores/images/one_view_l360.png`),
      oneViewUser: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/one_view_${data.survey._id}.png`) === true ? pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/one_view_${data.survey._id}.png`) : pdfpng(`${APP_DATA_ROOT}/theme/mores/one_view_l360_sample.png`),
      delegateAvatar: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/profile_${data.delegate._id}_default.jpeg`) === true ? `${APP_DATA_ROOT}/profiles/${data.delegate._id}/profile_${data.delegate._id}_default.jpeg` : pdfpng(`${APP_DATA_ROOT}/profiles/default/default.png`),
      spiderChartAll: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-all-${data.survey._id}.png`) === true ? pdfpng(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-all-${data.survey._id}.png`) : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/spider-chart-all.png`),
      spiderChartAvg: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-avg-${data.survey._id}.png`) === true ? (`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/spider-chart-avg-${data.survey._id}.png`) : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/spider-chart-avg.png`),
      overallScoreChart: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/overall-score-${data.survey._id}-others.png`) === true ? `${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/overall-score-${data.survey._id}-others.png` : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/overall-score-chart.png`),
      overallScoreSelf: existsSync(`${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/overall-score-${data.survey._id}-self.png`) === true ? `${APP_DATA_ROOT}/profiles/${data.delegate._id}/charts/overall-score-${data.survey._id}-self.png` : pdfpng(`${APP_DATA_ROOT}/content/placeholder/charts/overall-score-chart.png`),
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
    styles: partnerStyles(partner),
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
  content: pdfDefinition,
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
