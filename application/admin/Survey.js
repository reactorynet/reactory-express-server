import { ObjectId } from 'mongodb';
import { Survey, LeadershipBrand } from '../../models/index';

const getSurveysForOrganization = (organization) => {
  return new Promise((resolve, reject) => {
    if (!organization) reject(new Error('Organization is null'));
    Survey.find({ organization }).then((surveys) => {
      console.log(`Found ${surveys.length} surveys for organization`);
      resolve(surveys);
    }).catch((findErr) => {
      reject(findErr);
    });
  });
};

const getSurveys = () => Survey.find();

const createSurvey = (survey) => {
  return new Survey(survey).save();
};


const createLeadershipBrand = (brandInput) => {
  const now = new Date().valueOf();
  const brand = { ...brandInput, createAt: now, updatedAt: now };

  if (brandInput.legacyId) {
    return LeadershipBrand.findOneAndUpdate({ legacyId: brandInput.legacyId }, brand, { upsert: true });
  }

  if (brandInput._id || brandInput.id) {
    return LeadershipBrand.findOneAndUpdate({ _id: brandInput._id || brandInput.id }, brand, { upsert: true });
  }

  return new LeadershipBrand(brand).save();
};

const updateLeadershipBrand = (brandInput) => {
  return LeadershipBrand.findOneAndUpdate({ _id: ObjectId(brandInput.id) }, { ...brandInput });
};

const getLeadershipBrand = (id) => {
  return LeadershipBrand.findById(id);
};

const SurveyService = {
  getSurveysForOrganization,
  getSurveys,
  getLeadershipBrand,
  createSurvey,
  createLeadershipBrand,
  updateLeadershipBrand,
};

export default SurveyService;
