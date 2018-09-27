// import moment from 'moment';
import { ObjectId } from 'mongodb';
import co from 'co';
import _ from 'lodash';
import moment from 'moment';
import { getPool, querySync } from './legacy';

const { isNil, countBy, find } = _;

const assessmentScaffoldQuery = () => `
select 
  lb.id as brandId, 
  lb.brand_statement as brandStatement, 
  q.id as qualityId,
  q.ordinal as qualityOrdinal,
  q.name as qualityName,
  b.id as behaviourId, 
  b.ordinal as behaviourOrdinal,
  b.description as behaviourDescription from leadership_brand as lb
inner join quality as q on q.leadership_brand_id = lb.id 
inner join behaviour as b on b.quality_id = q.id
where organization_id = 1
and lb.id = 8
order by q.ordinal, b.ordinal;
`;

const scalesQuery = () => {
  return `
    SELECT  
      scale.id as legacyScaleId,      
      scale.title as title,
      scale.is_default as isDefault,
      scaleEntry.description,
      scaleEntry.scale as rating
    FROM assessment_scale as scale inner join 
      assessment_scale_entry as scaleEntry on scale.id = scaleEntry.assessment_scale_id
    ORDER BY scale.id, scaleEntry.scale
  `;
};

const leadershipBrandForOrganizationQuery = (organizationId) => {
  return `
  SELECT lb.id as legacyId,
      lb.title as title,
      lb.brand_statement as description,
      lb.date_created as createdAt,
      lb.last_updated as updatedAt,
      lb.organization_id as legacyOrganizationId,
      lb.scale_id as legacyScaleId            
  FROM leadership_brand as lb
  WHERE lb.organization_id = ${organizationId}
  `;
};

const qualitiesForBrandQuery = (brandId) => {
  return `
    SELECT 
      q.id as legacyId,
      q.name as title,
      q.description,
      q.ordinal,
      q.date_created as createdAt,
      q.last_updated as updatedAt
  FROM quality as q
  WHERE q.leadership_brand_id = ${brandId}`;
};

const behaviourForQualityQuery = (qualityId) => {
  return `
    SELECT 
      b.id as legacyId,
      b.description as title,
      b.description as description,
      b.ordinal as ordinal
    FROM 
      behaviour as b
    WHERE
      b.quality_id = ${qualityId}
    ORDER BY b.ordinal
  `;
};

const assessmentsForOrganization = (organizationId) => {
  return `
    SELECT
      a.id as legacyId,
      a.assessor_id as legacyAssessorId,
      a.employee_id as legacyEmployeeId,
      a.complete as isComplete,
      a.valid_from as startDate,
      a.valid_to as endDate,
      a.scale_id as legacyScaleId,
      ab.survey_id as legacySurveyId,
      sv.completed as complete,
      sv.title
  FROM
      assessment as a inner join assessment_batch as ab
      on a.assessment_batch_id = ab.id inner join survey_assessment_batch as sab
      on sab.assessment_batch_id = ab.id inner join survey as sv 
      on sv.id = sab.survey_batches_id
  WHERE 
      sv.id in (select id from survey where survey.organization_id = ${organizationId})
    `;
};

const ratingsForAssessment = (id) => {
  return `
    SELECT
      q.id as legacyQualityId,
      q.name,
      q.ordinal qualityOrdinal,    
      br.behaviour_id as legacyBehaviourId,
      b.ordinal behaviourOrdinal,
      br.comment as comment,
      br.rating
    FROM behaviour_rating as br inner join behaviour b on b.id = br.behaviour_id
    INNER JOIN quality q on q.id = b.quality_id
    WHERE br.assessment_id = ${id}`;
};

const behavioursForQuality = co.wrap(function* listBehavioursForQualityGenerator(id, options) {
  const behaviourRows = yield querySync(behaviourForQualityQuery(id), options);
  console.log(`Found ${behaviourRows.length} behaviour rows`);
  if (behaviourRows.length && behaviourRows.length === 0) return [];
  const now = new Date().valueOf();
  const behaviours = [];

  for (let bi = 0; bi < behaviourRows.length; bi += 1) {
    behaviours.push({
      ...behaviourRows[bi],
      createdAt: now,
      updateAt: now,
    });
  }
  console.log(`Returning ${behaviours.length} behaviours`);
  return behaviours;
});

const qualitiesForBrand = co.wrap(function* listQualitiesForBrand(id, options) {
  const qualitiesRows = yield querySync(qualitiesForBrandQuery(id), options);
  console.log(`Found ${qualitiesRows.length} in db`);
  if (qualitiesRows.length === 0) return [];

  const now = new Date().valueOf();
  const qualities = [];

  for (let qi = 0; qi < qualitiesRows.length; qi += 1) {
    try {
      const beahvioursForQuality = yield behavioursForQuality(qualitiesRows[qi].legacyId, options);
      const quality = {
        ...qualitiesRows[qi],
        behaviours: beahvioursForQuality,
        createdAt: now,
        updateAt: now,
      };
      qualities.push(quality);
    } catch (someErr) {
      console.error(someErr.message);
    }
  }
  console.log(`Returning ${qualities.length} qualities`);
  return qualities;
});

/**
 * Returns leadership brands for legacy organization
 * @param {int} id
 * @param {*} options
 */
function* listBrandsForOrganization(id, options) {
  const leadershipBrandsForOrganizationRows = yield querySync(leadershipBrandForOrganizationQuery(id, options)); // yield requestWrapper;
  if (leadershipBrandsForOrganizationRows && leadershipBrandsForOrganizationRows.length === 0) {
    console.log('Organization has no leadership brands');
    return [];
  }

  console.log(`Organization has ${leadershipBrandsForOrganizationRows.length} leadership brands`);
  const leadershipBrands = [];
  const now = new Date().valueOf();
  for (let lbi = 0; lbi < leadershipBrandsForOrganizationRows.length; lbi += 1) {
    const leaderhipBrand = {
      ...leadershipBrandsForOrganizationRows[lbi],
      qualities: yield qualitiesForBrand(leadershipBrandsForOrganizationRows[lbi].legacyId, options),
      createdAt: now,
      updatedAt: now,
    };
    leadershipBrands.push(leaderhipBrand);
  }
  return leadershipBrands;
}

function* listScalesGenerator(options) {
  const rows = yield querySync(scalesQuery(), options);
  const scales = [];
  for (let rid = 0; rid < rows.length; rid += 1) {
    let scale = null;
    scale = find(scales, { legacyId: rows[rid].legacyScaleId });
    if (isNil(scale) === true) {
      scale = {
        legacyId: rows[rid].legacyScaleId,
        key: rows[rid].title.toString().toLowerCase().replace(' ', '-'),
        title: rows[rid].title,
        isDefault: rows[rid].isDefault === true,
        entries: [
          {
            description: rows[rid].description,
            rating: rows[rid].rating,
          },
        ],
      };
      scales.push(scale);
    }

    if (isNil(find(scale.entries, { rating: rows[rid].rating })) === true) {
      scale.entries.push({
        description: rows[rid].description,
        rating: rows[rid].rating,
      });
    }
  }

  return scales;
}

function* listSurveysForOrganization(id, options) {
  const rows = yield querySync(`
  SELECT 
    sv.id as legacyId,    
    sv.date_created as createdAt,
    sv.description as description,
    sv.last_updated as updatedAt,
    sv.launched as launched,
    sv.leadership_brand_id legacyBrandId,
    sv.organization_id legacyOrganizationId,
    sv.scale_id scaleId, 
    sv.title,
    sv.valid_from startDate,
    sv.valid_to endDate,
    sv.calculated_date processDate,
    sv.completed isComplete,
    sv.survey_average averageScore,
    sv.minimum_assessment_count minAssessmentsCount, 
    sv.test isTest,
    sv.survey_type surveyType
FROM survey as sv
WHERE 
    sv.organization_id = ${id}
ORDER BY sv.valid_from
    `, options);
  if (rows && rows.length > 0) {
    console.log(`Found ${rows.length} surveys for organization`);
    return rows.map((surveyRow) => {
      const survey = {
        ...surveyRow,
        mode: surveyRow.test === 1 ? 'test' : 'live',
        status: 'complete',
        calendar: [],
        delegates: [],
        timeline: [{
          when: moment(surveyRow.createdAt).isMoment ?
            moment(surveyRow.createdAt).valueOf() :
            new Date().valueOf(),
          eventType: 'info',
          eventDetail: 'Survey created by System Import',
        }],
      };
      return survey;
    });
  }
  return [];
}

function* listRatingsForAssessment(id, options) {
  const ratingsRows = yield querySync(ratingsForAssessment(id), options);
  if (ratingsRows.length && ratingsRows.length === 0) return [];
  const ratings = [];
  for (let rid = 0; rid < ratingsRows.length; rid += 1) {
    const rating = {
      ...ratingsRows[rid],
    };
    ratings.push(rating);
  }

  return ratings;
}

function* listAssessmentsForOrganization(organizationId, options) {
  const assessmentRows = yield querySync(assessmentsForOrganization(organizationId), options);

  if (assessmentRows.length && assessmentRows.length === 0) return [];
  const assessments = [];
  for (let ai = 0; ai < assessmentRows.length; ai += 1) {
    const assessment = {
      ...assessmentRows[ai],
      organization: null,
      client: null,
      delegate: null,
      assessor: null,
      survey: null,
      leadershipBrandId: null,
      ratings: yield listRatingsForAssessment(assessmentRows[ai].legacyId, options),
    };
    assessments.push(assessment);
  }
  return assessments;
}

export default class Survey {
  static getAssessmentData = co.wrap(function* getAssessmentDataGenerator() {
    try {
      const assessmentData = {
        id: 'fake-id-12345',
        leadershipBrand: {
          description: null,
          qualities: [],
        },
        response: null,
        organization: {
          name: 'TowerStone Global',
          id: 2,
          logo: 'logo.png',
        },
      };

      const requestWrapper = new Promise((resolve, reject) => {
        const resultCallback = (error, results) => {
          if (error === null || error === undefined) {
            resolve(results);
          } else {
            reject(error);
          }
        };
        getPool().query(assessmentScaffoldQuery(), resultCallback);
      });

      const assessmentRowResult = yield requestWrapper;

      console.log(`${assessmentRowResult.length} assessment data (s) matching query`);
      _.map(assessmentRowResult, (rowResult) => {
        assessmentData.leadershipBrand.description = rowResult.brandStatement;
        assessmentData.leadershipBrand.id = ObjectId();
        if (_.isNil(_.find(
          assessmentData.leadershipBrand.qualities,
          { id: rowResult.qualityId },
        )) === true) {
          assessmentData.leadershipBrand.qualities.push({
            id: rowResult.qualityId,
            title: rowResult.qualityName,
            ordinal: rowResult.qualityOrdinal,
            behaviours: [{
              id: rowResult.behaviourId,
              description: rowResult.behaviourDescription,
              ordinal: rowResult.behaviourOrdinal,
            }],
          });
        } else {
          _.find(
            assessmentData.leadershipBrand.qualities,
            { id: rowResult.qualityId },
          ).behaviours.push({
            id: rowResult.behaviourId,
            description: rowResult.behaviourDescription,
            ordinal: rowResult.behaviourOrdinal,
          });
        }
      });

      return assessmentData;
    } catch (e) {
      console.error('Error loading data', e);
      return null;
    }
  });


  static listScales = co.wrap(listScalesGenerator);
  /**
   * Returns brands for a given company
   */
  static listBrandsForOrganization = co.wrap(listBrandsForOrganization);

  /**
   * Returns the surveys for an organization
   */
  static listSurveysForOrganization = co.wrap(listSurveysForOrganization);

  /**
   * Returns ratings for assessment
   */
  static listRatingsForAssessment = co.wrap(listRatingsForAssessment);

  /**
   * Returns assessments for an organization
   */
  static listAssessmentsForOrganization = co.wrap(listAssessmentsForOrganization);
}
