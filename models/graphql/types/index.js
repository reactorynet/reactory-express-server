import { fileAsString } from '../../../utils/io';

const typeDefs = [`
#Base scalar type ObjID for MongoDB
scalar ObjID
scalar Date

type ApiStatus {
    when: Date!
    status: String!
    firstName: String
    lastName: String
    avatar: String
    email: String
    id: String
}

type Query {    
    apiStatus: ApiStatus
}

type Subscription {
    apiStatus: String
}

type Mutation {
    apiStatus: String
}

`];

const typeImports = [
  'System/ReactoryClient',
  'User/User',
  'Organization/Organization',
  'Organization/LeadershipBrand',
  'Survey/Survey',
  'Survey/Assessment',
  'System/Email',
];

typeImports.forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
    console.log(`Loaded ${fileName}...`);
  } catch (e) {
    console.log('Error loading type', e);
  }
});

module.exports = typeDefs;
