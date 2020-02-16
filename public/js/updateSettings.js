/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Make a POST request to our API (the /updateMe route was previously created)
// 'data' is an object of all the data we want to update. type is either 'password' or 'data'
// EXAMPLE ON HOW TO CALL THIS FUNCTION: updateSettings({ name, email }, 'data');
export const updateSettings = async (data, type) => {
  try {
    // Use one url or another to change the password or the user data (name/email)
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe';

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
