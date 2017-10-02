var mongoose = require('mongoose');

var postObject = {
	//author: {type: String, required: true}, //since it's embedded, we know this?
	body: {type: String, required: true},
	pubDate: {type: String, required: true},
	//title?
};

var PostSchema = mongoose.Schema(postObject);

var userObject = {
	username: {type: String, required: true},
	password: {type: String, required: true},
	//email: {type: String, required: true},
	posts: [PostSchema]
};


var UserSchema = mongoose.Schema(userObject);

var User = module.exports = mongoose.model('User', UserSchema);
