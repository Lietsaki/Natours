/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// Function to redirect to home | Location is a Web API just like Document, .assign takes us to the specified URL.
const homeRedirect = time => {
  window.setTimeout(() => {
    location.assign('/');
  }, time);
};

// Note: Since we're using the same url for the API and the website, we can skip the host in the 'url' property of our axios call,
// using a relative path ('/api/v1/users/login'). However, we need to specify the full url when we're in development, for example:
// 'http://127.0.0.1:3000/api/v1/users/login' ----> This is what we'd put in development
export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password
      }
    });
    // Redirect to the homepage after 1.5 seconds
    if (res.data.status === 'Success!') {
      showAlert('success', 'Logged in successfully! Redirecting...');
      homeRedirect(1500);
    }
  } catch (err) {
    // Get the error | (err.response.data) comes from axios
    showAlert('error', err.response.data.message);
  }
};

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm
      }
    });
    // Redirect to the homepage after 1.5 seconds
    if (res.data.status === 'Success!') {
      showAlert('success', 'Signed up successfully! Redirecting...');
      homeRedirect(1500);
    }
  } catch (err) {
    // Get the error | (err.response.data) comes from axios
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    });
    // // Reload the page from the server and not browser cache passing in true as an argument to reload after logging out.
    // if ((res.data.status = 'success')) location.reload(true);

    // Instead of reloading the page, redirect the user to the homepage
    // The if statement below this can also be expressed in one line: if ((res.data.status = 'success')) location.assign('/');
    if (res.data.status === 'success') {
      location.assign('/');
    }
  } catch (err) {
    console.log(err.response);
    showAlert('error', 'Error logging out, try again!');
  }
};
