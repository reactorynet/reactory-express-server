/**
 * WP-B2: TenantRepository against a real SQL engine (in-memory SQLite), so
 * the where-merging and query-builder guards are exercised end to end.
 */
import 'reflect-metadata';
import { Brackets, Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ClientKeyColumn } from '../ClientKeyColumn';
import {
  TenantRepository,
  TenantScopeError,
  getCrossTenantRepository,
  getTenantRepository,
  registerTenantDataSource,
} from '../TenantRepository';

@Entity({ name: 'tenant_test_note' })
class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @ClientKeyColumn()
  clientKey!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', default: 'open' })
  status!: string;
}

@Entity({ name: 'tenant_test_global' })
class GlobalThing {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;
}

const ctx = (key?: string, roles: string[] = []) => ({
  partner: key ? { key } : null,
  hasRole: (role: string) => roles.includes(role),
});

let ds: DataSource;

beforeAll(async () => {
  ds = new DataSource({ type: 'sqlite', database: ':memory:', entities: [Note, GlobalThing], synchronize: true });
  await ds.initialize();
  registerTenantDataSource(ds);
});

afterAll(async () => {
  await ds.destroy();
});

beforeEach(async () => {
  await ds.getRepository(Note).clear();
  await ds.getRepository(Note).save([
    { clientKey: 'tenant-a', title: 'a-1', status: 'open' },
    { clientKey: 'tenant-a', title: 'a-2', status: 'closed' },
    { clientKey: 'tenant-b', title: 'b-1', status: 'open' },
  ]);
});

describe('TenantRepository reads', () => {
  it('only returns the request tenant rows', async () => {
    const notes = await getTenantRepository(ctx('tenant-a'), Note).find();
    expect(notes.map((n) => n.title).sort()).toEqual(['a-1', 'a-2']);
  });

  it('refuses a where that names another tenant, and allows its own', async () => {
    const repo = getTenantRepository(ctx('tenant-a'), Note);
    expect(() => repo.findBy({ clientKey: 'tenant-b' } as any)).toThrow(TenantScopeError);
    expect(await repo.findBy({ clientKey: 'tenant-a' } as any)).toHaveLength(2);
    expect(await repo.findOneBy({ title: 'b-1' })).toBeNull();
  });

  it('scopes every branch of an OR (array) where', async () => {
    const repo = getTenantRepository(ctx('tenant-a'), Note);
    const notes = await repo.find({ where: [{ title: 'a-1' }, { title: 'b-1' }] });
    expect(notes.map((n) => n.title)).toEqual(['a-1']);
  });

  it('counts within the tenant', async () => {
    expect(await getTenantRepository(ctx('tenant-b'), Note).count()).toBe(1);
  });
});

describe('TenantRepository query builders', () => {
  it('start filtered on the tenant', async () => {
    const rows = await getTenantRepository(ctx('tenant-a'), Note).createQueryBuilder('note').getMany();
    expect(rows).toHaveLength(2);
  });

  it('keep the tenant filter when the caller calls where()', async () => {
    const rows = await getTenantRepository(ctx('tenant-a'), Note)
      .createQueryBuilder('note')
      .where('note.status = :status', { status: 'open' })
      .getMany();
    expect(rows.map((n) => n.title)).toEqual(['a-1']);
  });

  it('keep it through a chain of builder calls', async () => {
    const rows = await getTenantRepository(ctx('tenant-a'), Note)
      .createQueryBuilder('note')
      .orderBy('note.title', 'DESC')
      .where('1 = 1')
      .take(10)
      .getMany();
    expect(rows.map((n) => n.title)).toEqual(['a-2', 'a-1']);
  });

  it('refuse a top-level orWhere, which would escape the filter', () => {
    const qb = getTenantRepository(ctx('tenant-a'), Note).createQueryBuilder('note');
    expect(() => qb.orWhere('note.status = :s', { s: 'open' })).toThrow(TenantScopeError);
  });

  it('refuse delete()/update() conversions, whose builders would drop the filter', () => {
    const repo = getTenantRepository(ctx('tenant-a'), Note);
    expect(() => repo.createQueryBuilder('note').delete()).toThrow(TenantScopeError);
    expect(() => repo.createQueryBuilder('note').update()).toThrow(TenantScopeError);
  });

  it('allow an OR inside Brackets', async () => {
    const rows = await getTenantRepository(ctx('tenant-a'), Note)
      .createQueryBuilder('note')
      .andWhere(new Brackets((q) => q.where('note.title = :x', { x: 'a-1' }).orWhere('note.title = :y', { y: 'b-1' })))
      .getMany();
    expect(rows.map((n) => n.title)).toEqual(['a-1']);
  });
});

describe('TenantRepository writes', () => {
  it('stamps the tenant on save', async () => {
    const saved = await getTenantRepository(ctx('tenant-b'), Note).save({ title: 'b-2' });
    expect(saved.clientKey).toBe('tenant-b');
  });

  it('refuses to save a row stamped for another tenant', async () => {
    await expect(getTenantRepository(ctx('tenant-a'), Note).save({ title: 'x', clientKey: 'tenant-b' }))
      .rejects.toBeInstanceOf(TenantScopeError);
  });

  it('refuses to overwrite another tenant row by id', async () => {
    const b = await ds.getRepository(Note).findOneByOrFail({ title: 'b-1' });
    await expect(getTenantRepository(ctx('tenant-a'), Note).save({ id: b.id, title: 'hijacked' }))
      .rejects.toBeInstanceOf(TenantScopeError);
    expect((await ds.getRepository(Note).findOneByOrFail({ id: b.id })).title).toBe('b-1');
  });

  it('scopes update and delete by id to the tenant', async () => {
    const b = await ds.getRepository(Note).findOneByOrFail({ title: 'b-1' });
    const repo = getTenantRepository(ctx('tenant-a'), Note);
    expect((await repo.update(b.id, { title: 'changed' })).affected).toBe(0);
    expect((await repo.delete(b.id)).affected).toBe(0);
    expect(await ds.getRepository(Note).countBy({ title: 'b-1' })).toBe(1);
  });

  it('refuses to move rows to another tenant', () => {
    expect(() => getTenantRepository(ctx('tenant-a'), Note).update({ title: 'a-1' }, { clientKey: 'tenant-b' } as any))
      .toThrow(TenantScopeError);
  });

  it('refuses empty criteria on update and delete', () => {
    const repo = getTenantRepository(ctx('tenant-a'), Note);
    expect(() => repo.delete(undefined)).toThrow(TenantScopeError);
  });
});

describe('entry points', () => {
  it('require a partner on the context', () => {
    expect(() => getTenantRepository(ctx(), Note)).toThrow(/requires a request context with a partner/);
  });

  it('refuse entities without a clientKey column', () => {
    expect(() => getTenantRepository(ctx('tenant-a'), GlobalThing)).toThrow(/not tenant-scoped/);
  });

  it('read across tenants only with CROSS_TENANT, and never write', async () => {
    expect(() => getCrossTenantRepository(ctx('tenant-a'), Note, ['tenant-a', 'tenant-b'])).toThrow(/CROSS_TENANT/);
    const repo = getCrossTenantRepository(ctx('tenant-a', ['CROSS_TENANT']), Note, ['tenant-a', 'tenant-b']);
    expect(await repo.count()).toBe(3);
    await expect(repo.save({ title: 'x' })).rejects.toThrow(/read-only/);
  });

  it('unsafeUnscoped returns the raw repository', async () => {
    const raw = getTenantRepository(ctx('tenant-a'), Note).unsafeUnscoped('test');
    expect(await raw.count()).toBe(3);
  });

  it('is a TenantRepository', () => {
    expect(getTenantRepository(ctx('tenant-a'), Note)).toBeInstanceOf(TenantRepository);
  });
});
