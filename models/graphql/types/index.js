import { fileAsString } from '../../../utils/io';

let typeDefs = [`
#Base scalar type ObjID for MongoDB
scalar ObjID
scalar Date

type ApiStatus {
    when: Date!
    status: String!
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

let typeImports = [
    'User/User',
    'Organization/Organization',
    'Organization/LeadershipBrand',
    'Survey/Survey',
    'Survey/Assessment'
];

typeImports.forEach(function(name){        
    try{
        const fileName = `./${name}.graphql`;
        let source = fileAsString(require.resolve(fileName));
        typeDefs.push(`${source}`);
        console.log(`Loaded ${fileName}...`);
    }catch(e){
        console.log('Error loading type', e);
    }
    
});  

module.exports = typeDefs;