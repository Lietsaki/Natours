const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Handle uncaught exceptions. They're errors in synchronous code
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION | shutting down...');
  console.log(
    'Here is the error of the uncaught exception:',
    err.name,
    err.message,
    err
  );

  // In uncaught exceptions, the server must be shut down mandatorily, so we don't need to use server.close
  process.exit(1);
});

dotenv.config({ path: './config.env' }); // The environment variables should be read before app.js
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'));
// Mongoose.connect returns a promise, we're consuming it with .then | Also, there we have access to the con object, but it's not necessary
// use it so we can just use a fuction "()" to log that connection successful message

console.log('process.env is:', process.env.NODE_ENV);

const port = process.env.PORT || 3000;
// If we don't specify the IP, the default one for app.listen is localhost, that is, 127.0.0.1
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`App running on port ${port}...`);
});

// ======================================================= UNHANDLED PROMISE REJECTION ================================================= //
// Every time that there's an unhandled rejection in our code, the process object will emit an object called unhandled rejection
// We can "subscribe" to that event just like this:

// Note: 'unhandledRejection' allows us to handle all events that occur in ASYNCHRONOUS code
// emitter.on is a nodejs method that adds a function for events. The first argument is the string name of the event, the second
// one is the function we want to run if that event is fired
process.on('unhandledRejection', err => {
  console.log(
    'Here is the error name and message of the unhandled promise rejection:',
    err.name,
    err.message
  );
  console.log(
    'And hehre is the full error of the unhandled promise rejection:',
    err
  );
  console.log('Unhandled rejection D: | Shutting down...');

  // Instead of just using process.exit, we close the server gracefully using server.close and process.exit inside it
  server.close(() => {
    // Shut down the app - 1 means uncaught exception, 0 means success.
    process.exit(1);
  });
});
