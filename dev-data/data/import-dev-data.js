const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');

dotenv.config({ path: './config.env' });

// Since we're running commands to import/delete our data, we need to connect to the database as a first step
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'));

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// IMPORT DATA INTO DATABASE
const importData = async () => {
  try {
    await Tour.create(tours); // myModel.create also accepts an array, so it'd create a new document for every item in the array
    await User.create(users, { validateBeforeSave: false }); // Our test users don't have a password confirm so we need to turn off the validation this time
    await Review.create(reviews);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log('There was an error importing the data! Take a look:', err);
  }
  process.exit();
};

// DELETE ALL DATA FROM THE COLLECTION
const deleteData = async () => {
  try {
    await Tour.deleteMany(); // myModel.deleteMany() will delete all documents in a certain collection
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log('There was an error deleting the data! Take a look:', err);
  }
  process.exit();
};

// Call either importData() or deleteData() depending on our commands
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

// NOTE: process.argv returns an array containing the command line arguments passed when the Node.js process was lauched. The first
// element will be the path of the process, the second element will be the path to the JavaScript file being executed.
// The remaining elements will be any additional command line arguments, so we can use the elements from the third one to create commands
// like we've done above with our if else statement

// EXAMPLES - HOW TO DELETE AND IMPORT DATA - Just use these commands
// node ./dev-data/data/import-dev-data.js --delete
// node ./dev-data/data/import-dev-data.js --import

// IMPORTANT!
// Make sure to comment out the middleware function for password encryption and the one to update the last time a password was modified in
// userModel.js BEFORE IMPORTING DATA, otherwise we wouldn't be able to log in because the passwords are already encrypted!

console.log(process.argv);
