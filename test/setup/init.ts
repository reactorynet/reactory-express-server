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
  appName: `reactory-unit-test-${SERVER_ID}@${DOMAIN_NAME}`,
};


// Global setup
beforeAll(async () => {
  // Connect to the MongoDB instance
  await mongoose.connect(MONGOOSE, options);
});

// Global teardown
afterAll(async () => {
  // Close the Mongoose connection
  await mongoose.disconnect();
});