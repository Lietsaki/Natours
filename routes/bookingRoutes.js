const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Protect all these routes (only logged in users can access them, and basically only logged in users can buy tours [no guests])
router.use(authController.protect);

// STRIPE CHECKOUT SESSION ROUTE
router.get('/checkout-session/:tourID', bookingController.getCheckoutSession);

// Only allow admins and lead-guides to access and modify bookings (so that other users can't modify other user's bookings)
router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
