import { Reactory } from "@reactory/server-core/types/reactory";
import { ObjectId } from "bson";
import Organigram from "@reactory/server-core/models/schema/Organigram";
import { User } from "@reactory/server-core/models";


interface PeersState {
  [key: string]: Reactory.IOrganigramDocument
}


//simple hashmap
interface PeersFetchingState {
  [key: string]: string
}

class UserService implements Reactory.Service.IReactoryUserService {

  name: string = "UserService";
  nameSpace: string = "core";
  version: string = "1.0.0";
  context: Reactory.IReactoryContext;
  props: Reactory.IReactoryServiceProps;

  peerState: PeersState;
  isFetchingDocument: PeersFetchingState;

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
    // contains any previously fetched documents using a key map
    this.peerState = {};
    // used to indicated whether or not we are fetching a document
    this.isFetchingDocument = {};
  }

  async getUserPeers(id: string | ObjectId, organization_id: string | ObjectId): Promise<Reactory.IOrganigramDocument> {


    if (id === null) return null;
    if (organization_id === null) return null;    

    const key = `${id}::${organization_id}`;

    if (this.peerState[key]) {
      this.context.log(`Found organigram data in service state: ${this.context.colors.green(key)} ✅`)
      return this.peerState[key];
    } 

    this.context.log(`Organigram document not found fetching: ${this.context.colors.green(key)} ☎`)
    this.isFetchingDocument[key] = 'fetching';

    const query = {
      user: new ObjectId(id),
      organization: new ObjectId(organization_id),
    };

    const organigram: Reactory.IOrganigramDocument = await Organigram.findOne(query).then();

    
    if (!this.peerState[key]) {      
      this.peerState[key] = organigram;
      this.isFetchingDocument[key] = 'fetched';
    }

    return this.peerState[key];
  }

  async setUserDemographics(user_id: string, organization_id: string, membership_id?: 
    string, dob?: Date, businessUnit?: string, gender?: string, operationalGroup?: string) {

    }

  createUser(userInput: Reactory.IUser, organization: Reactory.IOrganization): Promise<Reactory.IUserDocument> {
    throw new Error("Method not implemented.");
  }

  updateUser(userInput: Reactory.IUser): Promise<Reactory.IUserDocument> {
    throw new Error("Method not implemented.");
  }

  async findUserWithEmail(email: string): Promise<Reactory.IUserDocument> {
    return User.findOne({ email });
  }

  async findUserById(id: string | ObjectId): Promise<Reactory.IUserDocument> {
    return User.findById(id);
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
