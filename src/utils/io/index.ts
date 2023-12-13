import fs from 'fs';

export const fileAsString = (filename: string) => {
  return fs.readFileSync(filename, 'utf8');
};

export const ingest = (filename: string, options?: { paths: string[] }): string => {
  return fileAsString(filename);
}

export default {
  fileAsString,
};
