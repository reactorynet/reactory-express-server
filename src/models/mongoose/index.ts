import mongoose, { Mongoose, ConnectionOptions } from 'mongoose';


const {
    MONGOOSE,
    MONGO_USER,
    MONGO_PASSWORD,

    MODE,
    NODE_ENV,
    DOMAIN_NAME,
    SERVER_ID
  } = process.env;

const options: ConnectionOptions = {
    user: MONGO_USER,
    pass: MONGO_PASSWORD,
    useNewUrlParser: true
};

const connection = mongoose.connect(MONGOOSE, options);

export default connection;

