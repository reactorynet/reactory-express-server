import inspector from 'schema-inspector';

const nil = (o) => {
  if (o === undefined) return true;
  if (o === null) return true;
  if (typeof o === 'undefined') return true;

  return false;
};

const nilStr = (s) => {
  if (nil(s) === true) return true;
  if (typeof s === 'string') {
    if (s.trim() === '') return true;
    return false;
  }
  throw new Error('input is of invalid type, string or null expected');
};

export const jzon = {
  validate: (data, schema, custom, callback) => {
    return inspector.validate(data, schema, custom, callback);
  }, 
  sanitize: (data, schema) => {
    return inspector.sanitize(data, schema);
  } 
};


const iz = {
  email: (email) => {
    // eslint-disable-next-line
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  },
  nil,
  nilStr,
  jzon,
};


export default iz;
