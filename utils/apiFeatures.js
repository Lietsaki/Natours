class APIFeatures {
  constructor(query, queryString) {
    // mongoose query and queryString(req.query) from express
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1) Filtering
    const queryObj = { ...this.queryString }; // Create a hard copy (not a reference) of the queryString by using destructoring inside an object.

    // Exclude certain field names (we want to use them to implement API features and not for querying)
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1.5) Advanced filering
    let queryStr = JSON.stringify(queryObj);

    // Add the $ to gte, gt, lte, lt (the mongodb operator) to make it work. Note how we simply put one dollar sign in our ${match}
    // The match argument of this callback is basically anything that matches what we put inside our regular expression (gte, gt, lte, lt).
    // This allows us to pass in a MongoDB query into the url. For instance:
    // The query we want to perform ---> { difficulty: 'easy', duration: { $gte: 5} }
    // How our req.query would look like without adding the $ ---> { difficulty: 'easy', duration: { gte: '5'} } ---> This wouldn't work
    // That is why we need to convert it to a proper MongoDB query.
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    // Add the query to our req.query after adding the dollar sign
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
    // In this case, this is the whole object that has access to the other methods listed here.
    // We need to return this in order to be able to chain .other methods
  }

  sort() {
    if (this.queryString.sort) {
      // To sort by more than one property we'll add a comma in the url, like this: api/v1/tours/?sort=-price,ratingsAverage
      // Our goal here is to turn that comma into the mongoose sort syntax, which only uses a space, like this: sort(-price ratingsAverage)
      // So, split the string (-price,ratingsAverage) where there's a comma and join it using an empty space (-price ratingsAverage)
      // Note: Query.prototype.sort() is a mongoose function
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);

      // If there's no sort property specified in the queryString, automatically in a descending order (adding the minus in the start '-') by
      // the createdAt property, that is, show the newest tours first.
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      // To get only certain fields, use the fields parameter. To get all fields but exclude one, just put a minus in front of it ('-')
      // Separate the fields with a comma, for example:
      const fields = this.queryString.fields.split(',').join(' '); // This will return "name duration" (using name and duration as an example)
      this.query = this.query.select(fields);

      // query.select: Specifies which document fields to include or exclude
      // How to select specific fields in mongoose ---> query.select('name duration price');
      // If there's no specified fields, exclude the __v property that MongoDB automatically adds to all objects.
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  // ===================================================== EXPLANATORY NOTES =========================================================== //
  // .Skip() specifies the number of documents to skip before actually querying data.
  // For example, skip(10) means we want to skip 10 results before actually start querying.
  // .Limit() specifies the number of documents the query will return.
  // Use * 1 to convert it to a number and || to specify a default value.

  // In order to implement pagination, substract one from 'page' and multiply it by limit
  // Example: page = 3 and limit = 100 ----> (3 - 1) * 100 ---> 2*100 ---> 200.
  // So: this.query.skip(200).limit(100) ---> Skip 200 results and display only 100 so we'd get results 200 - 300.
  // =================================================================================================================================== //
  paginate() {
    // 4) Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
