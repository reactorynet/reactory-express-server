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
    'User',
    'Organization'
];

typeImports.forEach(function(name){        
    try{
        let source = fileAsString(require.resolve(`./${name}/${name}.graphql`));
        typeDefs.push(`${source}`);
    }catch(e){
        console.log('Error loading type', e);
    }
    
});  

console.log('TypeDefs', typeDefs);
module.exports = typeDefs;