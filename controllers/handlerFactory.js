const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const deletePhoto = require('./../utils/deletePhoto');

// This function will return everything contained in the catchAsync function because arrow functions
// return their content without setting return explicitly
exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    // findByIdAndDelete doesn't return anything, so we don't need to store it in a variable
    // HOWEVER, we need that variable in order to create our 404 error in case the element to delete is not found, so we use it anyways.

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      // 204 is one of the three response codes for deleted. The other two are 200 and 202
      // A 204 (No Content) status code if the action has been enacted and no further information is to be supplied.
      status: 'success',
      data: null // Since findByIdAndDelete doesn't return anything, we can just return null here
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    // IF 'MODEL' IS 'USER', UPDATE THE USER'S IMAGE AND MAKE SURE TO DELETE THE OLD ONE.
    // If the model is not user, there's no need to update the image since the tour model has its own controller function for that.
    // Note that this function allows admins to update an user's data using the API (in Postman, for instance) as users can
    // update their own data when they're logged in.
    const filteredBody = req.body;
    const targetUser = await Model.findById(req.params.id);
    //console.log(targetUser);

    if (req.file) filteredBody.photo = req.file.filename; // req.file.filename comes from the multer package (see notes in userController.js)
    // NEW PHOTO ---> filteredBody.photo ---> This is the one pick to update the user data
    // OLD PHOTO ---> targetUser.photo ---> This one is deleted
    if (req.file) await deletePhoto.deletePhotoFromServer(targetUser.photo);

    // Use the ternary operator to decide the data we will update depending on the passed in Model (the argument of this function)

    // NOTE: updatedBody will be an object with the data that we passed in to update, for example, if we only changed a user's image, it'll look
    // like this: "{photo: 'user-5c8a1d5b0190b214360dc057-1581452644836.jpeg'}" and if we updated a review's fields, it'll look like this:
    // { rating: 4.7, review: 'Best tour ever sponsored by DOGE' }
    const updatedBody = Model === 'User' ? filteredBody : req.body;

    const doc = await Model.findByIdAndUpdate(req.params.id, updatedBody, {
      // the first argument is the id of the document, the second one is what we want to update and the third one are just some options
      new: true, // returns the updated document, otherwise returns the old document
      runValidators: true // Makes sure the update follows our schema, for instance, we can't set a string for "price" because it is set to a number in our schema
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc
      }
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions); // If there are populate options specified, add that to the query
    const doc = await query;
    // findById() is a shorthand for Model.findOne({ _id: req.params.id })

    // Create a 404 error if there's no doc found
    if (!doc) {
      // Return is used here to stop the function execution if an error is found
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getAll = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    // Allow nested GET reviews on tour (get all reviews of a certain tour)
    let filter = {};

    // If there's a tour Id, use it as a filter object to show only data of that tour. Remember that tourId is a defined
    // parameter in tourRoutes.js and tour is a property of the review Model which is an id of a tour, you can check that in reviewModel.js
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query) // model.find returns all documents of the model
      .filter()
      .sort()
      .limitFields()
      .paginate();

    if (populateOptions)
      features.query = features.query.populate(populateOptions);
    const doc = await features.query; // features.query.explain() returns stats of the query and its performance which indexes can help to improve.
    // Our query with all the functions applied now lives within the query property of features.

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc
      }
    });
  });
// NOTE: res.json converts the data we pass in to a JSON object and sends a header content-type of "application/json".
// It also adds utf-8 charset automatically, while res.send uses "content-type: text/html"
