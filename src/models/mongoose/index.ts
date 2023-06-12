import mongoose, { ConnectOptions } from 'mongoose';


const {
    MONGOOSE,
    MONGO_USER,
    MONGO_PASSWORD,
    DOMAIN_NAME,
    SERVER_ID
  } = process.env;

export const options: ConnectOptions = {
    user: MONGO_USER,
    pass: MONGO_PASSWORD,
    appName: `reactory[${SERVER_ID}@${DOMAIN_NAME}]]`,
};

const connection = mongoose.connect(MONGOOSE, options);

export default connection;

