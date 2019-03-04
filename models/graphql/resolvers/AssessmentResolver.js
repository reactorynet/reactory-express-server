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
      const assessment = await Assessment.findById(id).populate('assessor').populate('delegate').then();
      const surveyDoc = await Survey.findById(assessment.survey).then();
      assessment.complete = true;
      await assessment.save().then();
      const { user } = global;

      if (user._id.equals(assessment.assessor._id) === true) {
        surveyDoc.addTimelineEntry('Assessment Completed', `${user.fullName()} completed assessment for ${assessment.delegate.fullName()}`, user._id, true);
      } else {
        surveyDoc.addTimelineEntry('Assessment Completed', `${user.fullName()} completed assessment for ${assessment.delegate.fullName()} on behalf of ${assessment.assessor.fullName()}`, user._id, true);
      }
      return assessment;
    },
    /**
   * deletes and assessment, when remove is true, it will attempt to clean up all
   * data relevant to the survey and remove all records relating to the
   * survey.  This has no undo, so should only be used in extreme cases.
   * Soft delete should be sufficient
   */
    deleteAssessment: async (obj, { id, remove = false }) => {
      try {
        const assessmentDoc = await Assessment.findById(id).then();
        if (lodash.isNil(assessmentDoc)) throw new RecordNotFoundError(`The assessment with the id ${id} was not found, perhaps it was already deleted.`);

        if (remove === false) {
          assessmentDoc.deleted = true;
          assessmentDoc.updatedAt = new Date().valueOf();
          await assessmentDoc.save().then();
          return {
            deleted: true,
            removed: false,
          };
        }
        // clean up from Survey References
        const surveyDoc = await Survey.findById(assessmentDoc.survey).then();
        if (lodash.isNil(surveyDoc) === false) {
          const delegateIndex = lodash.findIndex(surveyDoc.delegates, { delegate: assessmentDoc.delegate });
          if (delegateIndex >= 0) {
            if (lodash.isArray(surveyDoc.delegates[delegateIndex].assessments) === true) {
              surveyDoc.delegates[delegateIndex].assessments.remove(assessmentDoc._id);
              await surveyDoc.save().then();
            }
          }
        }

        assessmentDoc.remove();
        await assessmentDoc.save().then();

        return {
          deleted: true,
          removed: true,
        };
      } catch (unhandledException) {
        logger.error(`Unhandled error while deleting assessment: ${id}\n${unhandledException.message}`, unhandledException);
        throw new ApiError(`Could not ${remove ? 'remove' : 'soft-delete'} the record for Assessment Id: ${id}`);
      }
    },
  },
};

export default assessmentResolver;
