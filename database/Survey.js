// import moment from 'moment';
import { ObjectId } from 'mongodb';
import co from 'co';
import _ from 'lodash';
import { getPool } from './legacy';


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
}
