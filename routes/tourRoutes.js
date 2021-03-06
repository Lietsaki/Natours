const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// NOTE ABOUT NESTED GET REVIEWS
// Basically, when the route matches "/api/v1/tours", it'll be sent here (as specificed in app.js) and if it then matches
// "/api/v1/tours/:tourId/reviews", we're redirecting it to the review router using .use, that's why they're called 'Nested Routes'
// Example: POST or GET /tours/id34343/review
router.use('/:tourId/reviews', reviewRouter);

// GET THE TOP 5 BEST CHEAPEST TOURS
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

// GET TOUR STATS
router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

// GET TOURS WHOSE STARTING POINT IS WITHIN X DISTANCE
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

// URL example: /tours-distance/233/center/-40,45/unit/mi

// GET TOURS IN ORDER OF NEAREST TO FARTHEST FROM A SPECIFIED POINT + THE DISTANCE BETWEEN THEM AND THAT SPECIFIED POINT ($geoNear)
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// COMMON TOUR ROUTES
router
  .route('/') // This would mean "/api/v1/tours/", notice how we only add one "/" to the original route in our app.use for router
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id') // This would mean "/api/v1/tours/:id"
  .get(tourController.getTour) // NOTE: Reviews are displayed ONLY when we get an individual tour and not when we get all of them
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
