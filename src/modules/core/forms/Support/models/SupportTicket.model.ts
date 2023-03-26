import { fqn, title, min, max, id, nullable, defaultValue } from '@reactory/server-core/schema/reflection';
import { ObjectId } from 'mongodb';

export type SupportTicketModelConstructorArgs = {
  id?: any
  request?: string
  requestType?: string
  description?: string
  status?: string
  reference?: string
  createdBy?: Reactory.Models.IUserBio
  createdDate?: Date
  updatedDate?: Date
  assignedTo?: Reactory.Models.IUserBio
  formId?: string
  comments?: Reactory.Models.IReactoryComment[]

}

class SupportTicketModel implements Reactory.Models.IReactorySupportTicket {

  @id(true)
  @title("SupportTicketModel.id.title")
  id?: any;

  @title("SupportTicketModel.request.title")
  @min(10)
  @max(200)
  request: string;

  @title("SupportTicketModel.requestType.title")
  @min(10)
  @max(50)
  requestType: string;

  @title("SupportTicketModel.description.title")
  @min(10)
  description: string;

  @title("SupportTicketModel.status.title")
  @defaultValue("new")
  status: string;

  @title("SupportTicketModel.reference.title")
  reference: string;

  @title("SupportTicketModel.createdBy.title")
  @nullable()
  createdBy: Reactory.Models.IUserBio;

  @title("SupportTicketModel.createdDate.title")
  createdDate: Date;

  @title("SupportTicketModel.updatedDate.title")
  updatedDate: Date;

  @title("SupportTicketModel.assigned.title")
  @nullable()
  assignedTo: Reactory.Models.IUserBio;

  @title("SupportTicketModel.formId.title")
  @nullable()
  formId: string;

  @title("SupportTicketModel.comments.title")
  comments: Reactory.Models.IReactoryComment[];

  // @title("SupportTicketModel.documents.title")
  // documents: Reactory.Models.IReactoryFile[];

  /**
   * Default constructor
   * @param props 
   */
  constructor() {
    this.id = new ObjectId().toString();
    this.request = "";
    this.requestType = "";
    this.description = "";
    this.reference = "";
    this.status = "new";
    this.reference = "";
    this.createdBy = {
      firstName: 'Not',
      lastName: 'Set',
    };
    this.createdDate = new Date();
    this.assignedTo = {
      firstName: 'Not',
      lastName: 'Set',
    };
    this.formId = "";
    // this.comments = [];
    // this.documents = [];
    this.updatedDate = new Date();
  }
}

export default SupportTicketModel;