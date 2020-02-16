const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, `A tour must have a name`],
      unique: true, // Note: All unique properties will automatically get their own index in MongoDB
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters']
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'The difficulty level must be easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be equal to or above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // Setters allow you to transform the data before it gets to the raw MongoDB Document.
      // This setter will round values to 1 decimal, e.g. 4.666666 ---> 4.7
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      // Make sure the discount isn't greather than the price
      validate: {
        validator: function(val) {
          // val is the value that the user input | this points to the current document
          // IMPORTANT NOTE: This only points to current doc on NEW document creation
          return val < this.price; // example: 100 - 200 = true
        },
        message: 'The discount [{VALUE}] cannot be greater than the whole price'
      }
    },
    summary: {
      type: String,
      trim: true, // Remove all the whitespace in the beginning and the end of a string. Example: "   this tour is...   " ---> "this tour is"
      required: [true, 'A tour must have a description summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String, // Name of the image
      required: [true, 'A tour must have a cover image']
    },
    images: [String], // An array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date], // Dates in which a tour starts, like in January, Summer, etc
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // In order for this object to be recognized as GeoJSON, we need the type and coordinates properties
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    // To create embedded documents we need to use an array. This will create brand new documents inside the parent document (the tour)
    locations: [
      {
        type: {
          type: String,
          defalt: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number // Day of the tour in which people will visit the location
      }
    ],
    // Referencing the guides of the tour (not embedding)
    // This could be considered child referencing, which we do because there will be less than 10 tour guides
    guides: [
      {
        type: mongoose.Schema.ObjectId, // We expect every element in this array to be a mongoDB id
        ref: 'User' // Reference another Model, in this case, 'User'
      }
    ]
  },
  {
    // This object are the options of our Schema. Here we can specify some extra options
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
    // For example, here we're setting virtual properties to be shown when we send data as JSON and as a JS object.
  }
);

// ============================================================ INDEXES =================================================================== //
// Indexes are special data structures that store a small portion of the collection’s dataset in order to perform more effective queries
// Set an index on the price property // The number 1/-1 simply indicates ascesnding or descending
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

// Create an index where we're storing our geospatial query (see .getToursWithin in tourController.js)
// Geospatial data indexes need a 2dsphrere index instead of 1 or -1
tourSchema.index({ startLocation: '2dsphere' });

// =========================================================== VIRTUAL PROPERTIES ========================================================= //

// In Mongoose, a virtual is a property that is not stored in MongoDB.
// Calculate the duration in weeks dividing the duration in days by 7. "this" is tourSchema here
tourSchema.virtual('durationInWeeks').get(function() {
  return this.duration / 7;
});
// We need to define the get method because this virtual property here will be created each time that we get some data out of the database.
// And so this get function here is called a getter.
// Also, we used a regular function instead of an arrow one because we need to use the this keyword and arrow functions don't have access to it
// NOTE: Virtual properties cannot be used on queries because they're not present in the dabatase

// USING VIRTUAL POPULATE TO REFERENCE THE REVIEWS FROM THE TOURS (CHILD REFERENCING) BUT WITHOUT ACTUALLY STORING IT IN THE DB
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // Name of the field in the other model where the reference to the current model is stored
  localField: '_id' // Where that same id is stored in this model
});

// ========================================================= MONGOOSE MIDDLEWARE ======================================================== //

// DOCUMENT MIDDLEWARE - This function will run before .save() and .create() but not on insertMany() | This points to the document
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true }); // Slugify our slug
  next();
});

// // Add Tour Guides from their ID (embedding) | This points to the current document
// tourSchema.pre('save', async function(next) {
//   // Use array.map to find all our users with their Id. "id" is the element of the array we're looping (the id), then we pass it to User.findById
//   // as many times as elements are in our array, and that's how we get the users based on their id
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   // We need to use promise all because the result of the line above is an array of promises.
//   // Promise.all(yourArrayOfPromisesHere) takes an array of promises and returns their result once they're all fulfilled.
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });

// QUERY MIDDLEWARE - This points to the query

// Don't show the secret tours in our queries starting with "find"
tourSchema.pre(/^find/, function(next) {
  // Use a regular expression to cover all the strings starting with 'find' (this includes findOne). Using just 'find' wouldn't include findOne
  this.find({ secretTour: { $ne: true } });
  // Our secretTour is set to True, so here we're telling mongoose to give us only the results that are NOT equal to true

  // Set a property on the query to know when it started so we can know how long it took by substracting this amount in a post middleware
  // (it's down there)
  this.start = Date.now();
  next();
});

// =================================================== EXPLANATORY NOTES =========================================================== //

// Populate 'guides' so that we can have referencing in our Tour model. This applies to all routes starting with "find".
// We also filter out __v and passwordChangedAt since those are properties we're not interested in
// This can be done in the Controller directly in the route, for example:
//  const tour = await Tour.findById(req.params.id).populate('reviews');

// But instead of that and in order to have cleaner code, we can also write a middleware function to perform this action.

// ===================================================================================================================================== //

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

// Tell us how long the query took to return the results
tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  //console.log(docs); <--- This is the result of our query, we have access to it in post middleware. For example,
  // in this case it'd be all the documents that this query returned
  next();
});

// AGGREGATION MIDDLEWARE - 'This' points to the current aggregation object
// Display only tours whose secretTour property is not equal to true - This may interfere with other aggregation pipelines, such as $geoNear,
// because it needs to be the first aggregation middleware in the stack
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

// ======================================================================================================================================== //

const Tour = mongoose.model('Tour', tourSchema);
// The first argument will be the singular name of the collection that will be created (if it doesn't exist already), in this case it
// will be "tours". The second argument is the Schema that this model will use.

module.exports = Tour;
