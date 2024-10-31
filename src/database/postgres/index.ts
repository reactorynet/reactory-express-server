import { Helper } from 'postgres'
import ConnectionFactory from "./ConnectionFactory";

export default (query: string, connectionId: string, context: Reactory.Server.IReactoryContext): Helper<unknown> => { 
  const connection = ConnectionFactory.getConnectionForContext(connectionId, context);
  return connection(query);
};