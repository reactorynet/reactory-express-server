export default [
  /**
   * Activation email
   */
  {
    enabled: true,
    view: 'activation-email',
    kind: 'email',
    format: 'html',
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
  /**
   * Forgot password email
   */
  {
    enabled: true,
    view: 'forgot-password-email',
    kind: 'email',
    format: 'html',
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
   * SurveyInvite: 'towerstone.survey-invite-email',
   */
  {
    enabled: true,
    view: 'towerstone.survey-invite-email',
    kind: 'email',
    format: 'html',
    content: null,
    elements: [
      {
        enabled: true,
        view: 'towerstone.survey-invite-email/subject',
        kind: 'content',
        format: 'text',
        content: 'You have been invited to participate in the survey <%= survey.title %> on the <%= applicationTitle %> assessment platform.',
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
  /**
   * InvitePeers: 'towerstone.peer-invite-email',
   */
  {
    enabled: true,
    view: 'towerstone.peer-invite-email',
    kind: 'email',
    content: null,
    format: 'html',
    elements: [
      {
        enabled: true,
        view: 'towerstone.peer-invite-email/subject',
        kind: 'content',
        format: 'text',
        content: 'You have been nominated as a peer for <%= employee.firstName %> on the <%= applicationTitle %> assessment platform.',
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
        view: 'towerstone.peer-invite-email/body',
        kind: 'content',
        format: 'html',
        content: '$ref://towerstone/user/peer-invite-body-html.ejs',
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
  /**
   * SurveyLaunch: 'towerstone.survey-launch-email',
   */
  {
    enabled: true,
    view: 'towerstone.survey-launch-email',
    kind: 'email',
    format: 'html',
    content: null,
    elements: [
      {
        enabled: true,
        view: 'towerstone.survey-launch-email/subject',
        kind: 'content',
        format: 'text',
        content: '<% if(!isSelfAssessment) { %>You have been confirmed as an assessor for <%= delegate.firstName %> on the <%= applicationTitle %> assessment platform <% } else { %> Please complete your self-assessment on the <%= applicationTitle %> assessment platform <% } %>',
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
        view: 'towerstone.survey-launch-email/body',
        kind: 'content',
        format: 'html',
        content: '$ref://towerstone/survey/survey-launch-email-html.ejs',
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
  /**
   * SurveyReminder: 'towerstone.survey-reminder-email
   */
  {
    enabled: true,
    view: 'towerstone.survey-reminder-email',
    kind: 'email',
    format: 'html',
    content: null,
    elements: [
      {
        enabled: true,
        view: 'towerstone.survey-reminder-email/subject',
        kind: 'content',
        format: 'text',
        content: 'Please remember to complete assessments for <%= delegate.firstName %> on the <%= applicationTitle %> assessment platform.',
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
        view: 'towerstone.survey-reminder-email/body',
        kind: 'content',
        format: 'html',
        content: '$ref://towerstone/survey/survey-reminder-email-html.ejs',
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
