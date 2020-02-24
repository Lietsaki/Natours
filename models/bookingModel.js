const mongoose = require('mongoose');

// NOTE ABOUT PARENT REFERENCING: We're using parent referencing on the booking model (keeping a reference of the booked tour and the
// user who bought it). To do so, we set the type of our tour property to mongoose.Schema.ObjectId (the type of 'tour' is a mongoose
// schema object, if you think about it that way, it makes sense) and put the name of the model in ref.

// Note: The 'paid' property exists so that if someone wants to pay with cash, say in a physical location, an admin could use the API
// to manually create the booking for that client, and the status might be paid(true) or not paid(false), but of course most of the time
// (when they pay online, it'll be true)

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'The booking must belong to a tour!']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'The booking must belong to a user!']
  },
  price: {
    type: Number,
    required: [true, 'The booking must have a price!']
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  paid: {
    type: Boolean,
    default: true
  }
});
// Populate the tour and user automatically whenever there's a query.
// Note: Why do we use an object to populate the 'tour'? Well, it's because we only want to display the tour name, so we need to use 'select'
// in our options object, 'path' is the property we want to select, which we need to specify when we pass in an options object.

bookingSchema.pre(/^find/, function(next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name'
  });

  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
