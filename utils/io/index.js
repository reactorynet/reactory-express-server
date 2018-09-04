import fs from 'fs';

const fileAsString = (filename) => {
    return fs.readFileSync(filename, 'utf8');
}

module.exports = {
    fileAsString
};