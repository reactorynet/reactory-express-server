import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Users } from '../../../database/legacy';

const userResolvers = {
    User: {
        id(obj, args, context, info){
            return obj.id;
        },
        username(obj, args, context, info){
            return obj.username;
        }
    },
    Query: {
        allUsers(obj, args, context, info){ 
            let userList = Users.listAll();
            let response = userList;            
            return response;
        },
        userWithId(obj, args, context, info){
            return {
                id:ObjectId(),
                username: 'Werner'
            }
        }
    },
    Mutation: {
        createUser( obj, arg, context, info ){
            console.log('Create user mutation called', {obj, arg, context, info});
            let created = {id: ObjectId(), ...arg.input, createdAt: moment()}
            data.push(created);
            return created;
        }
    }
}

module.exports = userResolvers;