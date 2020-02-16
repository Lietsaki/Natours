const Tour = require('../models/tourModel');
//const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get all tour data from our collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template using the tour data

  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the tour whose slug(a defined property in our schema) matches the slug defined in the url
  // Also make sure to populate the reviews as we show this information in the tour page. We can do this
  // thanks to our virtual populate in tourModel.js
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review ratings user'
  });

  // 2) If there's not tour found, return an error
  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  // 3) Render template using the data from step 1
  res.status(200).render('tour', {
    title: tour.name,
    tour
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings - This will find all bookings with the provided user id (all the bookings of 1 single user, in other words)
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs - This loops through the bookings array and it'll grab the tour on each element
  const tourIDs = bookings.map(el => el.tour);

  // Use the $in operator to find all tours whose id's are present in tourIDs (the tour ids of our user)
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});

// // UPDATING USER NAME/EMAIL WITHOUT API
// exports.updateUserData = catchAsync(async (req, res, next) => {
//   // Passwords should NOT be updated with findByIdAndUpdate because it doesn't run the password encryption middleware
//   const updatedUser = await User.findByIdAndUpdate(
//     req.user.id,
//     {
//       name: req.body.name, // these are the names of the fields because that's the name we gave them in the HTML form with the name attribute
//       email: req.body.email
//     },
//     // Get the new data back
//     {
//       new: true,
//       runValidators: true
//     }
//   );

//   // Render the account page again but with the new user data
//   res.status(200).render('account', {
//     title: 'Your account',
//     user: updatedUser
//   });
// });
