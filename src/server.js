var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var bcrypt = require('bcryptjs');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var request = require('request');
var enforce = require('express-sslify');
var pool = require('./public/pool.js');
var adminB = require('./public/adminB.js');

//connect and check mongoDB
var db;
var uri = process.env.MONGODB_URI || 'mongodb://mongo:27017/schlaugh';
MongoClient.connect(uri, function(err, database) {
  if (err) {throw err;}
  else {console.log("MONGO IS ALIVE");
  db = database;
  }
});

// Init App
var app = express();

// Load View Engine
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({limit: '5mb'}));

// Set Public Folder
app.use("/assets", express.static(path.join(__dirname, '../assets')));
app.use("/app", express.static(path.join(__dirname, 'public')));

// Configure cookie-session middleware
app.use(session({
  name: 'session',
  keys: ['SECRETSECRETIVEGOTTASECRET'],
  maxAge: 90 * 24 * 60 * 60 * 1000 // (90 days?)
}))

// enforce https, "trustProtoHeader" is because heroku proxy
// very silly hack to make it not enforce https on local...
if (process.env.MONGODB_URI) {app.use(enforce.HTTPS({ trustProtoHeader: true }))}

// sendgrid email config
var sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);



//*******//HELPER FUNCTIONS//*******//
var checkFreshness = function (user) {  // pushes New pending posts to postlist
  var today = pool.getCurDate();
  if (user['postListUpdatedOn'] !== today) {
    user['postListUpdatedOn'] = today;
    var plp = user.postListPending;
    while (plp[0] && plp[0].date <= today) {
      user.postList.push({
        date: plp[0].date,
        num: plp[0].num,
      });
      plp.splice(0,1);
    }
    return user;
  } else {
    return "fresh!";
  }
}

var checkUpdates = function (user, callback) {  // pushes edits on OLD posts, and BIO
  var today = pool.getCurDate();        // "user"obj MUST have pendingUpdates, posts, bio, and _id props
  if (user.pendingUpdates && user.pendingUpdates.updates && user.pendingUpdates.lastUpdatedOn) {
    if (user.pendingUpdates.lastUpdatedOn !== today) {
      user.pendingUpdates.lastUpdatedOn = today;
      var ref = user.pendingUpdates.updates;
      var count = 0;
      for (var date in ref) {
        if (ref.hasOwnProperty(date)) {
          count++;
          if (date === "bio") {
            user.bio = ref[date];
            delete ref[date];
            count--;
          } else if (user.posts[date]) {
            // check existing tags
            var badTagArr = [];
            for (var tag in user.posts[date][0].tags) {
              if (user.posts[date][0].tags.hasOwnProperty(tag)) {
                if (!ref[date][0].tags[tag]) {       // if the old tag is NOT a new tag too
                  badTagArr.push(tag);
                }
              }
            }
            deleteTagRefs(badTagArr, date, user._id, function (resp) {
              if (resp.error) {return callback({error:resp.error});}
              else {
                count--;
                user.posts[resp.date] = ref[resp.date];         // the line where the update actually happens!
                delete ref[resp.date];
                setTimeout(function () {
                  if (count === 0) {
                    count--;
                    return callback({change:true, user:user});
                  }
                }, 0);
              }
            });
          } else {delete ref[date];}
        }
      }
      if (count === 0) {
        count--;
        return callback({change:true, user:user});
      }
    } else {return callback({change:false, user:user});}
  } else {return callback({change:false, user:user});}
}

var imageValidate = function (arr, res, callback) {
  if (arr.length !== 0) {       // does the post contain images?
    var count = arr.length;
    var bitCount = 104857600;   // 100mb(-ish...maybe)
    for (var i = 0; i < arr.length; i++) {
      (function (index) {
        request.head(arr[index], function (error, resp) {
          if (count > 0) {
            count -=1;
            if (error || resp.statusCode !== 200) {
              count = 0;
              return res.send({error:'the url for image '+(index+1)+' seems to be invalid<br><br>your post has not been saved'});
            } else if (resp.headers['content-type'].substr(0,5) !== "image" && resp.headers.server !== "AmazonS3") {
              count = 0;
              return res.send({error:'the url for image '+(index+1)+' is not a url for an image<br><br>your post has not been saved'});
            } else {bitCount -= resp.headers['content-length'];}
            if (count === 0) {
              if (bitCount < 0) {
                return res.send({error:"your image(s) exceed the byte limit by "+(-bitCount)+" bytes<br><br>your post has not been saved"});
              } else {return callback(res);}
            }
          }
        });
      })(i);
    }     // no images to check
  } else {return callback(res);}
}

var writeToDB = function (userID, data, callback) { // to the USER collection
  if (!ObjectId.isValid(userID)) {return callback({error:"invalid ID format"});}
  db.collection('users').updateOne({_id: ObjectId(userID)},
    {$set: data},
    function(err, user) {
      if (err) {callback({error:err});}
      else {callback({error:false});}
    }
  );
}

var getUserPic = function (user) {
  var userPic = user.iconURI;
  if (typeof userPic !== 'string') {userPic = "";}
  return userPic;
}

var checkObjForProp = function (obj, prop, value) { //and add the prop if it doesn't exist
  if (obj[prop]) {return false}     //note: returns FALSE to indicate no action taken
  else {
    obj[prop] = value;
    return obj;
  }
}

var checkLastTwoMessages = function (t, tmrw, inbound) {
  //'inbound' = true to indicate we are seeking inbound messages, false = outbound
  if (t && t.length !== undefined) {
    var len = t.length;
    if (t[len-1] && t[len-1].date === tmrw) {
      if (t[len-1].inbound === inbound) {
        return len-1;
      } else if (t[len-2] && t[len-2].date === tmrw && t[len-2].inbound === inbound) {
        return len-2;
      }
    }
  }
  //returns false for nothing found, else returns index of hit
  return false;
}

var checkLastTwoForPending = function (thread, remove, text, tmrw, inbound) {
  // ore either of the last two messages in a thread an extant pending message to overwrite?
  var overwrite = function (i) {
    if (remove) {thread.splice(i, 1);}
    else {thread[i].body = text;}
    return thread;
  }
  var x = checkLastTwoMessages(thread, tmrw, inbound);
  //returns false for nothing found, else returns modified thread
  if (x !== false) {return overwrite(x);}
  else {return false;}
}

var bumpThreadList = function (box) {  //bumps pending threads to top of list
  var today = pool.getCurDate();
  if (box.updatedOn !== today) {
    box.updatedOn = today;
    // for each name stored in 'pending',
    for (var x in box.pending) {
      if (box.pending.hasOwnProperty(x)) {
        // remove extant refference in the List, if there is one
        for (var i = 0; i < box.list.length; i++) {
          if (String(box.list[i]) === String(x)) {
            box.list.splice(i, 1);
            break;
          }
        }
        // push to the top(end) of the stack
        box.list.push(x);
        // set the newly bumped threads to unread
        box.threads[x].unread = true;
      }
    }
    // empty the pending collection
    box.pending = {};
    return box;
  } return false; // false indicates no update needed/performed
}

var removeListRefIfRemovingOnlyMessage = function (box, id, remove, tmrw) {
  if (remove && box.threads[id].thread.length < 2) {
    if (!box.threads[id].thread[0] || box.threads[id].thread[0].date === tmrw) {
      for (var i = box.list.length-1; i > -1 ; i--) {
        if (String(box.list[i]) === String(id)) {
          box.list.splice(i, 1);
          return box.list;
        }
      }
    }
  } return false;
}

var getPayload = function (req, res, otherUserID, callback) {
  if (!req.session.user) {return sendError(res, "no user session 0234");}
  else {
    db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
    , {username:1, posts:1, iconURI:1, settings:1, inbox:1, keys:1, following:1, pendingUpdates:1, bio:1, bookmarks:1, collapsed:1, savedTags:1}
    , function (err, user) {
      if (err) {return sendError(res, err);}
      else if (!user) {return sendError(res, "user not found");}
      else {
        var tmrw = pool.getCurDate(-1);
        // check if user needs keys
        if (!user.keys) {return res.send({needKeys:true});}
        var bio = user.bio;
        if (typeof bio !== 'string') {bio = "";}
        if (!user.bookmarks || user.bookmarks.length === undefined) {user.bookmarks = [];}
        if (!user.collapsed || user.collapsed.length === undefined) {user.collapsed = [];}
        if (!user.savedTags || user.savedTags.length === undefined) {user.savedTags = [];}
        var payload = {
          keys: user.keys,
          username: user.username,
          userID: req.session.user._id,
          userPic: getUserPic(user),
          settings: user.settings,
          following: user.following,
          bio: bio,
          bookmarks: user.bookmarks,
          collapsed: user.collapsed,
          savedTags: user.savedTags,
        }
        //pending post
        if (user.posts[tmrw]) {
          payload.pending = user.posts[tmrw][0];
        }
        checkUpdates(user, function (check) {
          if (check.error) {return sendError(res, check.error);}
          user = check.user;
          if (user.pendingUpdates && user.pendingUpdates.updates) {
            payload.pendingUpdates = user.pendingUpdates.updates;
          } else {
            payload.pendingUpdates = {};
          }
          //inbox
          if (user.inbox) {
            var threads = [];
            var bump = bumpThreadList(user.inbox);
            if (bump || check.change) {
              writeToDB(ObjectId(req.session.user._id), user, function () {});
            }
            var list = user.inbox.list;
            //reverse thread order so as to send a list ordered newest to oldest
            for (var i = list.length-1; i > -1; i--) {
              if (user.inbox.threads[list[i]] && user.inbox.threads[list[i]].thread && user.inbox.threads[list[i]].thread.length !== undefined) {
                //check the last two messages of each thread, see if they are allowed
                var x = checkLastTwoMessages(user.inbox.threads[list[i]].thread, tmrw, true);
                if (x !== false) {user.inbox.threads[list[i]].thread.splice(x, 1);}
                // add in the authorID for the FE
                user.inbox.threads[list[i]]._id = list[i];
                // all threads are locked until unlocked on the FE
                user.inbox.threads[list[i]].locked = true;
                threads.push(user.inbox.threads[list[i]]);
              }
            }                     // this data request is from a login on a user page
            if (otherUserID) {    // check if either user is blocking the other
              if (!user.inbox.threads[otherUserID] || (!user.inbox.threads[otherUserID].blocking && !user.inbox.threads[otherUserID].blocked)) {
                // good to go, we need the other users key
                db.collection('users').findOne({_id: otherUserID}
                , {_id:0, keys:1,}
                , function (err, otherUser) {
                  if (err) {return sendError(res, err);}
                  else if (!otherUser) {return sendError(res, "other user not found");}
                  else {
                    if (otherUser.keys) {
                      payload.threads = threads;
                      payload.otherKey = otherUser.keys.pubKey;
                      return callback(payload);
                    }
                  }
                });
              } else {
                payload.threads = threads;
                return callback(payload);
              }
            } else {
              payload.threads = threads;
              return callback(payload);
            }
          } else {
            payload.threads = [];
            return callback(payload);
          }
        });
      }
    });
  }
}

var getSettings = function (req, res, callback) {
  db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
  , {_id:0, settings:1}
  , function (err, user) {
    if (err) {return sendError(res, err);}
    else if (!user) {return sendError(res, "user not found");}
    else {
      var settings = {};
      settings.colors = user.settings.colors;
      settings.font = user.settings.font;
      return callback(settings);
    }
  });
}

var genRandString = function (length) {
  var bank = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var output = "";
  for (var i = 0; i < length; i++) {
    output += bank[Math.floor(Math.random() * (bank.length))];
  }
  return output;
}

var genID = function (clctn, length, callback) {
  var output = genRandString(length);
  db.collection(clctn).findOne({_id: output}, {_id:1}, function (err, record) {
    if (err) {return callback({error:err})}
    else if (record) {return genID(clctn, length, callback);} // collision! try again
    else {return callback({_id:output})}
  });
}

var createPost = function (authorID, callback, date) {    //creates a postID and ref in the postDB
  if (!ObjectId.isValid(authorID)) {return callback({error:"invalid authorID format"});}
  authorID = ObjectId(authorID);
  if (!date) {date = pool.getCurDate(-1)}
  genID('posts', 7, function (resp) {
    if (resp.error) {return callback({error:resp.error});}
    else {
      db.collection('posts').insertOne({
        _id: resp._id,
        date: date,
        authorID: authorID,
        num:0,
      }, {}, function (err, result) {
        if (err) {return callback({error:err});}
        else {return callback({error:false, postID:result.insertedId});}
      });
    }
  });
}

var deletePostFromPosts = function (postID, callback) {
  db.collection('posts').remove({_id: postID},
    function(err, post) {
      if (err) {return callback({error:err});}
      else {return callback({error:false});}
    }
  );
}

var nullPostFromPosts = function (postID, callback) {
  var emptyPost = {date: null, authorID: null,};
  db.collection('posts').updateOne({_id: postID},
    {$set: emptyPost},
    function(err, post) {
      if (err) {return callback({error:err});}
      if (!post) {return callback({error:"post not found in posts"});}
      else {return callback({error:false});}
    }
  );
}

var updateUserPost = function (text, newTags, title, userID, user, res, errMsg, callback) {
  var tmrw = pool.getCurDate(-1);
  if (user.posts[tmrw]) {                               //edit existing
    // check existing tags
    var badTagArr = [];
    for (var tag in user.posts[tmrw][0].tags) {
      if (user.posts[tmrw][0].tags.hasOwnProperty(tag)) {
        if (!newTags[tag]) {          // if the old tag is NOT a new tag too
          badTagArr.push(tag);
        }
      }
    }
    deleteTagRefs(badTagArr, tmrw, userID, function (resp) {
      if (resp.error) {return sendError(res, errMsg+resp.error);}
      else {
        var newTagArr = [];
        for (var tag in newTags) {
          if (newTags.hasOwnProperty(tag)) {
            if (!user.posts[tmrw][0].tags[tag]) { // if the new tag is NOT an old tag too
              newTagArr.push(tag);
            }
          }
        }
        createTagRefs(newTagArr, tmrw, userID, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          else {
            user.posts[tmrw][0].body = text;
            user.posts[tmrw][0].tags = newTags;
            user.posts[tmrw][0].title = title;
            return callback();
          }
        });
      }
    });
  } else {                                  //create new
    createPost(userID, function (resp) {
      if (resp.error) {return sendError(res, errMsg+resp.error);}
      else {
        user.posts[tmrw] = [{
            body: text,
            tags: newTags,
            title: title,
            post_id: resp.postID,
          }];
        user.postListPending.push({date:tmrw, num:0});
        //
        var tagArr = [];
        for (var tag in newTags) {    // add a ref in the tag db for each tag
          if (newTags.hasOwnProperty(tag)) {tagArr.push(tag)}
        }
        createTagRefs(tagArr, tmrw, userID, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          else {return callback();}
        });
      }
    });
  }
}

var deletePost = function (res, errMsg, userID, user, date, callback) {
  if (!user.posts[date]) {return sendError(res, errMsg+"post not found");}
  var deadTags = [];
  for (var tag in user.posts[date][0].tags) {
    if (user.posts[date][0].tags.hasOwnProperty(tag)) {
      deadTags.push(tag);
    }
  }
  deleteTagRefs(deadTags, date, userID, function (resp) {
    if (resp.error) {return sendError(res, errMsg+resp.error);}
    else {
      // is this a pending or an OLD post?
      if (date === pool.getCurDate(-1)) {
        user.postListPending.pop();   //currently assumes that postListPending only ever contains 1 post
        deletePostFromPosts(user.posts[date][0].post_id, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          else {
            delete user.posts[date];
            return writeToDB(userID, user, function (resp) {
              if (resp.error) {return sendError(res, errMsg+resp.error);}
              else {callback({error: false});}
            });
          }
        });
      } else {    // for OLD posts
        for (var i = 0; i < user.postList.length; i++) {
          if (user.postList[i].date === date) {
            user.postList.splice(i, 1);
            break;
          }
        }
        if (user.pendingUpdates && user.pendingUpdates.updates && user.pendingUpdates.updates[date]) {
          delete user.pendingUpdates.updates[date];
        }
        nullPostFromPosts(user.posts[date][0].post_id, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          else {
            delete user.posts[date];
            return writeToDB(userID, user, function (resp) {
              if (resp.error) {return sendError(res, errMsg+resp.error);}
              else {callback({error: false});}
            });
          }
        });
      }
    }
  });
}

var createTagRefs = function (tagArr, date, authorID, callback) {
  if (tagArr.length === 0) {return callback({error:false});}
  if (!ObjectId.isValid(authorID)) {return callback({error:"invalid authorID format"});}
  authorID = ObjectId(authorID);
  // check if dateBucket is extant
  db.collection('tags').findOne({date: date}, {ref:1}
  , function (err, dateBucket) {
    if (err) {return callback({error:err});}
    else if (!dateBucket) {  // dateBucket does not exist, make it
      var newDateBucket = {date: date,};
      newDateBucket.ref = {};
      for (var i = 0; i < tagArr.length; i++) {
        newDateBucket.ref[tagArr[i]] = [authorID];
      }
      db.collection('tags').insertOne(newDateBucket, {}, function (err, result) {
        if (err) {return callback({error:err});}
        else {return callback({error:false});}
      });
    } else {  // dateBucket exists, add to it
      var tagObject = [authorID];
      for (var i = 0; i < tagArr.length; i++) {
        if (!checkObjForProp(dateBucket.ref, tagArr[i], tagObject)) { // is tag extant?
          dateBucket.ref[tagArr[i]].push(authorID);
        }
      }
      db.collection('tags').updateOne({_id: ObjectId(dateBucket._id)},
        {$set: dateBucket},
        function(err, tag) {
          if (err) {return callback({error:err});}
          else {return callback({error:false});}
        }
      );
    }
  });
}

var deleteTagRefs = function (tagArr, date, authorID, callback) {
  if (tagArr.length === 0) {return callback({error:false, date:date});}
  if (!ObjectId.isValid(authorID)) {return callback({error:"invalid authorID format"});}
  authorID = ObjectId(authorID);
  db.collection('tags').findOne({date: date}, {ref:1, top:1}
  , function (err, dateBucket) {
    if (err) {return callback({error:err});}
    if (!dateBucket) {return callback({error:false, date:date});}
    // for each tag to be deleted,
    for (var i = 0; i < tagArr.length; i++) {
      if (dateBucket.ref[tagArr[i]]) {
        var array = dateBucket.ref[tagArr[i]];
        for (var j = 0; j < array.length; j++) {
          if (String(array[j]) === String(authorID)) {
            array.splice(j, 1);
            break;
          }
        }
        if (array.length === 0) {
          if (dateBucket.top && dateBucket.top.length) { //check for extant top tags
            for (var j = 0; j < dateBucket.top.length; j++) {
              if (dateBucket.top[j] === tagArr[j]) {
                dateBucket.top.splice(j, 1);
              }
            }
          }
        }
      }
    }
    db.collection('tags').updateOne({_id: ObjectId(dateBucket._id)},
    {$set: dateBucket},
    function(err, resp) {
      if (err) {return callback({error:err});}
      else {return callback({error:false, date:date});}
    });
  });
}

var parseInboundTags = function (tagString) {
  var tags = {};
  tagString = tagString.replace(/[^ a-zA-Z0-9-_!?@&*%:=+`"'~,]/g, '');
  var arr = tagString.match(/[ a-zA-Z0-9-_!?@&*%:=+`"'~]+/g);
  if (arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i] = arr[i].trim();
      if (arr[i] === '') {
        arr.splice(i,1);
      }
    }
    if (arr.length > 7) {return "this is not actually an 'error', this is just me preventing you from using this many tags. Do you <i>really</i> need this many tags?? Tell staff about this if you have legitimate reason for the limit to be higher. I might have drawn the line too low, i dunno, i had to draw it somewhere.<br><br>beep boop"}
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].length > 140) {return "this is not actually an 'error', it's just one of your tags is very long and I'm preventing you from submitting it. Do you <i>really</i> need that many characters in one tag?? I mean, maybe. Tell staff if you think there is good reason to nudge the limit higher. I just had to draw the line somewhere, lest someone submit the entire text of <i>HPMOR</i> as tags in an attempt to break the site.<br><br>enjoy your breakfast"}
      tags[arr[i]] = true;
    }
  }
  return tags;
}

var validatePostTitle = function (string) {
  if (string.length > 140) {
    return {error: "this is not actually an 'error', this is just me preventing you from making a title this long. Do you really need it to be this long? I mean, maybe. Tell staff if you think there is good reason to nudge the limit higher. I just had to draw the line somewhere, lest someone submit the entire text of <i>Gödel, Escher, Bach</i> as a title in an attempt to break the site.<br><br>have a nice lunch"};
  }
  string = string.replace(/</g, '&lt;');
  string = string.replace(/>/g, '&gt;');
  return string;
}

var sendError = function (res, msg) {
  // PUT error logging stuff HERE

  msg = "ERROR! SORRY! Please screenshot this and note all details of the situation and tell staff. SORRY<br><br>" + msg;
  res.send({error: msg});
}

var postsFromAuthorListAndDate = function (authorList, date, init, callback) {
  // for getting posts by following for main feed, and all posts with tag on date
  db.collection('users').find({_id: {$in: authorList}}
    ,{posts:1, username:1, iconURI:1, pendingUpdates:1, bio:1}).toArray(function(err, users) {
    if (err) {return callback({error:err});}
    else {
      var followingList = [];
      if (init) {
        for (var i = 0; i < users.length; i++) {
          var pic = users[i].iconURI;
          if (typeof pic !== 'string') {pic = "";}
          followingList.push({
            name: users[i].username,
            _id: users[i]._id,
            pic: pic,
          });
        }
      }
      var posts = [];
      var count = users.length;
      for (var i = 0; i < users.length; i++) {
        if (users[i].posts && users[i].posts[date]) {
          checkUpdates(users[i], function (resp) {
            if (resp.error) {return callback({error:resp.error})}
            var authorPic = getUserPic(resp.user);
            var post_id = null;
            if (resp.user.posts[date][0].post_id) {post_id = resp.user.posts[date][0].post_id}
            posts.push({
              body: resp.user.posts[date][0].body,
              tags: resp.user.posts[date][0].tags,
              post_id: post_id,
              author: resp.user.username,
              authorPic: authorPic,
              _id: resp.user._id,
              date: date,
              title: resp.user.posts[date][0].title
            });
            count--;
            if (count === 0) {
              count--;
              return callback({error:false, posts:posts, followingList:followingList});
            }
          });
        } else {count--;}
      }
      if (count === 0) {return callback({error:false, posts:posts, followingList:followingList});}
    }
  });
}

var postsFromListOfAuthorsAndDates = function (postList, callback) {
  // this is for bookmarkLists and sequences
  // parse postList into authorList and postRef
  var postRef = {}
  for (var i = 0; i < postList.length; i++) {
    var listing = {date:postList[i].date ,pos:i};
    if (postRef[postList[i].author_id]) {
      postRef[postList[i].author_id].push(listing)
    } else {
      postRef[postList[i].author_id] = [listing];
    }
  }
  var authorList = [];
  for (var author in postRef) {
    if (postRef.hasOwnProperty(author)) {
      authorList.push(ObjectId(author));
    }
  }
  db.collection('users').find({_id: {$in: authorList}}
    ,{posts:1, username:1, iconURI:1, pendingUpdates:1, bio:1}).toArray(function(err, users) {
    if (err) {return callback({error:err});}
    else {
      var posts = [];
      var count = users.length;
      for (var i = 0; i < users.length; i++) {
        checkUpdates(users[i], function (resp) {
          if (resp.error) {return callback({error:resp.error})}
          var authorPic = getUserPic(resp.user);
          //
          for (var j = 0; j < postRef[resp.user._id].length; j++) {
            var date = postRef[resp.user._id][j].date;
            if (resp.user.posts[date] && date <= pool.getCurDate()) {
              var post_id = null;
              if (resp.user.posts[date][0].post_id) {post_id = resp.user.posts[date][0].post_id}
              posts[postRef[resp.user._id][j].pos] = {
                body: resp.user.posts[date][0].body,
                tags: resp.user.posts[date][0].tags,
                title: resp.user.posts[date][0].title,
                post_id: post_id,
                author: resp.user.username,
                authorPic: authorPic,
                _id: resp.user._id,
                date: date,
              };
            } else {  // post not found
              posts[postRef[resp.user._id][j].pos] = {
                body: "<c><b>***post has been deleted by author***</b></c>",
                tags: {},
                post_id: genRandString(8),
                author: resp.user.username,
                authorPic: authorPic,
                _id: resp.user._id,
                date: date,
              };
            }
          }
          count--;
          if (count === 0) {
            count--;
            return callback({error:false, posts:posts,});
          }
        });
      }
      if (count === 0) {
        return callback({error:false, posts:posts,});
      }
    }
  });
}

var getAuthorListFromTagListAndDate = function (tagList, date, callback) {
  var authorList = [];
  if (!tagList || !tagList.length || !date) {
    return callback({error: false, authorList: authorList});
  }
  db.collection('tags').findOne({date: date}, {_id:0, ref:1}
  , function (err, dateBucket) {
    if (err) {return callback({error:err});}
    else {
      if (!dateBucket) {
        return callback({error: false, authorList: authorList});
      } else {
        for (var i = 0; i < tagList.length; i++) {
          if (dateBucket.ref[tagList[i]]) {
            authorList = authorList.concat(dateBucket.ref[tagList[i]]);
          }
        }
        return callback({error: false, authorList: authorList});
      }
    }
  });
}

var insertIntoArray = function (array, index, item) {
  var before = array.slice(0,index);
  before.push(item);
  var after = array.slice(index);
  return before.concat(after);
}

var getTopTags = function (ref) { //input ref of a date of tags
  // DEPRECIATED, this is only called by admin, leave so admin can see all used tags???
  // MISNOMER, this now just returns an ordered(by usage freq) list of ALL tags
  var arr = [];
  for (var tag in ref) {
    if (ref.hasOwnProperty(tag)) {
      if (ref[tag] && ref[tag].length) {
        if (arr.length === 0) {
          arr[0] = {tag: tag, count: ref[tag].length};
        } else {
          for (var i = arr.length-1; i > -1 ; i--) {
            if (ref[tag].length > arr[i].count || ref[tag].length === arr[i].count) {
              if (i === 0) {
                arr = insertIntoArray(arr, 0, {tag: tag, count: ref[tag].length});
              }
            } else {    // less than
              arr = insertIntoArray(arr, i+1, {tag: tag, count: ref[tag].length});
              break;
            }
          }
        }
      }
    }
  }
  return arr;
}

var genInboxTemplate = function () {
  return {threads: {}, list: [], updatedOn: pool.getCurDate(), pending: {}};
}

var idCheck = function (req, res, errMsg, callback) {
  if (!req.session.user) {return sendError(res, errMsg+"no user session 6481");}
  if (!ObjectId.isValid(req.session.user._id)) {return sendError(res, errMsg+"invalid userID format");}
  return callback(ObjectId(req.session.user._id));
}

var snakeBank = [
  "https://i.imgur.com/2DEHbtK.png",
  "https://i.imgur.com/3djrDDm.png",
  "https://i.imgur.com/gocod1S.png",
  "https://i.imgur.com/7EwkTXq.jpg",
  "https://i.imgur.com/if3IEqG.jpg",
  "https://i.imgur.com/NQOT1Fc.jpg",
];

//*******//ROUTING//*******//

// admin
var devFlag = false;
  // ^ NEVER EVER LET THAT BE TRUE ON THE LIVE PRODUCTION VERSION, FOR LOCAL TESTING ONLY
var adminGate = function (req, res, callback) {
  if (devFlag) {return callback(res);}
  if (!req.session.user) {
    renderLayout(req, res, {post_id: false});
  } else {
    db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
    , {_id:0, username:1, codes:1 }
    , function (err, user) {
      if (err) {return sendError(res, err);}
      else if (user && user.username === "admin") {callback(res, user);} //no need to pass 'user' once we take out the code nonsense
      else {
        return renderLayout(req, res, {post_id: false});
      }
    });
  }
}

app.get('/admin', function(req, res) {
  adminGate(req, res, function (res, user) {
    var results = pool.runTests(
      [ //array of arrays, each inner array contains two statements that are supposed to be equal
        [devFlag, false, "IN DEV MODE"],
        [pool.userNameValidate(), "empty string is not a valid username, sorry", "pool.userNameValidate()"],
        [pool.userNameValidate(0), false, "pool.userNameValidate(0)"],
        //
        [checkObjForProp({a: 23}, 'a', 23), false],
        [checkObjForProp({b: 12}, 'a', 23).a, 23],
        [checkObjForProp({b: 12}, 'a', 23).b, 12],
        //
        [checkLastTwoForPending([], false, "farts", 5, false), false],
        [checkLastTwoForPending([{date:2, inbound:true},{date:2, inbound:true},{date:2, inbound:true}], false, "farts", 5, false), false],
        [checkLastTwoForPending([{date:5, inbound:true},{date:2, inbound:true},{date:2, inbound:true}], false, "farts", 5, false), false],
        [checkLastTwoForPending([{date:5, inbound:true},{date:5, inbound:true},{date:5, inbound:true}], false, "farts", 5, false), false],
        [checkLastTwoForPending([{date:5, inbound:true},{date:5, inbound:true},{date:5, inbound:false}], false, "farts", 5, false)[2].body, "farts"],
        [checkLastTwoForPending([{date:5, inbound:true},{date:5, inbound:true},{date:5, inbound:false}], false, "farts", 5, false)[1].body, undefined],
        [checkLastTwoForPending([{date:5, inbound:true},{date:5, inbound:false},{date:5, inbound:true}], false, "farts", 5, false)[2].body, undefined],
        [checkLastTwoForPending([{date:5, inbound:true},{date:5, inbound:false},{date:5, inbound:true}], false, "farts", 5, false)[1].body, "farts"],
        //
        [bumpThreadList({updatedOn: pool.getCurDate(), pending:{5454:true, 1234:true, 9876:true}, list:[5454, 1234, 9876]}), false],
        [bumpThreadList({updatedOn: pool.getCurDate(1), threads:{5454:{unread:true}, 1234:{unread:true}, 9876:{unread:true}}, pending:{5454:true, 1234:true, 9876:true}, list:[5454, 1234, 9876]}).list.length, 3],
        [bumpThreadList({updatedOn: pool.getCurDate(1), threads:{5454:{unread:true}, 1234:{unread:true}, 9876:{unread:true}}, pending:{5454:true, 1234:true, 9876:true}, list:[]}).list.length, 3],
        [bumpThreadList({updatedOn: pool.getCurDate(1), threads:{5454:{unread:true}, 1234:{unread:true}, 9876:{unread:true}}, pending:{5454:true, 1234:true, 9876:true}, list:[54545, 12354, 9876]}).list.length, 5],
        //
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[]},3:{}}, list:[1,2,3]}, 2, true, 3).length, 2],
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[7,7,7,7]},3:{}}, list:[1,2,3]}, 2, true, 3), false],
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[{date:8}]},3:{}}, list:[1,2,3]}, 2, true, 3), false],
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[{date:3}]},3:{}}, list:[8,6,1,2,3]}, 2, true, 3).length, 4],
        //
      ]
    );
    if (!devFlag) {return res.render('admin', { codes:user.codes, results:results });}
    else {res.render('admin', { results:results });}
  });
});

app.post('/admin/posts', function(req, res) {
  adminGate(req, res, function (res, user) {
    //var fields = {_id:1, body:1, date:1, authorID:1, tags:1};
    //fields[req.body.text] = 1;
    db.collection('posts').find({},{}).toArray(function(err, posts) {
      if (err) {return sendError(res, err);}
      else {
        return res.send(posts);
      }
    });
  });
});

app.post('/admin/resetCodes', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('resetCodes').find({},{code:1, username:1, attempts:1, creationTime:1}).toArray(function(err, posts) {
      if (err) {return sendError(res, err);}
      else {
        return res.send(posts);
      }
    });
  });
});

app.post('/admin/tags', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('tags').findOne({date: req.body.date}, {_id:0,}
    , function (err, dateBucket) {
      if (err) {return res.send({error:err});}
      else {
        if (!dateBucket) {return res.send({error:"not found"});}
        if (!dateBucket.top) {
          dateBucket.genndTop = getTopTags(dateBucket.ref);
        }
        return res.send(dateBucket);
      }
    });
  });
});

app.post('/admin/users', function(req, res) {
  adminGate(req, res, function (res, user) {
    var fields = {_id:1, username:1};
    fields[req.body.text] = 1;
    db.collection('users').find({}, fields).toArray(function(err, users) {
      if (err) {return sendError(res, err);}
      else {
        return res.send(users);
      }
    });
  });
});

app.post('/admin/user', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').findOne({username: req.body.name}, {}
    , function (err, user) {
      if (err) {return sendError(res, err);}
      else if (!user) {return res.send({error:"user not found"});}
      else {return res.send(user);}
    });
  });
});

app.post('/admin/faq', function(req, res) {
  adminGate(req, res, function (res, user) {
    var x = pool.cleanseInputText(req.body.text);
    var faq = {
      name: 'faq',
      text: x[1],
    }
    db.collection('siteStuff').findOne({name: "faq"}, {}, function (err, doc) {
      if (err) {return sendError(res, err);}
      else if (doc) {
        db.collection('siteStuff').updateOne({name: "faq"},
          {$set: faq},
          function(err, doc) {
            if (err) {return sendError(res, err);}
            else {res.send({error:false});}
          }
        );
      } else {
        db.collection('siteStuff').insertOne(faq, {}, function (err, result) {
          if (err) {return sendError(res, err);}
          else {res.send({error:false});}
        });
      }
    });
  });
});

app.post('/admin/followStaff', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').find({},{_id:1, following:1}).toArray(function(err, users) {
      if (err) {return sendError(res, err);}
      else {
        var count = users.length;
        for (var i = 0; i < users.length; i++) {
          users[i].following = [ObjectId("5a0ea8429adb2100146f7568")];
          writeToDB(users[i]._id, users[i], function () {
            count--;
            if (count === 0) {
              res.send({error:false});
            }
          });
        }
      }
    });
  });
});

app.post('/admin/resetTest', function(req, res) {
  adminGate(req, res, function (res, user) {

    var today = pool.getCurDate();
    var ystr = pool.getCurDate(1);
    var ystr2 = pool.getCurDate(2);
    //var tmrw = pool.getCurDate(-1);

    var posts = {};
    posts[today] = [{body: "<r><r><r>a"}];
    posts[ystr] = [{body: "testPost2"}];
    posts[ystr2] = [{body: "<b>Lorem ipsum dolor sit amet, cunsectetur adipiscing elit. In tristique congue aliquet. Phasellus rutrum sit amet nisi sed lacinia. </b>Maecenas porta pulvinar vestibulum. Integer quis elit quam. <c>Etiam quis urna id lacus pulvinar tincidunt.</c> Quisque semper risus eget elit ornare, eu finibus lectus vulputate. Ut tortor leo, rutrum et facilisis et, imperdiet ut metus. Maecenas accumsan &lt;i>fringilla lorem, vitae pretium ligula varius at.</i> Proin ex tellus, venenatis vehicula venenatis in, pulvinar eget ex."}];
    var postList = [{date: ystr2, num: 0},{date: ystr, num: 0},{date: today, num: 0}];
    var postListPending = [];

    var mrah = {
      posts: posts,
      postList: postList,
      postListPending: postListPending,
    }
    mrah._id = ObjectId('000000000000000000000003');
    db.collection('users').updateOne({_id: mrah._id},
      {$set: mrah},
      {upsert: true},
      function(err, user) {
        if (err) {return sendError(res, err);}
        else { res.send({error:false}); }
      }
    );
  });
});

app.post('/admin/removeUser', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').remove({username: req.body.name},
      function(err, user) {
        if (err) {return sendError(res, err);}
        else {
          res.send({error:false});
        }
      }
    );
  });
});

/*app.post('/admin/removePost', function(req, res) { //only from the post db...don't use this
  adminGate(req, res, function (res, user) {
    deletePostFromPosts(req.body._id, function (result) {
      res.send(result);
    });
  });
});*/

app.post('/admin/makePostIDs', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').findOne({username: req.body.name}, {posts:1,}
    , function (err, user) {
      if (err) {return sendError(res, err);}
      else if (!user) {return res.send({error:"user not found"});}
      else {
        if (req.body.date && user.posts[req.body.date] && user.posts[req.body.date][0]) {
          createPost(user._id, function (resp) {
            if (resp.error) {sendError(res, resp.error);}
            else {
              user.posts[req.body.date][0].post_id = resp.postID;
              writeToDB(user._id, user, function (resp) {
                if (resp.error) {sendError(res, resp.error);}
                else {res.send({error:false, newID: user.posts[req.body.date][0].post_id});}
              });
            }
          }, req.body.date);
        } else {
          return res.send({error:"post not found"});
        }
      }
    });
  });
});

app.post('/admin/getPost', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('posts').findOne({_id: req.body._id},
      function(err, post) {
        if (err) {return res.send({error:err});}
        if (!post) {return res.send({error:"post not found"});}
        var userID = ObjectId(post.authorID);
        db.collection('users').findOne({_id: userID}
        , {_id:0, posts:1,}
        , function (err, user) {
          if (err) {return sendError(res, err);}
          else if (!user) {return sendError(res, "user not found");}
          else {return res.send({error:false, post:user.posts[post.date][0]});}
        });
      }
    );
  });
});

app.post('/admin/editPost', function(req, res) {  // HARD CODED TO EDIT POSTS(body)
  adminGate(req, res, function (res, user) {
    db.collection('posts').findOne({_id: req.body._id},
      function(err, post) {
        if (err) {return res.send({error:err});}
        if (!post) {return res.send({error:"post not found"});}
        var userID = ObjectId(post.authorID);
        db.collection('users').findOne({_id: userID}
          , {_id:0, posts:1,}
          , function (err, user) {
            if (err) {return sendError(res, err);}
            else if (!user) {return sendError(res, "user not found");}
            else {
              user.posts[post.date][0].body = req.body.input;
              writeToDB(userID, user, function (resp) {
                if (resp.error) {return res.send({error:resp.error});}
                else {return res.send({error:false, post:user.posts[post.date][0]});}
              });
            }
        });
      }
    );
  });
});

app.post('/admin/testEmail', function(req, res) {
  adminGate(req, res, function (res, user) {

  res.send({error:false});
  });
});

/*app.post('/admin/staffCheat', function(req, res) {
  adminGate(req, res, function (res, user) {
    var userID = ObjectId("5a0ea8429adb2100146f7568");
    db.collection('users').findOne({_id: userID}
    , {_id:0, posts:1, postList:1, postListPending:1}
    , function (err, user) {
      if (err) {return sendError(res, err);}
      else {
        checkFreshness(user);
        var today = pool.getCurDate();

        var updatezUserPost = function (text) {
          user.posts[today] = [{
            body: text,
            tags: {}
          }];
          var num = user.posts[today].length-1;
          user.postList.push({
            date: today,
            num: num
          });
        }

        var x = pool.cleanseInputText(req.body.text);
        imageValidate(x[0], res, function (res) {
          updatezUserPost(x[1]);
          return writeToDB(userID, user, function () {res.send([true, x[1]]);});
        });
      }
    });
  });
});*/

/*app.post('/admin', function(req, res) {      // add new codes
  if (req.session.user) {
    var userID = ObjectId(req.session.user._id)
    db.collection('users').findOne({_id: userID}
      , {_id:0, username:1, codes:1}
      , function (err, admin) {
        if (err) {return sendError(res, err);}
        else if (!admin || admin.username !== "admin") {
          res.render('layout', {pagename:'404', type:'user'});
        } else {
          if (!admin.codes) {admin.codes = {};}
          admin.codes[req.body.code] = true;
          db.collection('users').updateOne({_id: userID},
            {$set: admin },
            function(err, user) {
              if (err) {return sendError(res, err);}
              else {res.render('admin', { codes: admin.codes });}
            }
          );
        }
      }
    );
  } else {
    res.render('layout', {pagename:'404', type:'user'});
  }
});*/



// main page, and panels
app.get('/', function(req, res) {
  renderLayout(req, res, {panel:"posts"});
});
app.get('/~writePanel', function(req, res) {
  renderLayout(req, res, {panel:"write"});
});
app.get('/~inboxPanel', function(req, res) {
  renderLayout(req, res, {panel:"inbox"});
});
app.get('/~settingsPanel', function(req, res) {
  renderLayout(req, res, {panel:"settings"});
});

// payload
app.get('/~payload', function(req, res) {
  // for the "cookieless" version this should be a POST
  if (!req.session.user) {return sendError(res, "no user session 7194");}
  else {
    getPayload(req, res, null, function (payload) {
      return res.send({payload:payload});
    });
  }
});

// new/edit/delete (current) post
app.post('/', function(req, res) {
  var errMsg = "your post might not be saved, please copy all of your text to be safe<br><br>";
  if (!req.session.user) {return sendError(res, errMsg+"no user session 1652");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, posts:1, postList:1, postListPending:1}
  , function (err, user) {
    if (err) {return sendError(res, err);}
    else if (!user) {return sendError(res, errMsg+"user not found");}
    else {
      checkFreshness(user);
      var tmrw = pool.getCurDate(-1);
      var x = pool.cleanseInputText(req.body.text);
      if (x.error || x[1] === "") {                 //remove pending post, do not replace
        deletePost(res, errMsg, userID, user, tmrw, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          else {return res.send({error:false, text:"", tags:{}, title:""});}
        });
      } else {
        var tags = parseInboundTags(req.body.tags);
        if (typeof tags === 'string') {return sendError(res, errMsg+tags);}
        var title = validatePostTitle(req.body.title);
        if (title.error) {return sendError(res, errMsg+title.error);}
        imageValidate(x[0], res, function (res) {
          updateUserPost(x[1], tags, title, userID, user, res, errMsg, function () {
            return writeToDB(userID, user, function (resp) {
              if (resp.error) {return sendError(res, errMsg+resp.error);}
              else {return res.send({error:false, text:x[1], tags:tags, title:title});}
            });
          });
        });
      }
    }
  });
});

// new/edit/delete a pending edit to an old post, also handles bios
app.post('/editOldPost', function (req, res) {
  var errMsg = "the post was not successfully edited<br><br>";
  if (!req.body.post_id || !req.body.date) {return sendError(res, errMsg+"malformed request 154");}
  if (req.body.post_id !== "bio" && req.body.date > pool.getCurDate()) {return sendError(res, errMsg+"you would seek to edit your future? fool!");}
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
    , {_id:0, posts:1, postList:1, postListPending:1, pendingUpdates:1, bio:1}
    , function (err, user) {
      if (err) {return sendError(res, errMsg+err);}
      else if (!user) {return sendError(res, errMsg+"user not found");}
      else {
        checkFreshness(user); //in case they want to edit a post from today that is still in pendingList
        // pending updates MUST be fresh when we add to it, else all goes to shit
        checkUpdates(user, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          user = resp.user;
          // before changing anything, verify the postID corresponds with the date
          if ((req.body.date === "bio" && req.body.post_id === "bio") || (user.posts[req.body.date] && user.posts[req.body.date][0].post_id === req.body.post_id)) {
            var x = pool.cleanseInputText(req.body.text);
            if (x.error || x[1] === "") {                 // delete
              if (user.pendingUpdates && user.pendingUpdates.updates && user.pendingUpdates.updates[req.body.date]) {
                delete user.pendingUpdates.updates[req.body.date];
                return writeToDB(userID, user, function (resp) {
                  if (resp.error) {return sendError(res, errMsg+resp.error);}
                  else {return res.send({error:false, body:"", tags:{}, title:""});}
                });
              } else {return sendError(res, errMsg+"edit not found");}
            } else {                                      // new/edit
              var today = pool.getCurDate();
              if (!user.pendingUpdates) {user.pendingUpdates = {updates:{}, lastUpdatedOn:today};}
              if (!user.pendingUpdates.updates) {user.pendingUpdates.updates = {};}
              if (!user.pendingUpdates.lastUpdatedOn) {user.pendingUpdates.lastUpdatedOn = today;}
              //
              if (req.body.post_id !== "bio") {
                var tags = parseInboundTags(req.body.tags);
                if (typeof tags === 'string') {return sendError(res, errMsg+tags);}
                var title = validatePostTitle(req.body.title);
                if (title.error) {return sendError(res, errMsg+title.error);}
              } else {
                var tags = {};
                var title = "";
              }
              imageValidate(x[0], res, function (res) {
                if (req.body.post_id === "bio") {
                  var newPost = x[1];
                } else {
                  var newPost = [{
                    body: x[1],
                    tags: tags,
                    title: title,
                    post_id: req.body.post_id,
                    edited: true,
                  }];
                }
                user.pendingUpdates.updates[req.body.date] = newPost;
                return writeToDB(userID, user, function (resp) {
                  if (resp.error) {return sendError(res, errMsg+resp.error);}
                  else {return res.send({error:false, body:x[1], tags:tags, title:title});}
                });
              });
            }
          } else {return sendError(res, errMsg+"postID and date miscoresponce");}
        });
      }
    });
  });
});

// delete an already posted(non pending) post, also bio
app.post('/deleteOldPost', function (req, res) {
  var errMsg = "the post was not successfully deleted<br><br>";
  if (!req.body.post_id || !req.body.date) {return sendError(res, errMsg+"malformed request 813");}
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
    , {_id:0, posts:1, postList:1, postListPending:1, pendingUpdates:1, bio:1}
    , function (err, user) {
      if (err) {return sendError(res, err);}
      else if (!user) {return sendError(res, errMsg+"user not found");}
      else {
        if (req.body.date === "bio" && req.body.post_id === "bio") {
          user.bio = "";
          writeToDB(userID, user, function (resp) {
            if (resp.error) {return sendError(res, errMsg+resp.error);}
            else {return res.send({error: false});}
          });
        } else {
          checkFreshness(user); //in case they want to delete a post from today that is still in pendingList
          // before changing anything, verify the postID corresponds with the date
          if (user.posts[req.body.date] && user.posts[req.body.date][0].post_id === req.body.post_id) {
            deletePost(res, errMsg, userID, user, req.body.date, function (resp) {
              if (resp.error) {return sendError(res, errMsg+resp.error);}
              else {return res.send({error:false});}
            });
          } else {return sendError(res, errMsg+"postID and date miscoresponce");}
        }
      }
    });
  });
});

// get posts of following/with tracked tag, for a date
app.post('/posts/:date', function(req, res) {
  var errMsg = "error retrieving the posts of following<br><br>";
  if (!req.params.date) {return sendError(res, errMsg+"malformed request 412");}
  else if (req.params.date > pool.getCurDate()) {return res.send({error:false, posts:[{body: 'DIDYOUPUTYOURNAMEINTHEGOBLETOFFIRE', author:"APWBD", authorPic:"https://t2.rbxcdn.com/f997f57130195b0c44b492b1e7f1e624", _id: "5a1f1c2b57c0020014bbd5b7", key:adminB.dumbleKey}]});}
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
    , {_id:0, following:1, savedTags:1}
    , function (err, user) {
      if (err) {return sendError(res, errMsg+err);}
      else if (!user) {return sendError(res, errMsg+"user not found");}
      else {
        //
        if (req.body.init) {var init = true;}
        else {var init = false;}
        if (!user.following || !user.following.length) {user.following = [];}
        if (!user.savedTags || !user.savedTags.length) {user.savedTags = [];}
        getAuthorListFromTagListAndDate(user.savedTags, req.params.date, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          else {
            var authorList = resp.authorList.concat(user.following);
            postsFromAuthorListAndDate(authorList, req.params.date, init, function (resp) {
              if (resp.error) {return sendError(res, errMsg+resp.error);}
              else {
                return res.send({error:false, posts:resp.posts, followingList:resp.followingList, tagList:user.savedTags});
              }
            });
          }
        });
      }
    });
  });
});

// get posts of bookmarks
app.get('/bookmarks', function(req, res) {
  var errMsg = "bookmark list not successfully retrieved<br><br>";
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
    , {_id:0, bookmarks:1,}
    , function (err, user) {
      if (err) {return sendError(res, errMsg+err);}
      else if (!user) {return sendError(res, errMsg+"user not found");}
      else {
        if (!user.bookmarks || user.bookmarks.length === undefined) {
          return res.send({error:false, posts:[],});
        } else {
          postsFromListOfAuthorsAndDates(user.bookmarks, function (resp) {
            if (resp.error) {return sendError(res, errMsg+resp.error);}
            else {return res.send({error:false, posts:resp.posts,});}
          });
        }
      }
    });
  });
});

// add/remove to/from bookmarks
app.post('/bookmarks', function(req, res) {
  var errMsg = "bookmark list not successfully updated<br><br>";
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
      , {_id:0, bookmarks:1}
      , function (err, user) {
        if (err) {return sendError(res, errMsg+err);}
        else if (!user) {return sendError(res, errMsg+"user not found");}
        else {
          if (!req.body || !req.body.author_id || !req.body.date) {return sendError(res, errMsg+"malformed request 644");}
          if (req.body.date > pool.getCurDate()) {return sendError(res, errMsg+"pretty sneaky sis");}
          if (!user.bookmarks || user.bookmarks.length === undefined) {user.bookmarks = [];}
          var found = false;
          for (var i = 0; i < user.bookmarks.length; i++) {
            if (String(user.bookmarks[i].author_id) === String(req.body.author_id) && user.bookmarks[i].date === req.body.date) {
              found = true;
              if (req.body.remove) {
                user.bookmarks.splice(i, 1);
                i--;
              }
            }
          }
          if (!found && req.body.remove) {
            user.bookmarks.push({
              author_id: ObjectId(req.body.author_id),
              date: req.body.date
            });
          }
          writeToDB(userID, user, function (resp) {
            if (resp.error) {sendError(res, errMsg+resp.error);}
            else {res.send({error: false});}
          });
        }
      });
  });
});

// save/unsave tags
app.post('/saveTag', function(req, res) {
  var errMsg = "tag not successfully saved<br><br>";
  if (!req.body || !req.body.tag) {return sendError(res, errMsg+"malformed request 552");}
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
      , {_id:0, savedTags:1}
      , function (err, user) {
        if (err) {return sendError(res, errMsg+err);}
        else if (!user) {return sendError(res, errMsg+"user not found");}
        else {
          if (!user.savedTags || user.savedTags.length === undefined) {user.savedTags = [];}
          var found = false;
          for (var i = 0; i < user.savedTags.length; i++) {
            if (user.savedTags[i] === req.body.tag) {
              found = true;
              if (req.body.remove) {
                user.savedTags.splice(i, 1);
                i--;
              }
            }
          }
          if (!found && !req.body.remove) {
            user.savedTags.push(req.body.tag);
          }
          writeToDB(userID, user, function (resp) {
            if (resp.error) {sendError(res, errMsg+resp.error);}
            else {res.send({error: false});}
          });
        }
      });
  });
});

// follow/unfollow
app.post('/follow', function(req, res) {
  var errMsg = "following list not successfully updated<br><br>";
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
      , {_id:0, following:1}
      , function (err, user) {
        if (err) {return sendError(res, errMsg+err);}
        else if (!user) {return sendError(res, errMsg+"user not found");}
        else {
          if (!req.body || !req.body.id) {return sendError(res, errMsg+"malformed request 283");}
          // make sure they even have a following array
          if (!user.following || user.following.length === undefined) {user.following = [];}
          if (req.body.remove) {
            for (var i = 0; i < user.following.length; i++) {
              if (String(user.following[i]) === String(req.body.id)) {
                user.following.splice(i, 1);
                i--;
              }
            }
          } else {
            user.following.push(ObjectId(req.body.id));
          }
          writeToDB(userID, user, function (resp) {
            if (resp.error) {sendError(res, errMsg+resp.error);}
            else {res.send({error: false});}
          });
        }
      });
  });
});

// new/edit/delete message
app.post('/inbox', function(req, res) {
  var errMsg = "your message may not be saved, please copy your text if you want to keep it<br><br>";
  if (!req.session.user) {return sendError(res, errMsg+"no user session 3653");}
  // the incoming text is encrypted, so we can not cleanse it
  if (typeof req.body.encSenderText === undefined || typeof req.body.encRecText === undefined) {return sendError(res, errMsg+"malformed request 188<br><br>"+req.body.encSenderText+"<br><br>"+req.body.encRecText);}
  var recipientID = String(req.body.recipient);
  var senderID = String(req.session.user._id);
  if (recipientID === senderID) {return sendError(res, errMsg+"you want to message yourself??? freak.");}
  // make both sender and recipient DB calls first
  db.collection('users').findOne({_id: ObjectId(senderID)}
  , {_id:0, inbox:1, username:1, keys:1, iconURI:1,}
  , function (err, sender) {
    if (err) {return sendError(res, errMsg+err);}
    else if (!sender) {return sendError(res, errMsg+"sender not found");}
    else {
      if (!sender.keys) {return sendError(res, errMsg+"missing sender key<br><br>"+sender.keys);}
      db.collection('users').findOne({_id: ObjectId(recipientID)}
      , {_id:0, inbox:1, username:1, keys:1, iconURI:1,}
      , function (err, recipient) {
        if (err) {return sendError(res, errMsg+err);}
        else if (!recipient) {return sendError(res, errMsg+"recipient not found");}
        else {
          //
          if (!recipient.keys) {return sendError(res, errMsg+"missing recipient key<br><br>"+recipient.keys);}
          var tmrw = pool.getCurDate(-1);
          var overwrite = false;
          var noReKey = true;
          // update the sender's end first
          var inboxTemplate = genInboxTemplate();
          checkObjForProp(sender, 'inbox', inboxTemplate);
          //
          var recipientPic = recipient.iconURI;
          if (typeof recipientPic !== 'string') {recipientPic = "";}
          // if the sender does not already have a thread w/ the recipient, create one
          if (checkObjForProp(sender.inbox.threads, recipientID, {name:recipient.username, unread:false, image:recipientPic, thread:[], key:recipient.keys.pubKey})) {
            // and create the corresponding refference on the list
            sender.inbox.list.push(recipientID);
          } else {
            // there is an extant thread, so
            // is either person blocking the other?
            if (sender.inbox.threads[recipientID].blocking || sender.inbox.threads[recipientID].blocked) {
              return sendError(res, errMsg+"this message is not allowed");
            }
            // check/update the key
            if (!sender.inbox.threads[recipientID].key || sender.inbox.threads[recipientID].key !== recipient.keys.pubKey) {
              // key is OLD AND BAD, head back to FE w/ new Key to re-encrypt
              noReKey = false;
              sender.inbox.threads[recipientID].key = recipient.keys.pubKey;
              writeToDB(senderID, sender, function (resp) {
                if (resp.error) {return sendError(res, errMsg+resp.error);}
                else {return res.send({error:false, reKey:recipient.keys.pubKey});}
              });
            } else {
              // check the last two items, overwrite if there is already a pending message
              if (checkLastTwoForPending(sender.inbox.threads[recipientID].thread, req.body.remove, req.body.encSenderText, tmrw, false)) {
                overwrite = true;
                removeListRefIfRemovingOnlyMessage(sender.inbox, recipientID, req.body.remove, tmrw);
              }
              // check that there is a ref on the list, (an extant thread does not nec. imply this)
              if (!req.body.remove) {
                var foundMatch = false;
                for (var i = 0; i < sender.inbox.list.length; i++) {
                  if (String(sender.inbox.list[i]) === String(recipientID)) {
                    foundMatch = true;
                    break;
                  }
                }
                if (!foundMatch) {sender.inbox.list.push(recipientID);}
              }
              // check/update the thread "name"
              if (!sender.inbox.threads[recipientID].name || sender.inbox.threads[recipientID].name !== recipient.username) {
                sender.inbox.threads[recipientID].name = recipient.username;
              }
              // check/update pic
              if (!sender.inbox.threads[recipientID].image || sender.inbox.threads[recipientID].image !== recipientPic) {
                sender.inbox.threads[recipientID].image = recipientPic;
              }
            }
          }
          if (!overwrite) { //no message to overwrite, so push new message
            sender.inbox.threads[recipientID].thread.push({
              inbound: false,
              date: tmrw,
              body: req.body.encSenderText,
            });
          }

          if (noReKey) {
            // AND AGAIN: now update the symetric data on the recipient's side
            if (!checkObjForProp(recipient, 'inbox', inboxTemplate)) {
              bumpThreadList(recipient.inbox);
            }
            var senderPic = sender.iconURI;
            if (typeof senderPic !== 'string') {senderPic = "";}
            // if the recipient does not already have a thread w/ the sender, create one
            if (!checkObjForProp(recipient.inbox.threads, senderID, {name:sender.username, unread:false, image:senderPic, thread:[], key:sender.keys.pubKey})) {
              // there is an extant thread, so
              // is either person blocking the other?
              if (recipient.inbox.threads[senderID].blocking || recipient.inbox.threads[senderID].blocked) {
                return sendError(res, errMsg+"this message is not allowed");
              }
              // check the last two items, overwrite if there is already a pending message
              if (checkLastTwoForPending(recipient.inbox.threads[senderID].thread, req.body.remove, req.body.encRecText, tmrw, true)) {
                overwrite = true;
                // if deleting a message, then remove the listing in 'pending'
                if (req.body.remove) {
                  delete recipient.inbox.pending[senderID];
                }
              }
              // check/update the key
              if (!recipient.inbox.threads[senderID].key || recipient.inbox.threads[senderID].key !== sender.keys.pubKey) {
                recipient.inbox.threads[senderID].key = sender.keys.pubKey;
              }
              // check/update the thread "name"
              if (!recipient.inbox.threads[senderID].name || recipient.inbox.threads[senderID].name !== sender.username) {
                recipient.inbox.threads[senderID].name = sender.username;
              }
              // check/update pic
              if (!recipient.inbox.threads[senderID].image || recipient.inbox.threads[senderID].image !== senderPic) {
                recipient.inbox.threads[senderID].image = senderPic;
              }
            }
            if (!overwrite) { //no message to overwrite, so push new message
              recipient.inbox.threads[senderID].thread.push({
                inbound: true,
                date: tmrw,
                body: req.body.encRecText,
              });
              // add to the 'pending' collection
              recipient.inbox.pending[senderID] = true;
            }

            writeToDB(senderID, sender, function (resp) {
              if (resp.error) {return sendError(res, errMsg+resp.error);}
              else {
                writeToDB(recipientID, recipient, function (resp) {
                  if (resp.error) {return sendError(res, errMsg+resp.error);}
                  else {return res.send({error:false, reKey:false});}
                });
              }
            });
          }
        }
      });
    }
  });
});

// block/unblock a user from messaging you
app.post('/block', function(req, res) {
  var errMsg = "block/unblock error<br><br>"
  if (!req.session.user) {return sendError(res, errMsg+"no user session 8008");}
  var blockerID = ObjectId(req.session.user._id);
  if (!req.body || !req.body.blockeeID) {return sendError(res, errMsg+"malformed request 844");}
  var blockeeID = ObjectId(req.body.blockeeID);
  db.collection('users').findOne({_id: blockerID}
  , {_id:0, inbox:1}
  , function (err, blocker) {
    if (err) {return sendError(res, errMsg+err);}
    else if (!blocker) {return sendError(res, errMsg+"user not found, blocker");}
    else {
      db.collection('users').findOne({_id: blockeeID}
      , {_id:0, inbox:1}
      , function (err, blockee) {
        if (err) {return sendError(res, errMsg+err);}
        else if (!blockee) {return sendError(res, errMsg+"user not found, blockee");}
        else {
          var inboxTemplate = {name:'', unread:false, image:'', thread:[], key:''}
          if (!blocker.inbox) {blocker.inbox = genInboxTemplate();}
          if (!blockee.inbox) {blockee.inbox = genInboxTemplate();}
          if (!blocker.inbox.threads) {blocker.inbox.threads = {};}
          if (!blockee.inbox.threads) {blockee.inbox.threads = {};}
          if (!blocker.inbox.threads[blockeeID]) {blocker.inbox.threads[blockeeID] = inboxTemplate}
          if (!blockee.inbox.threads[blockerID]) {blockee.inbox.threads[blockerID] = inboxTemplate}
          if (req.body.blocking === true) {
            blocker.inbox.threads[blockeeID].blocking = true;
            blockee.inbox.threads[blockerID].blocked = true;
            // delete pending message from recipient (if one exists)
            var tmrw = pool.getCurDate(-1);
            if (checkLastTwoForPending(blocker.inbox.threads[blockeeID].thread, true, "", tmrw, false)) {
              removeListRefIfRemovingOnlyMessage(blocker.inbox, blockeeID, true, tmrw);
            }
            if (checkLastTwoForPending(blockee.inbox.threads[blockerID].thread, true, "", tmrw, true)) {
              if (blockee.inbox.pending[blockerID]) {delete blockee.inbox.pending[blockerID];}
            }
          } else {          // unblocking
            blocker.inbox.threads[blockeeID].blocking = false;
            blockee.inbox.threads[blockerID].blocked = false;
          }
          writeToDB(blockerID, blocker, function (resp) {
            if (resp.error) {sendError(res, errMsg+resp.error);}
            else {
              writeToDB(blockeeID, blockee, function (resp) {
                if (resp.error) {sendError(res, errMsg+resp.error);}
                else {res.send({error: false});}
              });
            }
          });
        }
      });
    }
  });
});

// validate images
app.post('/image', function(req, res) {
  // cant do this on the FE cause CORS
  if (req.body) {
    imageValidate(req.body, res, function () {
      res.send({error:false});
    });
  } else {sendError(res,"boy i hope no one ever sees this error message!");}
});

// validate links
app.post('/link', function(req, res) {
  // cant do this on the FE cause CORS
  if (req.body && typeof req.body.url === "string") {
    var url = req.body.url;
    request.head(url, function (error, resp) {
      if (error || resp.statusCode !== 200) {
        return res.send({issue:'your url: "'+url+'" does not seem to be valid.<br>you sure you want to link to "'+url+'"?'});
      } else {
        res.send({issue:false});
      }
    });
  } else {sendError(res,"boy i hope no one ever sees this error message!");}
});

// toggle collapsed status of posts
app.post('/collapse', function(req, res) {
  var errMsg = "collapsed property error<br><br>";
  if (!req.body.id) {return sendError(res, errMsg+"malformed request 501");}
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
      , {_id:0, collapsed:1}
      , function (err, user) {
        if (err) {return sendError(res, errMsg+err);}
        else if (!user) {return sendError(res, errMsg+"user not found");}
        else {
          if (!user.collapsed || user.collapsed.length === undefined) {user.collapsed = []}
          if (req.body.collapse) {
            // limit to 50, delete olest, FIFO
            if (user.collapsed.length > 50) {
              user.collapsed.splice(0,1);
            }
            user.collapsed.push(req.body.id);
          } else {
            for (var i = 0; i < user.collapsed.length; i++) {
              if (user.collapsed[i] === req.body.id) {
                user.collapsed.splice(i,1);
                i--;
              }
            }
          }
          writeToDB(userID, user, function (resp) {
            if (resp.error) {sendError(res, errMsg+ resp.error);}
            else {res.send({error: false});}
          });
        }
      }
    )
  })
});

// toggle unread status of threads
app.post('/unread', function(req, res) {
  var errMsg = "unread property error<br><br>"
  if (!req.session.user) {return sendError(res, errMsg+ "no user session 4653");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, inbox:1}
  , function (err, user) {
    if (err) {return sendError(res, errMsg+ err);}
    else if (!user) {return sendError(res, errMsg+ "user not found");}
    else {
      if (!user.inbox) {user.inbox = genInboxTemplate();}
      if (!user.inbox.threads) {user.inbox.threads = {};}
      if (!user.inbox.threads[req.body._id]) {return sendError(res, errMsg+ "thread not found");}
      user.inbox.threads[req.body._id].unread = req.body.bool;
      writeToDB(userID, user, function (resp) {
        if (resp.error) {sendError(res, errMsg+ resp.error);}
        else {res.send({error: false});}
      });
    }
  });
});

// change user picture URL
app.post('/changePic', function(req, res) {
  if (!req.session.user) {return sendError(res, "no user session 7841");}
  var userID = ObjectId(req.session.user._id);
  var updateUrl = function (url) {
    db.collection('users').findOne({_id: userID}
    , {_id:0, iconURI:1}
    , function (err, user) {
      if (err) {return sendError(res, err);}
      else if (!user) {return sendError(res, "user not found");}
      else {
        user.iconURI = url;
        writeToDB(userID, user, function (resp) {
          if (resp.error) {sendError(res, resp.error);}
          else {res.send({error: false});}
        });
      }
    });
  }
  var url = req.body.url;
  //validate URL
  if (url === "") {updateUrl(url);}
  else {
    request.head(url, function (error, resp) {
      if (error || resp.statusCode !== 200) {
        return res.send({error:'your image url seems to be invalid'});
      } else if (resp.headers['content-type'].substr(0,5) !== "image") {
        return res.send({error:'i have seen an image<br><br>and that is no image'});
      } else if (resp.headers['content-length'] > 10485760) {
        return res.send({error:"your image is "+resp.headers['content-length']+" bytes<br>which is "+(resp.headers['content-length'] - 10485760)+" bytes too many<br><br>sorry pal"});
      } else {
        updateUrl(url);
      }
    });
  }
});

// save custom display colors
app.post('/saveAppearance', function(req, res) {
  if (!req.session.user) {return sendError(res, "no user session");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, settings:1}
  , function (err, user) {
    if (err) {return sendError(res, err);}
    else if (!user) {return sendError(res, "user not found");}
    else {
      user.settings.colors = req.body.colors;
      user.settings.font = req.body.font;
      writeToDB(userID, user, function (resp) {
        if (resp.error) {sendError(res, resp.error);}
        else {res.send({error: false});}
      });
    }
  });
});

// flip a boolean setting
app.post('/toggleSetting', function(req, res) {
  var errMsg = "settings not successfully updated<br><br>";
  if (!req.body || !req.body.setting) {return sendError(res, errMsg+"malformed request 992");}
  idCheck(req, res, errMsg, function (userID) {
    db.collection('users').findOne({_id: userID}
      , {_id:0, settings:1}
      , function (err, user) {
        if (err) {return sendError(res, errMsg+err);}
        else if (!user) {return sendError(res, errMsg+"user not found");}
        else {
          var setting = req.body.setting;
          if (user.settings[setting]) {
            user.settings[setting] = false;
          } else {
            user.settings[setting] = true;
          }
          writeToDB(userID, user, function (resp) {
            if (resp.error) {sendError(res, resp.error);}
            else {res.send({error: false});}
          });
        }
      }
    );
  });
});

// new user sign up
app.post('/register', function(req, res) {
    // !!!!!!!! SANITIZE THESE INPUTS!!!!!!!!!!!!!!!!!!!!!
	var username = req.body.username;
	var password = req.body.password;
	var email = req.body.email;
	//var secretCode = req.body.secretCode;
                      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // validate
  var x = pool.userNameValidate(username);
  if (x) {return res.send({error:x});}
  var y = pool.passwordValidate(password);
  if (y) {return res.send({error:y});}
  /*
  // look up current active/valid secret access codes
  db.collection('users').findOne({ username: "admin" }
  , { codes:1 }
  , function (err, admin) {
    if (err) {return sendError(res, err);}
    // check if the provided code is a match
    else if (!admin.codes[secretCode]) {return res.send({error:"invalid code"});}
    else {
      */
      //check if there is already a user w/ that name
      db.collection('users').findOne({username: username}, {username:1}, function (err, user) {
        if (err) {return sendError(res, err);}
    		else if (user) {return res.send({error:"name taken"});}
    		else {
          var today = pool.getCurDate();
          db.collection('users').insertOne({
            username: username,
            password: "",
            email: "",
            posts: {},
            postList: [],
            postListPending: [],
            postListUpdatedOn: today,
            inbox: {
              threads: {},
              list: [],
              updatedOn: today,
              pending: {},
            },
            following: [],
            iconURI: snakeBank[Math.floor(Math.random() * (snakeBank.length))],
            settings: {},
          }, {}, function (err, result) {
            if (err) {return sendError(res, err);}
            var newID = ObjectId(result.insertedId);
            bcrypt.hash(password, 10, function(err, passHash){
              if (err) {return sendError(res, err);}
              else {
                bcrypt.hash(email, 10, function(err, emailHash){
                  if (err) {return sendError(res, err);}
                  else {
                    var setValue = {
                      password: passHash,
                      email: emailHash,
                      following: [
                        ObjectId("5a0ea8429adb2100146f7568"), //staff
                        newID, //self
                    ],
                    };
                    db.collection('users').updateOne({_id: newID},
                      {$set: setValue }, {},
                      function(err, r) {
                        if (err) {return sendError(res, err);}
                        else {
                          // "sign in" the user
                          req.session.user = { _id: newID };
                          return res.send({error:false, needKeys:true, newUser: true,
                            message: `welcome to schlaugh!<br><br>i'll be your staff. can i get you started with something to drink?<br><br>please don't hesitate to ask any questions, that's what i'm here for. if anything at all is even slightly confusing to you, you're doing me a huge favor by letting me know so that i can fix it for everyone else too. you can find the site FAQ <a href="https://www.schlaugh.com/~faq">here</a>.<br><br>i'd prefer you communicate by messaging me right here, but if need be, you can also reach me at "schlaugh@protonmail.com"<br><br>&lt;3`,
                          });
                          /*
                          // remove the code from the admin stash so it can't be used again
                          delete admin.codes[secretCode];
                          writeToDB(admin._id, admin, function () {res.send("success");});
                          */
                        }
                      }
                    );
                  }
                });
              };
            });
          });
    		}
      });
  /*
    }
  });
  */
});

// log in (aslo password verify)
app.post('/login', function(req, res) {
  if (!req.body.username || !req.body.password) {return sendError(res, "malformed request 147")}
  var username = req.body.username;
	var password = req.body.password;
  // validate
  var nope = "invalid username/password";
  db.collection('users').findOne({username: username}
    , { password:1 }
    , function (err, user) {
      if (err) {return sendError(res, err);}
      if (!user) {return res.send({error:nope});}
      else {
        // Match Password
        bcrypt.compare(password, user.password, function(err, isMatch){
          if (err) {return sendError(res, err);}
          else if (isMatch) {
            if (req.session.user) { // is there already a logged in user? (via cookie)
              // this is a password check to unlock an inbox
              if (String(req.session.user._id) !== String(user._id)) {
                // valid username and pass, but for a different user than currently logged in
                req.session.user = { _id: ObjectId(user._id) };
                // switcheroo
                return res.send({switcheroo:true});
              } else {
                return res.send({error:false});
              }
            } else { // this is an actual login
              req.session.user = { _id: ObjectId(user._id) };
              if (req.body.authorID) {        // is this a login while viewing an author page?
                var authorID = ObjectId(req.body.authorID);
              }
              getPayload(req, res, authorID, function (payload) {
                return res.send({error:false, payload:payload});
              });
            }
          } else {
            return res.send({error:nope});
          }
        });
      }
  });
});

// set keys
app.post('/keys', function(req, res) {
  if (!req.session.user) {return sendError(res, "no user session");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, inbox:1, keys:1}
  , function (err, user) {
    if (err) {return sendError(res, err);}
    else if (!user) {return sendError(res, "user not found");}
    else {
      if (req.body.privKey && req.body.pubKey) {
        // do not overwrite existing keys! (when we need to change keys, we clear them elsewhere)
        if (user.keys === undefined || user.keys === null) {
          user.keys = req.body;
        }
        if (req.body.newUserMessage) {    // new user, send welcome message
          var staffID = ObjectId("5a0ea8429adb2100146f7568");
          db.collection('users').findOne({_id: staffID}
          , {_id:0, iconURI:1, keys:1}
          , function (err, staff) {
            if (err) {return sendError(res, err);}
            else if (!staff) {
              var staff = {keys:{pubKey:adminB.dumbleKey}};  //this is wrong and will get replaced when a message is actually sent
            }                                         // though is also a backup that *should* never be used in the first place
            var staffPic = staff.iconURI;
            if (typeof staffPic !== 'string') {staffPic = "";}
            user.inbox.threads[staffID] = {name:"staff", unread:true, image:staffPic, thread:[], key:staff.keys.pubKey};
            user.inbox.threads[staffID].thread.push({
              inbound: true,
              date: pool.getCurDate(),
              body: req.body.newUserMessage,
            });
            user.inbox.list.push(staffID);
            //
            writeToDB(userID, user, function (resp) {
              if (resp.error) {sendError(res, resp.error);}
              else {
                getPayload(req, res, null, function (payload) {
                  return res.send({error:false, payload:payload});
                });
              }
            });
          });
        } else {
          writeToDB(userID, user, function (resp) {
            if (resp.error) {sendError(res, resp.error);}
            else {
              getPayload(req, res, null, function (payload) {
                return res.send({error:false, payload:payload});
              });
            }
          });
        }
      } else {return sendError(res, "malformed request 303");}
    }
  });
});

// logout
app.get('/~logout', function(req, res) {
  req.session.user = null;
  res.send({error: false});
});

// verify hashed email
app.post('/verifyEmail', function (req, res) {
  var errMsg = "email verification error<br><br>"
  if (!req.session.user) {return sendError(res, errMsg+ "no user session");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, email:1}
  , function (err, user) {
    if (err) {return sendError(res, errMsg+ err);}
    else if (!user) {return sendError(res, errMsg+ "user not found");}
    else {
      if (!user.email) {res.send({error: false, match:false});}
      else {
        bcrypt.compare(req.body.email, user.email, function(err, isMatch){
          if (err) {return sendError(res, errMsg+err);}
          else if (isMatch) {
            res.send({error: false, match:true});
          } else {
            res.send({error: false, match:false});
          }
        });
      }
    }
  });
});

// change user email
app.post('/changeEmail', function (req, res) {
  var errMsg = "email reset error<br><br>";
  if (!req.session.user) {return sendError(res, errMsg+ "no user session");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, email:1}
  , function (err, user) {
    if (err) {return sendError(res, errMsg+ err);}
    else if (!user) {return sendError(res, errMsg+ "user not found");}
    else {
      bcrypt.hash(req.body.email, 10, function(err, emailHash) {
        if (err) {return sendError(res, errMsg+err);}
        else {
          user.email = emailHash;
          writeToDB(userID, user, function (resp) {
            if (resp.error) {sendError(res, errMsg+resp.error);}
            else {res.send({error: false, email: req.body.email});}
          });
        }
      });
    }
  });
});

// change user password
app.post('/changePasswordStart', function (req, res) {
  if (!req.body.oldPass || !req.body.newPass) {return sendError(res, "malformed request 345")}
  if (!req.session.user) {return sendError(res, "no user session");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, password:1, keys:1, inbox:1}
  , function (err, user) {
    if (err) {return sendError(res, err);}
    else if (!user) {return sendError(res, "user not found");}
    else {
      if (!user.keys) {return sendError(res, "user has no keys???");}
      else {
        bcrypt.compare(req.body.oldPass, user.password, function(err, isMatch){
          if (err) {return sendError(res, err);}
          else if (!isMatch) {return res.send({error: false, noMatch:true});}
          else {
            var y = pool.passwordValidate(req.body.newPass);
            if (y) {return res.send({error:y});}
            else {
              return res.send({error: false, threads:user.inbox.threads, key:user.keys.privKey});
            }
          }
        });
      }
    }
  });
});

// swap in re-encrypted inbox and new keys
app.post('/changePasswordFin', function (req, res) {
  if (!req.body.newKeys || !req.body.newPass || !req.body.newThreads) {return sendError(res, "malformed request 642")}
  if (!req.session.user) {return sendError(res, "no user session");}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, password:1, keys:1, inbox:1}
  , function (err, user) {
    if (err) {return sendError(res, err);}
    else if (!user) {return sendError(res, "user not found");}
    else {
      if (!user.keys) {return sendError(res, "user has no keys???");}
      else {
        var y = pool.passwordValidate(req.body.newPass);
        if (y) {return res.send({error:y});}
        else {
          bcrypt.hash(req.body.newPass, 10, function(err, passHash) {
            if (err) {return sendError(res, err);}
            else {
              user.password = passHash;
              user.inbox.threads = req.body.newThreads;
              user.keys = req.body.newKeys;
              writeToDB(userID, user, function (resp) {
                if (resp.error) {sendError(res, resp.error);}
                else {return res.send({error: false})}
              });
            }
          });
        }
      }
    }
  });
});

// request password reset code
app.post('/passResetRequest', function (req, res) {
  db.collection('users').findOne({username: req.body.username}, {email:1, settings:1}
  , function (err, user) {
    if (err) {return sendError(res, err);}
    else if (!user) {return res.send({error: false});}
    else {            // first check if user already has an active reset code
      var today = pool.getCurDate();
      if (user.settings && user.settings.recovery && user.settings.recovery[today]) {
        var arr = user.settings.recovery[today];
        if (arr.length && arr.length > 6) {        // if they've already made 7 requests today,
          return res.send({error: false});
        }
        var now = new Date();
        if ((now - arr[arr.length-1]) < 600000) {  // if it's been < 10min since last request,
          return res.send({error: false});
        }
      } else {
        if (!user.settings.recovery) {user.settings.recovery = {};}
        user.settings.recovery[today] = [];
      }
      bcrypt.compare(req.body.email, user.email, function(err, isMatch){
        if (err) {return sendError(res, err);}
        else if (!isMatch) {res.send({error: false});}    // DO NOT send ANY indication of if there was a match
        else {
          // generate code, and send email
          genID('resetCodes', 20, function (resp) {
            if (resp.error) {return sendError(res, resp.err);}
            else {
              bcrypt.hash(req.body.username, 10, function(err, usernameHash){
                if (err) {return sendError(res, err);}
                else {
                  var msg = {
                    to: req.body.email,
                    from: 'schlaugh@protonmail.com',
                    subject: 'schlaugh account recovery',
                    text: `visit the following link to reset your schlaugh password: https://www.schlaugh.com/~recovery/`+resp._id+`\n\nIf you did not request a password reset for your schlaugh account, then kindly do nothing at all and the reset link will shortly be deactivated.\n\nplease do not reply to this email, or otherwise allow anyone to see its contents, as the reset link is a powerful secret`,
                    html: `<a href="https://www.schlaugh.com/~recovery/`+resp._id+`">click here to reset your schlaugh password</a><br><br>or paste the following link into your browser: schlaugh.com/~recovery/`+resp._id+`<br><br>If you did not request a password reset for your schlaugh account, then kindly do nothing at all and the reset link will shortly be deactivated.<br><br>please do not reply to this email, or otherwise allow anyone to see its contents, as the reset link is a powerful secret`,
                  };
                  sgMail.send(msg, (error, result) => {
                    if (error) {return sendError(res, "email server malapropriationologification");}
                    else {
                      var newCode = {
                        code: resp._id,
                        username: usernameHash,
                        attempts: 0,
                        creationTime: new Date(),
                      }
                      db.collection('resetCodes').insertOne(newCode, {}, function (err, result) {
                        if (err) {return sendError(res, err);}
                        else {
                          user.settings.recovery[today].push(newCode.creationTime);
                          writeToDB(user._id, user, function (dbResp) {
                            if (dbResp.error) {sendError(res, dbResp.error);}
                            else {res.send({error: false});}               // victory state
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

// use password recovery code/link
app.get('/~recovery/:code', function (req, res) {
  //if (!req.session.user) { 'you are accessing this recovery page, but you seem to aleady be signed in...erm what?'}
  req.session.user = null;
  db.collection('resetCodes').findOne({code: req.params.code}, {_id:1, code:1, creationTime:1}
  , function (err, code) {
    if (err) {return sendError(res, err);}
    else {
      if (!code) {
        return res.render('layout', {user:false, recovery:false});
      } else {
        var now = new Date();
        if ((now - code.creationTime) > 4000000) {  // code is too old, delete
          db.collection('resetCodes').remove({_id: code._id},
            function(err, post) {
              if (err) {return sendError(res, err);}
              else {return res.render('layout', {user:false, recovery:false});}
            }
          );
        } else {
          return res.render('layout', {user:false, recovery:code.code});
        }
      }
    }
  });
});

// recovery verify username/change pass
app.post('/resetNameCheck', function (req, res) {
  db.collection('resetCodes').findOne({code: req.body.code}, {_id:1, code:1, creationTime:1, username:1, attempts:1}
  , function (err, code) {
    if (err) {return sendError(res, err);}
    else {
      if (!code) {return sendError(res, 'code not found');}
      else {
        var now = new Date();
        if ((now - code.creationTime) > 5000000) {  // code is too old, delete
          db.collection('resetCodes').remove({_id: code._id},
            function(err, post) {
              if (err) {return sendError(res, err);}
              else {return sendError(res, 'code has expired');}
            }
          );
        } else {
          bcrypt.compare(req.body.username, code.username, function(err, isMatch){
            if (err) {return sendError(res, err);}
            else if (isMatch) {
              if (req.body.password) {
                var y = pool.passwordValidate(req.body.password);
                if (y) {return res.send({error:y});}
                else {
                  bcrypt.hash(req.body.password, 10, function(err, passHash){
                    if (err) {return sendError(res, err);}
                    else {
                      var user = {password: passHash, keys:null}
                      // keys are tied to pass, clear keys, new keys created on sign in
                      db.collection('users').updateOne({username: req.body.username},
                        {$set: user},
                        function(err, user) {
                          if (err) {res.send({error:err});}
                          else {
                            db.collection('resetCodes').remove({_id: code._id},
                              function(err, post) {
                                if (err) {return sendError(res, err);}
                                else {res.send({error: false, victory:true});}    //final victory state
                              }
                            );
                          }
                        }
                      );
                    }
                  });
                }
              } else {res.send({error: false, verify:true});}  //victory state
            } else {
              code.attempts++;
              if (code.attempts === 5) {
                db.collection('resetCodes').remove({_id: code._id},
                  function(err, post) {
                    if (err) {return sendError(res, err);}
                    else {res.send({error: false, attempt:5});}  // total fail state
                  }
                );
              } else {
                var attempt = code.attempts
                db.collection('resetCodes').updateOne({_id: ObjectId(code._id)},
                  {$set: code},
                  function(err, code) {
                    if (err) {res.send({error:err});}
                    else {
                      res.send({error: false, attempt:attempt});}  //fail state
                  }
                );
              }
            }
          });
        }
      }
    }
  });
});

// view about page for site
app.get('/~', function (req, res) {
  renderLayout(req, res, {about:true,});
});

// view faq page
app.get('/~faq', function (req, res) {
  renderLayout(req, res, {faq:true,});
});

app.get('/~faqText', function (req, res) {
  var errMsg = "error retrieving faq content<br><br>"
  db.collection('siteStuff').findOne({name: "faq"}
  , {_id:0, text:1}
  , function (err, faq) {
    if (err) {return sendError(res, errMsg+ err);}
    else if (!faq) {return sendError(res, errMsg+ "faq not found");}
    else {
      res.send({error: false, text: faq.text,})
    }
  });
});

var renderLayout = function (req, res, data) {
  if (!req.session.user) {
    res.render('layout', {
      user:false,
      author:data.author,
      post_id:data.post_id,
      date:data.date,
      tag:data.tag,
      ever:data.ever,
      about:data.about,
      faq:data.faq,
    });
  } else {
    getSettings(req, res, function (settings) {
      res.render('layout', {
        user:true,
        settings:settings,
        author:data.author,
        post_id:data.post_id,
        date:data.date,
        tag:data.tag,
        ever:data.ever,
        about:data.about,
        faq:data.faq,
        panel:data.panel,
      });
    });
  }
}

// get author/post routes:
// get 7 of a user,s posts, and authorInfo
app.post('/~getAuthor/:id/:page', function(req, res) {
  var errMsg = "author lookup error<br><br>";
  if (req.params.page === undefined) {return sendError(res, errMsg+"malformed request 299");}
  req.params.page = parseInt(req.params.page);
  if (!Number.isInteger(req.params.page) || req.params.page < 1) {return sendError(res, errMsg+"malformed request 301");}
  if (!req.params.id) {return sendError(res, errMsg+"malformed request 300");}
  var authorID = req.params.id;
  if (ObjectId.isValid(authorID)) {authorID = ObjectId(authorID);}
  else {return sendError(res, errMsg+"invalid author id");}
  db.collection('users').findOne({_id: authorID}
  , {username:1, posts:1, postList:1, postListPending:1, iconURI:1, keys:1, inbox:1, pendingUpdates:1, bio:1}
  , function (err, author) {
    if (err) {return sendError(res, errMsg+err);}
    else {
      if (!author) {
          res.send({error: false, four04: true,});      //404
        } else {
        checkFreshness(author);
        checkUpdates(author, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          author = resp.user;
          var authorPic = getUserPic(author);
          var posts = [];
          var pL = author.postList;
          var list = [];
          var page = req.params.page -1;
          var start = (pL.length - 1) - (page * 7);
          if (!req.body.postRef) {req.body.postRef = {}};
          for (var i = start; i > start - 7; i--) {
            if (pL[i]) {
              list.push(author.posts[pL[i].date][pL[i].num].post_id);
              if (!req.body.postRef[author.posts[pL[i].date][pL[i].num].post_id]) {
                posts.push({
                  body: author.posts[pL[i].date][pL[i].num].body,
                  tags: author.posts[pL[i].date][pL[i].num].tags,
                  title: author.posts[pL[i].date][pL[i].num].title,
                  post_id: author.posts[pL[i].date][pL[i].num].post_id,
                  date: pL[i].date,
                });
              }
            } else {break;}
          }
          if (page !== 0) {
            return res.send({
              error: false,
              four04: false,
              data:{
                list: list,
                author: author.username,
                posts: posts,
                _id: author._id,
                authorPic: authorPic,
              }
            });
          } else {
            var pages = Math.ceil(pL.length /7);
            var bio = author.bio;
            if (typeof bio !== 'string') {bio = "";}
            var key = null;
            if (req.session.user) {
              var userID = ObjectId(req.session.user._id);
              if (author.inbox && author.inbox.threads) {
                if (!author.inbox.threads[userID] || (!author.inbox.threads[userID].blocking && !author.inbox.threads[userID].blocked)) {
                  if (author.keys) {key = author.keys.pubKey}
                }
              }
            }
            return res.send({
              error: false,
              four04: false,
              data:{
                list: list,
                author: author.username,
                bio: bio,
                posts: posts,
                authorPic: authorPic,
                _id: author._id,
                key: key,
                pages: pages,
              }
            });
          }
        });
      }
    }
  });
});

// get single post, from authorID/date
app.get('/~getPost/:id/:date', function (req, res) {
  var errMsg = "post retrieval error<br><br>";
  if (!req.params.date) {return sendError(res, errMsg+"malformed request 512");}
  if (!req.params.id) {return sendError(res, errMsg+"malformed request 513");}
  else if (req.params.date > pool.getCurDate()) {return res.send({error:false, post:{body: 'THE CHAMBER OF SECRETS HAS BEEN OPENED', tags:{"swiper no swiping":true}, post_id: "gotcha",}});}
  var authorID = req.params.id;
  if (ObjectId.isValid(authorID)) {authorID = ObjectId(authorID);}
  else {return sendError(res, errMsg+"invalid author id");}
  db.collection('users').findOne({_id: authorID}
  , { posts:1, pendingUpdates:1, bio:1, username:1, iconURI:1}
  , function (err, author) {
    if (err) {return sendError(res, errMsg+err);}
    else {
      if (author && author.posts[req.params.date]) {
        var authorPic = getUserPic(author);
        checkUpdates(author, function (resp) {
          if (resp.err) {return sendError(res, errMsg+resp.err);}
          resp.user.posts[req.params.date][0].authorPic = authorPic;
          resp.user.posts[req.params.date][0].author = author.username;
          res.send({error: false, post: resp.user.posts[req.params.date][0]})
        });
      } else {
        res.send({error: false, four04: true,});      //404
      }
    }
  })
});

// view a single post, by id
app.get('/~/:post_id', function (req, res) {
  authorAndDateFromPostID(req.params.post_id, function (resp) {
    if (resp.error) {sendError(res, resp.error);}
    else {
      renderLayout(req, res, {author:resp.author, post_id:req.params.post_id, date:resp.date, ever:resp.ever});
    }
  })
});
var authorAndDateFromPostID = function (post_id, callback) {
  if (ObjectId.isValid(post_id)) {post_id = ObjectId(post_id);}
  //else {return callback({error: "invalid post id"});}
  db.collection('posts').findOne({_id: post_id,}, {date:1, authorID:1}
  , function (err, post) {
    if (err) {return callback({error:err});}
    else {
      if (!post) {    //404
        return callback({error: false,});
      } else if (!post.authorID) {
        return callback({error: false, ever: true});
      } else {
        return callback({error: false, author:post.authorID, date:post.date});
        /*
        var author_id = post.authorID;
        if (ObjectId.isValid(author_id)) {author_id = ObjectId(author_id);}
        //else {return callback({error: "invalid author id"});}
        db.collection('users').findOne({_id: author_id}
        , { _id:0, username:1,}
        , function (err, author) {
          if (err) {return callback({error:err});}
          else {
            if (!author) {    //404
              return callback({error: false, ever: true,});
            } else {
              return callback({error: false, four04: false, author:author.username, date:post.date});
            }
          }
        });
        */
      }
    }
  });
}

// get all of a user's posts with a tag
app.post('/~getTaggedByAuthor', function (req, res) {
  var errMsg = "author/tag lookup error<br><br>";
  if (!req.body || !req.body.authorID || req.body.tag === undefined) {return sendError(res, errMsg+"malformed request 400");}
  if (!req.body.postRef) {req.body.postRef = {}};
  var authorID = req.body.authorID;
  if (ObjectId.isValid(authorID)) {authorID = ObjectId(authorID);}
  else {return sendError(res, errMsg+"invalid author id");}
  db.collection('users').findOne({_id: authorID}
  , {username:1, posts:1, postList:1, postListPending:1, iconURI:1, pendingUpdates:1, bio:1}
  , function (err, author) {
    if (err) {return sendError(res, errMsg+err);}
    else {
      if (!author) {
          res.send({error: false, four04: true,});      //404
        } else {
        checkFreshness(author);
        checkUpdates(author, function (resp) {
          if (resp.error) {return sendError(res, errMsg+resp.error);}
          author = resp.user;
          var authorPic = getUserPic(author);
          var posts = [];
          var pL = author.postList;
          var list = [];
          for (var i = pL.length-1; i > -1; i--) {
            if (author.posts[pL[i].date] && author.posts[pL[i].date][pL[i].num] && author.posts[pL[i].date][pL[i].num].tags && author.posts[pL[i].date][pL[i].num].tags[req.body.tag]) {
              list.push(author.posts[pL[i].date][pL[i].num].post_id);
              if (!req.body.postRef[author.posts[pL[i].date][pL[i].num].post_id]) {
                posts.push({
                  body: author.posts[pL[i].date][pL[i].num].body,
                  tags: author.posts[pL[i].date][pL[i].num].tags,
                  title: author.posts[pL[i].date][pL[i].num].title,
                  post_id: author.posts[pL[i].date][pL[i].num].post_id,
                  date: pL[i].date,
                });
              }
            }
          }
          return res.send({
            error: false,
            four04: false,
            data:{
              list: list,
              author: author.username,
              posts: posts,
              _id: author._id,
              authorPic: authorPic,
            }
          });
        });
      }
    }
  });
});

// view a users posts, filtered by tag
app.get('/:author/~tagged/:tag', function(req, res) {
  var errMsg = "author lookup error<br><br>";
  db.collection('users').findOne({username: req.params.author}, {},
    function (err, user) {
      if (err) {return sendError(res, errMsg+err);}
      if (!user) {
        renderLayout(req, res, {post_id: false});
      } else {
        renderLayout(req, res, {author:user._id, tag:req.params.tag});
      }
    }
  );
});

// view a tag page
app.get('/~tagged/:tag', function(req, res) {
  renderLayout(req, res, {tag:req.params.tag});
});

// get all posts with tag on date, "post" just so we can take characters like "?", but this is a get request in spirit
app.post('/~getTag', function (req, res) {
  var errMsg = "tag fetch error<br><br>"
  if (!req.body.date || !req.body.tag) {return sendError(res, errMsg+"malformed request 712");}
  if (req.body.date > pool.getCurDate()) {return res.send({error:false, posts:[{body: 'IT DOES NOT DO TO DWELL ON DREAMS AND FORGET TO LIVE', author:"APWBD", authorPic:"https://t2.rbxcdn.com/f997f57130195b0c44b492b1e7f1e624", _id:"5a1f1c2b57c0020014bbd5b7", key:adminB.dumbleKey}]});}
  getAuthorListFromTagListAndDate([req.body.tag], req.body.date, function (resp) {
    if (resp.error) {return sendError(res, errMsg+resp.error);}
    else {
      if (resp.authorList.length === 0) {
        return res.send({error:false, posts:[],});
      } else {
        postsFromAuthorListAndDate(resp.authorList, req.body.date, null, function (resp) {
          if (resp.error) {return callback({error:err});}
          else {return res.send({error:false, posts:resp.posts,});}
        });
      }
    }
  });
});

// view a user page
app.get('/:author', function(req, res) {
  if (req.params.author === "admin" || req.params.author === "apwbd") {return renderLayout(req, res, {post_id: false});}
  var errMsg = "author lookup error<br><br>";
  db.collection('users').findOne({username: req.params.author}, {},
    function (err, user) {
      if (err) {return sendError(res, errMsg+err);}
      if (!user) {
        renderLayout(req, res, {post_id: false});
      }
      else {
        renderLayout(req, res, {author: user._id});
      }
    }
  );
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
  process.exit(0);
});
