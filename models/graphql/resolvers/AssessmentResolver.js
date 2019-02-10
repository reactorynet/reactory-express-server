import { ObjectId } from 'mongodb';
import moment from 'moment';
import lodash from 'lodash';
import { User, Survey, Assessment, LeadershipBrand } from '../../index';
import logger from '../../../logging';
import ApiError, { RecordNotFoundError } from '../../../exceptions';


const assessmentResolver = {
  Query: {

  },
  Mutation: {
    setRatingForAssessment: async (obj, {
      id, ratingId,
      rating, comment,
      qualityId, behaviourId,
      custom, behaviourText,
      deleteRating = false,
    }) => {
      logger.info(`Setting Rating ${ratingId} for Assessment ${id}`);
      const assessment = await Assessment.findById(id).then();
      const isNew = lodash.isString(ratingId) === true && ratingId === 'NEW';


      if (assessment && ratingId && isNew === false) {
        const ratingDoc = assessment.ratings.id(ratingId);
        if (ratingDoc && deleteRating === false) {
          ratingDoc.rating = rating;
          ratingDoc.comment = comment;
          ratingDoc.updatedAt = new Date().valueOf();
        }

        if (ratingDoc && deleteRating === true) {
          ratingDoc.remove();
        }

        assessment.updatedAt = new Date().valueOf();
        await assessment.save().then();
        return ratingDoc;
      }

      if (assessment && isNew === true) {
        if (qualityId) {
          const survey = await Survey.findById(assessment.survey).then();
          if (!survey) {
            throw new RecordNotFoundError('Survey not found for assessment record');
          }
          const lb = await LeadershipBrand.findById(survey.leadershipBrand).then();
          if (!lb) {
            throw new RecordNotFoundError('Leadeship Brand not found for assessment record');
          }


          if (lb.qualities.id(qualityId)) {
            let ratingDoc = null;
            if (!custom) {
              if (lb.qualities.id(qualityId).behaviours.id(behaviourId)) {
                ratingDoc = {
                  _id: new ObjectId(),
                  behaviourId,
                  qualityId,
                  rating,
                  comment,
                  updatedAt: new Date().valueOf(),
                };
                assessment.ratings.push(ratingDoc);
              } else throw new ApiError('New non custom behaviours must have a behaviour id');
            } else {
              ratingDoc = {
                _id: new ObjectId(),
                qualityId,
                rating,
                comment,
                custom: true,
                behaviourText,
                updatedAt: new Date().valueOf(),
              };
              assessment.ratings.push(ratingDoc);
            }

            if (ratingDoc != null) {
              await assessment.save().then();
              return ratingDoc;
            }
            throw new ApiError('Could not set the rating value for the assessment');
          }
        } else {
          throw new ApiError('Must specify qualityId and behaviourId to set rating');
        }
      } else {
        throw new RecordNotFoundError('Could not find the assessment with the id', 'Assessment');
      }

      throw new ApiError('Should have returned already');
    },
    setAssessmentComplete: async (obj, { id }) => {
      const assessment = await Assessment.findById(id).then();
      assessment.complete = true;
      await assessment.save().then();

      return assessment;
    },
  },
};

export default assessmentResolver;
