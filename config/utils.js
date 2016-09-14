var jwt = require('jwt-simple');
var aws = require('./aws.js');

module.exports = {
  decode: function (req, res, next) {
    var token = req.headers['x-access-token'];
    var user;

    if (!token) {
      return res.send(403); // send forbidden if a token is not provided
    }

    try {
      // decode token and attach user to the request
      // for use inside our controllers
      user = jwt.decode(token, 'secret');
      req.user = user;
      next();
    } catch (error) {
      return next(error);
    }

  },
  uploadToS3: function(filepath, data) {
    
    var s3 = new aws.S3();

    var params = {
      Bucket: 'broadcast10', 
      ACL: 'public-read',
      Key: filepath, 
      Body: data
    };            

    s3.putObject(params, function(err, data) {
      if (err) {
        throw Error(err);
      } else {
        console.log("Successfully uploaded data to S3:", data);  
      } 
    });

    return aws.config.baseUrl + filepath;
  
  }
};