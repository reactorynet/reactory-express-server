import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Survey } from '../../../database/legacy';

const assessmentResolver = {
    Query: {
        assessmentWithId( id ){            
            return Survey.getAssessmentData(id);
        }
    }
};

export default assessmentResolver;