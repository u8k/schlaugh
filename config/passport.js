var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dailypost';

module.exports = function(passport){
  // Local Strategy
  passport.use(new LocalStrategy(function(username, password, done){
    // Match Username
    MongoClient.connect(dbURI, function(err, db) {
      if (err) {throw err;}
      else {
        db.collection('users').findOne({username: username}, function (err, user) {
          if(!user){
            return done(null, false, {message: 'wrong'});
          } else {
            // Match Password
            bcrypt.compare(password, user.password, function(err, isMatch){
              if(err) throw err;
              if(isMatch){
                return done(null, user);
              } else {
                return done(null, false, {message: 'wrong'});
              }
            });
          }
        });
      }
      db.close();
    });
  }));

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    MongoClient.connect(dbURI, function(err, db) {
      if (err) {throw err;}
      else {
        db.collection('users').findOne({ '_id': ObjectId(id) }, function (err, user) {
          done(err, user);
        });
      }
      db.close();
    });
  });
}
