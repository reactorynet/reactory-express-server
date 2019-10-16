import express from 'express';
import moment from 'moment';
import { isNil, isEmpty } from 'lodash';
import Admin from '../application/admin';
import ApiError, { 
  UserExistsError, 
  UserValidationError, 
  OrganizationExistsError,
  UserNotFoundException, 
  SystemError 
} from '../exceptions';
import { Cache } from '../models';
import AuthConfig from '../authentication';
import allSchemas from './schema';
import generators from './schema/generators';
import logger from '../logging';
import { isArray } from 'util';

const router = express.Router();
router.options('/schema', (req, res) => {
  res.status(203).send('');
});

router.post('/schema', (req, res) => {
  res.send({ ok: true });
});

router.get('/schema', async (req, res) => {

  let schemas = [];
  try {
    const staticSchemas = await allSchemas().then();
    if(isArray(staticSchemas) === true) {
      schemas = staticSchemas;
    }
  } catch (staticSchemaError) {
    logger.error('Error while return static form schemas', staticSchemaError);
  }

  if(global.partner) {
    const generationSettings = global.partner.getSetting('reactory.forms.generation');
    //check if we have generation settings
    if(generationSettings && generationSettings.data) {
      logger.debug('Partner has generation settings configured');
      const conf = { ...generationSettings.data };
      if(conf.enabled === true) {
        let skipGeneration = false;
        if(Cache) {
          const cachedForms = await Cache.getItem(`${global.partner.key}_GENERATED_FORMS_@${connectionId}`).then();
          if(cachedForms) {
            schemas = [ ...schemas, ...cachedForms ];
            skipGeneration = true;
          }
        }

        if(skipGeneration === false) {
          const _generators = isArray(conf.generators) ? [...conf.generators ] : [];
          if(_generators.length > 0) {
            const formPromiseResults = await Promise.all(_generators.map(({ id, connectionId, props }) => {
              return ( async (id, connectionId, props) => {                
                if(typeof generators[id] === 'function') {
                  const forms = await generators[id]({ partner: global.partner, connectionId, props }).then();
                  if(Cache) {
                    Cache.setItem(`${global.partner.key}_GENERATED_FORMS_@${connectionId}`, forms, global.partner);
                  }                
                  return forms;
                } else {
                  logger.warn(`Warning, no generator found with the id: ${id} - skipped generation of forms`, generators);
                }
              })(id, connectionId, props);            
            })).then();
          
            if(formPromiseResults.length > 0) {
              formPromiseResults.map((formResults) => {
                schemas = [ ...schemas, ...formResults ];
              });            
            }                                    
          }  
        }                
      }      
    }     
  }
  
  res.send(schemas);
});

export default router;
