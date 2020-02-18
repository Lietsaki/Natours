/* eslint-disable */
import 'core-js/stable'; //  Polyfill to emulate a full ES2015+ environment
import 'regenerator-runtime/runtime'; // Polyfill to emulate a full ES2015+ environment
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { showAlert } from './alerts';
import { bookTour } from './stripe';

// ==================================================== DOM ELEMENTS ==================================================================== //

// Mapbox Map (we're selecting the div with the 'map' id)
const mapBox = document.getElementById('map');
// Login Form
const loginForm = document.querySelector('.form--login');
// Logout button
const logoutButton = document.querySelector('.nav__el--logout');
// Update my email/name form
const userDataForm = document.querySelector('.form-user-data');
// Password form
const userPasswordForm = document.querySelector('.form-user-password');
// Button to book a tour in the tour page
const bookBtn = document.getElementById('book-tour');

// Display the map if the page has a div with the 'map' id
if (mapBox) {
  //- Call our locations dataset from tour.pug by using .dataset + our assigned dataset name and convert it back to JSON
  const locations = JSON.parse(mapBox.dataset.locations);

  displayMap(locations);
}

// Perform login - Note that we can only get email and password in our "submit" event listener because the values
// have not been typed in before the user hits the submit button. Trying to get email/pass before the submit event would result in blank fields.
if (loginForm) {
  loginForm.addEventListener('submit', event => {
    // preventDefault() method cancels the event if it is cancelable. In this case, the form won't submit when clicking on a submit button.
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logoutButton) logoutButton.addEventListener('click', logout);

if (userDataForm)
  userDataForm.addEventListener('submit', event => {
    event.preventDefault();
    // NOTE: The names of the 3 consts below must be the same as what our API expects in the /updateMe route

    // Use the FormData web API to build a form. It uses the same format of a form with the encoding type "multipart/form-data"
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    // Our AJAX call with axios will recognize this 'form' as an object and work just as before
    updateSettings(form, 'data');

    const file = document.getElementById('photo').files[0];
    const reader = new FileReader();

    reader.onload = e => {
      document.getElementById('image_id').src = e.target.result;
    };

    reader.readAsDataURL(file);
  });

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async event => {
    event.preventDefault();
    // Set the "Save password" button to "Updating..." while this function finishes its execution
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    // Select the three password inputs: Current password, new password and new password confirm
    // NOTE: The names of the 3 consts below must be the same as what our API expects in the /updateMyPassword route
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    // Await the password update to clear the input fields after the function finishes updating the password
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    // Change the "Updating..." to "Save password" after the function has finished its work
    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });

if (bookBtn)
  bookBtn.addEventListener('click', event => {
    event.target.textContent = 'Processing...';
    // Note: event.target returns the element on which the event was fired. In this case, it'll be the 'Book tour now!' button
    // Note 2: Since event.target.dataset has the same name of our variabe, we can define it with destructoring.
    // GET THE TOUR ID FROM THE BUTTON AND CALL OUR bookTour function passing it in. (We put the tour id in the button in tour.pug)
    const { tourId } = event.target.dataset;
    bookTour(tourId);
  });

// DISPLAY THE SUCCESS ALERT WHEN SOMEONE BOOKS A TOUR.
// 1) Get the alert message from the data-alert attribute from base.pug
const alertMessage = document.querySelector('body').dataset.alert;

// 2) If there's an alert, display the alert using our showAlert function
if (alertMessage) showAlert('success', alertMessage, 20);
