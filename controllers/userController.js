const multer = require('multer');
const sharp = require('sharp'); // Node.js image processing library
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const deletePhoto = require('./../utils/deletePhoto');
const Factory = require('./handlerFactory');

// ================================================== MULTER FILE UPLOADER SETUP ========================================================== //
// Set the diskStorage for multer, we must define a function pointing where to store the files and another one specificying the name of the
// files. In both destination and filename we get access to request, the current file and a callback (cb) that works similar to 'next()'.
// To define the destination we need to call that callback, the first argument is an error if there is one, if not just use 'null', the
// second argument is the actual destination. Note: 'file' can be accessed through req.file and is an object with many properties.

// Our file name structure: user-(id)-(current timestamp).file-extension | EX: user-7a3b3v3c3d2f9l-445642564.jpeg

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // 1) Extract the file extension from the uploaded file
//     const ext = file.mimetype.split('/')[1];
//     // 2) Build the structure using cb
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

const multerStorage = multer.memoryStorage();

// Multer filter, this tests if the passed file is an image. Check for a filetype with an if statement and call cb to approve it using
// the same null for an error as the first argument and true/false to confirm if you want that type of file as the second one.
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    // Yes, mimetype shows 'image/gif' when uploading a gif, so users can have gifs as profile pic
    cb(null, true);
  } else {
    cb(
      new AppError(
        'That file is not an image! Please upload only images.',
        400
      ),
      false
    );
  }
};

// Pass in the options that we just created above to our upload multer function
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// Use the multer package to upload a file, then assign that field the name 'photo'. That can be found in req.file
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // If the user didn't upload an image, return next
  if (!req.file) return next();

  // Define the filename property on req.file with the structure of the file name
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // When doing image processing right after uploading a file, it's better to save the file to memory instead of the disk.
  // Using multer's memory storage, the file is contained in a field called buffer inside req.file, then we can chain sharp methods to resize it.
  // .resize(width, height), .toFormat(desiredFormat), .jpeg({jpeg options}), .toFile(path where we want to save the file).
  // See the docs here ---> https://sharp.pixelplumbing.com/
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

// ======================================================================================================================================== //

// FUNCTION TO FILTER PROPERTIES OUT AN OBJECT
// 'object' is the object we want to filter out properties from, and ...allowedFields are all the properties we want in the final, filtered obj.
const filterObj = (object, ...allowedFields) => {
  const newObject = {};
  // The Object.keys() method returns an array of a given object's own enumerable property names(but not its values)
  // iterated in the same order that a normal loop would.
  Object.keys(object).forEach(el => {
    // This line is a form of adding properties to objects. For example: newObject["name"] = object["name"] that'll add the name property from
    // newObject to object
    if (allowedFields.includes(el)) newObject[el] = object[el];
  });
  return newObject;
};

// Put the user id in the params to get your own user. The id will be in the req object thanks to .protect (see the "/me" route in userRoutes.js)
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// ALLOW THE USER TO UPDATE THEIR DATA (EX. NAME)
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create an error if the user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // 2) Filter out unwanted field names that aren't allowed to be updated and allow only name and email to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 2.5) If the user uploaded a photo, add it to the filteredBody object
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) If uploading a new photo, delete the old one from the server.
  if (req.file) await deletePhoto.deletePhotoFromServer(req.user.photo);

  // 4) Update user document - We need to pass the user id, the data that's going to be modified and some options to .findByIdAndUpdate
  const updatedUserData = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUserData
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false }); // Turn the user inactive but keep it in the db (in case they want to return)

  res.status(204).json({
    // 204 stands for no content / deleted
    status: 'success',
    data: null // We don't send any data back in delete operations
  });
});

exports.createUser = (req, res) => {
  // Status code 500 means internal server error
  res.status(500).json({
    status: 'error',
    message:
      'This route is not defined and never will be. Please use /signup instead :)'
  });
};

exports.getAllUsers = Factory.getAll(User);

exports.getUser = Factory.getOne(User);

exports.updateUser = Factory.updateOne(User); // Admins only - Do not update passwords with this! findOneAndUpdate doesn't run validators

exports.deleteUser = Factory.deleteOne(User);
