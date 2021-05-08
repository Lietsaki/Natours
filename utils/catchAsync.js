// What this function essential does is to save up having to wrap our async function in a try catch block.
module.exports = fn => {
  // Return an anonymous function that will be asigned to .createTour or whatever we assign this function to.
  // Such function is async so it'll return a promise. In case of any errors in that promise, we can catch them with the catch method
  // available on all promises, so the catch method will will pass the error into the next function which will send it to our global
  // error handling function
  return (req, res, next) => {
    fn(req, res, next).catch(err => next(err)); // A shortcut for this line is "fn(req, res, next).catch(next)"
  };

  // NOTE: Whatever we pass into next, express will assume it's an error. Then express will skip all the following middleware
  // and pass the error to our error handling middleware
};
