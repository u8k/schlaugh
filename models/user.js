var mongoose = require('mongoose');

var userObject = {
	username: {type: String, required: true},
	password: {type: String, required: true}
};

/*
var intervalSchema = mongoose.Schema({
	attempts: {type: Number, default: 0},
	wins: {type: Number, default: 0}
});

for (var i = -12; i < 13; i++) {
	if (i !== 0) {
		userObject['interval'+i] = {type: intervalSchema, default: intervalSchema};
	}
}
*/

var UserSchema = mongoose.Schema(userObject);

var User = module.exports = mongoose.model('User', UserSchema);
