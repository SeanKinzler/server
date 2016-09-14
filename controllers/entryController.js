var fs = require('fs');
var writeFile = require('write');
var multiparty = require('multiparty');
var easyimg = require('easyimage');

var uploadToS3 = require('../config/utils.js').uploadToS3;
var db = require('../models/Database.js');


module.exports = {

  createEntry: function(req, res, next){

    var form = new multiparty.Form();

    new Promise((resolve, reject) => {
      
      // initialize entry object with userId
      var entry = {userId: req.user.id};

      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
        }
        // Store entry text and location on entry object
        entry.text = fields.text[0];
        entry.location = fields.location[0];
        
        if (files.file) {
          var temppath = files.file[0].path;
          var filename = files.file[0].originalFilename;
          // Build file paths
          var filedir = 'uploads/';
          var filepath = filedir + filename;
          var thumbnailName = 'thumb_' + filename;
          var thumbnailPath = filedir + thumbnailName;
          var tempThumbnailPath = 'static/' + filedir + thumbnailName;

          fs.readFile(temppath, function(err, data) {
            if (err) {
              reject(err)
            }
            // Upload to S3 and set filepath on entry object
            entry.filepath =  uploadToS3(filepath, data);
            // Create thumbnail and temporarily store in local directory
            // `easyimg.rescrop` keeps aspect ratio. `easyimg.thumbnail`
            // will ignore aspect ratio and create square thumbnail
            easyimg.rescrop({
               src: temppath, 
               dst: tempThumbnailPath,
               width:60, 
               height:60,
            }) // end easyimg.thumbnail
            .then((image) => {
              fs.readFile(tempThumbnailPath, function(err, data) {
                if (err) {
                  reject(err);
                }
                // Upload to S3 and set thumbnail filepath
                entry.thumbnail = uploadToS3(thumbnailPath, data);
                // Delete temporary local thumbnail
                fs.unlink(tempThumbnailPath, function(err, data) {
                  if (err) {
                    console.log('Temporary local thumbnail deletion error', err);
                  }
                })
                // add thumbnail path to entry object
                resolve(entry);
              })
            })
            .catch((err) => {
              reject(err)
            })
          })// end fs.readFile
        } else {
          // if no files resolve here
          resolve(entry);
        }
      }) // end form.parse
    }) // end Promise
    .then((entry) => {
      db.Entry.create(entry)
      .then((newEntry) => {
        res.json(newEntry);
      })
      .catch((err) => {
        res.status(500).json(err);
      })
    })
    .catch((err) => {
      res.status(500).json(err);
    })

  },

  getEntries: function(req, res, next) {
    if (req.query.userId && (req.query.userId !== req.user.id.toString())) {
      // check if req.query.userId is in friendlist
      db.Relationships.findOne({ 
        where: { user1: req.user.id, user2: req.query.userId }
      })
        .then(function(friends) {
          if (friends) {
            // send entries
            db.Entry.findAll({ 
              where: { userId: req.query.userId },
              order: [['createdAt', 'DESC']]
            })
              .then(function(entries){
                res.send(entries);
              })
              .catch(function(err){
                res.status(404).json(err)
              });
          } else {
            res.status(404).json({ error: 'you are not friends'})
          }
        })
        .catch(function(err) {
          res.status(404).json(err)
        });
    } else {
      db.Entry.findAll({ 
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
      })
      .then(function(entries){
        res.send(entries);
      })
      .catch(function(err){
        res.status(404).json({error: 'Error retrieving entires: ' + err});
      });
    }
  }

};