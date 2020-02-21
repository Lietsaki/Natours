const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

// SIGNUP & LOGIN ROUTES
// Since we can only POST data to "/signup", we have to create an individual route .post for it. In other routes, for example "tours/:id" we
// can post, update and delete data, so they have a .route, but it's not this case.
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// FORGOT & RESET PASSWORD ROUTES
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// PROTECT ALL THE USER ROUTES AFTER THIS POINT. This works because middleware runs in sequence, so this way we can avoid repeating this code again and again
router.use(authController.protect);

// CHANGE PASSWORD WHEN YOU REMEMBER IT AND ARE LOGGED IN
router.patch('/updateMyPassword', authController.updatePassword);

// Get your own user
router.get('/me', userController.getMe, userController.getUser);

// Update your own user data (such as email and name)
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

// Delete your acount || Even when we don't fully delete the user, but as long as the user is no longer accesible anywhere, it's still ok to use the DELETE method
router.delete('/deleteMe', userController.deleteMe);

// ADMIN ONLY ROUTES
router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.updateUser
  )
  .delete(userController.deleteUser);

module.exports = router;
