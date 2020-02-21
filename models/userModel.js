const crypto = require('crypto'); // This is a built in node module that will allow us to generate a random token for password recovery
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, `Your name is missing!`],
    trim: true,
    maxlength: [30, 'A name must have less or equal than 30 characters'],
    minlength: [3, 'A name must have more or equal than 3 characters']
    // validate: [validator.isAlpha, 'Tour name must only contain characters']
  },
  email: {
    type: String,
    required: [true, 'Your email is missing!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email :)']
  },
  photo: {
    type: String,
    // We don't have to specify the route of the image here because we've defined it in multerStorage() in userController.js
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a passsword'],
    minlength: [8, 'Your password must have at least 8 characters!'],
    select: false // Hide the password from any output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password :)'],
    // Make sure the passwordConfirm matches the password. Validate functions are called when a document is created
    validate: {
      // This only works on .create and .save. Whenever we want to update a user, we'll have to use save and not findOneAndUpdate, for example.
      // The current element (el) refers to passwordConfirm. This function will run every time a new user is created.
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// ================================================== MIDDLEWARE =================================================================== //

// =============================================== PASSWORD ENCRYPTION EXPLANATORY NOTE ============================================ //
// The first line (the if statement) allows us to only encrypt the password if it's been modified or when it's newly created. So, if it
// hasn't been modified ("!"), exit this function. It's important to remember that when we set/assign a value like here:
// "this.password = await bcrypt.hash(this.password, 12);" all we're doing is modifying it, not saving it.

// Note: document.isModified is a mongoose method that returns true when setting a value for the first time or changing its orignal value.
// Setting the value to its original value would return false, because you're updating it but technically it wasn't modified.
// ================================================================================================================================ //

// Presave mongoose middleware for password encryption || This refers to the current user
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  // Hash the password with a cost of 12
  // bcrypt.hash(ourCurrentPassword, cost parameter[how CPU intensive this operation will be] ). Check docs on npm for more
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field. Without this line of code, the password would appear in the response after creating a new user.
  this.passwordConfirm = undefined;
  next();
});

// Presave mongoose middleware to update the last time a password was modified
// (this only runs if the password was modified and the document isn't new)
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  // Substract 1k miliseconds (1s). Sometimes saving to the database is a bit slower than issuing the JSON Web Token, so the
  // changed password timestamp is sometimes set a bit after the JSON Web Token has been created. This -1s fixes that.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query middleware to hide users whose active property is false
// The Regular Expression means "every word starting with find". Note: Remember that this points to the current query
// We need to use $ne because just putting active: true wouldn't return anything
//  becuase the other users don't have the active property set explicitly.
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// ===================================================== INSTANCE METHODS ================================================================= //

// Instance method to check if the given password is correct || An IM is a method that all documents of this collection will have access to
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword); // Return true if the passwords are the same, false if not
};

// Instance method to check if the user has changed their password || In an IM this always points to the current document
// This function is used in authController.js inside our .isLoggedIn() and .protect() functions
userSchema.methods.changedPasswordAfter = function(JTWTimestamp) {
  // 1) Convert the date in which the password was changed to seconds. Note that the property .passwordChangedAt will only appear in a user
  // object if he/she changed her password.
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // 2) Check if the time in which the password was changed is larger than the time in which the login token was created
    // console.log(changedTimestamp, JTWTimestamp);
    return JTWTimestamp < changedTimestamp; // Example: 100 < 200 (suppose we created the token at 100 and changed it at 200)
  }

  // False means NOT CHANGED
  return false;
};

// Instance method to generate random tokens for password recovery
userSchema.methods.createPasswordResetToken = function() {
  //  "32" represents the number of bytes, and it returns a number, so we have to turn it into a string with .toString, a built-in js method.
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Encrypt the random hash. This is what we save to the database.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log(
  //   { resetToken },
  //   'The encrypted version of resetToken is this one:',
  //   this.passwordResetToken
  // );

  // The expiration time is 10 minutes. Date.now() gives us the current time in miliseconds, so we multiply it by 1000 to get into seconds
  // and then by 60 to get into minutes, then we sum 10 to get our desired ten minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the plain text token, that's the one we'll send through the email
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
