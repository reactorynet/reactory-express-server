import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm"

@Entity({ name: 'reactory_audit' })
@Index(['user', 'action', 'createdAt'])
@Index(['source', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['moduleName', 'moduleVersion'])
export default class AuditModel {

  @PrimaryGeneratedColumn()
  id: number
  
  @Column({ 
    length: 255,
    nullable: false,
    name: 'user_id',
    type: 'varchar'
  })
  user: string

  @Column({
    length: 255,
    nullable: false,
    type: 'varchar'
  })
  action: string

  @Column({
    length: 255,
    nullable: false,
    type: 'varchar'
  })
  source: string

  @Column({
    length: 255,
    nullable: false,
    type: 'varchar'
  })
  signature: string

  @Column({
    type: 'text',
    nullable: true
  })
  before: string

  @Column({
    type: 'text',
    nullable: true
  })
  after: string

  // Enhanced fields for compliance tracking
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'actor_type'
  })
  actorType: string // 'user', 'system', 'service', 'admin'

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'actor_id'
  })
  actorId: string

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'resource_type'
  })
  resourceType: string // e.g., 'kyc_verification', 'document', 'user'

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'resource_id'
  })
  resourceId: string

  @Column({ 
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'event_type'
  })
  eventType: string // e.g., 'create', 'update', 'delete', 'access'

  @Column({
    type: 'text',
    nullable: true
  })
  metadata: string // JSON string for additional contextual data

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'ip_address'
  })
  ipAddress: string

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'user_agent'
  })
  userAgent: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'session_id'
  })
  sessionId: string

  @Column({
    type: 'boolean',
    nullable: false,
    default: true
  })
  success: boolean

  @Column({
    type: 'text',
    nullable: true,
    name: 'error_message'
  })
  errorMessage: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'organization_id'
  })
  organizationId: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'module_name'
  })
  moduleName: string // e.g., 'reactory-core', 'reactory-kyc', 'reactory-auth', 'reactory-user', 'reactory-organization', 'reactory-document', 'reactory-document-chunk', 'reactory-document-chunk-embedding', 'reactory-document-chunk-embedding-similarity', 'reactory-document-chunk-embedding-similarity-search', 'reactory-document-chunk-embedding-similarity-search-result'

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'module_version'
  })
  moduleVersion: string // e.g., '1.0.0', '1.1.0', '1.2.0'

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'created_at'
  })
  createdAt: Date
}