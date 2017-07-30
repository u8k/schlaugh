var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var User = require('./models/user');


//connect and check mongoDB
var promise = mongoose.connect('mongodb://localhost:27017/nodekb', {useMongoClient: true});
//var promise = mongoose.connect(process.env.MONGODB_URI, {useMongoClient: true});
var db = mongoose.connection;
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


////ROUTING////

// main/only page
app.get('/', function(req, res) {
	if (req.user) {
		var query = {username: req.user.username};
		User.findOne(query, function(err, user) {
			if (err) throw err;
			res.render('main', {user: user});
		});
	} else {
		res.locals.user = null;
		res.render('main');
	}
});

// update data
app.post('/', function(req, res) {
	var stat = {}
	stat['interval' + req.body.interval] = {
		attempts: req.body.attempts,
		wins: req.body.wins
	}
	var query = {username: req.user.username};
	User.update(query, {$set: stat}, function(err){
		if(err){
			console.log(err);
		} else {
			res.send('success');
			//console.log(req.body);
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


app.set('port', (process.env.PORT || 3000));

// Start Server
app.listen(app.get('port'), function(){
  console.log('Servin it up fresh on port ' + app.get('port') + '!');
});
