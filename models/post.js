var mongoose = require('mongoose');

var postObject = {
	author: {type: String, required: true},
	body: {type: String, required: true},
	pubDate: {type: String, required: true},
	//title?
};

var PostSchema = mongoose.Schema(postObject);

var Post = module.exports = mongoose.model('Post', PostSchema);
