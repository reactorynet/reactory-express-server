const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendActivationEmail = (props) => {
  const msg = {
    to: props.email,
    from: 'sparkybot@woosparks.com',
    subject: 'Your activation code',
    text: `Your activation code: #ac-${props.activationCode}, copy and paste the code including the #ac- part and send it back to sparky`,
    html: `
      <div>
        <h1>WooSparks - Activation Code</h1>
        <p>Hi ${props.name}, thank you for your interest in WooSparks.</p>
        <p>Below is an activation code you will need to activate your account</p>
        <p>You can click on the link and activate your account via our application, or just copy and paste the #ac-<your code> back to me (SparkyBot)</p>
        <p>Your activation code: #ac-${props.activationCode}</p>
        <h2>Regards, Sparky Bot</h2>
      </div>
      `,
  };
  sgMail.send(msg);
};

export default {
  sendActivationEmail,
};
