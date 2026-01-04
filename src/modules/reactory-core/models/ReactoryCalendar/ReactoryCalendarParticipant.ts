import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, BaseEntity } from "typeorm";


@Entity({ name: 'reactory_calendar_participant' })
// Indexes for efficient participant queries
@Index(['entryId', 'userId']) // Unique participant per entry
@Index(['userId', 'status']) // User's event participation status
@Index(['entryId', 'status']) // Entry participant responses
@Index(['invitedAt']) // Recent invitations
export class ReactoryCalendarParticipant extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entry_id', type: 'integer', nullable: false })
  @Index()
  entryId: number;

  @Column({ name: 'user_id', type: 'varchar', nullable: false })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['organizer', 'required', 'optional', 'resource'],
    default: 'optional'
  })
  role: Reactory.Models.ReactoryCalendarParticipantRole;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'tentative'],
    default: 'pending'
  })
  status: Reactory.Models.ReactoryCalendarRSVPStatus;

  @Column({ name: 'invited_at', type: 'timestamptz', nullable: false })
  invitedAt: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Virtual properties populated by service layer
  entry?: any; // Populated from PostgreSQL ReactoryCalendarEntry
  user?: any; // Populated from MongoDB User

  // Helper methods for participant management
  static findEntryParticipants(entryId: number) {
    return this.find({
      where: { entryId },
      order: { invitedAt: 'ASC' }
    });
  }

  static findUserParticipations(userId: string, status?: Reactory.Models.ReactoryCalendarRSVPStatus[]) {
    const query = this.createQueryBuilder('participant')
      .where('participant.user_id = :userId', { userId })
      .orderBy('participant.invited_at', 'DESC');

    if (status && status.length > 0) {
      query.andWhere('participant.status IN (:...status)', { status });
    }

    return query.getMany();
  }

  static findPendingResponses(userId: string) {
    return this.find({
      where: {
        userId,
        status: Reactory.Models.ReactoryCalendarRSVPStatus.PENDING
      },
      order: { invitedAt: 'ASC' }
    });
  }

  static findParticipantsByRole(entryId: number, role: Reactory.Models.ReactoryCalendarParticipantRole) {
    return this.find({
      where: { entryId, role }
    });
  }

  static countParticipantsByStatus(entryId: number) {
    return this.createQueryBuilder('participant')
      .select('participant.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('participant.entry_id = :entryId', { entryId })
      .groupBy('participant.status')
      .getRawMany();
  }

  static updateParticipantStatus(entryId: number, userId: string, status: Reactory.Models.ReactoryCalendarRSVPStatus, notes?: string) {
    return this.update(
      { entryId, userId },
      {
        status,
        respondedAt: new Date(),
        notes
      }
    );
  }

  static removeParticipant(entryId: number, userId: string) {
    return this.delete({ entryId, userId });
  }

  static addParticipants(entryId: number, participants: Array<{
    userId: string;
    role: Reactory.Models.ReactoryCalendarParticipantRole;
    notes?: string;
  }>) {
    const now = new Date();
    const participantEntities = participants.map(participant => ({
      entryId,
      userId: participant.userId,
      role: participant.role,
      status: Reactory.Models.ReactoryCalendarRSVPStatus.PENDING,
      invitedAt: now,
      notes: participant.notes
    }));

    return this.insert(participantEntities);
  }

  static isUserParticipant(entryId: number, userId: string) {
    return this.findOne({
      where: { entryId, userId }
    });
  }

  static findOrganizers(entryId: number) {
    return this.find({
      where: {
        entryId,
        role: Reactory.Models.ReactoryCalendarParticipantRole.ORGANIZER
      }
    });
  }
}