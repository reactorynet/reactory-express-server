import Reactory from '@reactory/reactory-core';
import { InsufficientPermissions } from 'exceptions';
/**
 * This function is used to resolve the schema for the SupportTicketDeleteAction form schema.
 * This shows how you can use state to get the ticketId and then use the ticketId to get the ticket
 * and then show the ticket reference and a confirm checkbox.
 * @param form - the parent form object
 * @param args - the arguments passed to the resolver
 * @param context - the context object
 * @param info - the info object
 * @returns - the schema object
 */
export const SupportTicketDeleteActionSchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {
  
  context.log('SupportTicketDeleteActionSchemaResolver', { state: context.state }, 'info' );
  const {
    i18n,
    state,
    getService
  } = context;

  let schema: Reactory.Schema.AnySchema = {
    type: 'object',
    title: i18n.t('reactory:support-ticket-delete-action', {
      defaultValue: 'Delete Ticket',
    }),
    properties: {
      message: {
        type: 'string',
        title: 'Message'
      }      
    }
  }

  const supportService = getService('core.ReactorySupportService@1.0.0') as Reactory.Service.TReactorySupportService;
  const { formOptions = {} } = state as { formOptions: any};
  if (!formOptions.ticketId) {
    (schema.properties as any)['message'].default = i18n.t('reactory:support-ticket-delete-action-no-ticket-id', {
      defaultValue: 'Ticket ID not provided',
    });
    schema.properties = {
      error: {
        type: 'string',
        title: i18n.t('reactory:support-ticket-delete-action', {
          defaultValue: 'Error getting ticket',
        }),
        default: 'Ticket ID not provided'
      }
    }; 
    return schema;
  }

  try { 
    const ticket = await supportService.getTicket(formOptions.ticketId);

    (schema.properties as any)['message'].default = i18n.t('reactory:support-ticket-delete-action-ticket-confirm-message', {
      defaultValue: `Please confirm that you want to delete this ticket`.trim(),          
    });

    (schema.properties as any)['ticketReference'] =  {
      type: 'string',
      title: i18n.t('reactory:support-ticket-delete-action-ticket-ref', {
        defaultValue: `Ticket Ref: ${ticket.reference}`.trim(),          
      }),
      default: ticket.reference
    };
  
    (schema.properties as any)['confirm'] =  {
      type: 'boolean',
      title: i18n.t('reactory:support-ticket-delete-action-confirm', {
        defaultValue: `Confirm delete`.trim(),          
      }),
      default: false
    };

  } catch (error) { 
    // check if it is an InsufficientPermissionsError
    // if it is, we should return an error message schema
    
    if (error instanceof InsufficientPermissions) {
      schema.properties = {
        error: {
          type: 'string',
          title: i18n.t('reactory:support-ticket-delete-action-permission-error', {
            defaultValue: 'Insufficient Permissions to delete this ticket',
          }),
          default: error.message
        }
      };      
    } else {
      schema.properties = {
        error: {
          type: 'string',
          title: i18n.t('reactory:support-ticket-delete-action', {
            defaultValue: 'Error getting ticket',
          }),
          default: error.message
        }
      };
      // log the error as it is unexpected
      context.error('Error getting ticket', { error }, 'SupportTicketDeleteActionSchemaResolver');
    }    
  }
  return schema;
}
