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
    , {_id:0, username:1, posts:1, threads:1}
    , function (err, user) {
      if (err) {throw err;}
      else {
        var pending;
        if (user.posts[getCurDate(-1)]) {
          pending = user.posts[getCurDate(-1)]; //negative into the future
        }
        res.render('main', {user:user, pending:pending}); //'user' holds all the post data right now, UNNECESARY
      }
    });
  } else {
    res.render('main', {user: null});     //direct to a login page?
  }
});

// new post
app.post('/', function(req, res) {
	var text = req.body.text;
  var setValue = {posts: {}};
  setValue.posts[getCurDate(-1)] = text;
  db.collection('users').updateOne({_id: req.user._id},
    {$set: setValue },
    function(err, user) {
      if (err) {throw err;}
      else {res.send('success');}
    }
  );
});

// get posts-(should maybe be a "GET"? nahhhh)
app.post('/posts', function(req, res){
  if (req.body.date === getCurDate(-1)) {
    return res.send({posts: [{body: 'DIDYOUPUTYOURNAMEINTHEGOBLETOFFIRE', author: "APWBD"}]});
  }
  db.collection('users').find({},{ _id:0, posts:1, username:1 }).toArray(function(err, users) {  //later make this only check "following" instead of all users
    if (err) {throw err;}
    else {
      //console.log(users);
      var posts = [];
      for (var i = 0; i < users.length; i++) {
        if (users[i].posts[req.body.date]) {
          posts.push({
            body: users[i].posts[req.body.date],
            author: users[i].username
          })
        }
      }
      return res.send({posts: posts});
    }
  });
});

// new user sign up
app.post('/register', function(req, res){
	var username = req.body.username;
	var password = req.body.password;
	//check if there is already a user w/ that name
  db.collection('users').findOne({username: username}, function (err, user) {
    if (err) throw err;
		if (user) {return res.send("name taken");}
		else {
      db.collection('users').insertOne({
        username: username,
        password: password,
        posts: {},
        threads: {},
      }, {}, function (err) {
        if (err) {throw err;}
        bcrypt.genSalt(10, function(err, salt){
  				bcrypt.hash(password, salt, function(err, hash){
  					if (err) {throw err;}
            var setValue = {password: hash};
            db.collection('users').findOneAndUpdate({username: username},
              {$set: setValue }, {},
              function(err, r) {
                if (err) {throw err;}
                else {
    							req.logIn(r.value, function(err) {
    								if (err) {console.log(err); return res.send(err);}
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
      if (err) {console.log(err); return res.send(err);}
      return res.send("success");
    });
  })(req, res);
});

// logout
app.get('/logout', function(req, res){
  req.logout();
  res.send("success")
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
