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
import { Cache } from '@reactory/server-core/modules/core/models';
import AuthConfig from '../authentication';
import allSchemas from './schema';
import generators from './schema/generators';
import logger from '../logging';
import { isArray } from 'util';
import { Reactory } from 'types/reactory';
import * as ReactorySchemaTypes from './types';
import { ICacheStatic } from 'modules/core/models/CoreCache';



const router = express.Router();
router.options('/schema', (req, res) => {
  res.status(203).send('');
});

router.post('/schema', (req, res) => {
  res.send({ ok: true });
});

const 24Hours = 86400; //24 

router.get('/schema', async (req, res) => {

  let schemas: Reactory.IReactoryForm[] = [];
  
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
      const conf: ReactorySchemaTypes.IReactoryFormsGeneratorConfig = generationSettings.data;
      const _generators = isArray(conf.generators) ? [...conf.generators ] : [];

      if(conf.enabled === true) {
        let skipGenerationFor: Map<string, boolean> = new Map<string, boolean>();
        if(Cache) {
          let cachePromises: Promise<any>[] = [];
          _generators.forEach((generatorConfig) => {
            cachePromises.push(Cache.getItem(`${global.partner.key}_GENERATED_FORMS_@${generatorConfig.connectionId}`, true));
          });

          
          if(cachePromises.length > 0) {
            try {
              let connectionCacheResult = await Promise.all(cachePromises).then();
              connectionCacheResult.forEach((cachedItem) => {
                const { key, item } = cachedItem;
                if(item !== null) {                  
                  let itemObject = JSON.parse(item);
                  if(isArray(itemObject) === true) {
                    logger.debug(`Found ${itemObject.length} forms for ${key}`);
                    skipGenerationFor.set(key, true);
                    schemas = [...schemas, ...itemObject];
                  }                  
                }
              });
            } catch(error) {
              logger.error('Could not fetch cache results for forms', error);
            }            
          }                              
        }
                 
        if(_generators.length > 0) {
          const formPromiseResults = await Promise.all(_generators.map(({ id, connectionId, props }) => {
            return ( async (id, connectionId, props) => {                
              logger.debug(`Executing Generator ${id} for connection: ${connectionId}`);              
              if(typeof generators[id] === 'function') {
                const cacheKey = `${global.partner.key}_GENERATED_FORMS_@${connectionId}`
                logger.debug(`Checking cache key ${cacheKey}`);
                if(skipGenerationFor.has(cacheKey) === false) {
                  logger.debug(`No cache available for ${cacheKey}`);                  
                  const forms = await generators[id]({ partner: global.partner, connectionId, props }).then();
                  logger.debug(`Provider generated ${forms.length} forms`)
                  if(Cache) {
                    try {
                      Cache.setItem(cacheKey, JSON.stringify(forms), 24Hours, global.partner);
                    } catch(setCacheError) {
                      logger.error("Could not set the cache item due to an error", setCacheError);
                    }
                  }
                  return forms;
                }
                return [];
              } else {
                logger.warn(`Warning, no generator found with the id: ${id} - skipped generation of forms`, generators);
              }
            })(id, connectionId, props);            
          })).then();
        
          if(formPromiseResults.length > 0) {
            formPromiseResults.map((formResults) => {
              logger.debug(`Checking Form Result ${formResults.length}`);
              schemas = [ ...schemas, ...formResults ];
            });            
          }
        }
      }
    }
  }
  
  res.send(schemas);
});

export default router;
