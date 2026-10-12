import Reactory from '@reactorynet/reactory-core';

/**
 * UI schema for the Static Content route-binding properties editor.
 *
 * Layout: `ui:field: 'TabbedLayout'` groups the (flat) fields into tabs, and
 * `ui:grid-layout` lays each tab's fields out on the 12-column grid. The schema
 * — and therefore formData / the route's persisted `componentProps` — is
 * unchanged; only the presentation is grouped. This is the same pattern the
 * Application dashboard and the AI-model editors use, so the editor renders
 * identically on both form engines.
 *
 * Widget notes (all resolvable on the live v5 engine and the legacy fork):
 *   - `TextareaWidget` is an rjsf default widget (for long text).
 *   - `CheckboxWidget` is an rjsf default widget (explicit for clarity).
 *   - `ChipArrayWidget` is registered in the Reactory widget catalogue and is
 *     used for free-form string arrays.
 *   - Enums render through the implicit select widget; free-form objects
 *     (`containerProps`, `style`, `commentsProps`, `aipersona`) render through
 *     the object field so arbitrary JSON keys can be configured.
 */
const uiSchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: 'div',
    showSubmit: false,
    showHelp: false,
    showRefresh: false,
  },
  'ui:field': 'TabbedLayout',
  'ui:tab-layout': [
    {
      field: 'slug',
      title: 'Content',
      icon: 'article',
      fields: [
        'slug',
        'slugSource',
        'slugSourceProps',
        'defaultSlug',
        'title',
        'showTitle',
        'defaultValue',
        'locale',
      ],
    },
    {
      field: 'viewMode',
      title: 'Presentation',
      icon: 'dashboard',
      fields: [
        'viewMode',
        'container',
        'containerProps',
        'style',
        'placeHolder',
        'useExpanded',
        'expanded',
      ],
    },
    {
      field: 'editAction',
      title: 'Editing',
      icon: 'edit',
      fields: [
        'editAction',
        'editDisplayMode',
        'editLink',
        'editRoles',
        'viewRoles',
        'autoSaveDrafts',
        'showEditIcon',
      ],
    },
    {
      field: 'enableComments',
      title: 'Comments & i18n',
      icon: 'comments',
      fields: ['enableComments', 'commentLayout', 'commentsProps', 'templateEngine'],
    },
    {
      field: 'helpTitle',
      title: 'Advanced',
      icon: 'tune',
      fields: ['helpTitle', 'helpTopics', 'throttle', 'formFqn', 'aipersona'],
    },
  ],
  'ui:grid-layout': [
    // Content
    {
      slug: { xs: 12, md: 8 },
      slugSource: { xs: 12, md: 4 },
    },
    { slugSourceProps: { xs: 12 } },
    {
      defaultSlug: { xs: 12, sm: 6, md: 4 },
      title: { xs: 12, sm: 6, md: 4 },
      locale: { xs: 12, sm: 6, md: 4 },
    },
    {
      showTitle: { xs: 12, sm: 6, md: 3 },
    },
    { defaultValue: { xs: 12 } },
    // Presentation
    {
      viewMode: { xs: 12, sm: 6, md: 4 },
      container: { xs: 12, sm: 6, md: 4 },
      placeHolder: { xs: 12, sm: 6, md: 4 },
    },
    {
      useExpanded: { xs: 12, sm: 6, md: 3 },
      expanded: { xs: 12, sm: 6, md: 3 },
    },
    { containerProps: { xs: 12, md: 6 } },
    { style: { xs: 12, md: 6 } },
    // Editing
    {
      editAction: { xs: 12, sm: 6, md: 4 },
      editDisplayMode: { xs: 12, sm: 6, md: 4 },
      editLink: { xs: 12, sm: 12, md: 4 },
    },
    {
      editRoles: { xs: 12, md: 6 },
      viewRoles: { xs: 12, md: 6 },
    },
    {
      autoSaveDrafts: { xs: 12, sm: 6, md: 3 },
      showEditIcon: { xs: 12, sm: 6, md: 3 },
    },
    // Comments & i18n
    {
      enableComments: { xs: 12, sm: 6, md: 3 },
      commentLayout: { xs: 12, sm: 6, md: 4 },
      templateEngine: { xs: 12, sm: 6, md: 4 },
    },
    { commentsProps: { xs: 12 } },
    // Advanced
    {
      helpTitle: { xs: 12, sm: 6, md: 4 },
      throttle: { xs: 12, sm: 6, md: 3 },
      formFqn: { xs: 12, sm: 12, md: 5 },
    },
    { helpTopics: { xs: 12 } },
    { aipersona: { xs: 12 } },
  ],

  // Field-level presentation
  slug: {
    'ui:placeholder': 'e.g. about-us',
  },
  title: {
    'ui:placeholder': 'e.g. About Us',
  },
  defaultValue: {
    'ui:widget': 'TextareaWidget',
    'ui:options': {
      rows: 6,
    },
  },
  slugSourceProps: {
    'ui:options': {
      variant: 'section',
    },
    'ui:grid-layout': [
      {
        paramId: { xs: 12, sm: 6, md: 4 },
        slugPrefix: { xs: 12, sm: 6, md: 4 },
        basePath: { xs: 12, sm: 12, md: 4 },
      },
    ],
  },
  placeHolder: {
    'ui:placeholder': 'Shown while content loads / is missing',
  },
  showTitle: { 'ui:widget': 'CheckboxWidget' },
  useExpanded: { 'ui:widget': 'CheckboxWidget' },
  expanded: { 'ui:widget': 'CheckboxWidget' },
  autoSaveDrafts: { 'ui:widget': 'CheckboxWidget' },
  showEditIcon: { 'ui:widget': 'CheckboxWidget' },
  enableComments: { 'ui:widget': 'CheckboxWidget' },
  editRoles: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      placeholder: 'Add a role and press Enter...',
      allowAdd: true,
      allowDelete: true,
    },
  },
  viewRoles: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      placeholder: 'Add a role and press Enter...',
      allowAdd: true,
      allowDelete: true,
    },
  },
  helpTopics: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      placeholder: 'Add a help topic...',
      allowAdd: true,
      allowDelete: true,
    },
  },
};

export default uiSchema;
