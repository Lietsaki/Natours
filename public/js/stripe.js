/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
var stripe = Stripe('pk_test_XG3QTTyEcOUxNoRULnhQIvZb');

export const bookTour = async tourID => {
  try {
    // 1) Get the checkout-session from our API endpoint. To do a simple GET request with axios, simply pass in the URL
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourID}`
    );
    // session returns an object with details about the purchase. We can find the session id in session.data.session.id
    console.log(session);

    // 2) Create the checkout form + charge the credit card for us. (.redirectToCheckout comes from the stripe library)
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
