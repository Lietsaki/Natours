const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

// ROUTES THAT SEND US HERE:
// 1) /api/v1/reviews as set up in app.js
// 2) /:tourId/reviews as set up in tourRoutes.js

// By setting mergeParams to true, we can preserve the req.params values from the parent router and enable a successful nested route.
// POST /tours/id34343/review ---> "mergeParams: true" gives us access to the id of the tour coming from the parent param.
const router = express.Router({ mergeParams: true });

// PROTECT ALL THE ROUTES FROM THIS POINT
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourAndUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.checkIfAuthor,
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.checkIfAuthor,
    reviewController.deleteReview
  );

module.exports = router;
