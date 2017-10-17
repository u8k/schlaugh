var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var db;

//connect and check mongoDB
var uri = 'mongodb://localhost:27017/dailypost'
//var uri = process.env.MONGODB_URI
MongoClient.connect(uri, function(err, database) {
  if (err) {throw err;}
  else {console.log("MONGO IS ALIVE");
  db = database;
  }
});

// Init App
var app = express();

// Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

// Configure cookie-session middleware
app.use(session({
  name: 'session',
  keys: ['SECRETSECRETIVEGOTTASECRET'],
  maxAge: 7 * 24 * 60 * 60 * 1000 // IT'S BEEN...(one week)
}))

// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//date helper function
var getCurDate = function (minusDays) {
  if (!minusDays) {minusDays = 0}
  var now = new Date(new Date().getTime() - 9*3600*1000 - minusDays*24*3600000);   //UTC offset by -9
  var year = now.getUTCFullYear();
  var mon = now.getUTCMonth()+1;
  if (mon < 10) {mon = "0"+mon}
  var date = now.getUTCDate();
  if (date < 10) {date = "0"+date}
  return year+"-"+mon+"-"+date;
}

////ROUTING////

// main/only page
app.get('/', function(req, res) {
  if (req.user) {
    db.collection('users').findOne({_id: req.user._id}
    , {_id:0, username:1, posts:1}
    , function (err, user) {
      if (err) {throw err;}
      else {
        var pending;
        if (user.posts[getCurDate(-1)]) {
          pending = user.posts[getCurDate(-1)]; //negative into the future
        }
        res.render('main', {username:user.username, pending:pending});
      }
    });
  } else {
    //direct to a login page
    res.render('login');
  }
});

// new/edit/delete post
app.post('/', function(req, res) {
  db.collection('users').findOne({_id: req.user._id}
  , {_id:0, posts:1}
  , function (err, user) {
    if (err) {throw err;}
    else {
      if (req.body.remove) {  //is trying to delete a post that doesn't exist a problem????
        delete user.posts[getCurDate(-1)];
      } else {
        user.posts[getCurDate(-1)] = req.body.text;
      }
      db.collection('users').updateOne({_id: req.user._id},
        {$set: user },
        function(err, user) {
          if (err) {throw err;}
          else {res.send('success');}
        }
      );
    }
  });
});

// get posts-(should maybe be a "GET"? ehhhh(following list))
app.post('/posts', function(req, res){
  if (req.body.date === getCurDate(-1)) {
    return res.send({posts: [{body: 'DIDYOUPUTYOURNAMEINTHEGOBLETOFFIRE', author: "APWBD"}]});
  }
  db.collection('users').find({},{ _id:0, posts:1, username:1 }).toArray(function(err, users) {  //later make this only check "following" instead of all users
    //      can i make that^ only return the post for the date i want instead of all posts?
    if (err) {throw err;}
    else {
      var posts = [];
      for (var i = 0; i < users.length; i++) {
        if (users[i].posts[req.body.date]) {
          posts.push({
            body: users[i].posts[req.body.date],
            author: users[i].username
          })
        }
      }
      return res.send(posts);
    }
  });
});

// get all messages
app.get('/inbox', function(req, res){
  if (!req.user) {return res.render('login');}
  db.collection('users').findOne({_id: req.user._id}
  , {_id:0, threads:1}
  , function (err, user) {
    if (err) {throw err;}
    else {
      // later, make this pull from a user specific list of "mutuals"
      db.collection('users').find({},{ username:1 }).toArray(function(err, users) {
        if (err) {throw err;}
        else {
          var threads = [];
          for (var i = 0; i < users.length; i++) {
            if (String(req.user._id) !== String(users[i]._id)) {
              if (user.threads[users[i]._id]) {
                var thread = user.threads[users[i]._id];
                //check if the last two items are allowed
                for (var j = 1; j < 3; j++) {
                  if (thread[thread.length-j] && thread[thread.length-j].date === getCurDate(-1) && thread[thread.length-j].incoming === true) {
                    thread.splice(thread.length-j, 1);
                    j+=2;
                  }
                }
                threads.push({
                  name: users[i].username,
                  _id: users[i]._id,
                  thread: thread
                });
              } else {
                threads.push({
                  name: users[i].username,
                  _id: users[i]._id,
                  thread: []
                });
              }
            }
          }
          res.send(threads);
        }
      });
    }
  });
});

// send/update a message
app.post('/inbox', function(req, res){
  var recipient = ObjectId(req.body.recipient);
  db.collection('users').findOne({_id: req.user._id}
  , {_id:0, threads:1}
  , function (err, user) {
    if (err) {throw err;}
    else {
      var overwrite = false;
      if (!user.threads[recipient]) {
        user.threads[recipient] = [];
      } else {
        // check the last two items, overwrite if there is already a pending message
        for (var j = 1; j < 3; j++) {
          if (user.threads[recipient][user.threads[recipient].length-j] && user.threads[recipient][user.threads[recipient].length-j].date === getCurDate(-1) && user.threads[recipient][user.threads[recipient].length-j].incoming === false) {
            overwrite = true;
            if (req.body.remove) {
              user.threads[recipient].splice(user.threads[recipient].length-j, 1);
            } else {
              user.threads[recipient][user.threads[recipient].length-j].body = req.body.text;
            }
            j+=2;
          }
        }
      }
      if (!overwrite) { //no message to overwrite, so push new message
        user.threads[recipient].push({
          incoming: false,
          date: getCurDate(-1),
          body: req.body.text,
        });
      }
      db.collection('users').updateOne({_id: req.user._id},
        {$set: user },
        function(err, user) {
          if (err) {throw err;}
          else {
            db.collection('users').findOne({_id: recipient}
            , {_id:0, threads:1}
            , function (err, user) {
              if (err) {throw err;}
              else {
                if (!user.threads[req.user._id]) {
                  user.threads[req.user._id] = [];
                }
                if (overwrite) {
                  for (var j = 1; j < 3; j++) {
                    if (user.threads[req.user._id][user.threads[req.user._id].length-j] && user.threads[req.user._id][user.threads[req.user._id].length-j].date === getCurDate(-1) && user.threads[req.user._id][user.threads[req.user._id].length-j].incoming === true) {
                      if (req.body.remove) {
                        delete user.threads[req.user._id].splice(user.threads[req.user._id].length-j, 1);
                      } else {
                        user.threads[req.user._id][user.threads[req.user._id].length-j].body = req.body.text;
                      }
                      j+=2;
                    }
                  }
                } else {
                  user.threads[req.user._id].push({
                    incoming: true,
                    date: getCurDate(-1),
                    body: req.body.text,
                  });
                }
                db.collection('users').updateOne({_id: recipient},
                  {$set: user },
                  function(err, user) {
                    if (err) {throw err;}
                    else {res.send('success');}
                  }
                );
              }
            });
          }
        }
      );
    }
  });
})

// new user sign up
app.post('/register', function(req, res){
	var username = req.body.username;
	var password = req.body.password;
	//check if there is already a user w/ that name
  db.collection('users').findOne({username: username}, {}, function (err, user) {
    if (err) throw err;
		if (user) {return res.send("name taken");}
		else {
      db.collection('users').insertOne({
        username: username,
        password: password,
        posts: {},
        threads: {},
        following: {},
        followers: {},
        mutuals: {},
        about: "",
        //field for little iconPic that goes next to posts?
      }, {}, function (err) {
        if (err) {throw err;}
        bcrypt.genSalt(10, function(err, salt){
  				bcrypt.hash(password, salt, function(err, hash){
  					if (err) {throw err;}
            var setValue = {password: hash};
            db.collection('users').findOneAndUpdate({username: username}, //MAKE BETTER
              {$set: setValue }, {},
              function(err, r) {
                if (err) {throw err;}
                else {
    							req.logIn(r.value, function(err) {
    								if (err) {throw err; return res.send(err);}
    								return res.send("success");
    							});
    						}
              });
          });
				});
      });
		}
  });
});

// log in
app.post('/login', function(req, res) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
		  return res.send(err);
		}
    if (!user) {
		  return res.send("invalid username/password");
		}
    req.logIn(user, function(err) {
      if (err) {throw err; return res.send(err);}
      return res.send("success");
    });
  })(req, res);
});

// logout
app.get('/logout', function(req, res){
  req.logout();
  res.send("success") //REDIRECT
});


///////////
app.set('port', (process.env.PORT || 3000));
// Start Server
app.listen(app.get('port'), function(){
  console.log('Servin it up fresh on port ' + app.get('port') + '!');
});

// If the Node process ends, close the DB connection
process.on('SIGINT', function() {
  db.close();
  console.log('bye');
  process.exit(0);
});
