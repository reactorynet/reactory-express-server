import mongoose, { ConnectOptions } from 'mongoose';
import { mongoClientOptions } from '@reactory/server-core/database/connectionOptions';


const {
    MONGOOSE,
    MONGO_USER,
    MONGO_PASSWORD,
    DOMAIN_NAME,
    SERVER_ID
  } = process.env;

// TLS, CA bundle and retryWrites for DocumentDB come from
// src/database/connectionOptions.ts (WP-B4); unset variables leave the URI in charge.
export const options: ConnectOptions = {
    user: MONGO_USER,
    pass: MONGO_PASSWORD,
    appName: `reactory[${SERVER_ID}@${DOMAIN_NAME}]]`,
    ...mongoClientOptions(),
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
