export default [
  {
    enabled: true,
    view: 'activation-email',
    kind: 'email',
    content: null,
    elements: [
      {
        enabled: true,
        view: 'activation-email/subject',
        kind: 'content',
        format: 'text',
        content: 'Welcome to <%= applicationTitle %> <%= user.firstName %>, please confirm your account',
        parameters: [
          {
            name: 'applicationTitle',
            type: 'text',
          },
          {
            name: 'user',
            type: 'User',
          },
        ],
        elements: [],
      },
      {
        enabled: true,
        view: 'activation-email/body',
        kind: 'content',
        format: 'html',
        content: '$ref://defaults/activation/activation-email-body-html.ejs',
        parameters: [
          {
            name: 'applicationTitle',
            propType: 'text',
          },
          {
            name: 'user',
            propType: 'User',
          },
        ],
        elements: [],
      },
    ],
  },
  {
    enabled: true,
    view: 'forgot-password-email',
    kind: 'email',
    content: null,
    elements: [
      {
        enabled: true,
        view: 'forgot-password-email/subject',
        kind: 'content',
        format: 'text',
        content: 'Follow the steps below to reset your password for <%= applicationTitle %>.',
        parameters: [
          {
            name: 'applicationTitle',
            type: 'text',
          },
        ],
        elements: [],
      },
      {
        enabled: true,
        view: 'forgot-password-email/body',
        kind: 'content',
        format: 'html',
        content: '$ref://defaults/forgot/forgot-password-body-html.ejs',
        parameters: [
          {
            name: 'applicationTitle',
            propType: 'text',
          },
          {
            name: 'user',
            propType: 'User',
          },
          {
            name: 'resetLink',
            propType: 'text',
          },
        ],
        elements: [],
      },
    ],
  },
];
