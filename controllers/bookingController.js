const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Pass our secret key directly into the function returned by stripe
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const Factory = require('./handlerFactory');
//const AppError = require('../utils/appError');

// NOTE ABOUT THE SUCCESS URL: It will contain the data we need to create a new booking with our bookingModel, that is, the tour Id, user id
// and the tour price. Of course, that's not secure because anyone who knows this url structure could technically create a booking without
// paying, but for now it is a good workaround since we'll use stripe hooks for that later.

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour from the params - Reminder: This is our route for this function ---> '/checkout-session/:tourID'
  const tour = await Tour.findById(req.params.tourID);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],

    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
    //   req.params.tourID
    // }&user=${req.user.id}&price=${tour.price}`,

    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,

    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email, // user is already inside request because this is a protected route
    client_reference_id: req.params.tourID,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`
        ],
        amount: tour.price * 100, // Multiply the price by 100 to convert it to cents
        currency: 'usd',
        quantity: 1
      }
    ]
  });

  // 3) Create session as response (send it to the client)
  res.status(200).json({
    status: 'success',
    session
  });
});

// // This version of the function is only TEMPORARY
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // Tour, user and price are available at req.query, that is, req.query.tour/user/price, so we can use destructoring to create the 3 variables
//   // at the same time
//   const { tour, user, price } = req.query;

//   if (!tour && !user && !price) return next();
//   // Create a new booking but don't store it in a variable cuz we're not going to send it back to the user (at this point)
//   await Booking.create({ tour, user, price });

//   // Redirect the user to the url without the query string to make it a bit more secure by splitting the url by the question mark (that's where
//   // the query string starts)
//   // Note: req.originalUrl is the entire url from which the request came
//   res.redirect(req.originalUrl.split('?')[0]);

//   // IMPORTANT NOTE: When we use this function (once we click 'Book Tour Now'), we'll create the booking and then we'll be sent to '/' which
//   // will run this function again (check the middleware stack for '/' in viewRoutes.js but this time without the other part of the query
//   // string, which will make us return next() thanks to our if statement up there. We'll finally end up in viewsController.getOverview, simply
//   // rendering the homepage). This way, the query string is never exposed to the public.
// });

const createBookingCheckout = async session => {
  const tour = session.client_reference_id; // We defined this as req.params.tourId in getCheckoutSession() up there.
  const user = (await User.findOne({ email: session.customer_email })).id; // Query for the user using its email and extract its id
  const price = session.display_items[0].amount / 100;

  await Booking.create({ tour, user, price });
};

// Stripe webhook that runs once a payment is successful. It receives req.body, the signature headers set by stripe and our webhook secret
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Create a booking with the 'session' (it is at checkout.session.complete)
  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = Factory.createOne(Booking);
exports.getBooking = Factory.getOne(Booking);
exports.getAllBookings = Factory.getAll(Booking);
exports.deleteBooking = Factory.updateOne(Booking);
exports.updateBooking = Factory.deleteOne(Booking);
