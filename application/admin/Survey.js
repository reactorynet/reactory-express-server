import { Survey } from '../../models/index';

const getSurveysForOrganization = (organization) => {
  return new Promise((resolve, reject) => {
    if (!organization) reject(new Error('Organization is null'));
    Survey.find({ organization }).then((surveys) => {
      resolve(surveys);
    }).catch((findErr) => {
      reject(findErr);
    });
  });
};


const SurveyService = {
  getSurveysForOrganization,
};

export default SurveyService;
