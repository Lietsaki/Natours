const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

// new Email(user, url).sendWelcome();

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Jonas Schmedtmann <${process.env.EMAIL_FROM}>`;
  }
  // NOTE: The 'url' parameter is a link we want to put in our email, for example, as a CTA. We pass in as an argument to use it as a variable
  // in our pug templates.

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Use Sendgrid if we're in production
      return nodemailer.createTransport({
        // Sendgrid is a well known service in node mailer, so we can just define it in 'service' and it's not necessary to define host and port.
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }
    // If we're in development, use mailtrap
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env_EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template (save the template as a variable instead of directly rendering it)
    // Note: Remember that dirname is the location of the currently running script, in this case it's the utils folder
    // Note 2: ${template} refers to the template argument of this function.
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      // Define some variables that our pug templates will have access to
      {
        firstName: this.firstName,
        url: this.url,
        subject
      }
    );

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to, // The email adress we want to send this email to is specified in the options argument of this function
      subject,
      html,
      text: htmlToText.fromString(html)
    };

    // 3) Create a transport and send the email with .sendMail, a nodemailer method that must be chained to the transporter
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    // Use 'welcome' as the template and 'Welcome to the Natours family' as the subject.
    await this.send('welcome', 'Welcome to the Natours family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Reset your password - Valid for only 10 minutes'
    );
  }
};
