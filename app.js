var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var User = require('./models/user');
//var Post = require('./models/post');


//connect and check mongoDB
var promise = mongoose.connect('mongodb://localhost:27017/dailypost', {useMongoClient: true});
//var promise = mongoose.connect(process.env.MONGODB_URI, {useMongoClient: true});
var db = mongoose.connection;
mongoose.Promise = global.Promise;
db.once('open', function(){
  console.log('Connected to MongoDB');
});
// Check for DB errors
db.on('error', function(err){
  console.log(err);
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
  Post.find({pubDate: getCurDate()}, { author:1, body:1, _id:0 }, function(err, posts) {
    if (err) {throw err;
    } else {
      if (req.user) {
    		var query = {username: req.user.username};
    		User.findOne(query,  { username:1, _id:0 }, function(err, user) {
    			if (err) {throw err;}
          else {
            User.find({}, { username:1, _id:0 }, function(err, users) {
              if (err) {throw err;}
              else {
                var query = {$and: [
                  { pubDate: getCurDate(-1) }, //negative into the future
                  { author: req.user.username }
                ]};
            		Post.findOne(query, { author:1, body:1, _id:0 }, function(err, pending) {
                  if (err) {throw err;}
                  else {
                    res.render('main', {user:user, posts:posts, users:users, pending:pending});
                  }
                })
              }
            })
          }
    		});
    	} else {
    		res.locals.user = null;
    		res.render('main', {posts:posts});
    	}
    }
  });
});

// new post
app.post('/', function(req, res) {
	var text = req.body.text;
	var query = {username: req.user.username};
  User.findOne(query, function(err, user) {
    if (err) throw err;
    var newPost = new Post({
      author: user.username,
      body: text,
      pubDate: getCurDate(-1) //negative into the future...
    });
    newPost.save(function(err){
      if(err){
      console.log(err);
      return;
      } else {
        res.send('success');
      }
    });
	});
});

// get posts-(should maybe get a "GET"?)
app.post('/posts', function(req, res){
  if (req.body.date === getCurDate(-1)) {
    console.log('DENIED');
    return;
  }
  Post.find({pubDate: req.body.date}, { author:1, body:1, _id:0 }, function(err, posts) {
    if (err) {throw err;
    } else {
      return res.send({posts:posts});
    }
  });
});

// new user sign up
app.post('/register', function(req, res){
	var username = req.body.username;
	var password = req.body.password;
	//check if there is already a user w/ that name
	var query = {username:username};
  User.findOne(query, function(err, user) {
		if (err) throw err;
		if (user) {return res.send("name taken");}
		else {
			var newUser = new User({
				username: username,
				password: password
			});

			bcrypt.genSalt(10, function(err, salt){
				bcrypt.hash(newUser.password, salt, function(err, hash){
					if(err){
						console.log(err);
					}
					newUser.password = hash;
					newUser.save(function(err){
						if(err){
						console.log(err);
						return;
						} else {
							req.login(newUser, function(err) {
								if (err) {return res.send(err);}
								return res.send("success");
							});
						}
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
      if (err) {return res.send(err);}
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
