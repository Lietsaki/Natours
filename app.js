const path = require('path'); // Node module to manipulate path names
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit'); // Package to prevent multiple requests from a single IP
const helmet = require('helmet'); // Package to secure the http headers
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

// Start express app
const app = express();

// Trust proxies (For heroku)
app.enable('trust proxy');

// ========================================================= PUG SETUP =================================================================== //
// Tell Express which template engine we're gonna use - Express automatically supports the most common ones, including pug.
app.set('view engine', 'pug');

// Define where these views are located in our file system - The templates are called "views" in Express (because they're the
// view in the MVC architecture)
// This will create a path with the CURRENT directory name + /views. That's because this path is relative from where we launch the node app,
// it's usually the root folder but that's not always the case, path.join also makes sure to put a "/" before views which prevents some bugs.
app.set('views', path.join(__dirname, 'views'));

// ========================================================== GLOBAL MIDDLEWARES ======================================================= //

// Set security HTTP headers
app.use(helmet());

// Implement CORS (Allow requests to our API from any domain and in any route[tours, users, reviews, bookings])
// This will allow simple requests (GET and POST) from any domain and in any route.
app.use(cors());

// ALLOW non-simple requests from other domains: Respond to the options request ('options' is an HTTP method) made by the browser
// in the preflight phase (when another domain wants to make a non-simple request). Use '*' to allow access in all our routes.
app.options('*', cors());

// Serve static files from the the public folder, including css files, images, etc. We'll be able to access them without
// writing the "/public" part tho, just like this "http://127.0.0.1:3000/tour.html", because Express makes that selected
// folder kind of the root. We're also able to access the contents of other folders, like this "http://127.0.0.1:3000/img/pin.png"
app.use(express.static(path.join(__dirname, 'public')));

// Set a limit of 100 connections from the same IP in one hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP! Please try again later!'
  // Note: The info about how many requests have been made and how many you have left are stored in the response headers.
});
// Apply the middleware limiter function to all the routes startes with '/api'.
app.use('/api', limiter);

// STRIPE WEBHOOK ROUTE FOR CHECKOUT SESSION COMPLETED
// Why do we define this here instead in the bookingRouter? It's because in this handler funcion when we receive the body the stripe
// function that we're then gonna use to read the body needs it in a raw form (as a string, and NOT in json).
// So in this route 'webhook-checkout', we need the body coming with the request(req.body) in a raw form and not in json,
// That's why this app.post is before the body parser, because otherwise it'd be converted into json. USE express.raw
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Morgan middleware to see the route we accessed in our terminal when we're in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// NOTE: We can access to this variable without defining it in this file because the process object only needs to be read once and then it's
// available globally, in this case, we're reading it in server.js with our config.env file

// Body parser - Add the data from the body to the request object.
app.use(
  express.json({
    limit: '10kb' // The body shouldn't be larger than 10kb
  })
);

// Parse data from an url encoded form (when the user updates their name/email) using an express built in middleware
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser - Add our cookies to the request object (req.cookies)
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution - This will remove the duplicated parameters, for example:
// sort=duration&sort=price - It would only sort by the last passed in element, in this case, price.
app.use(
  hpp({
    whitelist: [
      // An array of properties for which we actually allow duplicates in the query string
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Compression middleware for text responses (like json and html)
app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies)
  next();
});

// Note: If we don't specify next, the response would never be sent and the request would time out.

// ======================================================= ROUTES ====================================================================== //

// PUG ROUTES - see viewRoutes.js
app.use('/', viewRouter);

// API ROUTES | These next 2 lines are caled "mounting the router"
app.use('/api/v1/tours', tourRouter); // Since the very fist moment this route is requested, it's sent to tourRoutes.js
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// ====================================================== ERROR HANDLING ================================================================ //

// Handle all routes with no response (404)
// This is the last part of our middleware because it would only run if the route didn't match our defined routes above
// Putting it before our defined routes would return this 404 error for absolutely EVERYTHING

app.all('*', (req, res, next) => {
  // Whatever we pass into next, express will assume it's an error. Then express will skip all the following middleware and pass the error
  // to our error handling middleware

  // Call our AppError constructor to create a new error! [Note: the function can be found on utils/appError.js]
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
