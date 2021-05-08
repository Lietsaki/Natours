const AppError = require('./../utils/appError');

// =========================================== FUNCTIONS TO CREATE APPERROR()'S ============================================== //

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

// Handle errors for duplicate fields that are meant to be unique, for example, creating a new tour with the name of an already existing tour.
// In this type of error, we get an errmsg property containing the duplicate field between quotes, so we can use a regular expression to
// match all the text between quotes and use [0] to make sure we only get the name of the duplicate property
const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];

  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token, please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired! Please log in again', 401);

// ==================================================== SEND ERROR TO DEV OR PRODUCTION MODE ======================================= //

const sendErrorDev = (req, res, err) => {
  // Render the error if the route starts with '/api'
  if (req.originalUrl.startsWith('/api')) {
    // Note how 'return' stops the function execution, so the code that renders a page for the error would never run in this case.
    // This works like an else statement, because if we enter this if block, the code below would never execute and vice versa.
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Otherwise render an error page (user friendly). Note that since this function only runs in development mode, we do send the err.message
  // instead of a generic one, like we do down there in the production function.
  console.error('ERROR💥: ', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (req, res, err) => {
  // A) API in Production
  if (req.originalUrl.startsWith('/api')) {
    // A.1) Operational, trusted error: send the error message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // A.2) Programming or other unknown error: don't leak the details to the client. Send generic message + log the error
    console.error('ERROR💥: ', err);
    return res.status(500).json({
      status: 'Error',
      message: 'Something went wrong!'
    });
  }
  // B) Rendered Website in Production
  // B.1) Operational error: send the message to the user, but because we know it's operational
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  // B.2) Programming or other unknown error: don't leak the details to the client. Send generic message + log the error
  console.error('ERROR💥: ', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later'
  });
};

// ========================================================== EXPORTED FUNCTION =========================================================== //

// This function receives the error coming from appError.js
module.exports = (err, req, res, next) => {
  // Define a default status code (500) which means internal server error. This will happen only if err.statusCode isn't defined
  err.statusCode = err.statusCode || 500;

  // Define a default status. 'error' means 500 status code and 400 is a fail.
  err.status = err.status || 'error';

  // Send different errors depending on the production mode: development or production
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(req, res, err);
  } else if (process.env.NODE_ENV === 'production') {
    // Create a hard copy of the error
    let error = Object.create(err);

    // SEND APPROPIATE RESPONSES FOR 3 COMMON ERRORS
    // 1) Cast error is the name of the error caused by an incorrect id, eg. "tours/dfsdafadsfsdf"
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    // 2) 11000 is the 'code' property that we get when have a duplicate property
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    // 3) Update a tour with invalid data. eg. "difficulty": "whatever". Note: The third and second errors are mongoose errors.
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(req, res, error);
  }
};
