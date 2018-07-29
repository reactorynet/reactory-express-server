
const defaultForm = {
  id: 'default',
  interface: 'material',
  title: 'User Registration',
  tags: ['registration', 'user account'],
  schema: {
    title: 'User Registration',
    description: 'User Registration Form',
    type: 'object',
    required: [
      'firstName',
      'lastName',
    ],
    properties: {
      firstName: {
        type: 'string',
        title: 'First name',
      },
      lastName: {
        type: 'string',
        title: 'Last name',
      },
      age: {
        type: 'integer',
        title: 'Age',
      },
      bio: {
        type: 'string',
        title: 'Bio',
      },
      password: {
        type: 'string',
        title: 'Password',
        minLength: 3,
      },
      telephone: {
        type: 'string',
        title: 'Telephone',
        minLength: 10,
      },
    },
  },
  uiSchema: {
    firstName: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
    age: {
      'ui:widget': 'updown',
      'ui:title': 'Age of person',
      'ui:description': '(earthian year)',
    },
    bio: {
      'ui:widget': 'textarea',
    },
    password: {
      'ui:widget': 'password',
      'ui:help': 'Hint: Make it strong!',
    },
    date: {
      'ui:widget': 'alt-datetime',
    },
    telephone: {
      'ui:options': {
        inputType: 'tel',
      },
    },
  },
  layout: {

  },
};

const arrayForm = {
  id: 'array',
  interface: 'material',
  title: 'An array testing form',
  tags: ['registration', 'user account'],
  schema: {
    definitions: {
      Thing: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            default: 'Default name',
          },
        },
      },
    },
    type: 'object',
    properties: {
      listOfStrings: {
        type: 'array',
        title: 'A list of strings',
        items: {
          type: 'string',
          default: 'bazinga',
        },
      },
      multipleChoicesList: {
        type: 'array',
        title: 'A multiple choices list',
        items: {
          type: 'string',
          enum: [
            'foo',
            'bar',
            'fuzz',
            'qux',
          ],
        },
        uniqueItems: true,
      },
      fixedItemsList: {
        type: 'array',
        title: 'A list of fixed items',
        items: [
          {
            title: 'A string value',
            type: 'string',
            default: 'lorem ipsum',
          },
          {
            title: 'a boolean value',
            type: 'boolean',
          },
        ],
        additionalItems: {
          title: 'Additional item',
          type: 'number',
        },
      },
      minItemsList: {
        type: 'array',
        title: 'A list with a minimal number of items',
        minItems: 3,
        items: {
          $ref: '#/definitions/Thing',
        },
      },
      defaultsAndMinItems: {
        type: 'array',
        title: 'List and item level defaults',
        minItems: 5,
        default: [
          'carp',
          'trout',
          'bream',
        ],
        items: {
          type: 'string',
          default: 'unidentified',
        },
      },
      nestedList: {
        type: 'array',
        title: 'Nested list',
        items: {
          type: 'array',
          title: 'Inner list',
          items: {
            type: 'string',
            default: 'lorem ipsum',
          },
        },
      },
      unorderable: {
        title: 'Unorderable items',
        type: 'array',
        items: {
          type: 'string',
          default: 'lorem ipsum',
        },
      },
      unremovable: {
        title: 'Unremovable items',
        type: 'array',
        items: {
          type: 'string',
          default: 'lorem ipsum',
        },
      },
      noToolbar: {
        title: 'No add, remove and order buttons',
        type: 'array',
        items: {
          type: 'string',
          default: 'lorem ipsum',
        },
      },
      fixedNoToolbar: {
        title: 'Fixed array without buttons',
        type: 'array',
        items: [
          {
            title: 'A number',
            type: 'number',
            default: 42,
          },
          {
            title: 'A boolean',
            type: 'boolean',
            default: false,
          },
        ],
        additionalItems: {
          title: 'A string',
          type: 'string',
          default: 'lorem ipsum',
        },
      },
    },
  },
  uiSchema: {
    firstName: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
    age: {
      'ui:widget': 'updown',
      'ui:title': 'Age of person',
      'ui:description': '(earthian year)',
    },
    bio: {
      'ui:widget': 'textarea',
    },
    password: {
      'ui:widget': 'password',
      'ui:help': 'Hint: Make it strong!',
    },
    date: {
      'ui:widget': 'alt-datetime',
    },
    telephone: {
      'ui:options': {
        inputType: 'tel',
      },
    },
  },
};

const complexForm = {
  id: 'complex',
  schema: {
    title: 'Tell m',
    type: 'object',
    required: ['firstName'],
    properties: {
      image: {
        type: 'string',
      },
      user: {
        type: 'object',
        properties: {
          password: {
            type: 'string',
            title: 'Password',
          },
          username: {
            type: 'string',
          },
        },
      },
      details: {
        type: 'boolean',
      },
      lastName: {
        type: 'string',
        title: 'Last name',
      },
      bio: {
        type: 'string',
        title: 'Bio',
      },
      firstName: {
        type: 'string',
        title: 'First name',
      },
      age: {
        type: 'integer',
        title: 'Age',
      },
    },
  },
  uiSchema: 'complex',
};

export default [
  defaultForm,
  arrayForm,
  complexForm
];
