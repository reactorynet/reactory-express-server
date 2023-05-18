import * as dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import _ from 'lodash';
import ReactoryResource from '@reactory/server-modules/core/models/ReactoryResource';
import logger from '../logging';



const decompress = require('decompress');
const decompressUnzip = require('decompress-unzip');


dotenv.config();

const router = express.Router();

router.options('/', (req, res) => {
  res.status(203).send('');
});


router.post('/', async (req, res) => {
  const resource = new ReactoryResource(req.body);
  const validationResult = resource.validateSync();
  if (validationResult && validationResult.length > 0) {
    logger.debug('Could not validate resource', validationResult);
    res.status(403).send(validationResult);
    return;
  }

  await resource.save().then();
  res.send({
    accepted: true,
    id: resource._id.toString(),
  });
});

router.get('/', (req, res) => {
  logger.info('Running GET for /resources/');
  // return a test pdf page with instructions on how to use the api
  res.send(ReactoryResource.find({}));
});

router.get('/install/:id', async (req, res) => {
  const resource = await ReactoryResource.findById(req.params.id).then();
  const { WEBROOT, APP_DATA_ROOT } = process.env;

  const _paths = {
    build: `${APP_DATA_ROOT}/builds`,
  };

  try {
    if (fs.existsSync(resource.meta.installerprops.path) === false) fs.mkdirSync(_paths.build, { recursive: true });

    if (resource && resource.resourceType === 'application' && resource.meta.installer === 'nginx') {
      const file = `${_paths.build}/${resource.version}/${resource.meta.clientKey}/${resource.name}`;
      if (fs.existsSync(file) === true && file.endsWith('.zip') === true) {
        if (fs.existsSync(resource.meta.installerprops.path) === false) {
          fs.mkdirSync(resource.meta.installerprops.path, { recursive: true });
        }
        decompress(file, resource.meta.installerprops.path, {
          plugins: [
            decompressUnzip(),
          ],
        }).then(() => {
          console.log('Files decompressed');
          res.status(200).send({ success: true, message: 'Ensure caches are cleared after updating content' });
        }).catch((decompressionError: any) => {
          if (decompressionError?.code === 'EISDIR' && decompressionError?.errno === -21 && decompressionError?.syscall === 'open') {
            /*
            code: "EISDIR"
            errno: -21
            path: "/mnt/d/data/reactory/html/www/lasec-crm/static/css/"
            syscall: "open"
            */
            logger.warn('Decompression - WARNING: System indicates directory is open, but it is not. False positive, but requires further investigation');
            res.status(200).send({ success: true, message: 'Ensure caches are cleared after updating content' });
          } else {
            console.error('This thing got bubble sickness', decompressionError);
            res.status(501).send('There is mockery afoot...');
          }          
        });
      } else {
        res.status(403).send('This is not the file you are looking for');
      }
    }
  } catch (unzipError) {
    logger.error('Could not unpack the application content', unzipError);
    res.status(501).send({ message: 'Could not unpack the application content' });
  }
});

export default router;
