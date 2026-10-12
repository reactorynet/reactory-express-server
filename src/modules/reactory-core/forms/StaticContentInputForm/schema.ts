import Reactory from '@reactorynet/reactory-core';

/**
 * Schema for the Static Content route-binding properties editor.
 *
 * The form is the `componentProps` editor for a route bound to
 * `core.StaticContent@1.0.0`: its `formData` *is* the route's `componentProps`
 * object, so the schema is deliberately **flat** and mirrors the component's
 * public prop surface (`ReactoryStaticContentProps` in
 * `components/shared/StaticContent/types.ts`). Keeping it flat means the saved
 * props go straight onto the component with no shape translation.
 *
 * Properties are grouped into tabs by the uiSchema; the schema itself stays a
 * single object so formData / the persisted `componentProps` remain flat.
 */
const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Static Content Binding',
  description:
    'Configures a route bound to core.StaticContent@1.0.0 — which content record to render, and how it presents and behaves.',
  properties: {
    // ── Content selection ────────────────────────────────────────────────
    slug: {
      type: 'string',
      title: 'Content Slug',
      description:
        'Slug of the content record to render. Supports ${...} templates resolved against the route, e.g. ${route.id}.',
    },
    slugSource: {
      type: 'string',
      title: 'Slug Source',
      enum: ['manual', 'route'],
      default: 'manual',
      description:
        'Use "route" to derive the slug from a route parameter; otherwise the fixed Content Slug above is used.',
    },
    slugSourceProps: {
      type: 'object',
      title: 'Route Slug Source',
      description: 'Used only when Slug Source is "route".',
      properties: {
        paramId: {
          type: 'string',
          title: 'Route Parameter',
          description: 'Name of the route parameter that carries the slug (e.g. id).',
        },
        slugPrefix: {
          type: 'string',
          title: 'Slug Prefix',
          description: 'Prefix prepended to the route value (e.g. "page/").',
        },
        basePath: {
          type: 'string',
          title: 'Content Base Path',
          default: 'content/static-content',
        },
      },
    },
    defaultSlug: {
      type: 'string',
      title: 'Default Slug',
      description: 'Fallback slug used when the route parameter is absent.',
    },
    title: {
      type: 'string',
      title: 'Title Override',
      description: 'Overrides the content record title for this binding.',
    },
    showTitle: {
      type: 'boolean',
      title: 'Show Title',
      default: false,
    },
    defaultValue: {
      type: 'string',
      title: 'Placeholder Content',
      description: 'Body shown (and editable) when the record does not exist yet.',
    },
    locale: {
      type: 'string',
      title: 'Locale',
      description: 'Locale to render (e.g. en). Leave empty to use the active UI language.',
    },

    // ── Presentation ─────────────────────────────────────────────────────
    viewMode: {
      type: 'string',
      title: 'View Mode',
      enum: ['cms', 'inline', 'full', 'splitPreview', 'minimal'],
      default: 'cms',
    },
    container: {
      type: 'string',
      title: 'Container',
      enum: ['Box', 'Paper', 'div'],
      default: 'Box',
      description: 'MUI element wrapping the rendered content.',
    },
    containerProps: {
      type: 'object',
      title: 'Container Props',
      additionalProperties: true,
      description: 'Props passed to the container element (e.g. { "sx": { "mt": 2 } }).',
    },
    style: {
      type: 'object',
      title: 'Style',
      additionalProperties: true,
      description: 'Inline style overrides merged over the record style.',
    },
    placeHolder: {
      type: 'string',
      title: 'Placeholder',
    },
    useExpanded: {
      type: 'boolean',
      title: 'Collapse By Default',
      default: false,
      description: 'Start collapsed, requiring the reader to expand the content.',
    },
    expanded: {
      type: 'boolean',
      title: 'Expanded On Load',
      default: true,
    },

    // ── Editing & access ─────────────────────────────────────────────────
    editAction: {
      type: 'string',
      title: 'Edit Action',
      enum: ['inline', 'link'],
      default: 'inline',
    },
    editDisplayMode: {
      type: 'string',
      title: 'Edit Display Mode',
      enum: ['inline', 'drawer', 'modal', 'sidepanel', 'splitPreview', 'link'],
      default: 'inline',
    },
    editLink: {
      type: 'string',
      title: 'Edit Link',
      default: '/Forms/ContentCapture/edit/',
    },
    editRoles: {
      type: 'array',
      title: 'Edit Roles',
      items: { type: 'string' },
      default: ['DEVELOPER'],
      description: 'Roles allowed to edit the content in place.',
    },
    viewRoles: {
      type: 'array',
      title: 'View Roles',
      items: { type: 'string' },
      description: 'Roles allowed to view the content. Empty = everyone.',
    },
    autoSaveDrafts: {
      type: 'boolean',
      title: 'Auto-save Drafts',
      default: false,
    },
    showEditIcon: {
      type: 'boolean',
      title: 'Show Edit Icon',
      default: true,
    },

    // ── Comments & localisation ──────────────────────────────────────────
    enableComments: {
      type: 'boolean',
      title: 'Enable Comments',
      default: false,
    },
    commentLayout: {
      type: 'string',
      title: 'Comment Layout',
      enum: ['bottom', 'accordion', 'drawer', 'card'],
      default: 'bottom',
    },
    commentsProps: {
      type: 'object',
      title: 'Comments Props',
      additionalProperties: true,
      description: 'Extra props forwarded to the comments surface.',
    },
    templateEngine: {
      type: 'string',
      title: 'Template Engine',
      enum: ['none', 'lodash', 'handlebars'],
      default: 'none',
      description: 'Expands ${...} expressions in the content body before render.',
    },

    // ── Advanced ─────────────────────────────────────────────────────────
    helpTitle: {
      type: 'string',
      title: 'Help Title',
    },
    helpTopics: {
      type: 'array',
      title: 'Help Topics',
      items: { type: 'string' },
    },
    throttle: {
      type: 'number',
      title: 'Throttle (ms)',
      default: 0,
      description: 'Minimum interval between reloads (0 = no throttle).',
    },
    formFqn: {
      type: 'string',
      title: 'Form FQN',
      description: 'Optional ReactoryForm to use when creating missing content.',
    },
    aipersona: {
      type: 'object',
      title: 'AI Persona',
      additionalProperties: true,
      description: 'UI AI options for the inline assistant (equivalent to ui:ai on the widget).',
    },
  },
};

export default schema;
