import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Organization } from '../../../database/legacy';

const organizationResolver = {
    Tennant: {

    },
    Organization: {
        id(obj, args, context, info){
            return obj.id;
        }        
    },
    Query: {
        allOrganizations(obj, args, context, info){ 
            return Organization.listAll();                        
        }
    },
    Mutation: {
        createOrganization( obj, arg, context, info ){
            console.log('Create user mutation called', { obj, arg, context, info });
            let created = {id: ObjectId(), ...arg.input, createdAt: moment()}
            
            return created;
        },
        migrateOrganizations( obj, arg, context, info ){
            console.log('Migrating organization data', { obj, arg, context, info });
            let migrated = [];
            return Organization.listAll();            
        }
    }
}

module.exports = organizationResolver;