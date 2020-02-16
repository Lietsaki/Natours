/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// Function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// This will make a POST request to our API (the /updateMe and /updateMyPassword routes were previously created)
// 'data' is an object with all the data we want to update. type is either 'password' or 'data'

// EXAMPLE ON HOW TO CALL THIS FUNCTION: updateSettings({ name, email }, 'data');
export const updateSettings = async (data, type) => {
  try {
    // Use one url or another to change the password or the user data (name/email)
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';

    const res = await axios({
      method: 'PATCH',
      url,
      data
    });
    //console.log(res.data);
    if (res.data.status === 'success' || 'Success!') {
      showAlert(
        'success',
        `${capitalizeFirstLetter(type)} updated successfully!`
      );
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
    //console.log(err.response);
  }
};
