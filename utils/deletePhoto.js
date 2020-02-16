const fs = require('fs');
const AppError = require('./appError');

exports.deletePhotoFromServer = async photo => {
  if (photo.startsWith('default')) return;

  const path = `${__dirname}/../public/img/users/${photo}`;
  await fs.unlink(path, err => {
    // The most common error in this case is that the previous photo was already deleted so this function can't find it on the server to delete it.
    if (err) return new AppError(err, 400);
    console.log('Previous photo has been deleted');
  });
};
