import express from 'express';
import { isNil } from 'lodash';
import Admin from '../application/admin';
import { OrganizationNotFoundError } from '../exceptions';

const router = express.Router();

router.get('/search', (req, res) => {
  const { id } = req.query;

  Admin.Organization.findById(id).then((results) => {
    if (!isNil(results)) {
      res.send({ id, name: results.name });
    } else {
      res.status(404).send(new OrganizationNotFoundError(`No organization with id: ${id} exists`))
    }
  });
});

export default router;
