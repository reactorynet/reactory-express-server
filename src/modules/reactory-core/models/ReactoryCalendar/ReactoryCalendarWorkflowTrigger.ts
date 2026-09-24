import { ClientKeyColumn } from '../../../../database/tenant/ClientKeyColumn';
import type { CalendarRepository } from './repository';
import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from "typeorm";

@Entity({ name: 'reactory_calendar_workflow_trigger' })
// Indexes for trigger queries
@Index(['entryId', 'triggerType']) // Triggers by entry and type
@Index(['workflowId', 'workflowVersion']) // Workflow-specific triggers
export class ReactoryCalendarWorkflowTrigger extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Owning ReactoryClient key (WP-B2); set by the tenant repository. */
  @ClientKeyColumn()
  clientKey: string;

  @Column({ name: 'entry_id', type: 'integer', nullable: false })
  @Index()
  entryId: number;

  @Column({ name: 'workflow_id', type: 'varchar', nullable: false })
  workflowId: string;

  @Column({ name: 'workflow_version', type: 'varchar', nullable: false })
  workflowVersion: string;

  @Column({
    name: 'trigger_type',
    type: 'enum',
    enum: ['on_create', 'on_update', 'on_delete', 'time_based', 'participant_response'],
    nullable: false
  })
  triggerType: Reactory.Models.ReactoryCalendarWorkflowTriggerType;

  @Column({ name: 'trigger_offset', type: 'integer', nullable: true })
  triggerOffset?: number; // minutes before/after event

  @Column({ type: 'json', nullable: true })
  parameters: Record<string, any>;

  // Virtual properties populated by service layer
  entry?: any; // Populated from PostgreSQL ReactoryCalendarEntry

  // Helper methods for trigger management
  static findEntryTriggers(repo: CalendarRepository<ReactoryCalendarWorkflowTrigger>, entryId: number) {
    return repo.find({
      where: { entryId },
      order: { triggerType: 'ASC' }
    });
  }

  static findTimeBasedTriggers(repo: CalendarRepository<ReactoryCalendarWorkflowTrigger>) {
    return repo.find({
      where: { triggerType: Reactory.Models.ReactoryCalendarWorkflowTriggerType.TIME_BASED }
    });
  }

  static findWorkflowTriggers(repo: CalendarRepository<ReactoryCalendarWorkflowTrigger>, workflowId: string, workflowVersion?: string) {
    const where: any = { workflowId };
    if (workflowVersion) {
      where.workflowVersion = workflowVersion;
    }
    return repo.find({ where });
  }

  static removeEntryTriggers(repo: CalendarRepository<ReactoryCalendarWorkflowTrigger>, entryId: number) {
    return repo.delete({ entryId });
  }

  static createTrigger(repo: CalendarRepository<ReactoryCalendarWorkflowTrigger>, entryId: number, triggerData: {
    workflowId: string;
    workflowVersion: string;
    triggerType: Reactory.Models.ReactoryCalendarWorkflowTriggerType;
    triggerOffset?: number;
    parameters?: Record<string, any>;
  }) {
    return repo.create({
      entryId,
      ...triggerData
    });
  }
}