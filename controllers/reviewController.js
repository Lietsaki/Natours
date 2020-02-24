const Review = require('./../models/reviewModel');
const Factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

// ALLOW NESTED ROUTES | Automatically put the current tour and user id in the review body
exports.setTourAndUserIds = (req, res, next) => {
  // 1) Get the id of the tour from the url (if it wasn't specified in the body)
  if (!req.body.tour) req.body.tour = req.params.tourId; // tourId is specified in tourRoutes.js as a parameter in the url

  // 2) Get the user id from protect(), a middleware function coming from authController.js that runs before .createReview in reviewRoutes.js
  req.body.user = req.user.id;
  next();
};

// Only allow authors to update and delete their reviews
exports.checkIfAuthor = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  // Allow admins to edit any review
  if (req.user.role !== 'admin') {
    if (review.user.id !== req.user.id)
      return next(
        new AppError(`You cannot edit or delete someone's else review.`, 403)
      );
  }
  next();
};

exports.getAllReviews = Factory.getAll(Review);
exports.getReview = Factory.getOne(Review);
exports.createReview = Factory.createOne(Review);
exports.updateReview = Factory.updateOne(Review);
exports.deleteReview = Factory.deleteOne(Review);
