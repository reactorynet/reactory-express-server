import express from 'express';
import fileUpload from './fileUpload';
import imageUpload from './imageUpload';
import videoUpload from './videoUpload';

const router = express.Router({
  caseSensitive: true,
  strict: true
});

const uploader = {
  file: fileUpload,
  image: imageUpload,
  video: videoUpload,
};

router.options('/upload/:uploadType', (req, res) => {
  if (uploader[req.params.uploadType]) res.status(203).send(`Upload ${req.params.uploadType} supported`);
  else res.status(403).send(`Upload ${req.params.uploadType} not-supported`);
});

router.post('/upload/:uploadType', (req, res) => {
  if (req.params.uploadType) {
    uploader[req.params.uploadType](req, (err, data) => {
      if (err) {
        return res.status(404).end(JSON.stringify(err));
      }
      res.send(data);
    });
  } else {
    res.status(403).send(JSON.stringify({ message: 'No upload type specified, use "image", "file" or "video"' }));
  }
});

router.options('/image_manager', (req, res) => {
  res.status(203).send('Supports GET and POST');
});

router.get('/image_manager', (req, res) => {
  res.send(200).send([{
    url: 'http://exmaple.com/images/photo1.jpg',
    thumb: 'http://exmaple.com/thumbs/photo1.jpg',
    tag: 'flower',
  },
  {
    url: 'http://exmaple.com/images/photo2.jpg',
    thumb: 'http://exmaple.com/thumbs/photo2.jpg',
    tag: 'sport',
  }]);
});

export default router;
