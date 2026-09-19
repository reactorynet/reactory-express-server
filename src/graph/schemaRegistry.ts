import type { GraphQLSchema } from 'graphql';

/**
 * Process-wide access to the compiled Reactory GraphQL schema.
 *
 * The schema is assembled once in `express/middleware/ReactoryGraph.ts` from
 * the module-contributed type definitions and resolvers. Resolvers are plain
 * objects and have no reference to it, so anything that needs to read the
 * schema itself (introspection) needs a way back to it.
 *
 * A registry is used rather than importing the middleware: the middleware
 * imports the resolver tree, so a resolver importing the middleware would be a
 * cycle.
 *
 * This is a set-once value for the lifetime of the process. It deliberately
 * holds no user data — the schema is the same for every caller, and access to
 * it is gated at the resolver, not here.
 */

let compiledSchema: GraphQLSchema | null = null;
let compiledAt: string | null = null;

/** Called once by the express middleware immediately after `makeExecutableSchema`. */
export const setReactorySchema = (schema: GraphQLSchema): void => {
  compiledSchema = schema;
  compiledAt = new Date().toISOString();
};

/**
 * The compiled schema, or `null` before compilation (or if compilation failed).
 * Callers must handle `null` — introspection is unavailable, not empty.
 */
export const getReactorySchema = (): GraphQLSchema | null => compiledSchema;

/** ISO-8601 timestamp of when the schema was compiled, for diagnostics. */
export const getReactorySchemaCompiledAt = (): string | null => compiledAt;

/** Test seam: drop the cached schema so a suite can exercise the not-compiled path. */
export const clearReactorySchema = (): void => {
  compiledSchema = null;
  compiledAt = null;
};
