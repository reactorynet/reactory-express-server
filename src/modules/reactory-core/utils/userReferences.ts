import { USER_REFERENCE_FIELDS } from './userReferenceSelect';

/**
 * Resolves user references (owner, members, submitter, ...) for GraphQL field
 * resolvers without ever handing back a complete User document.
 *
 * A reference arrives in one of two shapes:
 *  - an id (ObjectId or hex string): the users are loaded in ONE query, with
 *    the reference projection, instead of one `findById` per entry;
 *  - an already-populated user (a service populated it, with or without a
 *    projection): it is narrowed in memory to the reference fields, so a parent
 *    that loaded the full document cannot leak it through this field.
 *
 * Order and length are preserved; an id with no matching user resolves to
 * `null`, as the previous per-entry `findById` did.
 *
 * The model is passed in rather than imported so callers keep using the model
 * binding they already have (and their tests already mock).
 */

type UserFinder = {
  find: (filter: any) => any;
};

const HEX_OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * Whether `ref` is a populated user rather than an id.
 *
 * Mongoose patches `ObjectId.prototype._id` to return the ObjectId itself, so
 * an id is an object whose `_id` is either absent or itself; a populated user
 * (hydrated or lean) carries a distinct `_id`.
 */
export const isPopulatedUser = (ref: any): boolean =>
  ref !== null
  && typeof ref === 'object'
  && ref._id !== undefined
  && ref._id !== null
  && ref._id !== ref;

/** Copies only `fields` from a hydrated or plain user into a plain object. */
export const pickUserReference = (
  user: any,
  fields: readonly string[] = USER_REFERENCE_FIELDS,
): Record<string, any> | null => {
  if (!user || typeof user !== 'object') return null;
  const read = (field: string) => (typeof user.get === 'function' ? user.get(field) : user[field]);
  const reference: Record<string, any> = {};
  for (const field of fields) {
    const value = read(field);
    if (value !== undefined) reference[field] = value;
  }
  return reference;
};

export async function resolveUserReferences(
  User: UserFinder,
  refs: any[] | null | undefined,
  fields: readonly string[] = USER_REFERENCE_FIELDS,
): Promise<Array<Record<string, any> | null>> {
  if (!Array.isArray(refs) || refs.length === 0) return [];

  const ids = Array.from(new Set(
    refs
      .filter((ref) => ref !== null && ref !== undefined && !isPopulatedUser(ref))
      .map((ref) => String(ref).toLowerCase())
      .filter((id) => HEX_OBJECT_ID.test(id)),
  ));

  const loaded: any[] = ids.length > 0
    ? await User.find({ _id: { $in: ids } }).select(fields.join(' ')).lean().exec()
    : [];
  // Keys are lowercase hex: `String(ObjectId)` is lowercase, and an id stored
  // as an uppercase string must still find its user.
  const byId = new Map<string, any>((loaded || []).map((user: any) => [String(user._id).toLowerCase(), user]));

  return refs.map((ref) => {
    if (ref === null || ref === undefined) return null;
    if (isPopulatedUser(ref)) return pickUserReference(ref, fields);
    return byId.get(String(ref).toLowerCase()) ?? null;
  });
}

export async function resolveUserReference(
  User: UserFinder,
  ref: any,
  fields: readonly string[] = USER_REFERENCE_FIELDS,
): Promise<Record<string, any> | null> {
  if (ref === null || ref === undefined) return null;
  const [user] = await resolveUserReferences(User, [ref], fields);
  return user ?? null;
}
