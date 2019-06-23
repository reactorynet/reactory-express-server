import express from 'express';
import testchart from './testchart';

const router = express.Router();
const {
  APP_DATA_ROOT,
} = process.env;

router.get('/test', (req, res) => {
  testchart({
    file: 'chartjs-test.png',
    folder: `${APP_DATA_ROOT}/content/images/charts`,
  }).then((chartresult) => {
    res.status(200).send({ ok: true, chartresult });
  }).catch((charterr) => {
    res.status(500).send({ error: charterr.message });
  });
});

router.options('/test', (req, res) => {
  res.status(200).send({ ok: true, supports: 'GET', returns: { GET: 'application/json' } });
});


export default router;
