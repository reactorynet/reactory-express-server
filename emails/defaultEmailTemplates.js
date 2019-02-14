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
  /**
    SurveyInvite: 'towerstone.survey-invite-email',
    InvitePeers: 'towerstone.peer-invite-email',
    SurveyLaunch: 'towerstone.survey-launch-email',
    SurveyReminder: 'towerstone.survey-launch-email
   */
  {
    enabled: true,
    view: 'towerstone.survey-invite-email',
    kind: 'email',
    content: null,
    elements: [
      {
        enabled: true,
        view: 'towerstone.survey-invite-email/subject',
        kind: 'content',
        format: 'text',
        content: 'You have been confirmed as a peer for <%= user.firstName %> on the <%= applicationTitle %> assessment platform.',
        parameters: [
          {
            name: 'applicationTitle',
            title: 'Application Title',
            type: 'string',
          },
          {
            name: 'user',
            type: 'object',
            properties: {
              firstName: {
                title: 'First name',
                name: 'firstName',
                type: 'string',
              },
            },
          },
        ],
        elements: [],
      },
      {
        enabled: true,
        view: 'towerstone.survey-invite-email/body',
        kind: 'content',
        format: 'html',
        content: '$ref://towerstone/survey/survey-invite-body-html.ejs',
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
          {
            name: 'peer',
            type: 'object',
          },
        ],
        elements: [],
      },
    ],
  },
];
