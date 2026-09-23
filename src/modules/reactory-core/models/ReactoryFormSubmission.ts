import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ReactoryFormSubmission - the storage record for the generic form submission
 * pipeline.
 *
 * Forms that declare a `submission` block (see
 * `ReactoryFormSubmissionConfig`) do not need to ship their own GraphQL
 * mutation. The FormService injects the generic `ReactoryFormSubmit` mutation
 * into the resolved form definition and every submit lands here as a row keyed
 * by the form's fully qualified name.
 *
 * The record is deliberately schema-less: `formData` holds whatever the form
 * produced as a JSONB document so that a form's schema can evolve without a
 * migration. Querying into that document is handled by the submission filter
 * DSL, which compiles to JSONB operators (see `SubmissionFilter.ts`).
 */
@Entity({ name: 'reactory_form_submission' })
// GIN index over form_data for SubmissionFilter's containment / key lookups.
// TypeORM cannot express jsonb_path_ops; the core baseline migration and
// createFormSubmissionIndexes() create it, and synchronize: false stops schema
// sync and migration:generate from dropping it.
@Index('idx_reactory_form_submission_data', { synchronize: false })
@Index(['fqn', 'createdAt'])
@Index(['fqn', 'userId'])
@Index(['clientKey', 'fqn', 'createdAt'])
export default class ReactoryFormSubmission {

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The fully qualified name of the form that produced this submission,
   * i.e. `contact.Form@1.0.0`. This is the same value as the form's `id`.
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index()
  fqn!: string;

  /**
   * The ReactoryClient key that the submission was captured under.
   *
   * Reactory serves multiple clients from a single server and forms are shared
   * across them, so submissions must be partitioned per tenant - without this
   * an administrator of one client could read another client's submissions
   * through the explorer.
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'client_key' })
  @Index()
  clientKey?: string;

  /**
   * The MongoDB ObjectId string of the submitting user. Null when the form was
   * submitted anonymously (`submission.allowAnonymous`).
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_id' })
  @Index()
  userId?: string;

  /**
   * The form data as submitted. Stored as JSONB so that the explorer can filter
   * and search inside the document in the database rather than in memory.
   */
  @Column({ type: 'jsonb', nullable: false, name: 'form_data', default: () => "'{}'" })
  formData!: Record<string, unknown>;

  /**
   * The remote address the submission originated from. Long enough to hold an
   * IPv6 address, or an `x-forwarded-for` derived value.
   */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @CreateDateColumn({ type: 'timestamptz', nullable: false, name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: false, name: 'updated_at' })
  updatedAt!: Date;
}
