import { Reactory } from "@reactory/server-core/types/reactory"
import { SchemaBuilder } from '@reactory/server-core/schema';


export const UserSchema: Reactory.IObjectSchema = {
  type: 'object',
  title: 'User',
  properties: {
    id: {
      type: 'string',
      title: 'User Id',
      description: `The user's internal id`
    },
    firstName: {
      type: 'string',
      title: 'Firstname',
      description: `The user's firstname`
    },
    lastName: {
      type: 'string',
      title: 'email',
      description: `The user's email`
    },
    email: {
      type: 'string',
      title: 'email',
      description: `The user's email address`
    },
    username: {
      type: 'string',
      title: 'username',
      description: `The user's username`
    },
    avatar: {
      type: 'string',
      title: 'username',
      description: `The user's username`
    },
  }  
};

export const UserLogin: Reactory.IObjectSchema = {
  type: 'object',
  title: 'User',
  properties: {
    username: {
      type: 'string',
      title: 'Username',
      description: `The user's login id`
    },
    password: {
      type: 'string',
      title: 'Firstname',
      description: `The user's password`
    },    
  }  
}
