
import { Repository } from "typeorm";
import { 
  ReactoryCalendarEntry,
  ReactoryCalendarWorkflowTrigger,
  ReactoryCalendarServiceTrigger,
  ReactoryCalendarParticipant
 } from "@reactory/server-modules/reactory-core/models/ReactoryCalendar";
import { service } from "@reactory/server-core/application/decorators/service";
import { PostgresDataSource } from "../models";
import { Models } from '@reactory/reactory-core';
import { ReactoryCalendarEntryService } from "./ReactoryCalendarEntryService";

@service({
  id: 'reactory.CalendarIntegrationService@1.0.0',
  name: 'ReactoryCalendarIntegrationService',
  nameSpace: 'reactory',
  version: '1.0.0',
  description: 'Service for integrating Reactory Calendar with workflows and services',
  serviceType: 'calendar-integration',
  lifeCycle: 'instance'
})
export class ReactoryCalendarIntegrationService implements Reactory.Service.IReactoryDefaultService {
  name: string;
  nameSpace: string;
  version: string;
  description: string;
  serviceType: string;
  lifeCycle: string;
  props: any;
  context: Reactory.Server.IReactoryContext;

  private workflowTriggerRepository: Repository<ReactoryCalendarWorkflowTrigger>;
  private serviceTriggerRepository: Repository<ReactoryCalendarServiceTrigger>;
  private participantRepository: Repository<ReactoryCalendarParticipant>;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
    this.workflowTriggerRepository = PostgresDataSource.getRepository(ReactoryCalendarWorkflowTrigger);
    this.serviceTriggerRepository = PostgresDataSource.getRepository(ReactoryCalendarServiceTrigger);
    this.participantRepository = PostgresDataSource.getRepository(ReactoryCalendarParticipant);
  }
  onStartup(): Promise<void> {
    return Promise.resolve();
  }
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): void {
    this.context = executionContext;
  }
  toString?(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}@${this.version}`;
  }

  /**
   * Process workflow triggers for a calendar entry event
   */
  async processWorkflowTriggers(
    entry: ReactoryCalendarEntry,
    eventType:  Models.ReactoryCalendarTriggerEventType
  ): Promise<void> {
    try {
      // Find relevant workflow triggers for this entry
      const workflowTriggers = await this.workflowTriggerRepository.find({
        where: { entryId: entry.id }
      });

      // Filter triggers that match the event type
      const relevantTriggers = workflowTriggers.filter(trigger => {
        switch (eventType) {
          case Models.ReactoryCalendarTriggerEventType.CREATED:
            return trigger.triggerType === Models.ReactoryCalendarWorkflowTriggerType.ON_CREATE;
          case Models.ReactoryCalendarTriggerEventType.UPDATED:
            return trigger.triggerType === Models.ReactoryCalendarWorkflowTriggerType.ON_UPDATE;
          case Models.ReactoryCalendarTriggerEventType.DELETED:
            return trigger.triggerType === Models.ReactoryCalendarWorkflowTriggerType.ON_DELETE;
          case Models.ReactoryCalendarTriggerEventType.STARTING:
            return trigger.triggerType === Models.ReactoryCalendarWorkflowTriggerType.TIME_BASED;
          case Models.ReactoryCalendarTriggerEventType.PARTICIPANT_RESPONSE:
            return trigger.triggerType === Models.ReactoryCalendarWorkflowTriggerType.PARTICIPANT_RESPONSE;
          default:
            return false;
        }
      });

      // Execute workflow triggers
      for (const trigger of relevantTriggers) {
        await this.executeWorkflowTrigger(trigger, entry, eventType);
      }
    } catch (error) {
      console.error('Error processing workflow triggers:', error);
      // Log error but don't throw to avoid breaking calendar operations
    }
  }

  /**
   * Process service triggers for a calendar entry event
   */
  async processServiceTriggers(
    entry: ReactoryCalendarEntry,
    eventType: Reactory.Models.ReactoryCalendarTriggerEventType
  ): Promise<void> {
    try {
      // Find relevant service triggers for this entry
      const serviceTriggers = await this.serviceTriggerRepository.find({
        where: { entryId: entry.id }
      });

      // Filter triggers that match the event type
      const relevantTriggers = serviceTriggers.filter(trigger => {
        switch (eventType) {
          case Models.ReactoryCalendarTriggerEventType.CREATED:
            return trigger.triggerType === Models.ReactoryCalendarServiceTriggerType.ON_CREATE;
          case Models.ReactoryCalendarTriggerEventType.UPDATED:
            return trigger.triggerType === Models.ReactoryCalendarServiceTriggerType.ON_UPDATE;
          case Models.ReactoryCalendarTriggerEventType.DELETED:
            return trigger.triggerType === Models.ReactoryCalendarServiceTriggerType.ON_DELETE;
          case Models.ReactoryCalendarTriggerEventType.STARTING:
            return trigger.triggerType === Models.ReactoryCalendarServiceTriggerType.TIME_BASED;
          case Models.ReactoryCalendarTriggerEventType.PARTICIPANT_RESPONSE:
            return trigger.triggerType === Models.ReactoryCalendarServiceTriggerType.PARTICIPANT_RESPONSE;
          default:
            return false;
        }
      });

      // Execute service triggers
      for (const trigger of relevantTriggers) {
        await this.executeServiceTrigger(trigger, entry, eventType);
      }
    } catch (error) {
      console.error('Error processing service triggers:', error);
      // Log error but don't throw to avoid breaking calendar operations
    }
  }

  /**
   * Send notifications for calendar events
   */
  async sendNotifications(
    entry: ReactoryCalendarEntry,
    eventType: Reactory.Models.ReactoryCalendarNotificationEventType
  ): Promise<void> {
    try {
      // Get participants for the entry
      const participants = await this.participantRepository.find({
        where: { entryId: entry.id }
      });

      // Prepare notification data
      const notificationData = {
        entryId: entry.id,
        title: entry.title,
        startDate: entry.startDate,
        endDate: entry.endDate,
        location: entry.location,
        organizerId: entry.organizerId,
        eventType
      };

      // Send notifications to participants
      for (const participant of participants) {
        await this.sendParticipantNotification(participant, notificationData);
      }

      // Send notification to organizer if not already included
      if (!participants.some(p => p.userId === entry.organizerId)) {
        await this.sendOrganizerNotification(entry.organizerId, notificationData);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Expand recurring entries for a date range
   */
  async expandRecurringEntries(
    baseEntry: ReactoryCalendarEntry,
    startDate: Date,
    endDate: Date
  ): Promise<ReactoryCalendarEntry[]> {
    // This method is already implemented in ReactoryCalendarEntryService
    // but included here for integration purposes
    const entryService = this.context.getService<ReactoryCalendarEntryService>('core.ReactoryCalendarEntryService@1.0.0');
    
    return await entryService.expandRecurringEntries(baseEntry, startDate, endDate);
  }

  /**
   * Get time-based triggers that need to be executed
   */
  async getPendingTimeBasedTriggers(currentTime: Date = new Date()): Promise<ReactoryCalendarWorkflowTrigger[]> {
    // Find workflow triggers that should fire based on time
    const workflowTriggers = await this.workflowTriggerRepository.find({
      where: { triggerType: Models.ReactoryCalendarWorkflowTriggerType.TIME_BASED }
    });

    // Find service triggers that should fire based on time
    const serviceTriggers = await this.serviceTriggerRepository.find({
      where: { triggerType: Models.ReactoryCalendarServiceTriggerType.TIME_BASED }
    });

    // Filter triggers that are due to execute
    const dueWorkflowTriggers: ReactoryCalendarWorkflowTrigger[] = [];

    for (const trigger of workflowTriggers) {
      if (await this.isTriggerDue(trigger, currentTime)) {
        dueWorkflowTriggers.push(trigger);
      }
    }

    return dueWorkflowTriggers;
  }

  /**
   * Process time-based triggers
   */
  async processTimeBasedTriggers(): Promise<void> {
    const currentTime = new Date();
    const dueTriggers = await this.getPendingTimeBasedTriggers(currentTime);

    for (const trigger of dueTriggers) {
      try {
        // Get the associated calendar entry
        const entry = await PostgresDataSource.getRepository(ReactoryCalendarEntry).findOne({
          where: { id: trigger.entryId }
        });

        if (entry) {
          await this.executeWorkflowTrigger(trigger, entry, Models.ReactoryCalendarTriggerEventType.STARTING);
        }
      } catch (error) {
        console.error(`Error processing time-based trigger ${trigger.id}:`, error);
      }
    }
  }

  /**
   * Private method to execute a workflow trigger
   */
  private async executeWorkflowTrigger(
    trigger: ReactoryCalendarWorkflowTrigger,
    entry: ReactoryCalendarEntry,
    eventType: Reactory.Models.ReactoryCalendarTriggerEventType
  ): Promise<void> {
    try {
      // Prepare workflow execution context
      const context = {
        entryId: entry.id,
        calendarId: entry.calendarId,
        organizerId: entry.organizerId,
        eventType,
        triggerOffset: trigger.triggerOffset,
        parameters: trigger.parameters || {},
        entryData: {
          title: entry.title,
          description: entry.description,
          startDate: entry.startDate,
          endDate: entry.endDate,
          location: entry.location
        }
      };

      // TODO: Integrate with workflow service to execute the workflow
      console.log(`Executing workflow ${trigger.workflowId} version ${trigger.workflowVersion} for entry ${entry.id}`, context);

      // For now, just log the execution
      // In a real implementation, this would call the workflow service:
      // await workflowService.executeWorkflow(trigger.workflowId, trigger.workflowVersion, context);

    } catch (error) {
      console.error(`Error executing workflow trigger ${trigger.id}:`, error);
      throw error;
    }
  }

  /**
   * Private method to execute a service trigger
   */
  private async executeServiceTrigger(
    trigger: ReactoryCalendarServiceTrigger,
    entry: ReactoryCalendarEntry,
    eventType: Reactory.Models.ReactoryCalendarTriggerEventType
  ): Promise<void> {
    try {
      // Prepare service execution context
      const context = {
        entryId: entry.id,
        calendarId: entry.calendarId,
        organizerId: entry.organizerId,
        eventType,
        triggerOffset: trigger.triggerOffset,
        parameters: trigger.parameters || {},
        entryData: {
          title: entry.title,
          description: entry.description,
          startDate: entry.startDate,
          endDate: entry.endDate,
          location: entry.location
        }
      };

      // TODO: Integrate with service registry to execute the service
      console.log(`Executing service ${trigger.serviceId} method ${trigger.method} for entry ${entry.id}`, context);

      // For now, just log the execution
      // In a real implementation, this would call the service:
      // await serviceRegistry.executeService(trigger.serviceId, trigger.serviceVersion, trigger.method, context);

    } catch (error) {
      console.error(`Error executing service trigger ${trigger.id}:`, error);
      throw error;
    }
  }

  /**
   * Private method to check if a time-based trigger is due
   */
  private async isTriggerDue(trigger: ReactoryCalendarWorkflowTrigger, currentTime: Date): Promise<boolean> {
    try {
      // Get the associated calendar entry
      const entry = await PostgresDataSource.getRepository(ReactoryCalendarEntry).findOne({
        where: { id: trigger.entryId }
      });

      if (!entry) return false;

      // Calculate when the trigger should fire
      const triggerTime = new Date(entry.startDate);
      if (trigger.triggerOffset) {
        triggerTime.setMinutes(triggerTime.getMinutes() + trigger.triggerOffset);
      }

      // Check if current time is at or past the trigger time
      return currentTime >= triggerTime;
    } catch (error) {
      console.error(`Error checking if trigger ${trigger.id} is due:`, error);
      return false;
    }
  }

  /**
   * Private method to send notification to a participant
   */
  private async sendParticipantNotification(
    participant: ReactoryCalendarParticipant,
    notificationData: any
  ): Promise<void> {
    try {
      // TODO: Integrate with notification service
      console.log(`Sending notification to participant ${participant.userId} for entry ${notificationData.entryId}`, {
        eventType: notificationData.eventType,
        title: notificationData.title,
        startDate: notificationData.startDate
      });

      // In a real implementation, this would send email/push notifications:
      // await notificationService.sendCalendarNotification(participant.userId, notificationData);

    } catch (error) {
      console.error(`Error sending notification to participant ${participant.userId}:`, error);
    }
  }

  /**
   * Private method to send notification to organizer
   */
  private async sendOrganizerNotification(organizerId: string, notificationData: any): Promise<void> {
    try {
      // TODO: Integrate with notification service
      console.log(`Sending notification to organizer ${organizerId} for entry ${notificationData.entryId}`, {
        eventType: notificationData.eventType,
        title: notificationData.title,
        startDate: notificationData.startDate
      });

      // In a real implementation, this would send email/push notifications:
      // await notificationService.sendCalendarNotification(organizerId, notificationData);

    } catch (error) {
      console.error(`Error sending notification to organizer ${organizerId}:`, error);
    }
  }
}