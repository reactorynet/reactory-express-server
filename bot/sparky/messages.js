const messages = {
  welcome: (props = { anon: true, name: '' }) => {
    return props.anon ? 'Welcome to WooSparks, my name is Sparky. Would you like to register or login?' : `Welcome back ${props.name}. What would you like to do?`;
  },
  registrationConfirm: () => {
    return 'Would you like to register with WooSpark? (yes / no)';
  },
  knowMore: () => {
    return 'For more information about our services and offering please go to http://www.woosparks.com/faq'
  },
};

export default messages;
