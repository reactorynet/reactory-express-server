import { 
  fqn, 
  title,
  description, 
  min, 
  max, 
  id, 
  type,
  ref,
  format,
  nullable, 
  defaultValue,
  store,
  enumType,
  widget,
  uiSchema,
  required,
  readOnly,
} from '@reactory/server-core/schema/reflection';
import ReactorySupportTicketModel from '@reactory/server-core/modules/reactory-core/models/ReactorySupportTicket';
import { ObjectId } from 'mongodb';
import GridUISchema from './GridUISchema';

const {
  API_ROOT
} = process.env as Reactory.Server.ReactoryEnvironment;

const FroalaOptions = (context: Reactory.Server.IReactoryContext) => ({
  imageManagerLoadMethod: 'GET',
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  fileUploadURL: `${API_ROOT}/froala/upload/file`,
  videoUploadURL: `${API_ROOT}/froala/upload/video`,
  imageUploadURL: `${API_ROOT}/froala/upload/image`,
  requestHeaders: {
    'x-client-key': `${context.partner.key}`,
    'x-client-pwd': `${context.partner.password}`,
  }
});

@fqn("core.SupportTicketDocumentViewModel@1.0.0")
class SupportTicketDocument { 
  @id(true)
  id: string;

  @title("reactory:support-ticket-document.filename.title")
  filename: string

  constructor(props: Partial<SupportTicketDocument> = {}) { 
    this.id = props.id || new ObjectId().toHexString();
    this.filename = props.filename || "";
  }
}


@fqn("core.UserBioViewModel@1.0.0")
class UserBio {

  @id(true)
  @widget('HiddenWidget', {})
  id: string;

  @title("reactory:support-ticket.model.createdBy.title")
  firstName: string;

  @title("reactory:support-ticket.model.createdBy.title")
  lastName: string;

  constructor(props: Partial<UserBio> = {}) {
    this.id = props.id || new ObjectId().toHexString();
    this.firstName = props.firstName || "";
    this.lastName = props.lastName || "";
  }
}

@fqn("core.SupportTicketCommentViewModel@1.0.0")
class SupportTicketComment {
  @id(true)
  id: string;

  @title("reactory:support-ticket.model.comment.title")
  user: UserBio;

  @title("reactory:support-ticket-model.comment.title")
  comment: string;

  @title("reactory:support-ticket-model.comment.createdAt")
  createdAt: Date;

  @title("reactory:support-ticket-model.comment.createdBy")
  @type(UserBio)
  createdBy: UserBio;


  constructor(props: Partial<SupportTicketComment> = {}) { 
    this.id = props.id || new ObjectId().toHexString();
    this.user = props.user || {
      id: new ObjectId().toHexString(),
      firstName: 'Not',
      lastName: 'Set',
    };
    this.comment = props.comment || "";
    this.createdAt = props.createdAt || new Date();
    this.createdBy = props.createdBy || {
      id: new ObjectId().toHexString(),
      firstName: 'Not',
      lastName: 'Set',
    };
  };
}

export enum SupportTicketStatus { 
  new = 'new',
  open = 'open',
  closed = 'closed',
  resolved = 'resolved',
  withdrawn = 'withdrawn',
  rejected = 'rejected',   
}

export namespace SupportTicketStatus { 
  export function isEnum(value: any): value is SupportTicketStatus {
    return Object.values(SupportTicketStatus).includes(value);
  }

  export function getKey(value: SupportTicketStatus): string { 
    switch (value) {
      case SupportTicketStatus.new: return "reactory:support-ticket.model.status.new";
      case SupportTicketStatus.open: return "reactory:support-ticket.model.status.open";
      case SupportTicketStatus.closed: return "reactory:support-ticket.model.status.closed";
      case SupportTicketStatus.resolved: return "reactory:support-ticket.model.status.resolved";
      case SupportTicketStatus.withdrawn: return "reactory:support-ticket.model.status.withdrawn";
      case SupportTicketStatus.rejected: return "reactory:support-ticket.model.status.rejected";
    }
  }

  export function getValues(): {key: string, value: SupportTicketStatus, label: string}[] {   
    return [
      { key: "new", value: SupportTicketStatus.new, label: getKey(SupportTicketStatus.new) },
      { key: "open", value: SupportTicketStatus.open, label: getKey(SupportTicketStatus.open) },
      { key: "closed", value: SupportTicketStatus.closed, label: getKey(SupportTicketStatus.closed) },
      { key: "rejected", value: SupportTicketStatus.rejected, label: getKey(SupportTicketStatus.rejected) },
      { key: "resolved", value: SupportTicketStatus.resolved, label: getKey(SupportTicketStatus.resolved) },
      { key: "withdrawn", value: SupportTicketStatus.withdrawn, label: getKey(SupportTicketStatus.withdrawn) },
    ]
  }
  
  export function translate(value: SupportTicketStatus, context: Reactory.Server.IReactoryContext): string {
    const { i18n } = context;
    const key = SupportTicketStatus.getKey(value);
    return i18n.t(key);
  }
};

export type SupportTicketModelConstructorArgs = {
  id?: string
  request?: string
  requestType?: string
  description?: string
  status?: SupportTicketStatus
  reference?: string
  createdBy?: UserBio
  createdDate?: Date
  updatedDate?: Date
  assignedTo?: UserBio
  formId?: string
  comments?: SupportTicketComment[]
  documents?: SupportTicketDocument[]
}

/**
 * Support Ticket View Model. This class is used to create a new instance of a support ticket.
 */
@fqn("core.SupportTicketViewModel@1.0.0")
@store(
  "graphql", 
  "core.ReactorySupportTicketModelMapper@1.0.0")
@uiSchema('grid', 
  GridUISchema,
  'gridview',
  'reactory:support-ticket.gridviewschema.title', 
  'reactory:support-ticket.gridviewschema.description', 'grid')
@title("reactory:support-ticket.model.title")
@description("reactory:support-ticket.model.description")
class SupportTicketModel {

  @id(true)
  @readOnly()
  @title("reactory:support-ticket.model.id.title")
  @description("reactory:support-ticket.model.id.description")
  @widget('HiddenWidget', {})
  id?: string;

  @title("reactory:support-ticket.model.request.title")
  @description("reactory:support-ticket.model.request.description")
  @required()
  @min(10)
  @max(200)
  request: string;

  @title("reactory:support-ticket.model.requestType.title")
  @description("reactory:support-ticket.model.requestType.description")
  @min(10)
  @max(50)
  requestType: string;

  @title("reactory:support-ticket.model.description.title")
  @min(10, "reactory:support-ticket.model.description.minLength")
  @max(1000, "reactory:support-ticket.model.description.maxLength")
  @widget('FroalaWidget', FroalaOptions)
  description: string;

  @title("reactory:support-ticket.model.status.title")
  @description("reactory:support-ticket.model.status.description")
  @defaultValue(SupportTicketStatus.new)
  @enumType(SupportTicketStatus)
  status: SupportTicketStatus;

  @title("reactory:support-ticket.model.reference.title")
  @description("reactory:support-ticket.model.reference.description")
  @readOnly()
  reference: string;

  @title("reactory:support-ticket.model.createdBy.title")
  @description("reactory:support-ticket.model.createdBy.description")
  @nullable()
  @type(UserBio)
  createdBy: UserBio;

  @title("reactory:support-ticket.model.createdDate.title")
  @description("reactory:support-ticket.model.createdDate.description")
  @defaultValue(new Date())
  @format("date-time")
  createdDate: Date;

  @title("reactory:support-ticket.model.updatedDate.title")
  @description("reactory:support-ticket.model.updatedDate.description")
  updatedDate: Date;

  @title("reactory:support-ticket.model.assignedTo.title")
  @description("reactory:support-ticket.model.assignedTo.description")
  @nullable()
  @type(UserBio)
  @ref("UserBio")
  assignedTo: UserBio;

  @title("reactory:support-ticket.model.formId.title")
  @description("reactory:support-ticket.model.formId.description")
  @nullable()
  formId: string;

  @title("reactory:support-ticket.model.comments.title")
  @description("reactory:support-ticket.model.comments.description")
  @type(SupportTicketComment)
  comments: SupportTicketComment[];

  @title("reactory:support-ticket.model.documents.title")
  @description("reactory:support-ticket.model.documents.description")
  @nullable()
  @type(SupportTicketDocument)
  documents: SupportTicketDocument[];

  /**
   * Default constructor. It is important to note that the default values are set for the createdBy and assignedTo properties.
   * In order for reflection to work correctly, the default values must be set in the constructor to ensure the object is created correctly.
   * @param props - Partial<SupportTicketModelConstructorArgs>
   */
  constructor(props: Partial<SupportTicketModelConstructorArgs> = {}) {
    this.id = props.id || new ObjectId().toHexString();
    this.request = props.request || "";
    this.requestType = props.requestType || "";
    this.description = props.description || "";
    this.reference = props.reference || "";
    this.status = SupportTicketStatus.isEnum(props.status) 
      ? props.status 
      : SupportTicketStatus.new;
    this.createdBy = props.createdBy || {
      id: new ObjectId().toHexString(),
      firstName: 'Not',
      lastName: 'Set',
    };
    this.createdDate = new Date();
    this.assignedTo = {
      id: new ObjectId().toHexString(),
      firstName: 'Not',
      lastName: 'Set',
    };
    this.formId = "";
    this.comments = [{
      id: new ObjectId().toHexString(),
      user: {
        id: new ObjectId().toHexString(),
        firstName: 'Not',
        lastName: 'Set',
      },
      comment: "",
      createdAt: new Date(),
      createdBy: {
        id: new ObjectId().toHexString(),
        firstName: 'Not',
        lastName: 'Set',
      }
    }];
    this.documents = [];
    this.updatedDate = new Date();
  }
  
  static fromModel(model: Reactory.Models.ReactorySupportDocument, context: Reactory.Server.IReactoryContext): SupportTicketModel { 
    const { utils } = context;
    const props: Partial<SupportTicketModelConstructorArgs> = utils.objectMapper.merge(model, {
      '_id': { target: 'id', transform: (value: any) => value.toHexString() },
      'request': 'request',
      'requestType': 'requestType',
      'description': 'description',
      'status': 'status',
      'reference': 'reference',
      'createdBy': 'createdBy',
      'createdDate': 'createdDate',
      'updatedDate': 'updatedDate',
      'assignedTo': 'assignedTo',
      'formId': 'formId',
      'comments': 'comments',
      'documents': 'documents',
    });
    return new SupportTicketModel(props);
  }

  static toModel(viewModel: SupportTicketModel, context: Reactory.Server.IReactoryContext): Reactory.Models.ReactorySupportDocument { 
    const { utils } = context;
    const props: Partial<SupportTicketModelConstructorArgs> = utils.objectMapper.merge(viewModel, {
      'id': '_id',
      'request': 'request',
      'requestType': 'requestType',
      'description': 'description',
      'status': 'status',
      'reference': 'reference',
      'createdBy': 'createdBy',
      'createdDate': 'createdDate',
      'updatedDate': 'updatedDate',
      'assignedTo': 'assignedTo',
      'formId': 'formId',
      'comments': 'comments',
      'documents': 'documents',
    });

    return new ReactorySupportTicketModel(props);
  }
}

export default SupportTicketModel;