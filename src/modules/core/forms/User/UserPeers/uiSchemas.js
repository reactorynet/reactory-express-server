const DefaultUISchema = {
  id: {
    'ui:widget': 'HiddenWidget',
  },
  organization: {
    id: {
      'ui:widget': 'LogoWidget',
    },
  },
  user: {
    id: {
      'ui:widget': 'UserListItemWidget',
      'ui:options': {
        widget: 'UserListItemWidget',
      },
    },
  },
  peers: {
    items: {
      'ui:widget': 'UserPeersWidget',
    },
  },
};

const DetailUISchema = {
  id: {
    'ui:widget': 'HiddenWidget',
  },
};

export default {
  DefaultUISchema,
  DetailUISchema,
};
