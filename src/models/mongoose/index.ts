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

export let connection: typeof mongoose;

const getConnection = async () => { 
    try {
        connection = await mongoose.connect(MONGOOSE, options);
        return connection;
    } catch (error) {
        console.error(error);
    }
}

export default getConnection;

