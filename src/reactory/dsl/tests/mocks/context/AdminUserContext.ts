import ReactoryContextProvider from "@reactory/server-core/context/ReactoryContextProvider";
import { ReactoryAnonUser } from "@reactory/server-core/context/AnonUser";
import uuid from "uuid";

const getAdminUserContext = async () => {    
  const adminUser: Partial<Reactory.Models.IUserDocument> = { 
    ...ReactoryAnonUser,
    memberships: [],
    id: uuid.v4() 
  };

  adminUser.hasRole = (role: string) => { 
    return true; 
  };

  return await ReactoryContextProvider(null, {
    user: adminUser
  });  
}

export default getAdminUserContext;