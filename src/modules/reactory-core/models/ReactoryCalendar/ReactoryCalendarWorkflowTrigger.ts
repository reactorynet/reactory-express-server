import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from "typeorm";

@Entity({ name: 'reactory_calendar_workflow_trigger' })
// Indexes for trigger queries
@Index(['entryId', 'triggerType']) // Triggers by entry and type
@Index(['workflowId', 'workflowVersion']) // Workflow-specific triggers
export class ReactoryCalendarWorkflowTrigger extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

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
  static findEntryTriggers(entryId: number) {
    return this.find({
      where: { entryId },
      order: { triggerType: 'ASC' }
    });
  }

  static findTimeBasedTriggers() {
    return this.find({
      where: { triggerType: Reactory.Models.ReactoryCalendarWorkflowTriggerType.TIME_BASED }
    });
  }

  static findWorkflowTriggers(workflowId: string, workflowVersion?: string) {
    const where: any = { workflowId };
    if (workflowVersion) {
      where.workflowVersion = workflowVersion;
    }
    return this.find({ where });
  }

  static removeEntryTriggers(entryId: number) {
    return this.delete({ entryId });
  }

  static createTrigger(entryId: number, triggerData: {
    workflowId: string;
    workflowVersion: string;
    triggerType: Reactory.Models.ReactoryCalendarWorkflowTriggerType;
    triggerOffset?: number;
    parameters?: Record<string, any>;
  }) {
    return this.create({
      entryId,
      ...triggerData
    });
  }
}