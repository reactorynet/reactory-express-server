import { PNG, PackerOptions } from 'pngjs';
import imageType from 'image-type';
import { resolve as resolvePath } from 'path';
import { readFileSync, existsSync } from 'fs';
const badref = `${process.env.APP_DATA_ROOT}/themes/mores/images/badref.png`;

export const pdfpng = (path: string) => {
  let buffer = null;
  let returnpath = path;
  try {
    buffer = readFileSync(path);
  } catch (fileError) {
    returnpath = resolvePath(badref);
    buffer = readFileSync(returnpath);
  }

  try {
    const { mime } = imageType(buffer);
    if (mime === 'image/png') {
      const png = PNG.sync.read(buffer);
      if (png.interlace) {
        //@ts-ignore
        buffer = PNG.sync.write(png, { interlace: true });
      }
      return buffer;
    }
  } catch (buffErr) {
    returnpath = badref;
  }

  return returnpath;
};

