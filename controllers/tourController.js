const multer = require('multer');
const sharp = require('sharp'); // Node.js image processing library
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const Factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

// ==================================================  MULTER FILE UPLOADER SETUP  ========================================================== //
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

// Multiple images under different field names
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') // Just one image - req.file
// upload.array('images', 5) // Multiple images under the same field name - req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // IMAGE COVER
  // A.1) Pass our filename structure to req.body so that it can be updated when we use our updateTour function.
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  // A.2) Process the cover image and use the filename structure we defined in req.body.imageCover to write its output name.
  // Note: req.files.imageCover is an array with only 1 object inside, so we must select it with [0]
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // Resize it to a 2:3 ratio
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // THE 3 IMAGES IN THE TOUR DESCRIPTION
  // B.1) req.files.images is an array created by multer, so we can add it to our body by using an empty array that we'll
  // fill later with the processed images. Also, rememeber that out tourSchema expects an array of strings in 'images'.
  req.body.images = [];
  await Promise.all(
    // B.2) Loop through the images array to process our 3 tour images. Use map instead of forEach to save the promise returned by each file
    // and then await those 3 promises with Promise.all
    req.files.images.map(async (file, i) => {
      // Note that the filename has the .jpeg extension, so it WILL actually be the file after await sharp() writes it.
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333) // Resize it to a 2:3 ratio
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
      //console.log('this is the filename:', filename);
    })
  );
  //console.log('this is the req.body:', req.body);
  next();
});

// ========================================================================================================================================= //

// Set these properties of the query object for the 5 most popular tours
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name, price, ratingsAverage, summary, difficulty';
  next();
};

exports.getAllTours = Factory.getAll(Tour);
exports.getTour = Factory.getOne(Tour, { path: 'reviews' });
exports.createTour = Factory.createOne(Tour);
exports.updateTour = Factory.updateOne(Tour);
exports.deleteTour = Factory.deleteOne(Tour);

// AGGREGATION PIPELINE - Note: AP is a function of MongoDB
// Get some tour stats
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    // Only when we await it we get the results back. Otherwise it returns the aggreated object itself
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // null would give us stats for ALL the tours. '$difficulty gives us stats for the three types of difficulty
        // $toUpper only makes the difficulty word uppercase, for instance, "easy" ---> "EASY"
        numTours: { $sum: 1 }, // For each of the documents that will go through this pipeline, +1 will be added to this accumulator operator
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 } // 1 means ascending, that is, from the smaller to the biggest numbers. -1 Means descending.
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // $ne = not equal, it excludes whatever we put as the result, in this case, the documents whose id is 'EASY'
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// Count how many tours there are for a given month, in a given year
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
      // Unwind deconstructs an array returning one individual element for each item in the array. See documentation for practical examples.
    },
    {
      $match: {
        // Return only documents whose startDates property is greater or equal than /:year-01-01 and less or equal than /:year-12-31
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // Extract the month form our dates
        // The _id field is used to say what we want to use to group our documents
        numTourStarts: { $sum: 1 }, // Add +1 for each of the documents
        tours: { $push: '$name' } // Create an array with each of the names of the tours starting in each month
      }
    },
    {
      $addFields: { month: '$_id' } // Create a NAMED field with the value of _id
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12 // Get only X number of results
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: plan.length,
    data: {
      plan
    }
  });
});

// ==================================  GET TOURS WHOSE STARTING POINTS ARE NEAR A SPECIFIED LOCATION =================================== //
// ROUTE: '/tours-within/:distance/center/:latlng/unit/:unit' (it's in tourRotes.js)
// URL example: /tours-within/233/center/35.668403,139.698093/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params; // Get our data from the parameters
  const [lat, lng] = latlng.split(','); // Get the latitude and longitude in separated variables using destructoring

  // DEFINE THE RADIUS OF $centerSphere which should be in a special unit called radians
  // And in order to get the radians, we need to divide our distance by the equatorial radius of the Earth.
  // We're using a ternary operator to divide the distance by different values depending on the unit, if it's miles
  // then 3963.2, if not then we assume it's km and use 6378.1
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  // Throw an error if the user didn't provide latitude or longitude
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in this format: lat,lng',
        400
      )
    );
  }

  // $geoWithing selects documents with geospatial data that exists entirely within a specified shape, we'll be using a sphere
  //To use $centerSphere, specify an array that contains:
  // 1) The grid coordinates of the circle’s center point, such as latitude and longiture. Longitude always goes first, like this: [lng, lat]
  // 2) The circle’s radius measured in radians.

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    results: tours.length,
    status: 'success',
    data: {
      data: tours
    }
  });
});

// GET TOURS IN ORDER OF NEAREST TO FARTHEST FROM A SPECIFIED POINT + THE DISTANCE BETWEEN THEM AND THAT SPECIFIED POINT ($geoNear)

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params; // Get our data from the parameters
  const [lat, lng] = latlng.split(','); // Get the latitude and longitude in separated variables using destructoring

  // Use the ternary operator to store the equivalent value of meters in miles or in km depending on the selected unit.
  // Multiplying by 0.001 is the same as dividing by 1000, so we're essentially converting our result to km.
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  // Throw an error if the user didn't provide latitude or longitude
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in this format: lat,lng',
        400
      )
    );
  }

  // Note how we're using the Tour model here, that's why it can add the "distance" property to our tours in the output
  const distances = await Tour.aggregate([
    {
      // $geoNear is the only geospatial aggregation pipeline stage that actually exists, and hence it needs to be the fist one
      // $geoNear requires a geospatial index. If you have more than one geospatial index on the collection, use the keys parameter
      // to specify which field to use in the calculation. In our case, we already have one in tourModel.js: { startLocation: '2dsphere' }
      $geoNear: {
        // "near" is the point from which to calculate the distances. We must specify it as geoJson.
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1] // Convert the coordinates to numbers multiplying them by one
        },
        distanceField: 'distance', // All the calculated distances will be stored here
        // Multiply all distances by this value, so we can transform it to miles, km or radians. The distance is specified in meters by default.
        distanceMultiplier: multiplier
      }
    },
    {
      // Specify the data we want in the output. Here we're telling mongoDB to only display name and distance instead of the full tour data.
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
