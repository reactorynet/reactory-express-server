import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity({ name: 'reactory_audit' })
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
    length: 255,
    nullable: true,
    type: 'varchar'
  })
  before: string

  @Column({
    length: 255,
    nullable: true,
    type: 'varchar'
  })
  after: string

  @Column({
    type: 'timestamp',
    nullable: false,
    name: 'created_at'
  })
  createdAt: Date
}