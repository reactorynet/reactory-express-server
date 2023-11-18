import ReactoryContextProvider from "@reactory/server-core/context/ReactoryContextProvider";

const getAnonUserContext = async () => { 
  return await ReactoryContextProvider(null, null);
}

export default getAnonUserContext;
