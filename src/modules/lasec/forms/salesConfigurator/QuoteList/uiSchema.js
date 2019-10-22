export default {
  'ui:widget': 'MaterialListWidget',
  'ui:options': {
    primaryText: '${item.companyTradingName} - ${item.customerName}',
    secondaryText: '${props.api.utils.moment(item.created).format(\'YYYY-MM-DD HH:mm:ss\')}',
    showAvatar: false,
    icon: 'history'
  }
};
