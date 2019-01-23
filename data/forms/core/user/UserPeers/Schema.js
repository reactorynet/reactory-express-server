import {
  DateProperty,
  DateTimeProperty,
  StringProperty,
} from '../../../defs';
import { UserProperties } from '../Schema';
import Organization from '../../organization/Organization';

export default {
  title: 'Colleagues',
  description: 'In order to measure your participation in the business, you need to have some work colleagues nominated that the system will use as a pool of assessors to give constructive and considered feedback. These should include someone you report to, someone that reports to you and several peers or colleagues. For best results you should have about seven to eight nominees in total. Keep in mind that some people may decline your nomination, so it is better to nominate more than less.',
  type: 'object',
  required: [
    'user',
    'organization',
    'allowEdit',
    'peers',
  ],
  properties: {
    id: {
      type: 'string',
      title: 'id',
    },
    user: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          title: 'id',
        },
      },
    },
    organization: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          title: 'id',
        },
        logo: {
          type: 'string',
        },
      },
    },
    allowEdit: {
      type: 'boolean',
      title: 'Allow Editing of Colleagues',
    },
    lastConfirm: DateProperty('Last Confirm Date', 'The last time the peers were confirmed by the user'),
    peers: {
      defaultValue: [],
      type: 'array',
      title: 'Selected Colleagues',
      items: {
        type: 'object',
        properties: {
          user: { ...UserProperties },
          relationShip: {
            type: 'string',
            title: 'Relationship',
            enum: [
              'peer', 'manager', 'report', 'vendor', 'client', 'partner',
            ],
          },
          isInternal: {
            type: 'boolean',
            title: 'Internal (Company)',
          },
          inviteSent: {
            type: 'boolean',
            title: 'Invite Sent',
            description: 'Indicates whether or not an invite has been sent',
          },
          confirmed: {
            type: 'boolean',
            title: 'Confirmed by peer',
            description: 'Has the invite been confirmed',
          },
        },
      },
    },
  },
};
