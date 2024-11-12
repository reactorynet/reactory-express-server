
export interface StatusWidgetDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  DropDownMenu: Reactory.Client.Components.DropDownMenu,
  FullScreenModal: Reactory.Client.Components.FullScreenModal,
  SupportTicket: Reactory.Client.Components.SupportTicket,
}

export interface StatusWidgetProps {
  reactory: Reactory.Client.IReactoryApi,
  form?: any,
  status: string,
  ticket: Reactory.Models.IReactorySupportTicket,
  useCase: string,
  style: any
}

export interface ISupportTicketWorkflowModule {  
  openTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  closeTicket(args: ISupportTickeArgs): Promise<boolean>
  commentTicket(args: ISupportTickeArgs): Promise<Reactory.Models.IReactorySupportTicket>
  addNew(): void,
  deleteTicket(args: ISupportTicketDeleteArgs): Promise<void>
}


export interface ISupportTicketWorkflowProps {
  reactory: Reactory.Client.IReactoryApi, 
}

export interface ISupportTicketOpenMutationResult {
  ReactorySupportTicketOpen: Reactory.Models.IReactorySupportTicket
}

export interface ISupportTickeArgs {
  ticket: Reactory.Models.IReactorySupportTicket,
  comment?: string
}

export interface ISupportTicketDeleteArgs {
  tickets: Reactory.Models.IReactorySupportTicket[]
}