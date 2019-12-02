import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { PNG } from 'pngjs';
import imageType from 'image-type';
import { isArray } from 'util';
import _ from 'lodash';
import logger from '@reactory/server-core/logging';
import ApiError from 'exceptions';
import ExcelWriter from './ExcelWriter';
import ExcelReader from './ExcelReader';

const router: express.IRouter = express.Router();

router.post('/upload', (req, res) => {  
  try {
        
  } catch (uploadError) {
    res.status(403).send(new ApiError(uploadError.message));
  }  
});


router.get('/download', (req, res) => {  
  try {
    
  } catch (schemaLoadError) {
    res.status(403).send(new ApiError(schemaLoadError.message));
  }  
});

export default router;