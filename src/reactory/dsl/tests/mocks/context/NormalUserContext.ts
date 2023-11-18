import ReactoryContextProvider from "@reactory/server-core/context/ReactoryContextProvider";
import { ReactoryAnonUser } from "@reactory/server-core/context/AnonUser";
import uuid from "uuid";

const getNormalUserContext = async () => {    
  const normalUser: Partial<Reactory.Models.IUserDocument> = { 
    ...ReactoryAnonUser,
    memberships: [],
    id: uuid.v4() 
  };

  normalUser.hasRole = (role: string) => { 
    return role === 'USER'; 
  };

  return await ReactoryContextProvider(null, {
    user: normalUser
  });
}

export default getNormalUserContext;