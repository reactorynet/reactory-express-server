import uuid from 'uuid';
import messages from './messages';
import email from '../../emails';
import models from '../../models';
import { createUserForOrganization } from '../../application/admin/User';
import iz from '../../utils/validators';

const builder = require('botbuilder');
const { User, Organization } = models;

// Create chat connector for communicating with the Bot Framework Service
const botStorage = new builder.MemoryBotStorage();

const botConnector = new builder.ChatConnector({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
});

const userStore = [];

const bot = new builder.UniversalBot(botConnector).set('storage', botStorage);
bot.recognizer(new builder.RegExpRecognizer('RegisterIntent', { en_us: /^(register|signup)/i }));
bot.recognizer(new builder.RegExpRecognizer('LoginIntent', { en_us: /^(login|signin)/i }));

const isBot = (member) => {
  return member.name === 'Bot';
};

bot.dialog('/', (session) => {
  if (session.message.text === 'register') session.beginDialog('register');
  if (session.message.text === 'login') session.beginDialog('login');
  else session.endDialog('type register');
});

bot.dialog('login', [
  (session) => {
    builder.Prompts.text(session, 'Please provide your email');
  },
  (session, results) => {
    if (iz.email(results.response)) {
      User.findOne({ email: results.response }).then((user) => {        
        if (iz.nil(user) === false) {
          // eslint-disable-next-line
          session.dialogData.userAccount = user;
          builder.Prompts.text(session, 'Please provide your password');
        } else {
          session.send('Your account could not be located');
          session.endDialog();
        }
      });
    } else {
      bot.beginDialog('login');
    }
  },
  (session, results) => {
    if (results.response) {
      const user = new User({ user });
      console.log('Password received, matching', user);
      if (user.validatePassword(results.response) === true) {
        session.send('Login successful');
        session.endDialog();
      }
    }
  },
]).triggerAction({ matches: 'LoginIntent' });

bot.dialog('register', [
  (session) => {
    builder.Prompts.text(session, messages.registrationConfirm());
  },
  (session, results) => {
    session.dialogData.registerConfirmed = results.response === 'yes';
    if (session.dialogData.registerConfirmed === true) {
      session.beginDialog('collectPersonal');
    } else {
      session.endDialog('If you change you mind, I will be here.');
    }
  },
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
      if (iz.email(results.response)) {
        session.dialogData.profile.email = results.response; // eslint-disable-line
        User.findOne({ email: results.response }).then((user) => {
          if (user !== null) {
            session.send('It seems you are already registered');
            session.endDialog();
          }
          if (!session.dialogData.profile.company) {
            builder.Prompts.text(session, 'What company do you work for?');
          } else {
            next(); // Skip if we already have this info.
          }
        });
      }
    }
  },
  (session, results) => {
    if (results.response) {
      session.dialogData.profile.company = results.response; // eslint-disable-line      
    }

    Organization.findOne({ name: results.response.trim() }).then((organization) => {
      if (iz.nil(organization)) {
        new Organization({
          name: results.response,
          code: 'NA',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).save().then((org) => {
          const password = 'password123';
          const user = {
            firstName: session.dialogData.profile.name,
            email: session.dialogData.profile.email,
          };

          createUserForOrganization(user, password, org, { sendRegistrationEmail: false, clientId: 'woosparks' }).then((createResults) => {
            const userRegistration = {
              name: createResults.user.firstName,
              email: createResults.user.email,
              company: createResults.organization.name,
              activationCode: uuid(),
            };

            email.sendActivationEmail(userRegistration);

            session.send(`I've sent you an email to ${session.dialogData.profile.email} with an authorization code to make sure you own the email address, once you activate the link I will be notified and we can start collecting ideas!`);    
            session.endDialogWithResult({ response: createResults });
          }).catch((createError) => {
            session.send('An error occured while creating your account');
            session.endDialogWithResult({ response: createError });
          });          
        });
      }
    });
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
