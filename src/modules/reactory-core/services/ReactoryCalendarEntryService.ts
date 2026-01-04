import { 
  ReactoryCalendarEntry,
  ReactoryCalendarParticipant,
  ReactoryCalendarWorkflowTrigger,
  ReactoryCalendarServiceTrigger,
  ReactoryCalendarRecurrencePattern,
 } from "@reactory/server-modules/reactory-core/models/ReactoryCalendar";
import { service } from "@reactory/server-core/application/decorators/service";
import { PostgresDataSource } from "@reactory/server-modules/reactory-core/models";
import { Repository } from "typeorm";
import { Models } from '@reactory/reactory-core';
export interface CreateReactoryCalendarEntryInput {
  calendarId: number;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  timeZone?: string;
  isAllDay?: boolean;
  recurrence?: Reactory.Models.ReactoryCalendarRecurrencePattern;
  status?: Reactory.Models.ReactoryCalendarEntryStatus;
  priority?: Reactory.Models.ReactoryCalendarEntryPriority;
  category?: string;
  tags?: string[];
  workflowTrigger?: Reactory.Models.ReactoryCalendarWorkflowTrigger;
  serviceTrigger?: Reactory.Models.ReactoryCalendarServiceTrigger;
  metadata?: Record<string, any>;
}

export interface UpdateReactoryCalendarEntryInput {
  title?: string;
  description?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  timeZone?: string;
  isAllDay?: boolean;
  recurrence?: Reactory.Models.ReactoryCalendarRecurrencePattern;
  status?: Reactory.Models.ReactoryCalendarEntryStatus;
  priority?: Reactory.Models.ReactoryCalendarEntryPriority;
  category?: string;
  tags?: string[];
  workflowTrigger?: Reactory.Models.ReactoryCalendarWorkflowTrigger;
  serviceTrigger?: Reactory.Models.ReactoryCalendarServiceTrigger;
  metadata?: Record<string, any>;
}

export interface ReactoryCalendarParticipantInput {
  userId: string;
  role: 'organizer' | 'required' | 'optional' | 'resource';
  notes?: string;
}

@service({
  id: 'reactory.CalendarEntryService@1.0.0',
  name: 'ReactoryCalendarEntryService',
  nameSpace: 'reactory',
  version: '1.0.0',
  description: 'Service for managing Reactory Calendar Entries',
  serviceType: 'calendar',
  lifeCycle: 'instance'
})
export class ReactoryCalendarEntryService implements Reactory.Service.IReactoryDefaultService {
  name: string;
  nameSpace: string;
  version: string;
  description: string;
  serviceType: string;
  lifeCycle: string;
  props: any;
  context: Reactory.Server.IReactoryContext;
  private entryRepository: Repository<ReactoryCalendarEntry>;
  private participantRepository: Repository<ReactoryCalendarParticipant>;
  private workflowTriggerRepository: Repository<ReactoryCalendarWorkflowTrigger>;
  private serviceTriggerRepository: Repository<ReactoryCalendarServiceTrigger>;
  private recurrenceRepository: Repository<ReactoryCalendarRecurrencePattern>;
  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
    this.entryRepository = PostgresDataSource.getRepository(ReactoryCalendarEntry);
    this.participantRepository = PostgresDataSource.getRepository(ReactoryCalendarParticipant);
    this.workflowTriggerRepository = PostgresDataSource.getRepository(ReactoryCalendarWorkflowTrigger);
    this.serviceTriggerRepository = PostgresDataSource.getRepository(ReactoryCalendarServiceTrigger);
    this.recurrenceRepository = PostgresDataSource.getRepository(ReactoryCalendarRecurrencePattern);
  }
  onStartup(context: Reactory.Server.IReactoryContext): Promise<void> {
    return Promise.resolve();
  }
  tags?: string[];
  toString?(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}@${this.version}`;
  }
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): void {
    this.context = executionContext;
  }
  /**
   * Create a new calendar entry
   */
  async createEntry(input: CreateReactoryCalendarEntryInput, organizerId: string): Promise<ReactoryCalendarEntry> {
    return await PostgresDataSource.transaction(async transactionalEntityManager => {
      // Create the calendar entry
      const entry = transactionalEntityManager.create(ReactoryCalendarEntry, {
        ...input,
        organizerId,
        createdBy: organizerId,
        updatedBy: organizerId,
        status: input.status || Models.ReactoryCalendarEntryStatus.CONFIRMED,
        priority: input.priority || Models.ReactoryCalendarEntryPriority.NORMAL,
        timeZone: input.timeZone || 'UTC',
        isAllDay: input.isAllDay || false,
        tags: input.tags || [],
        metadata: input.metadata || {}
      });

      const savedEntry = await transactionalEntityManager.save(ReactoryCalendarEntry, entry);

      // Create recurrence pattern if provided
      if (input.recurrence) {
        const recurrence = transactionalEntityManager.create(ReactoryCalendarRecurrencePattern, input.recurrence);
        await transactionalEntityManager.save(ReactoryCalendarRecurrencePattern, recurrence);
        savedEntry.recurrence = recurrence;
      }

      // Create workflow trigger if provided
      if (input.workflowTrigger) {
        const workflowTrigger = transactionalEntityManager.create(ReactoryCalendarWorkflowTrigger, {
          ...input.workflowTrigger,
          entryId: savedEntry.id
        });
        await transactionalEntityManager.save(ReactoryCalendarWorkflowTrigger, workflowTrigger);
      }

      // Create service trigger if provided
      if (input.serviceTrigger) {
        const serviceTrigger = transactionalEntityManager.create(ReactoryCalendarServiceTrigger, {
          ...input.serviceTrigger,
          entryId: savedEntry.id
        });
        await transactionalEntityManager.save(ReactoryCalendarServiceTrigger, serviceTrigger);
      }

      return savedEntry;
    });
  }

  /**
   * Update an existing calendar entry
   */
  async updateEntry(id: number, input: UpdateReactoryCalendarEntryInput, userId: string): Promise<ReactoryCalendarEntry> {
    return await PostgresDataSource.transaction(async transactionalEntityManager => {
      const entry = await transactionalEntityManager.findOne(ReactoryCalendarEntry, { where: { id } });
      if (!entry) {
        throw new Error(`Calendar entry with id ${id} not found`);
      }

      // Check permissions (organizer or participant can update)
      const isOrganizer = entry.organizerId === userId;
      const isParticipant = await transactionalEntityManager.findOne(ReactoryCalendarParticipant, {
        where: { entryId: id, userId }
      });

      if (!isOrganizer && !isParticipant) {
        throw new Error('Insufficient permissions to update calendar entry');
      }

      Object.assign(entry, {
        ...input,
        updatedBy: userId,
        updatedAt: new Date()
      });

      const savedEntry = await transactionalEntityManager.save(ReactoryCalendarEntry, entry);

      // Update recurrence pattern if provided
      if (input.recurrence) {
        let recurrence = await transactionalEntityManager.findOne(ReactoryCalendarRecurrencePattern, {
          where: { entryId: id }
        });

        if (recurrence) {
          Object.assign(recurrence, input.recurrence);
          await transactionalEntityManager.save(ReactoryCalendarRecurrencePattern, recurrence);
        } else {
          recurrence = transactionalEntityManager.create(ReactoryCalendarRecurrencePattern, {
            ...input.recurrence,
            entryId: id
          });
          await transactionalEntityManager.save(ReactoryCalendarRecurrencePattern, recurrence);
        }
        savedEntry.recurrence = recurrence;
      }

      // Update triggers if provided
      if (input.workflowTrigger) {
        let workflowTrigger = await transactionalEntityManager.findOne(ReactoryCalendarWorkflowTrigger, {
          where: { entryId: id }
        });

        if (workflowTrigger) {
          Object.assign(workflowTrigger, input.workflowTrigger);
          await transactionalEntityManager.save(ReactoryCalendarWorkflowTrigger, workflowTrigger);
        } else {
          workflowTrigger = transactionalEntityManager.create(ReactoryCalendarWorkflowTrigger, {
            ...input.workflowTrigger,
            entryId: id
          });
          await transactionalEntityManager.save(ReactoryCalendarWorkflowTrigger, workflowTrigger);
        }
      }

      if (input.serviceTrigger) {
        let serviceTrigger = await transactionalEntityManager.findOne(ReactoryCalendarServiceTrigger, {
          where: { entryId: id }
        });

        if (serviceTrigger) {
          Object.assign(serviceTrigger, input.serviceTrigger);
          await transactionalEntityManager.save(ReactoryCalendarServiceTrigger, serviceTrigger);
        } else {
          serviceTrigger = transactionalEntityManager.create(ReactoryCalendarServiceTrigger, {
            ...input.serviceTrigger,
            entryId: id
          });
          await transactionalEntityManager.save(ReactoryCalendarServiceTrigger, serviceTrigger);
        }
      }

      return savedEntry;
    });
  }

  /**
   * Delete a calendar entry
   */
  async deleteEntry(id: number, userId: string): Promise<boolean> {
    return await PostgresDataSource.transaction(async transactionalEntityManager => {
      const entry = await transactionalEntityManager.findOne(ReactoryCalendarEntry, { where: { id } });
      if (!entry) {
        throw new Error(`Calendar entry with id ${id} not found`);
      }

      // Check permissions
      const isOrganizer = entry.organizerId === userId;
      const isParticipant = await transactionalEntityManager.findOne(ReactoryCalendarParticipant, {
        where: { entryId: id, userId }
      });

      if (!isOrganizer && !isParticipant) {
        throw new Error('Insufficient permissions to delete calendar entry');
      }

      // Soft delete by marking as cancelled
      entry.status = Models.ReactoryCalendarEntryStatus.CANCELLED;
      entry.updatedBy = userId;
      entry.updatedAt = new Date();

      await transactionalEntityManager.save(ReactoryCalendarEntry, entry);
      return true;
    });
  }

  /**
   * Get a calendar entry by ID
   */
  async getEntry(id: number, userId?: string): Promise<ReactoryCalendarEntry | null> {
    const entry = await this.entryRepository.findOne({
      where: { id, status: Models.ReactoryCalendarEntryStatus.CONFIRMED }
    });
    if (!entry) return null;

    // Check access if userId provided (user should be participant or calendar should be accessible)
    if (userId) {
      const isParticipant = await this.participantRepository.findOne({
        where: { entryId: id, userId }
      });
      // Additional calendar access check would be needed here
    }

    return entry;
  }

  /**
   * Get calendar entries with filtering
   */
  async getCalendarEntries(calendarId: number, filter: Reactory.Models.ReactoryCalendarEntryFilter = {}): Promise<ReactoryCalendarEntry[]> {
    return await ReactoryCalendarEntry.findCalendarEvents(calendarId, filter.startDate, filter.endDate, filter.status);
  }

  /**
   * Get user's calendar entries
   */
  async getUserEntries(userId: string, filter: Reactory.Models.ReactoryCalendarEntryFilter = {}): Promise<ReactoryCalendarEntry[]> {
    return await ReactoryCalendarEntry.findUserEvents(userId, filter.startDate || new Date(), filter.endDate || new Date(), filter.status);
  }

  /**
   * Invite participants to a calendar entry
   */
  async inviteParticipants(entryId: number, participants: ReactoryCalendarParticipantInput[], organizerId: string): Promise<ReactoryCalendarEntry> {
    return await PostgresDataSource.transaction(async transactionalEntityManager => {
      const entry = await transactionalEntityManager.findOne(ReactoryCalendarEntry, { where: { id: entryId } });
      if (!entry) {
        throw new Error(`Calendar entry with id ${entryId} not found`);
      }

      // Check if user is organizer
      if (entry.organizerId !== organizerId) {
        throw new Error('Only organizer can manage participants');
      }

      // Create participants
      const participantEntities = participants.map(participant => ({
        entryId,
        userId: participant.userId,
        role: participant.role,
        status: 'pending' as const,
        invitedAt: new Date(),
        notes: participant.notes
      }));

      await transactionalEntityManager.insert(ReactoryCalendarParticipant, participantEntities);

      return entry;
    });
  }

  /**
   * Update participant RSVP status
   */
  async updateParticipantStatus(entryId: number, userId: string, status: 'accepted' | 'declined' | 'tentative', notes?: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { entryId, userId }
    });

    if (!participant) {
      throw new Error('User is not a participant of this calendar entry');
    }

    participant.status = status as any;
    participant.respondedAt = new Date();
    if (notes) participant.notes = notes;

    await this.participantRepository.save(participant);
    return true;
  }

  /**
   * Get availability for user across calendars
   */
  async getUserAvailability(userId: string, startDate: Date, endDate: Date, timeZone: string = 'UTC'): Promise<Reactory.Models.ReactoryCalendarTimeSlot[]> {
    const entries = await ReactoryCalendarEntry.findUserEvents(userId, startDate, endDate);

    const timeSlots: Reactory.Models.ReactoryCalendarTimeSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dayEntries = entries.filter(entry =>
        entry.startDate.toDateString() === currentDate.toDateString()
      );

      // Create hourly slots for the day (assuming business hours 9-17)
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(currentDate);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        const conflictingEntries = dayEntries.filter(entry =>
          (entry.startDate <= slotEnd && entry.endDate >= slotStart)
        );

        timeSlots.push({
          startDate: slotStart,
          endDate: slotEnd,
          available: conflictingEntries.length === 0,
          conflictingEntries: conflictingEntries.map(e => e.id)
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timeSlots;
  }

  /**
   * Get calendar availability
   */
  async getCalendarAvailability(calendarId: number, startDate: Date, endDate: Date): Promise<Reactory.Models.ReactoryCalendarTimeSlot[]> {
    const entries = await ReactoryCalendarEntry.findCalendarEvents(calendarId, startDate, endDate);

    const timeSlots: Reactory.Models.ReactoryCalendarTimeSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dayEntries = entries.filter(entry =>
        entry.startDate.toDateString() === currentDate.toDateString()
      );

      // Create hourly slots for the day
      for (let hour = 0; hour < 24; hour++) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(currentDate);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        const conflictingEntries = dayEntries.filter(entry =>
          (entry.startDate <= slotEnd && entry.endDate >= slotStart)
        );

        timeSlots.push({
          startDate: slotStart,
          endDate: slotEnd,
          available: conflictingEntries.length === 0,
          calendarId,
          conflictingEntries: conflictingEntries.map(e => e.id)
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timeSlots;
  }

  /**
   * Expand recurring entries for a date range
   */
  async expandRecurringEntries(baseEntry: ReactoryCalendarEntry, startDate: Date, endDate: Date): Promise<ReactoryCalendarEntry[]> {
    if (!baseEntry.recurrence) {
      return [baseEntry];
    }

    const recurrence = await this.recurrenceRepository.findOne({
      where: { id: baseEntry.recurrence.id }
    });

    if (!recurrence) {
      return [baseEntry];
    }

    const occurrences = recurrence.generateOccurrences(startDate, endDate, baseEntry.startDate);

    return occurrences.map(occurrenceDate => ({
      ...baseEntry,
      id: baseEntry.id, // Keep original ID for recurring events
      startDate: occurrenceDate,
      endDate: new Date(occurrenceDate.getTime() + (baseEntry.endDate.getTime() - baseEntry.startDate.getTime()))
    })) as ReactoryCalendarEntry[];
  }

  /**
   * Duplicate a calendar entry
   */
  async duplicateEntry(id: number, modifications: Partial<CreateReactoryCalendarEntryInput>, userId: string): Promise<ReactoryCalendarEntry> {
    const originalEntry = await this.entryRepository.findOne({ where: { id } });
    if (!originalEntry) {
      throw new Error(`Calendar entry with id ${id} not found`);
    }

    const newEntryInput: CreateReactoryCalendarEntryInput = {
      calendarId: originalEntry.calendarId,
      title: modifications.title || `${originalEntry.title} (Copy)`,
      description: modifications.description || originalEntry.description,
      location: modifications.location || originalEntry.location,
      startDate: modifications.startDate || new Date(originalEntry.startDate.getTime() + 24 * 60 * 60 * 1000), // Next day
      endDate: modifications.endDate || new Date(originalEntry.endDate.getTime() + 24 * 60 * 60 * 1000),
      timeZone: modifications.timeZone || originalEntry.timeZone,
      isAllDay: modifications.isAllDay || originalEntry.isAllDay,
      recurrence: modifications.recurrence || originalEntry.recurrence,
      status: modifications.status || Models.ReactoryCalendarEntryStatus.CONFIRMED,
      priority: modifications.priority || originalEntry.priority,
      category: modifications.category || originalEntry.category,
      tags: modifications.tags || originalEntry.tags,
      workflowTrigger: modifications.workflowTrigger || originalEntry.workflowTrigger,
      serviceTrigger: modifications.serviceTrigger || originalEntry.serviceTrigger,
      metadata: modifications.metadata || originalEntry.metadata
    };

    return await this.createEntry(newEntryInput, userId);
  }
}