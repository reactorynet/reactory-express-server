import Reactory, { Reactor } from '@reactory/reactory-core';
import SupportTicketModel from '../models/SupportTicket.model';
describe('Reflection', () => {

  it('Checks schema for SupportTicket model', () => {
    //@ts-ignore
    const supportTicket: ReflectionUnitTest.MyUser = Reactor.Reflection.getInstance(SupportTicketModel, {});
    //@ts-ignore
    const schema = ReactoryStatic.Reflection.reflectSchema<SupportTicketModel>(instance);
    const schemaString = JSON.stringify(schema, null, 2);
    
    console.log(schemaString);
  })
});