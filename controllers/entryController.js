var fs = require('fs');
var writeFile = require('write');
var multiparty = require('multiparty');

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
        entry.text = fields.text[0];
        entry.location = fields.location[0];
        if (files.file) {
          var temppath = files.file[0].path;
          var filename = files.file[0].originalFilename;
          var filepath = 'static/uploads/' + filename;
          fs.readFile(temppath, function(err, data) {
            if (err) {
              reject(err)
            }
            writeFile(filepath, data, function(err, data) {
              if (err) {
                reject(err);
              }
              entry.filepath = filepath;
              resolve(entry);
            })
          })
        } else {
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