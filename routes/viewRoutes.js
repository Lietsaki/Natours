const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
//const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Since '/' (our homepage) is the route we want to hit once a credit card is successfully charged, we need to create a new booking in this
// point of time using our createBookingCheckout middleware function

router.get(
  '/',
  // bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

// // UPDATING USER NAME/EMAIL WITHOUT API
// router.post(
//   '/submit-user-data',
//   authController.protect,
//   viewsController.updateUserData
// );

module.exports = router;
