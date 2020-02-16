class APIFeatures {
  constructor(query, queryString) {
    // mongoose query and queryString(req.query) from express
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1) Filtering
    const queryObj = { ...this.queryString }; // destructuring

    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1.5) Advanced filering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
    // In this case, this is the whole object that has access to the other methods listed here.
    // We need to return this in order to be able to chain .other methods
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' '); // This will return "name duration" (using name and duration as an example)
      this.query = this.query.select(fields);

      // query.select: Specifies which document fields to include or exclude
      // How to select specific fields in mongoose ---> query.select('name duration price');
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

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
