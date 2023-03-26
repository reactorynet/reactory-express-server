import fs from 'fs';

export const fileAsString = (filename: string) => {
  return fs.readFileSync(filename, 'utf8');
};

export default {
  fileAsString,
};
