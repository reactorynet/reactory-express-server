import mongoose, { ConnectOptions } from 'mongoose';


const {
    MONGOOSE,
    MONGO_USER,
    MONGO_PASSWORD,

    MODE,
    NODE_ENV,
    DOMAIN_NAME,
    SERVER_ID
  } = process.env;

const options: ConnectOptions = {
    user: MONGO_USER,
    pass: MONGO_PASSWORD,
    appName: `reactory[${SERVER_ID}@${DOMAIN_NAME}]]`,
    //useNewUrlParser: true
};

const connection = mongoose.connect(MONGOOSE, options);

export default connection;

