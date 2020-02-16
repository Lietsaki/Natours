// Create a sulass for operational errors (invalid path, failed to connect to server, etc)
// This class is a children of the Error class, a Javascript class (not from node or mongo) that allows us to create errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Super contains the properties we're grabbing from the superclass, in this case Error

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // if the status code starts with 4 (400), it'll be 'fail'. Otherwise 'error'.
    this.isOperational = true;

    // Creates a .stack property on targetObject, which when accessed returns a string representing the location in the code at which Error.captureStackTrace() was called.
    // This tells us in what line the error happened
    Error.captureStackTrace(this, this.constructor);
  }
}
// Note: So, in order to create an AppError instance, you must pass a message and a statusCode as arguments
module.exports = AppError;
