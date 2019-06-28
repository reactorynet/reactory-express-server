import logger from '../logging';

const Busboy = require('busboy');
const path = require('path');
const fs = require('fs');
const sha1 = require('sha1');


const {
  APP_DATA_ROOT,
  CDN_ROOT,
} = process.env;

// Gets a filename extension.
function getExtension(filename) {
  return filename.split('.').pop();
}

// Test if a file is valid based on its extension and mime type.
function isFileValid(filename, mimetype) {
  const allowedExts = ['txt', 'pdf', 'doc', 'zip'];
  const allowedMimeTypes = ['text/plain', 'application/msword', 'application/x-pdf', 'application/pdf', 'application/zip'];

  // Get file extension.
  const extension = getExtension(filename);

  return allowedExts.indexOf(extension.toLowerCase()) != -1 &&
     allowedMimeTypes.indexOf(mimetype) != -1;
}

function upload(req, callback) {
  // The route on which the file is saved.
  let fileRoute = 'content';
  let preserveFilename = false;
  if (req.query['__reactory__upload'] === 'true') {
    logger.info('Uploading reactory specific file');
    fileRoute = req.query.folder || fileRoute;
    preserveFilename = true;
  }
  // Server side file path on which the file is saved.
  let saveToPath = null;

  // Flag to tell if a stream had an error.
  let hadStreamError = null;

  // Used for sending response.
  let link = null;

  // Stream error handler.
  function handleStreamError(error) {
    // Do not enter twice in here.
    if (hadStreamError) {
      return;
    }

    hadStreamError = error;

    // Cleanup: delete the saved path.
    if (saveToPath) {
      // eslint-disable-next-line consistent-return
      return fs.unlink(saveToPath, (err) => {
        return callback(error);
      });
    }

    // eslint-disable-next-line consistent-return
    return callback(error);
  }

  // Instantiate Busboy.
  let busboy = null;
  try {
    busboy = new Busboy({ headers: req.headers });
  } catch (e) {
    return callback(e);
  }

  // Handle file arrival.
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    logger.debug(`Received a new file: ${fieldname}, ${filename} - ${mimetype}`);
    // Check fieldname:
    if (fieldname != 'file') {
      // Stop receiving from this stream.
      file.resume();

      return callback("Fieldname is not correct. It must be 'file'.");
    }

    if (preserveFilename === false) {
      // Generate link.
      const randomName = `${sha1(new Date().getTime())}.${getExtension(filename)}`;
      link = `${CDN_ROOT}${fileRoute}/files/${randomName}`;
      saveToPath = path.join(APP_DATA_ROOT, 'content', 'files', randomName);
    } else {
      link = `${CDN_ROOT}${fileRoute}${filename}`;
      saveToPath = path.join(APP_DATA_ROOT, fileRoute, filename);
      if (fs.existsSync(path.join(APP_DATA_ROOT, fileRoute)) === false) {
        fs.mkdirSync(path.join(APP_DATA_ROOT, fileRoute));
      }      
      //if (fs.existsSync(saveToPath) === false) 
    }
    // Generate path where the file will be saved.
    // var appDir = path.dirname(require.main.filename);

    // Pipe reader stream (file from client) into writer stream (file from disk).
    file.on('error', handleStreamError);

    // Create stream writer to save to file to disk.
    const diskWriterStream = fs.createWriteStream(saveToPath);
    diskWriterStream.on('error', handleStreamError);

    // Validate file after it is successfully saved to disk.
    diskWriterStream.on('finish', () => {
      // Check if file is valid
      const status = isFileValid(saveToPath, mimetype);

      if (!status) {
        return handleStreamError(`File does not meet the validation. ${status}`);
      }

      return callback(null, { status, link });
    });

    // Save file to disk.
    file.pipe(diskWriterStream);
  });

  // Handle file upload termination.
  busboy.on('error', handleStreamError);
  req.on('error', handleStreamError);

  // Pipe reader stream into writer stream.
  return req.pipe(busboy);
}

module.exports = upload;
