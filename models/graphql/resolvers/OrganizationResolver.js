import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Organization } from '../../../database/legacy';

const organizationResolver = {
    Tennant: {

    },
    Organization: {
        id(obj, args, context, info){
            return obj.id;
        },
        username(obj, args, context, info){
            return obj.username;
        }
    },

    Query: {
        allOrganizations(obj, args, context, info){ 
            return Organization.listAll();                        
        }
    },
    Mutation: {
        createOrganization( obj, arg, context, info ){
            console.log('Create user mutation called', {obj, arg, context, info});
            let created = {id: ObjectId(), ...arg.input, createdAt: moment()}
            
            return created;
        }
    }
}

module.exports = userResolvers;