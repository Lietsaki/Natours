/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password
      }
    });
    // Redirect to the homepage after 1.5 seconds | Location is a Web API just like Document, .assign takes us to the specified URL.
    if (res.data.status === 'Success!') {
      showAlert('success', 'Logged in successfully! Redirecting...');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
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
      url: 'http://127.0.0.1:3000/api/v1/users/logout'
    });
    // Reload the page from the server and not browser cache passing in true as an argument to reload after logging out
    if ((res.data.status = 'success')) location.reload(true);
  } catch (err) {
    //console.log(err.response);
    showAlert('error', 'Error logging out, try again!');
  }
};
