const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    // Tour and User are the references of the review model, we implement them by using parent referencing
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must have an author!']
    }
  },
  {
    toJSON: { virtuals: false }, // Set these two to false so we don't get a dobule id in our query results.
    toObject: { virtuals: false }
  }
);

// Create a unique compound index for the tour and user, so that a single user cannot create more than 1 review for a single tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Populate the tours and users. Without this, we'd only see their Id's in the output
reviewSchema.pre(/^find/, function(next) {
  // ===================================================== EXPLANATORY NOTES ============================================================ //
  // When we query for a tour and get the result, it will show its reviews too, but we don't want that review to also show information about
  // the tour it is linked to, because that's the tour we just requested! So, in order to avoid duplicate information, populate only
  // the user data in the reviews and not the tour again.
  // ======================================================================================================================================== //
  //   this.populate({
  //     path: 'tour',
  //     select: '-guides name'
  //   })

  this.populate({
    path: 'user',
    select: 'name photo' // show only the user name and photo instead of all its data
  });

  next();
});
// =========================================== QUICK DIFFERENCE BETWEEN STATIC AND INSTANCE METHODS ==================================== //
// Instance and Statics methods are not only a JS thing, but something present in OOP in general. Basically, isntance methods are functions
// that can be called on all instances of a class. For examples, a class "Person" has an instance called "Daniel" and an instance method
// ".sayHi()" which can be called on like this: Daniel.sayHi() but not on the class itself.

// On the other hand, static methods can be called ONLY on classes and not on their instances. Take the ".sayName()" method, only
// Person could use it like this Person.sayName(), but using it on Daniel(e.g. "Daniel.sayName()") would return an error.
// In this case, reviewSchema acts as our class and its documents as the instances, well, this time we only want a function for reviewSchema.
// ====================================================================================================================================== //

// STATIC METHOD TO CALCULATE THE RATINGS AVERAGE - 'This' points to the current model
// Note: We don't need to add catchAsynch here because we don't get access to next() in this function, even thought it's an async function
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId } // Match documents(reviews) whose tour is the one we passed in as an argument (tourId)
    },
    {
      $group: {
        _id: '$tour', // Common field that we want to group by (all reviews have a 'tour' property)
        nRating: { $sum: 1 }, // Add +1 for each
        avgRating: { $avg: '$rating' } // The $avg Accumulator Operator returns an average of numerical values.
      }
    }
  ]);
  //console.log(stats); ---> stats returns an object like this: [ { _id: 5e2f2faf5cfef01724ed136b, nRating: 1, avgRating: 4.9 } ]

  if (stats.length > 0) {
    // Find the current tour and update it
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    // If there are no reviews, set the default values to the ratingsQuantity and the ratingsAverage
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// CALCULATE THE RATINGS AVERAGE EVERY TIME THAT WE SAVE A REVIEW - EXPLANATORY NOTES
// ================================================================================================================================== //
// We'll apply our calcAverageRatings static method to the constructor every time that a document from reviewSchema is saved.

// We can't use Review.calcAverageRatings since the Review variable hasn't been defined at this point.
// We can't just put this middleware after it because the Review variable wouldn't have this hook.
// To solve this issue, we need to refer to the Review model as 'constructor'.
// 'this.constructor' is the model who created that document.
// Note: In reviewSchema.post 'this' points to the current review.
// ================================================================================================================================== //
reviewSchema.post('save', function() {
  this.constructor.calcAverageRatings(this.tour);
});

// CALCULATE THE RATINGS AVERAGE EVERY TIME THAT WE DELETE OR UDPATE A REVIEW - EXPLANATORY NOTES
// ================================================================================================================================== //
// Since there's no document middleware for these functions, we'll have to use query middleware.

// 1) Get access to the current review being updated/deleted with a pre-hook, also make sure to use a Regular Expression
// to cover both findOneAndUpdate and findOneAndDelete. In this case, 'this' points to the current query object, we're going to create
// a property insde that query object to store the review we want to update.

// 2) To do so, we can use this.findOne() which would find the review being targeted, and then store that value on a newly created property
// "this.r", we need to store the 'r' in 'this' instead of storing it in a variable because we need to access it in a post-hook.

// Note: Since this is a pre-hook, "this.r" will return the non-updated review, but the review will be
// updated regardless of what the value of 'this.r' is at this point of time.

// 3) This will allow us to finaly gain access to the review in our post-middleware.
// Why can't we just run .calcAverageRatings in reviewSchema.pre? Because the new data hasn't been updated/deleted at this point, so our
// average ratings wouldn't be accurate.

// 4) Now we can run .calcAverageRatings, but not on this.r directly, because it's a STATIC method, so it must be used on the model, not
// on their instances. Just as we did before, refer to the model as "constructor" and chain it into . to apply our method.
// ================================================================================================================================== //
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  //console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
