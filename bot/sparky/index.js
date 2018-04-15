import uuid from 'uuid';
import messages from './messages';
import email from '../../email';

const builder = require('botbuilder');

// Create chat connector for communicating with the Bot Framework Service
const botStorage = new builder.MemoryBotStorage();

const botConnector = new builder.ChatConnector({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
});

const userStore = [];

const bot = new builder.UniversalBot(botConnector).set('storage', botStorage);
bot.recognizer(new builder.RegExpRecognizer('RegisterIntent', { en_us: /^(register|signup)/i }));

const isBot = (member) => {
  return member.name === 'Bot';
};

bot.dialog('/', (session) => {
  if (session.message.text === 'register') session.beginDialog('register');
  else session.endDialog('type register')
});

bot.dialog('register', [
  (session) => {    
    builder.Prompts.text(session, messages.registrationConfirm())
  },
  (session, results) => {
    session.dialogData.registerConfirmed = results.response === 'yes';
    if (session.dialogData.registerConfirmed === true) {
      session.beginDialog('collectPersonal');
    } else {
      session.endDialog('If you change you mind, I will be here.')
    }
  }
]).triggerAction({ matches: 'RegisterIntent' });

bot.dialog('collectPersonal', [
  (session, args, next) => {
    session.dialogData.profile = args || {}; // eslint-disable-line 
    if (!session.dialogData.profile.name) {
      builder.Prompts.text(session, 'What may I call you?');
    } else {
      next(); // Skip if we already have this info.
    }
  },
  (session, results, next) => {    
    if (results.response) {
      // Save user's name if we asked for it.
      session.dialogData.profile.name = results.response; // eslint-disable-line
      session.send(`Thank you ${session.dialogData.profile.name}, a few more questions and we'll be ready.`);
    }

    if (!session.dialogData.profile.email) {
      builder.Prompts.text(session, 'What is your email address?');
    } else {
      next();
    }
  },
  (session, results, next) => {
    if (results.response) {
      session.dialogData.profile.email = results.response; // eslint-disable-line      
    }
    if (!session.dialogData.profile.company) {
      builder.Prompts.text(session, 'What company do you work for?');
    } else {
      next(); // Skip if we already have this info.
    }
  },
  (session, results) => {      
    if (results.response) {
      session.dialogData.profile.company = results.response; // eslint-disable-line      
    }

    const userRegistration = {
      name: session.dialogData.profile.name,
      email: session.dialogData.profile.email,
      company: session.dialogData.profile.company,
      activationCode: uuid(),
    };

    email.sendActivationEmail(userRegistration);
    session.send(`I've sent you an email to ${session.dialogData.profile.email} with an authorization code to make sure you own the email address, once you activate the link I will be notified and we can start collecting ideas!`);    
    session.endDialogWithResult({ response: session.dialogData.profile });
  },
]);

// Every 5 seconds, check for new registered users and start a new dialog
const greetNewUser = (message) => {
  console.log('greetIfNewUser()', message);
  message.membersAdded.map((member) => {
    if (!isBot(member)) {
      const reply = new builder.Message()
        .address(message.address)
        .text(messages.welcome());
      bot.send(reply);
    }
    return member;
  });
};

bot.on('conversationUpdate', (message) => {
  if (message.membersAdded && message.membersAdded.length > 0) {
    greetNewUser(message);
  } else if (message.membersRemoved) {
    // See if bot was removed
    const botId = message.address.bot.id;
    for (let i = 0; i < message.membersRemoved.length; i++) {
      if (message.membersRemoved[i].id === botId) {
        // Say goodbye
        const reply = new builder.Message()
          .address(message.address)
          .text('Goodbye');
        bot.send(reply);
        break;
      }
    }
  }
});

console.log('Bot started');

export default botConnector;
