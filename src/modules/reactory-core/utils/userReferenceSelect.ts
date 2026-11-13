/**
 * The user fields that may be handed to a caller when a user is referenced by
 * *another* record: a support ticket's author/assignee, a comment author, a team
 * member, a statistics owner, and so on.
 *
 * A `populate()` without a projection loads the complete User document. That
 * document carries the credential material - `password` (PBKDF2 hash), `salt`,
 * `sessionInfo[].jwtPayload.refresh` (a live refresh token) and
 * `authentications[].props.accessToken` (a live OAuth token) - so any caller
 * that serialises the populated record (`JSON.stringify`, a REST
 * `res.json()`, an AI tool result, a GraphQL selection that still exposes the
 * field) leaks working credentials for every referenced user.
 *
 * This projection is the single place that decision is made. Reference reads
 * use it, so a user reference can only ever carry an identity, never a secret.
 *
 * `_id` is projected rather than `id`: `id` is a Mongoose virtual, not a stored
 * field, and the GraphQL `User.id` resolver maps `_id` for clients.
 */
export const USER_REFERENCE_SELECT = '_id firstName lastName email avatar username';

/**
 * The same projection plus the user's document-level `roles`.
 *
 * Only for rosters (team members, business-unit members, owners) whose UI has to
 * show what a person may do. `roles` is an authorisation label, not a
 * credential; `memberships[].roles` and every token stay excluded.
 */
export const USER_REFERENCE_WITH_ROLES_SELECT = `${USER_REFERENCE_SELECT} roles`;
