import express from 'express';
import moment from 'moment';
import { isNil, isEmpty } from 'lodash';
import Admin from '../application/admin';
import ApiError, { UserExistsError, UserValidationError, OrganizationExistsError, UserNotFoundException, SystemError } from '../exceptions';
import AuthConfig from '../authentication';
import allSchemas from './schema';

const router = express.Router();
router.options('/schema', (req, res) => {
  res.status(203).send('');
});

router.post('/schema', (req, res) => {
  res.send({ ok: true });
});

router.get('/schema', (req, res) => {
  allSchemas().then((schemas) => {
    res.send(schemas);
  }).catch((schemaError) => {
    res.status(500).send(new ApiError(schemaError.message));
  });
});

export default router;
