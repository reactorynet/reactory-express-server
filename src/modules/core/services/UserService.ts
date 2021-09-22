import { Reactory } from "@reactory/server-core/types/reactory";
import { ObjectId } from "bson";


class UserService implements Reactory.Service.IReactoryUserService {

  name: string = "UserService";
  nameSpace: string = "core";
  version: string = "1.0.0";
  context: Reactory.IReactoryContext;
  props: Reactory.IReactoryServiceProps;

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  createUser(userInput: Reactory.IUser, organization: Reactory.IOrganization): Promise<Reactory.IUserDocument> {
    throw new Error("Method not implemented.");
  }

  updateUser(userInput: Reactory.IUser): Promise<Reactory.IUserDocument> {
    throw new Error("Method not implemented.");
  }

  findUserWithEmail(email: string): Promise<Reactory.IUserDocument> {
    throw new Error("Method not implemented.");
  }

  findUserById(id: string | ObjectId): Promise<Reactory.IUserDocument> {
    throw new Error("Method not implemented.");
  }

  onStartup(): Promise<any> {
    this.context.log(`Reactory Core User Service: ${this.context.colors.green('STARTUP OKAY')} ✅`)
    return Promise.resolve();
  }
  
  getExecutionContext(): Reactory.IReactoryContext {
   return this.context;
  }
  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }
 
  
  static reactory: Reactory.IReactoryServiceDefinition = {
    id: 'core.UserService@1.0.0',
    description: 'The core default user service',
    service: (props, context) => {
      return new UserService(props, context)
    },
    name: 'User management service',
    dependencies: [],
    serviceType: "user"
  }
}

export default UserService;
