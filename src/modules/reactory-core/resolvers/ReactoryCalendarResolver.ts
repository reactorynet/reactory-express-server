import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { ReactoryCalendarService } from '../services/ReactoryCalendarService';
import { ReactoryCalendarEntryService } from '../services/ReactoryCalendarEntryService';
import { ReactoryCalendarIntegrationService } from '../services/ReactoryCalendarIntegrationService';

const getCalendarService = (context: Reactory.Server.IReactoryContext): ReactoryCalendarService => {
  return context.getService<ReactoryCalendarService>("core.ReactoryCalendarService@1.0.0");
}

const getCalendarEntryService = (context: Reactory.Server.IReactoryContext): ReactoryCalendarEntryService => {
  return context.getService<ReactoryCalendarEntryService>("core.ReactoryCalendarEntryService@1.0.0");
}

const getCalendarIntegrationService = (context: Reactory.Server.IReactoryContext): ReactoryCalendarIntegrationService => {
  return context.getService<ReactoryCalendarIntegrationService>("core.ReactoryCalendarIntegrationService@1.0.0");
}

//@ts-ignore
@resolver
class ReactoryCalendarResolver {

  // Calendar Queries
  @roles(["USER"], 'args.context')
  @query("ReactoryCalendar")
  async ReactoryCalendar(
    obj: any,
    params: { id: number },
    context: Reactory.Server.IReactoryContext
  ) {
    const calendarService = getCalendarService(context);
    return calendarService.getCalendar(params.id, context.user?.id);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryCalendars")
  async ReactoryCalendars(
    obj: any,
    params: { filter?: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const calendarService = getCalendarService(context);
    return calendarService.listCalendars(params.filter, context.user?.id);
  }

  @roles(["USER"], 'args.context')
  @query("MyReactoryCalendars")
  async MyReactoryCalendars(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.getUserCalendars(userId);
  }

  @roles(["USER"], 'args.context')
  @query("UserReactoryCalendars")
  async UserReactoryCalendars(
    obj: any,
    params: { userId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    // Check if current user can view other user's calendars
    const currentUserId = context.user?.id;
    if (currentUserId !== userId) {
      // TODO: Add permission check for viewing other users' calendars
    }

    const calendarService = getCalendarService(context);
    return calendarService.getUserCalendars(params.userId);
  }

  @roles(["USER"], 'args.context')
  @query("OrganizationReactoryCalendars")
  async OrganizationReactoryCalendars(
    obj: any,
    params: { organizationId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.getOrganizationCalendars(params.organizationId, userId);
  }

  @roles(["USER"], 'args.context')
  @query("ClientReactoryCalendars")
  async ClientReactoryCalendars(
    obj: any,
    params: { clientId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.getClientCalendars(params.clientId, userId);
  }

  // Calendar Entry Queries
  @roles(["USER"], 'args.context')
  @query("ReactoryCalendarEntry")
  async ReactoryCalendarEntry(
    obj: any,
    params: { id: number },
    context: Reactory.Server.IReactoryContext
  ) {
    const entryService = getCalendarEntryService(context);
    return entryService.getEntry(params.id, context.user?.id);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryCalendarEntries")
  async ReactoryCalendarEntries(
    obj: any,
    params: { calendarId: number, filter?: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    // Check calendar access
    const hasAccess = await calendarService.checkCalendarAccess(params.calendarId, userId, 'read');
    if (!hasAccess) {
      throw new Error("Insufficient permissions to view calendar entries");
    }

    const entryService = getCalendarEntryService(context);
    return entryService.getCalendarEntries(params.calendarId, params.filter);
  }

  @roles(["USER"], 'args.context')
  @query("MyReactoryCalendarEntries")
  async MyReactoryCalendarEntries(
    obj: any,
    params: { filter?: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    return entryService.getUserEntries(userId, params.filter);
  }

  @roles(["USER"], 'args.context')
  @query("UserReactoryCalendarEntries")
  async UserReactoryCalendarEntries(
    obj: any,
    params: { userId: string, filter?: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const currentUserId = context.user?.id;
    if (currentUserId !== params.userId) {
      // TODO: Add permission check for viewing other users' entries
    }

    const entryService = getCalendarEntryService(context);
    return entryService.getUserEntries(params.userId, params.filter);
  }

  // Availability Queries
  @roles(["USER"], 'args.context')
  @query("ReactoryUserAvailability")
  async ReactoryUserAvailability(
    obj: any,
    params: { userId: string, startDate: Date, endDate: Date, timeZone?: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const currentUserId = context.user?.id;
    if (currentUserId !== params.userId) {
      // TODO: Add permission check for viewing other users' availability
    }

    const entryService = getCalendarEntryService(context);
    return entryService.getUserAvailability(params.userId, params.startDate, params.endDate, params.timeZone || "UTC");
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryCalendarAvailability")
  async ReactoryCalendarAvailability(
    obj: any,
    params: { calendarId: number, startDate: Date, endDate: Date },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    // Check calendar access
    const hasAccess = await calendarService.checkCalendarAccess(params.calendarId, userId, 'read');
    if (!hasAccess) {
      throw new Error("Insufficient permissions to view calendar availability");
    }

    const entryService = getCalendarEntryService(context);
    return entryService.getCalendarAvailability(params.calendarId, params.startDate, params.endDate);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryCalendarEntryRecurrences")
  async ReactoryCalendarEntryRecurrences(
    obj: any,
    params: { entryId: number, startDate: Date, endDate: Date },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    const entry = await entryService.getEntry(params.entryId, userId);
    if (!entry) {
      throw new Error("Calendar entry not found");
    }

    return entryService.expandRecurringEntries(entry, params.startDate, params.endDate);
  }

  // Calendar Mutations
  @roles(["USER"], 'args.context')
  @mutation("CreateReactoryCalendar")
  async CreateReactoryCalendar(
    obj: any,
    params: { input: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.createCalendar(params.input, userId);
  }

  @roles(["USER"], 'args.context')
  @mutation("UpdateReactoryCalendar")
  async UpdateReactoryCalendar(
    obj: any,
    params: { id: number, input: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.updateCalendar(params.id, params.input, userId);
  }

  @roles(["USER"], 'args.context')
  @mutation("DeleteReactoryCalendar")
  async DeleteReactoryCalendar(
    obj: any,
    params: { id: number },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.deleteCalendar(params.id, userId);
  }

  @roles(["USER"], 'args.context')
  @mutation("ShareReactoryCalendar")
  async ShareReactoryCalendar(
    obj: any,
    params: { id: number, permissions: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.shareCalendar(params.id, params.permissions, userId);
  }

  @roles(["USER"], 'args.context')
  @mutation("SetDefaultReactoryCalendar")
  async SetDefaultReactoryCalendar(
    obj: any,
    params: { calendarId: number },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    return calendarService.setUserDefaultCalendar(params.calendarId, userId);
  }

  // Calendar Entry Mutations
  @roles(["USER"], 'args.context')
  @mutation("CreateReactoryCalendarEntry")
  async CreateReactoryCalendarEntry(
    obj: any,
    params: { input: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    // Check calendar access
    const hasAccess = await calendarService.checkCalendarAccess(params.input.calendarId, userId, 'write');
    if (!hasAccess) {
      throw new Error("Insufficient permissions to create calendar entries");
    }

    const entryService = getCalendarEntryService(context);
    const integrationService = getCalendarIntegrationService(context);

    const entry = await entryService.createEntry(params.input, userId);

    // Process triggers asynchronously
    setImmediate(async () => {
      try {
        await integrationService.processWorkflowTriggers(entry, 'created');
        await integrationService.processServiceTriggers(entry, 'created');
        await integrationService.sendNotifications(entry, 'created');
      } catch (error) {
        context.log('Error processing triggers for new calendar entry', { error, entryId: entry.id }, 'error', 'ReactoryCalendarResolver');
      }
    });

    return entry;
  }

  @roles(["USER"], 'args.context')
  @mutation("UpdateReactoryCalendarEntry")
  async UpdateReactoryCalendarEntry(
    obj: any,
    params: { id: number, input: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    const integrationService = getCalendarIntegrationService(context);

    const entry = await entryService.updateEntry(params.id, params.input, userId);

    // Process triggers asynchronously
    setImmediate(async () => {
      try {
        await integrationService.processWorkflowTriggers(entry, 'updated');
        await integrationService.processServiceTriggers(entry, 'updated');
        await integrationService.sendNotifications(entry, 'updated');
      } catch (error) {
        context.log('Error processing triggers for updated calendar entry', { error, entryId: entry.id }, 'error', 'ReactoryCalendarResolver');
      }
    });

    return entry;
  }

  @roles(["USER"], 'args.context')
  @mutation("DeleteReactoryCalendarEntry")
  async DeleteReactoryCalendarEntry(
    obj: any,
    params: { id: number },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    const integrationService = getCalendarIntegrationService(context);

    const entry = await entryService.getEntry(params.id, userId);
    const result = await entryService.deleteEntry(params.id, userId);

    if (result && entry) {
      // Process triggers asynchronously
      setImmediate(async () => {
        try {
          await integrationService.processWorkflowTriggers(entry, 'deleted');
          await integrationService.processServiceTriggers(entry, 'deleted');
          await integrationService.sendNotifications(entry, 'cancelled');
        } catch (error) {
          context.log('Error processing triggers for deleted calendar entry', { error, entryId: entry.id }, 'error', 'ReactoryCalendarResolver');
        }
      });
    }

    return result;
  }

  @roles(["USER"], 'args.context')
  @mutation("DuplicateReactoryCalendarEntry")
  async DuplicateReactoryCalendarEntry(
    obj: any,
    params: { id: number, input?: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    return entryService.duplicateEntry(params.id, params.input || {}, userId);
  }

  // Participant Mutations
  @roles(["USER"], 'args.context')
  @mutation("InviteReactoryCalendarEntryParticipants")
  async InviteReactoryCalendarEntryParticipants(
    obj: any,
    params: { entryId: number, participants: any[] },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    return entryService.inviteParticipants(params.entryId, params.participants, userId);
  }

  @roles(["USER"], 'args.context')
  @mutation("UpdateReactoryCalendarEntryParticipantStatus")
  async UpdateReactoryCalendarEntryParticipantStatus(
    obj: any,
    params: { entryId: number, status: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    const integrationService = getCalendarIntegrationService(context);

    const result = await entryService.updateParticipantStatus(params.entryId, userId, params.status);

    if (result) {
      // Process participant response triggers
      setImmediate(async () => {
        try {
          const entry = await entryService.getEntry(params.entryId);
          if (entry) {
            await integrationService.processWorkflowTriggers(entry, 'participant_response');
            await integrationService.processServiceTriggers(entry, 'participant_response');
            await integrationService.sendNotifications(entry, 'participant_response');
          }
        } catch (error) {
          context.log('Error processing participant response triggers', { error, entryId: params.entryId }, 'error', 'ReactoryCalendarResolver');
        }
      });
    }

    return result;
  }

  @roles(["USER"], 'args.context')
  @mutation("RemoveReactoryCalendarEntryParticipant")
  async RemoveReactoryCalendarEntryParticipant(
    obj: any,
    params: { entryId: number, userId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);

    // Only organizer can remove participants
    const entry = await entryService.getEntry(params.entryId, userId);
    if (!entry || entry.organizerId !== userId) {
      throw new Error("Only organizer can remove participants");
    }

    // TODO: Implement participant removal in service
    // For now, return false
    return false;
  }

  // Bulk Operations
  @roles(["USER"], 'args.context')
  @mutation("BulkReactoryCalendarEntryCreateEntries")
  async BulkReactoryCalendarEntryCreateEntries(
    obj: any,
    params: { input: any[] },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const calendarService = getCalendarService(context);
    const entryService = getCalendarEntryService(context);

    const results = [];

    for (const entryInput of params.input) {
      // Check calendar access for each entry
      const hasAccess = await calendarService.checkCalendarAccess(entryInput.calendarId, userId, 'write');
      if (!hasAccess) {
        throw new Error(`Insufficient permissions to create entries in calendar ${entryInput.calendarId}`);
      }

      const entry = await entryService.createEntry(entryInput, userId);
      results.push(entry);
    }

    return results;
  }

  @roles(["USER"], 'args.context')
  @mutation("BulkReactoryCalendarEntryUpdateEntries")
  async BulkReactoryCalendarEntryUpdateEntries(
    obj: any,
    params: { updates: any[] },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);
    const results = [];

    for (const update of params.updates) {
      const entry = await entryService.updateEntry(update.id, update.updates, userId);
      results.push(entry);
    }

    return results;
  }

  @roles(["USER"], 'args.context')
  @mutation("BulkReactoryCalendarEntryDeleteEntries")
  async BulkReactoryCalendarEntryDeleteEntries(
    obj: any,
    params: { ids: number[] },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?.id;
    if (!userId) throw new Error("Authentication required");

    const entryService = getCalendarEntryService(context);

    for (const id of params.ids) {
      await entryService.deleteEntry(id, userId);
    }

    return true;
  }

  // Property Resolvers
  @property("ReactoryCalendar", "entries")
  async calendarEntries(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const entryService = getCalendarEntryService(context);
    return entryService.getCalendarEntries(obj.id, args?.filter);
  }

  @property("ReactoryCalendarEntry", "participants")
  async entryParticipants(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    // This would need to be implemented to fetch participants for an entry
    return obj.participants || [];
  }

  @property("ReactoryCalendarEntry", "calendar")
  async entryCalendar(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const calendarService = getCalendarService(context);
    return calendarService.getCalendar(obj.calendarId, context.user?.id);
  }

  @property("ReactoryCalendarEntry", "organizer")
  async entryOrganizer(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    // If organizer is populated, return it, otherwise fetch user data
    if (typeof obj.organizer === 'object') {
      return obj.organizer;
    }

    // Fetch user by ID if needed
    const userService = context.getService('core.UserService@1.0.0');
    if (userService && obj.organizerId) {
      return userService.getUserById(obj.organizerId);
    }

    return null;
  }
}

export default ReactoryCalendarResolver;