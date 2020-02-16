const crypto = require('crypto');
const { promisify } = require('util'); // Take the promisify method from the built-in nodejs "util" module
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

// ======================================================== EXPLANATORY NOTES ========================================================== //
// jwt.sign: The first argument is the data we want to store in the token, which is called the Payload. It must be an object, in
// this case, we only want the id. Saying just id is the same as {id: id} where the first is the object property and the latter it's the
// function argument.
// The second argument that the sign method takes is the secreOrPrivateKey. The third one are options.
// ===================================================================================================================================== //
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Function to send a token to the user (log them in)
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Define the options for the cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 // Convert the "90" to miliseconds. It'll expire in 90 days from now.
    ),
    httpOnly: true // This particular cookie should only be accessed by the server. Any attempt to access the cookie from a client script is strictly forbidden.
  };

  // Send the cookie only via https when we're on production.
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // Define a cookie, name it "jwt" and send the token in it.
  res.cookie('jwt', token, cookieOptions);

  // Remove password from the output when we create a new user
  user.password = undefined;

  res.status(statusCode).json({
    status: 'Success!',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // With this way of creating a new user, we only receive the data that we need and avoid users setting themselves as an admin.
  // We can set anyone's role as admin manually in MongoDB atlas, adding the property ourselves
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    photo: req.body.photo
  });

  // Send the welcome email to the new user
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  // the res here is the same we defined in the createSendToken function. 201 stands for created.
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // This syntax is destructoring. Since the email and password properties are the same as the const name, we can do it like this.
  // Without destructoring, it'd look like this: "email = req.body.email" and "password = req.body.password"
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400)); // Return stops the function right here in case of an error
  }

  // 2) Check if the user exists and if the password is correct
  // ======================================================= EXPLANATORY NOTE ============================================================= //
  // This findOne syntax is from ES6. If the document property we want to compare with a const/let has the same name, we can just put the
  // name there. So it would look like this in ES5: ({email: email}) The first email refers to the email property of the document.
  // The second one is the one that we created up there with destructoring and represents the data the user is sending.
  // Also, we need to use .select to include the password in the query and with a + sign because it's hidden by default (select: false) in
  //  our schema. "const user" is a document with the result of querying for the provided email and password.
  // ======================================================================================================================================= //

  const user = await User.findOne({ email }).select('+password');

  // If user doesn't exist, or if the comparison between the provided password and the correct one is false, return an error.
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401)); // 401 means unauthorized
  }

  // Only if the user exists and if the password is correct we'll reach this piece of code here
  // 3) If everything is correct, then send back the token to the client
  createSendToken(user, 200, res);
});

// Log users out sending a new cookie without a token and with the same name('jwt') (to override the current cookie and hence log the user out)
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Make it expire in 10.000 miliseconds, so that's essentially 10 seconds
    httpOnly: true
  });

  res.status(200).json({ status: 'success' });
};

// ========================================================= EXPLANATORY NOTE ======================================================= //
// This protect method makes sure you can only access X route if your token is valid, your user still exists and hasn't changed his password.
// The token is sent in the headers with a key name of authorization and a value of "Bearer *yourTokenGoesHere*"
// Of course, the headers in which we send the token are the headers of the desired route.
// Our if statement makes sure the headers exist and that they start with "Bearer", that is, that they contain a token.
// So we have to use .split to extract the token from the authorization property

// Then we can verify if the token hasn't been tampered using the .verify method of the jwt package, which is a synchronous function
// that returns the payload of the Token, an object containing 3 properties: id, iat and exp. (iat = creation data, exp = expiration date).
// The values of such dates are in seconds.
// Since we've used async functions in all our code, we use the promisify method from the built in node module "util" to make .verify
// return a promise.

// The next step is checking if the id of the requested user still exists. The id of the current user lives in the token payload, as we
// specified in our signup method up there.

// As a third step, we created an instance method in userModel.js to check if the password has been changed after the creation of the token.
// Finally, we pass the current user data into req.user so that the next middleware functions have access to such data

// ================================================================================================================================== //

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  console.log('This is the token:', token);

  if (!token) {
    return next(
      new AppError(`You're not logged in! Please log in to get access`, 401)
    );
  }

  // 2) Verificating the token (read the explanatory note up there)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //console.log('This is the decoded token for protected routes:', decoded);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  // This will return true if the user has changed his password, false if he hasn't
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again!', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  // Put the entire user data in the request
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Render certain pages if the user is logged in, there are no possible errors in this case
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 4) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // Use the res.locals object to store values we want to access in the rest of the app, like in our templates.
      // Every pug template has access to the res.locals object
      res.locals.user = currentUser;

      // Make sure to RETURN next to exit the function and avoid calling next twice in the same function, which would throw an error
      // saying that "/" cannot be found on this server
      return next();
    } catch (err) {
      // Ignore the error and go to the next middleware (there will be an error every time we sign out because we send a token that just
      // says "logged out" so jwt cannot verify it and will throw an error, so we need to ignore it and move on in order to log users out)
      return next();
    }
  }
  // In case there's no cookie, call the next middleware
  next();
};

// ONLY ALLOW ADMINS AND LEAD-GUIDES TO DELETE TOURS

// ========================================================= EXPLANATORY NOTE ============================================================ //
// This function allows us to perfom certain actions only if you're a specific type of user.

// We need to pass in arguments to our middleware function so we can create a wrapper function that will return the middleware function that
// we actually want to create. In order to pass the arguments we'll be using the rest parameter "(...YourArgumentsHere)", which allows us to
// pass in an indefinite number of arguments as an array. So now our middleware function will have access to the arguments passed in there.

// If ...roles doesn't include the role present in req.user.role, we'll throw an error. The 403 status code means forbidden.
// Otherwise, we call next and proceed with the next middleware, which is probably delete or something that only admins or tour guides
// should be able to do.
// ======================================================================================================================================= //

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is the name we've given to our possible arguments.
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// RESET PASSWORD METHOD

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  // 2) Generate the random token
  // .createPasswordResetToken returns the randomly generated token, so we need to store it in a variable
  // NOTE: "user" (in lowercase) is the variable we created from the found user up there. It wouldn't work with User (first U in uppercase)
  // because that's just our model, and what has access to the instance method are the model instances
  const resetToken = user.createPasswordResetToken();
  // validateBeforeSave is a mongoose method that allows us to skip the verification of user and password that our other middleware enforce.
  // Here we're also saving our user data, that is, the passwordResetToken that was just created, since all users don't have it by default.
  await user.save({ validateBeforeSave: false });

  // 3) Send it back as an email
  try {
    // This is the URL containing the token that will allow the user to reset their password. Note how the ${resetToken} is the last item.
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    // Actually send the email with our function created using nodemailer
    await new Email(user, resetURL).sendPasswordReset();

    // Send back a response (but it doesn't contain any sensitive data, that was sent to the user's email)
    res.status(200).json({
      status: 'Success',
      message: 'The token was sent to your email!'
    });
    // If there's an error, set the token and the expiration date to undefined so nobody can use them
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    //console.log(err);

    return next(
      new AppError('There was an error sending the email, try again later!'),
      500
    ); // 500 stands for internal server error
  }
});

// ======================================================= EXPLANATORY NOTES ============================================================== //
// In order to get the user from the token, we need to hash the original token that he's sending in the url, because in our database we're
// only storing the hased one. We do so using the node built-in crypt module, just as we did when generating the random password recovery
// token in userModel.js. So we get the token from req.params.token because it's part of the url "(/:token)", then we can find the user
// searching for the hased token in our database.

// To check if the token hasn't expired, its passwordResetExpires property must be greater than the date right now.
// ======================================================================================================================================== //
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there's a user, set the new password
  if (!user) {
    return next(new AppError('The token is invalid or it has expired!', 400));
  }

  // Set the user password to the new one and delete the passwordResetToken and its expiration date so it can't be used again
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // We use save instead of update because it runs the validators, update doesn't.
  await user.save();

  // 3) Log the user in (send the JWTs)
  createSendToken(user, 200, res);
});

// CHANGE THE PASSWORD FOR LOGGED IN USERS

// ==================================================== EXPLANATORY NOTES ================================================================ //
// First, we need to get the user by his id, which is located in the user object inside the request, then explicitly select the password with
// .select('+password) because in our schema we set an option to hide the password in the output when we query for an user.

// Second, we use our .correctPassword instance method (which can be found on userModel.js) to compare the provided password with the
// actual one, and return an error if they're not.

// We need to use .save() because findOneAndUpdate doesn't run the validators and the middlewares, the password wouldn't be
// encrypted, for instance.

// Then we have to check if the passed password is correct, that's a property that might not be defined in our Model, but it'll be sent
// in the request object by the user.
// ======================================================================================================================================= //

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if the POSTED password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong!', 401));
  }

  // 3) If so, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log in the user with the new password, send JWT
  createSendToken(user, 200, res);
});
