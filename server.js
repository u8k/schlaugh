var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var bcrypt = require('bcryptjs');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var requestModule = require('request');
var enforce = require('express-sslify');
var RSS = require('rss');
var fs = require("fs");
var pool = require('./public/pool.js');
var schlaunquer = require('./public/schlaunquer.js');
var adminB = require('./public/adminB.js');
var bson = require("bson");
var BSON = new bson.BSON();

//connect and check mongoDB
var db;
var dbURI = process.env.ATLAS_DB_KEY || 'mongodb://mongo:27017/schlaugh';

MongoClient.connect(dbURI, { useUnifiedTopology: true }, function(err, database) {
  if (err) {throw err;}
  else {
    db = database.db("heroku_kr76r150");
  }
});

// Init App
var app = express();

// Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({limit: '5mb'}));

// Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

var sessionKey = ['SECRETSECRETIVEGOTTASECRET'];
if (process.env.COOKIE_SESSION_KEY) {
  sessionKey = [process.env.COOKIE_SESSION_KEY];
}
// Configure cookie-session middleware
app.use(session({
  name: 'session',
  keys: sessionKey,
  maxAge: 90 * 24 * 60 * 60 * 1000, // (90 days?)
}))

var devFlag = false;  //NEVER EVER LET THIS BE TRUE ON THE LIVE PRODUCTION VERSION, FOR LOCAL TESTING ONLY

// enforce https, "trustProtoHeader" is because heroku proxy
// very silly hack to make it not enforce https on local...
if (process.env.ATLAS_DB_KEY) {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
} else {
  devFlag = true; // on production we'll always have the DB key, so if we don't have the DB key, put it in dev mode
}

// sendgrid email config
var sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);



//*******//HELPER FUNCTIONS//*******//
var pushNewToPostlist = function (user) {  // pushes New pending posts to postlist
  // needs user.postListPending, postList, and postListUpdatedOn, does not perform it's own save
  var today = pool.getCurDate();
  if (user.postListUpdatedOn !== today) {
    user.postListUpdatedOn = today;
    var plp = user.postListPending;
    while (plp[0] && plp[0].date <= today) {
      user.postList.push({
        date: plp[0].date,
        num: plp[0].num,
      });
      plp.splice(0,1);
    }
    return true;
  } else {
    return false;
  }
}

var checkForUserUpdates = function (req, res, errMsg, userID, callback) {  // pushes edits on OLD posts, BIO, and userPic
  // first cursory DB fetch to see if updates are needed
  var props = ['postListUpdatedOn','pendingUpdates'];
  readUser(req, res, errMsg, userID, {list:props}, function (user) {
    if (!user) {return callback();}
    var updatesNeedsUpdate = false;
    var postListNeedsUpdate = false;
    var today = pool.getCurDate();
    // is postListUpdatedOn fresh?
    if (user.postListUpdatedOn !== today) {
      props.push('postListPending', 'postList');
      postListNeedsUpdate = true;
    }
    // check for 'pendingUpdates'
    if (user.pendingUpdates && user.pendingUpdates.updates && user.pendingUpdates.lastUpdatedOn && user.pendingUpdates.lastUpdatedOn !== today) {
      updatesNeedsUpdate = true;
      var updateList = [];
      // so we do need to update something, what exactly? (or maybe we just bump the 'lastUpdatedOn')
      var ref = user.pendingUpdates.updates;
      var alreadyGotPosts = false;
      for (var date in ref) {if (ref.hasOwnProperty(date)) {
        updateList.push(date);
        if (date === "bio" || date === "iconURI") {
          props.push(date);
        } else {
          // if we have even one post, then we need the whole darn posts object
          if (!alreadyGotPosts) {
            props.push('posts');
            alreadyGotPosts = true;
          }
        }
      }}
    }
    if (postListNeedsUpdate || updatesNeedsUpdate) {
      // fetch the props we need for this user
      readUser(req, res, errMsg, userID, {list:props}, function (user) {
        if (postListNeedsUpdate) {pushNewToPostlist(user);}
        if (updatesNeedsUpdate) {
          user.pendingUpdates.lastUpdatedOn = today;
          var ref = user.pendingUpdates.updates;
          //
          var loop = function (i, callback) {
            if (!updateList[i]) {return callback(user);}
            //
            else if (updateList[i] === "bio" || updateList[i] === "iconURI") {
              user[updateList[i]] = ref[updateList[i]];
              delete ref[updateList[i]];
              return loop(i+1, callback);
              //
            } else if (user.posts[updateList[i]]) {      // it's an edit to an old post
              // check existing tags
              var badTagArr = [];
              for (var tag in user.posts[updateList[i]][0].tags) {
                if (user.posts[updateList[i]][0].tags.hasOwnProperty(tag)) {
                  if (!ref[updateList[i]][0].tags[tag]) {       // if the old tag is NOT a new tag too
                    badTagArr.push(tag.toLowerCase());
                  }
                }
              }
              deleteTagRefs(req, res, errMsg, badTagArr, updateList[i], user._id, function (resp) {
                user.posts[resp.date] = ref[resp.date];         // the line where the update actually happens!
                delete ref[resp.date];
                return loop(i+1, callback);
              });
            } else {  // can't find the thing we're supposed to be editing?
              delete ref[updateList[i]];
              return loop(i+1, callback);
            }
          }
          loop(0, function (user) {
            callback();
            writeToUser(req, null, errMsg+'write failure in "checkForUserUpdates"<br>', user);
          });
        } else {
          callback();
          writeToUser(req, null, errMsg+'write failure in "checkForUserUpdates"<br>', user);
        }
      });
    } else {  // no update needed
      return callback();
    }
  });
}

var checkMultiUsersForUpdates = function (req, res, errMsg, idList, callback) {
  var loop = function (i, callback) {
    if (!idList[i]) {return callback();}
    else {
      checkForUserUpdates(req, res, errMsg, idList[i], function () {
        return loop(i+1, callback);
      });
    }
  }
  loop(0, function () {
    callback();
  });
}

var imageValidate = function (arr, callback, byteLimit) {
  if (!arr) {return callback({error:'"""type error""" on the "imageValidate" probably because staff is a dingus'})}
  if (arr.length !== 0) {       // does the post contain images?
    var count = arr.length;
    var byteCount = 104857600;   // 100mb(-ish...)
    if (byteLimit) {
      byteCount = byteLimit;
    }
    for (var i = 0; i < arr.length; i++) {
      (function (index) {
        requestModule.head(arr[index], function (error, resp) {
          if (count > 0) {
            count -=1;
            if (error || resp.statusCode !== 200) {
              count = 0;
              return callback({error:'the url for image '+(index+1)+' seems to be invalid'});
            } else if (!resp.headers['content-type'] || (resp.headers['content-type'].substr(0,5) !== "image" && resp.headers.server !== "AmazonS3")) {
              count = 0;
              return callback({error:'the url for image '+(index+1)+' is not a url for an image'});
            } else {byteCount -= resp.headers['content-length'];}
            if (count === 0) {
              if (byteCount < 0) {
                return callback({error:"your image(s) exceed the byte limit by "+(-byteCount)+" bytes"});
              } else {return callback({error:false});}
            }
          }
        });
      })(i);
    }     // no images to check
  } else {return callback({error:false});}
}

var linkValidate = function (arr, callback) {
  if (!arr || arr.length === 0) {return callback(false);}

  var timer = setTimeout(function () {
    // this is because of the heroku 30sec response time limit
    timer = null;
    return callback("schlaugh's link checker is having trouble checking multiple links in your post. So much so that it got tired and gave up. They might be fine, but schlaugh's link checker is stalling when trying to follow them, so please try clicking on all your links yourself to make sure they work");
  }, 28000);

  var manageLinkValidate = function (i, problems) {
    // init
    if (!i) {
      i = 0;
      problems = [];
      //
    }

    var url = arr[i];
    // give it 4 seconds to try checking the link
    var linkTimer = setTimeout(function () {
      // after 4 seconds:
      problems.push(url);
      linkTimer = null;
      wrapUpLinkValidate(i, problems);
    }, 4000);

    requestModule.head(url, function (error, resp) {
      if (linkTimer !== null) { // otherwise, the timer already went off and this link has already been marked as bad, so do nothing
        clearTimeout(linkTimer);
        if (error || !resp || !resp.statusCode) {
          problems.push(url);
        }
        //
        wrapUpLinkValidate(i, problems);
      }
    });
  }

  var wrapUpLinkValidate = function (i, problems) {
    i++;
    if (i === arr.length) { // done
      if (timer === null) {
        return;
      }
      clearTimeout(timer);
      if (problems.length === 0) {return callback(false);}
      if (problems.length === 1) {
        return callback(`your url: <code>`+problems[0]+`</code> does not seem to be valid. It might be fine, but schlaugh's link checker is flagging it, so please try clicking on it yourself to make sure it works<br><br>were you perhaps intending to link to schlaugh itself using the shorter form of link? please note that URL must start with a "/" character`);
      } else {
        var badUrls = "<br>";
        for (var j = 0; j < problems.length; j++) {
          badUrls += problems[j]+"<br>"
        }
        return callback(`your urls: <code>`+badUrls+`</code> do not seem to be valid. They might be fine, but schlaugh's link checker is flagging them, so please try clicking on them yourself to make sure they work<br><br>were you perhaps intending to link to schlaugh itself using the shorter form of link? please note that URL must start with a "/" character`);
      }
    } else {
      return manageLinkValidate(i, problems);
    }
  }

  manageLinkValidate();
}

var getUserPic = function (user) {
  var userPic;
  if (user) {
    userPic = user.iconURI;
  }
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

var newSessionKey = function (userID) {
  var key = genRandString(5)
  if (sessions && sessions[userID] && sessions[userID][key]) {
    return newSessionKey();
  } else {
    return key;
  }
}

var getPayload = function (req, res, callback) {
  var errMsg = 'unable to acquire payload<br><br>';
  checkForUserUpdates(req, res, errMsg, req.session.user._id, function () {
    var propList = ['posts','username', 'iconURI', 'settings', 'inbox', 'keyPrivate', 'keyPublic', 'following', 'muted', 'pendingUpdates', 'bio', 'bookmarks', 'collapsed', 'savedTags', 'games'];
    readCurrentUser(req, res, errMsg, {list:propList}, function (user) {
      // check if user needs keys
      if (!user.keyPrivate || !user.keyPublic) {return res.send({needKeys:true});}
      if (!user.bookmarks || user.bookmarks.length === undefined) {user.bookmarks = [];}
      if (!user.collapsed || user.collapsed.length === undefined) {user.collapsed = [];}
      if (!user.savedTags || user.savedTags.length === undefined) {user.savedTags = [];}
      var payload = {
        keys: {privKey:user.keyPrivate, pubKey:user.keyPublic },
        username: user.username,
        userID: req.session.user._id,
        settings: user.settings,
        following: user.following,
        bookmarks: user.bookmarks,
        collapsed: user.collapsed,
        savedTags: user.savedTags,
        muted: user.muted,
        games: user.games,
      }
      // session key set
      var sessionKey = newSessionKey(req.session.user._id);
      payload.sessionKey = sessionKey;

      //pending post
      var tmrw = pool.getCurDate(-1);
      if (user.posts[tmrw]) {
        payload.pending = user.posts[tmrw][0];
      }
      //
      if (user.pendingUpdates && user.pendingUpdates.updates) {
        payload.pendingUpdates = user.pendingUpdates.updates;
      } else {
        payload.pendingUpdates = {};
      }
      // bio/userPic need to be filled in AFTER we check for updates
      payload.userPic = getUserPic(user);
      payload.bio = user.bio;
      if (typeof payload.bio !== 'string') {payload.bio = "";}

      //inbox
      if (user.inbox) {
        var threads = [];
        var bump = bumpThreadList(user.inbox);
        if (bump) {
          writeToUser(req, null, errMsg, user);
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
        }
        payload.threads = threads;
        return callback(payload);
      } else {
        payload.threads = [];
        return callback(payload);
      }
    });
  });
}

var getSettings = function (req, res, callback) {
  if (!req.session.user) {return callback({user:false, settings:null});}
  var errMsg = "unable to access user settings<br><br>";
  readCurrentUser(req, res, errMsg, {list:['settings']}, function (user) {
    var settings = {};
    settings.colors = user.settings.colors;
    settings.font = user.settings.font;
    return callback({user:true, settings:settings});
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

var genID = function (req, res, errMsg, clctn, length, callback) {
  var output = genRandString(length);
  dbReadOneByID(req, res, errMsg, clctn, output, getProjection(['_id']), function (record) {
    if (record) {return genID(req, res, errMsg, clctn, length, callback);} // collision! try again
    else {return callback(output)}
  });
}

var createStat = function (date, callback) {
  dbCreateOne(null, null, null, 'stats', {_id:date}, function (newID) {
    return callback();
  });
}
var incrementStat = function (kind) {
  var date = pool.getCurDate();
  // does statBucket already exist for day?
  dbReadOneByID(null, null, 'error incrementing stat<br><br>', 'stats', date, null, function (stat) {
    if (!stat) {createStat(date, function () {
      updateStat(date, kind, 1);
    })} else {
      var x = 1;
      if (stat[kind]) {x = stat[kind] + 1;}
      updateStat(date, kind, x);
    }
  });
}
var updateStat = function (date, kind, val) {
  var obj = {};
  obj[kind] = val;
  dbWriteByID(null, null, "error updating stat: ", 'stats', date, obj, null);
}

var createPost = function (req, res, errMsg, authorID, callback, date) {    //creates a postID and ref in the postDB
  if (!ObjectId.isValid(authorID)) {return callback({error:"invalid authorID format"});}
  authorID = ObjectId(authorID);
  if (!date) {date = pool.getCurDate(-1)}
  genID(req, res, errMsg, 'posts', 7, function (newID) {
    var newPostObject = {
      _id: newID,
      date: date,
      authorID: authorID,
      num:0,
    }
    dbCreateOne(req, res, errMsg, 'posts', newPostObject, function (newID) {
      return callback({error:false, post_id:newID});
    });
  });
}

var nullPostFromPosts = function (req, res, errMsg, postID, callback) {
  var emptyPost = {date: null, authorID: null,};
  dbWriteByID(req, res, errMsg, 'posts', postID, emptyPost, function () {
    callback();
  });
}

var lowercaseTagRef = function (ref) {
  var newRef = {}
  for (var tag in ref) {
    if (ref.hasOwnProperty(tag)) {
      if (!newRef[tag.toLowerCase()]) {
        newRef[tag.toLowerCase()] = true;
      }
    }
  }
  return newRef;
}

var updateUserPost = function (req, res, errMsg, text, newTags, title, url, userID, user, callback, daysAgo) {
  var tmrw = pool.getCurDate(-1);
  if (devFlag && daysAgo) { // CHEATING, for local testing only
    var tmrw = pool.getCurDate(daysAgo);
  }
  // lowercase copy of the newTags
  var newTagsLowerCased = lowercaseTagRef(newTags);
  //
  if (user.posts[tmrw]) {                               //edit existing
    // lowercase the existing tags
    var oldTagsLowerCased = lowercaseTagRef(user.posts[tmrw][0].tags);
    // check existing tags
    var badTagArr = [];
    for (var tag in oldTagsLowerCased) {
      if (oldTagsLowerCased.hasOwnProperty(tag)) {
        if (!newTagsLowerCased[tag]) {          // if the old tag is NOT a new tag too
          badTagArr.push(tag.toLowerCase());
        }
      }
    }
    deleteTagRefs(req, res, errMsg, badTagArr, tmrw, userID, function () {
      var newTagArr = [];
      for (var tag in newTagsLowerCased) {
        if (newTagsLowerCased.hasOwnProperty(tag)) {
          if (!oldTagsLowerCased[tag]) { // if the new tag is NOT an old tag too
            newTagArr.push(tag.toLowerCase());
          }
        }
      }
      createTagRefs(req, res, errMsg, newTagArr, tmrw, userID, function () {
        user.posts[tmrw][0].body = text;
        user.posts[tmrw][0].tags = newTags;
        user.posts[tmrw][0].title = title;
        user.posts[tmrw][0].url = url;
        return callback();
      });
    });
  } else {                                  //create new
    createPost(req, res, errMsg, userID, function (resp) {
      user.posts[tmrw] = [{
        body: text,
        tags: newTags,
        title: title,
        url: url,
        post_id: resp.post_id,
      }];
      user.postListPending.push({date:tmrw, num:0});
      //
      var tagArr = [];
      for (var tag in newTagsLowerCased) {    // add a ref in the tag db for each tag
        if (newTagsLowerCased.hasOwnProperty(tag)) {tagArr.push(tag.toLowerCase())}
      }
      createTagRefs(req, res, errMsg, tagArr, tmrw, userID, function () {
        return callback();
      });
    });
  }
}

var deletePost = function (req, res, errMsg, user, date, callback) {
  if (!user.posts[date]) {return sendError(req, res, errMsg+" post not found");}
  var deadTags = [];
  for (var tag in user.posts[date][0].tags) {
    if (user.posts[date][0].tags.hasOwnProperty(tag)) {
      deadTags.push(tag.toLowerCase());
    }
  }
  deleteTagRefs(req, res, errMsg, deadTags, date, user._id, function () {
    if (user.posts[date][0].url) {
      delete user.customURLs[user.posts[date][0].url];
    }
    // is this a pending or an OLD post?
    if (date === pool.getCurDate(-1)) {
      user.postListPending.pop();   //currently assumes that postListPending only ever contains 1 post
      //
      dbDeleteByID(req, res, errMsg, 'posts', user.posts[date][0].post_id, function () {
        delete user.posts[date];
        writeToUser(req, res, errMsg, user, function () {
          return callback();
        });
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
      nullPostFromPosts(req, res, errMsg, user.posts[date][0].post_id, function () {
        delete user.posts[date];
        writeToUser(req, res, errMsg, user, function () {
          return callback();
        });
      });
    }
  });
}

// **** the "tagsByTag" db  is where we store references to posts, indexed by TAG, and in arrays sorted by date, oldest to newest
var multiTagIndexAddOrRemove = function (tagArr, date, authorID, creating, callback) {
  var count = tagArr.length;
  for (var i = 0; i < tagArr.length; i++) {
    tagIndexAddOrRemove(tagArr[i], date, authorID, creating, function (resp) {
      if (resp.error && count > 0) {
        count = -1;
        return callback({error:resp.error});
      } else {
        count--;
        if (count === 0) {
          return callback({error:false,});
        }
      }
    })
  }
}
var tagIndexAddOrRemove = function (tag, date, authorID, creating, callback) {
  tag = tag.toLowerCase();
  var postItem = {date:date, authorID:authorID, num:0};

  var nextInLine = 0;
  if (tagIndexOccupiedSign[tag]) {              // if there line, how long it?
    nextInLine = tagIndexOccupiedSign[tag].length +1;
  }

  var lineDecisions = function (resp) {
    if (tagIndexOccupiedSign[tag]) {  // on way out, if line, then tap person after you
      if (tagIndexOccupiedSign[tag][nextInLine]) {
        tagIndexOccupiedSign[tag][nextInLine]();
      } else {  // you are last in line, close the line
        delete tagIndexOccupiedSign[tag];
      }
    }
    if (resp.error) {return callback(resp);}
    else {return callback({error:false});}
  }

  var execute = function () {
    if (creating) {
      createTagIndexItem(tag, postItem, lineDecisions)
    } else {
      removeTagIndexItem(tag, postItem, lineDecisions)
    }
  }

  if (tagIndexOccupiedSign[tag]) {      // if there is a line, then get in line
    tagIndexOccupiedSign[tag].push(execute);
  } else {
    tagIndexOccupiedSign[tag] = [];
    execute();
  }
}
var tagIndexOccupiedSign = {};
var createTagIndexItem = function (tag, postItem, callback) {
  // check if tag listing is extant
  dbReadOneByID(null, null, null, 'tagsByTag', tag, null, function (tagListing) {
    if (tagListing && tagListing.error) {return callback({error:tagListing.error});}
    if (!tagListing) {                             // tag does not exist, make it
      var newTag = {_id: tag};
      newTag.list = [postItem];
      dbCreateOne(null, null, null, 'tagsByTag', newTag, function (newID) {
        if (newID.error) {return callback({error:newID.error});}
        else {return callback({error:false});}
      });
    } else {                                           // tag exists, add to it
      tagListing.list.push(postItem);
      dbWriteByID(null, null, null, 'tagsByTag', tag, tagListing, function (resp) {
        if (resp && resp.error) {return callback({error:resp.error});}
        else {return callback({error:false});}
      });
    }
  });
}
var removeTagIndexItem = function (tag, postItem, callback) {
  // check if tag listing is extant
  dbReadOneByID(null, null, null, 'tagsByTag', tag, null, function (tagListing) {
    if (tagListing && tagListing.error) {return callback({error:tagListing.error});}
    if (!tagListing) {return callback({error:false});} // tag does not exist, so can't be deleted...but it doesn't exist, so we're good?
    // tag exists, find the item to be removed
    for (var i = 0; i < tagListing.list.length; i++) {
      // this is potentially very slow, cycling through every post ever w/ that tag
      // since the posts are sorted, it could search faster, or at the very least just go from the end since most deletions will be recent, i think
      if (tagListing.list[i].date === postItem.date && String(tagListing.list[i].authorID) === String(postItem.authorID)) {
        tagListing.list.splice(i, 1);
        break;
      }
    }
    if (tagListing.list.length > 0) { // write the new array with the item taken out
      dbWriteByID(null, null, null, 'tagsByTag', tag, tagListing, function (resp) {
        if (resp && resp.error) {return callback({error:resp.error});}
        else {return callback({error:false});}
      });
    } else {                      // hde array is empty, delete the whole thing
      dbDeleteByID(null, null, null, 'tagsByTag', tag, function (resp) {
        if (resp && resp.error) {return callback({error:resp.error});}
        else {return callback({error:false});}
      });
    }
  });
}

// **** the "tagsByDate" db is where we store references to posts, indexed by DATE, then by tag for each day, then unsorted arrays for each date[tag]
var createTagRefs = function (req, res, errMsg, tagArr, date, authorID, callback) {
  if (tagArr.length === 0) {return callback();}
  //
  if (!ObjectId.isValid(authorID)) {return sendError(req, res, errMsg+"invalid authorID format");}
  authorID = ObjectId(authorID);
  multiTagIndexAddOrRemove(tagArr, date, authorID, true, function (resp) {
    if (resp.error) {return sendError(req, res, errMsg+resp.error);}

    // check if dateBucket is extant
    dbReadOneByID(req, res, errMsg, 'tagsByDate', date, null, function (dateBucket) {
      if (!dateBucket) {                          // dateBucket does not exist, make it
        var newDateBucket = {_id: date,};
        newDateBucket.ref = {};
        for (var i = 0; i < tagArr.length; i++) {
          newDateBucket.ref[tagArr[i]] = [authorID];
        }
        dbCreateOne(req, res, errMsg, 'tagsByDate', newDateBucket, function (newID) {
          return callback();
        });
      } else {                                     // dateBucket exists, add to it
        var tagObject = [authorID];
        for (var i = 0; i < tagArr.length; i++) {
          if (!checkObjForProp(dateBucket.ref, tagArr[i], tagObject)) { // is tag extant?
            dateBucket.ref[tagArr[i]].push(authorID);
          }
        }
        dbWriteByID(req, res, errMsg, 'tagsByDate', date, dateBucket, function () {
          return callback();
        });
      }
    });
  });
}
var deleteTagRefs = function (req, res, errMsg, tagArr, date, authorID, callback) {
  if (tagArr.length === 0) {return callback({date:date});}
  //
  if (!ObjectId.isValid(authorID)) {return sendError(req, res, errMsg+" invalid authorID format");}
  authorID = ObjectId(authorID);
  multiTagIndexAddOrRemove(tagArr, date, authorID, false, function (resp) {
    if (resp.error) {return sendError(req, res, errMsg+resp.error);}

    dbReadOneByID(req, res, errMsg, 'tagsByDate', date, null, function (dateBucket) {
      if (!dateBucket) {return callback({date:date});}
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
            delete dateBucket.ref[tagArr[i]];
          }
        }
      }
      dbWriteByID(req, res, errMsg, 'tagsByDate', date, dateBucket, function () {
        return callback({date:date});
      });
    });
  });
}
//

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
    if (arr.length > 41) {return "this is not actually an 'error', this is just me preventing you from using this many tags. Do you <i>really</i> need this many tags?? Tell staff about this if you have legitimate reason for the limit to be higher. I might have drawn the line too low, i dunno, i had to draw it somewhere.<br><br>beep boop"}
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].length > 280) {return "this is not actually an 'error', it's just one of your tags is very long and I'm preventing you from submitting it. Do you <i>really</i> need that many characters in one tag?? I mean, maybe. Tell staff if you think there is good reason to nudge the limit higher. I just had to draw the line somewhere, lest someone submit the entire text of <i>Worth the Candle</i> as tags in an attempt to break the site.<br><br>enjoy your breakfast"}
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

var validatePostURL = function (user, date, string) {
  if (!string) {string = "";}
  if (!user || !user.posts) {return {error:"url validation: missing user data"};}
  if (!date) {return {error:"url validation: missing date"};}
  if (user.posts && user.posts[date] && user.posts[date][0].url) {
    if (user.posts[date][0].url === string) { // no change, we good
      return {user:user, url:string};
    } else {
      delete user.customURLs[user.posts[date][0].url]
    }
  }
  if (string === "") {
    return {user:user, url:string};
  }
  if (string.length > 60) {
    return {error: "this is not actually an 'error', this is just me preventing you from making a url >60 characters. Like, you really want it that long? <i>Short</i> urls are typically the thing people want? I mean, maybe. Tell staff if you think there is good reason to nudge the limit higher. I just had to draw the line somewhere, lest someone submit the entire text of <i>Worth the Candle</i> as a url in an attempt to break the site.<br><br>remember to floss!"};
  }
  string = string.replace(/[^a-zA-Z0-9-_]/g, '');
  if (!user.customURLs) {user.customURLs = {}}
  if (user.customURLs[string]) {
    if (user.customURLs[string].date !== date) {
      var errorString = "you have already used this url for another post, if you wish to use it for this post, please go edit that post and unassign it first:<br><a class='special'  target='_blank' href='/"+user.username+"/"+string+"'>schlaugh.com/"+user.username+"/"+string+"</a>";
      return {deny: errorString};
    }
    // else, do nothing, the url is taken, for THIS post
  } else {
    user.customURLs[string] = {date: date}
  }
  return {user:user, url:string};
}

var sendError = function (req, res, errMsg) {
  // req and res are optional. if no req, then no user is associated w/ the error. if no res, then no response to the client about it
  // log it
  var newErrorLog = {
    error: errMsg,
    creationTime: new Date(),
  }
  if (req && req.session && req.session.user && req.session.user._id) {
    newErrorLog.user = req.session.user._id;
  }

  dbCreateOne(req, res, errMsg, 'errorLogs', newErrorLog, function (newID) {
    // do nothing, don't report an error if reporting the error doesn't work, because loop
  });

  //
  if (res) {  // so we can NOT notify the FE about an error, but still log it above
    errMsg = "ERROR! SORRY! Please screenshot this and note all details of the situation and tell staff. SORRY<br><br>" + errMsg;
    res.send({error: errMsg});
  }
}

var postsFromAuthorListAndDate = function (req, res, errMsg, authorList, date, followingRef, postRef, callback) {
  // for getting posts by following for main feed, and all posts with tag on date,
  checkMultiUsersForUpdates(req, res, errMsg, authorList, function () {
    readMultiUsers(req, res, errMsg, authorList, {list:['username', 'iconURI', 'pendingUpdates',], dates:[date]}, function (users) {
      // this is to get pics for authors to populate the following list
      var followingList = [];
      if (followingRef) {
        for (var i = 0; i < users.length; i++) {
          if (followingRef[users[i]._id]) {
            var pic = users[i].iconURI;
            if (typeof pic !== 'string') {pic = "";}
            followingList.push({
              name: users[i].username,
              _id: users[i]._id,
              pic: pic,
            });
          }
        }
      }
      var posts = [];

      for (var i = 0; i < users.length; i++) {
        if (users[i].posts && users[i].posts[date]) {
          //
          var post_id = null;
          if (users[i].posts[date][0].post_id) {post_id = users[i].posts[date][0].post_id}
          // strip out private posts
          if (!users[i].posts[date][0].private) {
            // if the postRef indicates that FE already has it, we don't need it again
            if (postRef[post_id]) {
              posts.push({post_id: post_id,});
            } else {
              var authorPic = getUserPic(users[i]);
              posts.push({
                body: users[i].posts[date][0].body,
                tags: users[i].posts[date][0].tags,
                post_id: post_id,
                author: users[i].username,
                authorPic: authorPic,
                _id: users[i]._id,
                date: date,
                title: users[i].posts[date][0].title,
                url: users[i].posts[date][0].url,
              });
            }
          }
        }
      }
      return callback({error:false, posts:posts, followingList:followingList});
    });
  });
}

var postsFromListOfAuthorsAndDates = function (req, res, errMsg, postList, postRef, callback) {
  // this is for bookmarkLists and sequences and tagPages
  if (postList.length === 0) {return callback({error:false, posts:[],});}
  // garbage to cover my inconsistent choice of author_id AND authorID
  var aID = "authorID";
  if (postList[0].author_id) {aID = "author_id"}
  // parse postList into authorList and postBook
  var postBook = {};
  for (var i = 0; i < postList.length; i++) {
    var listing = {date:postList[i].date ,pos:i};
    if (postBook[postList[i][aID]]) {
      postBook[postList[i][aID]].push(listing)
    } else {
      postBook[postList[i][aID]] = [listing];
    }
  }
  var authorList = [];
  for (var author in postBook) {
    if (postBook.hasOwnProperty(author)) {
      authorList.push(ObjectId(author));
    }
  }
  //
  checkMultiUsersForUpdates(req, res, errMsg, authorList, function () {
    //
    var posts = [];
    var loop = function (i, callback) {
      if (!authorList[i]) {return callback();}
      //
      var dates = [];
      for (var j = 0; j < postBook[authorList[i]].length; j++) {
        dates.push(postBook[authorList[i]][j].date);
      }
      readUser(req, res, errMsg, authorList[i], {list:['username', 'iconURI',], dates}, function(user) {
        //
        var authorPic = getUserPic(user);
        //
        for (var j = 0; j < postBook[user._id].length; j++) {
          var date = postBook[user._id][j].date;
          if (user && user.posts && user.posts[date] && date <= pool.getCurDate()) {
            var post_id = null;
            if (user.posts[date][0].post_id) {post_id = user.posts[date][0].post_id}
            // strip out private posts
            if (user.posts[date][0].private) {
              // but leave this flag here to show that something was here before
              posts[postBook[user._id][j].pos] = {
                body: "<c><b>***post has been made private by author***</b></c>",
                tags: {},
                post_id: genRandString(8),
                author: "",
                authorPic: "",
                _id: "",
                date: date,
                private: true,
              };
              //
            } else if (postRef[post_id]) {    // they already have the post data
              posts[postBook[user._id][j].pos] = {
                post_id: post_id,
              };
            } else {                    // the normal case, send the data
              posts[postBook[user._id][j].pos] = {
                body: user.posts[date][0].body,
                tags: user.posts[date][0].tags,
                title: user.posts[date][0].title,
                url: user.posts[date][0].url,
                post_id: post_id,
                author: user.username,
                authorPic: authorPic,
                _id: user._id,
                date: date,
              };
            }
          } else if (user && user.posts && user.posts[date]) {  // they bookmarked a future post lol
            posts[postBook[user._id][j].pos] = {
              body: `<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"><c><b><i>***n i c e  t r y  p a l***</i></b></c></a>`,
              tags: {},
              post_id: genRandString(8),
              author: "",
              authorPic: "",
              _id: "",
              date: date,
            };
          } else {  // post not found, and/or the author is not found
            posts[postBook[user._id][j].pos] = {
              body: "<c><b>***post has been deleted by author***</b></c>",
              tags: {},
              post_id: genRandString(8),
              author: "",
              authorPic: "",
              _id: "",
              date: date,
            };
          }
        }
        return loop(i+1, callback);
      });
    }
    return loop(0, function () {
      return callback({error:false, posts:posts,});
    });
  });
}

var getAuthorListFromTagListAndDate = function (req, res, errMsg, tagList, date, callback) {
  // takes list of tags and a single date, returns list of authors with posts using at least one of the tags, on the date
  var authorList = [];
  if (!tagList || !tagList.length || !date) {
    return callback({authorList: authorList});
  }

  dbReadOneByID(req, res, errMsg, 'tagsByDate', date, null, function (dateBucket) {
    if (!dateBucket) {
      return callback({authorList: authorList});
    } else {
      for (var i = 0; i < tagList.length; i++) {
        if (dateBucket.ref[tagList[i].toLowerCase()]) {
          authorList = authorList.concat(dateBucket.ref[tagList[i].toLowerCase()]);
        }
      }
      for (var i = 0; i < authorList.length; i++) {
        if (typeof authorList[i] === 'string' && ObjectId.isValid(authorList[i])) {
          authorList[i] = ObjectId(authorList[i])
        }
      }
      return callback({authorList: authorList});
    }
  });
}

var insertIntoArray = function (array, index, item) { // array.sPlice already does that, accepts a 3rd parameter that is inserted this, swap this at some point
  var before = array.slice(0,index);
  before.push(item);
  var after = array.slice(index);
  return before.concat(after);
}

var getTags = function (ref) { //input ref of a date of tags
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

var idScreen = function (req, res, errMsg, callback) {
  if (!req.session || !req.session.user) {return sendError(req, res, errMsg+"no user session 6481");}
  if (!ObjectId.isValid(req.session.user._id)) {return sendError(req, res, errMsg+"invalid userID format");}
  return callback(ObjectId(req.session.user._id));
}

var idCheck = function (req, callback) {
  if (!req.session.user) {return callback(false);}
  if (!ObjectId.isValid(req.session.user._id)) {return callback(false);}
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



// **** datebase operation functions **** //
var dbTimeOut = function (req, res, errMsg) {
  return sendError(req, res, errMsg+"database request timeout!");
}
var setDbTimer = function (req, res, errMsg) {
  var dbTimer = setTimeout(function () {
    dbTimer = null;
    return dbTimeOut(req, res, errMsg)
  }, 25000);
  return dbTimer;
}
var cancelDbTimer = function (timer, callback) {
  if (timer === null) { return; }
  clearTimeout(timer);
  return callback();
}

// CRUD (or RRRCUD)
var dbReadOneByID = function (req, res, errMsg, collection, _id, projection, callback) {
  // 'collection' is the name of the database table, 'projection' is output from 'getProjection'
  //
  var dbTimer = setDbTimer(req, res, errMsg);
  db.collection(collection).findOne({_id: _id}, projection, function (err, doc) {
    cancelDbTimer(dbTimer, function () {
      if (err) {
        if (res) {
          return sendError(req, res, errMsg+err);
        } else if (callback) {
          return callback({error:err});
        }
      } else {
        if (callback) {
          callback(doc);
        }
        //
        if (doc) {
          var size = BSON.calculateObjectSize(doc);
          if (size) {
            size = Math.ceil(size/4000);
            incrementDbStat('read', size)
          }
        }
      }
    });
  });
}
var dbReadMany = function (req, res, errMsg, collection, idList, projection, callback) {
  // if no idList, then returns ALL docs in the collection
  var searchCriteria = {};
  if (idList) {
    searchCriteria['_id'] = {$in: idList};
  }
  var dbTimer = setDbTimer(req, res, errMsg);
  db.collection(collection).find(searchCriteria, projection).toArray( function(err, docs) {
    cancelDbTimer(dbTimer, function () {
      if (err) {return sendError(req, res, errMsg+err);}
      else {
        if (callback) {
          callback(docs);
        }
        //
        if (docs) {
          var size = BSON.calculateObjectSize(docs);
          if (size) {
            size = Math.ceil(size/4000);
            incrementDbStat('read', size)
          }
        }
        //
      }
    });
  });
}
var getProjection = function (props, dates) {
  // both props and dates are arrays of strings
  var obj = {};
  if (props) {
    for (var i = 0; i < props.length; i++) {
      obj[props[i]] = 1;
    }
  }
  if (dates) {
    for (var i = 0; i < dates.length; i++) {
      obj["posts."+dates[i]] = 1;
    }
  }
  return {projection: obj};
}

var dbCreateOne = function (req, res, errMsg, collection, object, callback) {
  // if 'object' has an _id field, that will be the indexed unique id for the document, otherwise mongo assigns an ObjectId
  var dbTimer = setDbTimer(req, res, errMsg);
  db.collection(collection).insertOne(object, null, function (err, result) {
    cancelDbTimer(dbTimer, function () {
      if (err) {
        if (res) {return sendError(req, res, errMsg+err);}
        else if (callback) {return callback({error:err});}
      } else if (callback) {
        callback(result.insertedId);
      }
      //
      if (object) {
        var size = BSON.calculateObjectSize(object);
        if (size) {
          size = Math.ceil(size/1000);
          incrementDbStat('write', size)
        }
      }
      //
    });
  });
}

var dbWriteByID = function (req, res, errMsg, collection, _id, object, callback) {
  var dbTimer = setDbTimer(req, res, errMsg);
  db.collection(collection).updateOne({_id:_id}, {$set: object}, function(err, doc) {
    cancelDbTimer(dbTimer, function () {
      if (err) {
        if (res) {
          return sendError(req, res, errMsg+err);
        } else if (callback) {
          return callback({error:err});
        }
      } else if (!doc) {
        if (res) {
          return sendError(req, res, errMsg+"db write error, could not find document");
        } else if (callback) {
          return callback({error:"db write error, could not find document"});
        }
      } else {
        if (callback) {
          callback();
        }
        //
        if (object) {
          var size = BSON.calculateObjectSize(object);
          if (size) {
            size = Math.ceil(size/1000);
            incrementDbStat('write', size)
          }
        }
        //
      }
    });
  });
}

var dbDeleteByID = function (req, res, errMsg, collection, _id, callback) {
  var dbTimer = setDbTimer(req, res, errMsg);
  db.collection(collection).deleteOne({_id: _id}, function(err) {
    cancelDbTimer(dbTimer, function () {
      if (err) {
        if (res) {return sendError(req, res, errMsg+err);}
        else if (callback) {return callback({error:err});}
      } else if (callback) {
        callback();
      }
      incrementDbStat('write', 1);
    });
  });
}

//
var incrementDbStat = function (kind, amount) {
  var date = pool.getCurDate();
  // does statBucket already exist for day?
  db.collection('dbStats').findOne({_id: date}, null, function (err, stat) {
    if (err) {return sendError(null, null, "error incrementing dbStat, on read<br><br>"+err);}
    else if (!stat) {
      var bucket = {_id: date,}
      bucket[kind] = amount;
      db.collection('dbStats').insertOne(bucket, null, function (err, result) {
        if (err) {return sendError(null, null, "error incrementing dbStat, on create<br><br>"+err);}
        return;
      });
    } else {
      if (stat[kind]) {
        stat[kind] += amount;
      } else {
        stat[kind] = amount;
      }
      db.collection('dbStats').updateOne({_id:date}, {$set: stat}, function(err, doc) {
        if (err) {return sendError(null, null, "error incrementing dbStat, on update<br><br>"+err);}
        return;
      });
    }
  });
}

var readUser = function (req, res, errMsg, userID, propRef, callback) {
  if (!ObjectId.isValid(userID)) {return sendError(req, res, errMsg+"invalid userID format");}
  dbReadOneByID(req, res, errMsg, 'users', ObjectId(userID), getProjection(propRef.list, propRef.dates), function (user) {
    callback(user);
  });
}

var readCurrentUser = function (req, res, errMsg, propRef, callback) {
  idScreen(req, res, errMsg, function (userID) {
    readUser(req, res, errMsg, userID, propRef, function(user) {
      if (!user) {
        return sendError(req, res, errMsg+"user not found");
      } else {
        callback(user);
      }
    });
  });
}

var readMultiUsers = function (req, res, errMsg, authorIdList, propRef, callback) {
  dbReadMany(req, res, errMsg, 'users', authorIdList, getProjection(propRef.list, propRef.dates), function (users) {
    callback(users);
  });
}

var writeToUser = function (req, res, errMsg, userObj, callback) {
  if (!callback) {res = null;}  // so if the thread isn't waiting for the write, then we don't try using res after it already sent later in the thread
  var userID = userObj._id;
  delete userObj._id; // this removes the id from what we are trying to write, since we never want to write an _id...
  if (!userID) {return sendError(req, res, errMsg+"missing _id on user object");}
  if (!ObjectId.isValid(userID)) {return sendError(req, res, errMsg+"invalid user ID format");}
  dbWriteByID(req, res, errMsg, 'users', ObjectId(userID), userObj, function () {
    if (callback) {
      callback();
    }
  });
}

var createUserUrl = function (req, res, errMsg, username, authorID, callback) {    //creates a listing in the userUrl collection
  if (!ObjectId.isValid(authorID)) {return sendError(req, res, errMsg+"invalid authorID format");}
  authorID = ObjectId(authorID);
  var urlObject = {_id: username.toLowerCase(), authorID: authorID}
  dbCreateOne(req, res, errMsg, 'userUrls', urlObject, function (newID) {
    return callback();
  });
}

var getUserIdFromName = function (req, res, errMsg, username, callback) {
  dbReadOneByID(req, res, errMsg, 'userUrls', username.toLowerCase(), null, function (user) {
    if (!user) {
      return callback(false);
    } else {
      return callback(user.authorID);
    }
  });
}



// admin
var adminGate = function (req, res, callback) {
  if (devFlag) {return callback(res);}
  if (!req.session.user) {
    return return404author(req, res);
  } else {
    readCurrentUser(req, res, 'adminGate error', {list:['username',]}, function (user) {
      if (user && user.username === "admin") {
        callback();
      } //no need to pass 'user' once we take out the code nonsense
      else {
        return return404author(req, res);
      }
    });
  }
}

app.get('/admin', function(req, res) {
  adminGate(req, res, function () {
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
        [getProjection(['username', 'iconURI', 'pendingUpdates', 'bio'], ['2020-03-01']).projection.fish, undefined],
        [getProjection(['username', 'iconURI', 'pendingUpdates', 'bio'], ['2020-03-01']).projection.iconURI, 1],
        [getProjection(['username', 'iconURI', 'pendingUpdates', 'bio'], ['2020-03-01']).projection['posts.2020-03-01'], 1],
      ]
    );
    res.render('admin', { results:results });
  });
});

app.post('/admin/resetCodes', function(req, res) {
  adminGate(req, res, function () {
    dbReadMany(req, res, 'resetCodes errMsg', 'resetCodes', null, null, function (codes) {
      return res.send(codes);
    });
  });
});

app.post('/admin/errorLogs', function(req, res) {
  adminGate(req, res, function () {
    dbReadMany(req, res, 'errorLogs errMsg', 'errorLogs', null, null, function (logs) {
      return res.send(logs);
    });
  });
});

app.post('/admin/users', function(req, res) {
  adminGate(req, res, function () {
    var props = ['_id', 'username'];
    if (req.body.text && typeof req.body.text === 'string') {
      props.push(req.body.text);
    }
    readMultiUsers(req, res, '/admin/users errMsg', null, {list:props,}, function (users) {
      return res.send(users);
    });
  });
});

app.post('/admin/userUrls', function(req, res) {
  adminGate(req, res, function () {
    dbReadMany(req, res, 'userUrls errMsg', 'userUrls', null, null, function (userUrls) {
      return res.send(userUrls);
    });
  });
});

app.post('/admin/stats', function(req, res) {
  adminGate(req, res, function () {
    dbReadMany(req, res, 'stats errMsg', 'stats', null, null, function (stats) {
      return res.send(stats);
    });
  });
});

app.post('/admin/user', function(req, res) {
  var errMsg = "buggon /admin/user<br><br>"
  adminGate(req, res, function () {
    if (req.body.name) {
      getUserIdFromName(req, res, errMsg, req.body.name, function (userID) {
        if (!userID) {
          return res.send({error:"username not found"});
        } else {
          readUser(req, res, errMsg, userID, {}, function(user) {
            if (!user) {user = {user:"username found, but user not found"}}
            return res.send(user);
          });
        }
      });
    } else {
      readUser(req, res, errMsg, req.body.id, {}, function(user) {
        if (!user) {user = {user:"user not found"}}
        return res.send(user);
      });
    }
  });
});

app.post('/admin/getDbStats', function(req, res) {
  adminGate(req, res, function () {
    dbReadMany(req, res, 'dbStats errMsg', 'dbStats', null, null, function (stats) {
      return res.send(stats);
    });
  });
});

app.post('/admin/getPost', function(req, res) {
  adminGate(req, res, function () {
    dbReadOneByID(req, res, '/admin/getPost errMsg', 'posts', req.body._id, null, function (post) {
        if (!post) {return res.send({error:"post not found"});}
        //
        readUser(req, res, "errMsg", post.authorID, {dates:[post.date]}, function(user) {
          if (!user) {
            return sendError(req, res, errMsg+"user not found");
          } else {
            return res.send({error:false, post:user.posts[post.date][0]});
          }
        });
      }
    );
  });
});

app.post('/admin/getSessions', function (req, res) {
  adminGate(req, res, function () {
    var obj = {};
    for (var id in sessions) {
      if (sessions.hasOwnProperty(id)) {
        obj[id] = {}
        for (var key in sessions[id]) {
          if (sessions[id].hasOwnProperty(key)) {
            obj[id][key] = {isEditorOpen: sessions[id][key].isEditorOpen,}
            if (sessions[id][key].lastPing) {
              obj[id][key].lastPing = sessions[id][key].lastPing.toString();
            }
          };
        }
      }
    }
    return res.send(obj);
  });
});

app.post('/admin/schlaunquer', function(req, res) {
  adminGate(req, res, function () {
    dbReadMany(req, res, 'schlaunquerMatches errMsg', 'schlaunquerMatches', null, null, function (matches) {
      return res.send(matches);
    });
  });
});

app.post('/admin/getTagsOfDate', function(req, res) {
  adminGate(req, res, function () {
    dbReadOneByID(req, res, 'errMsg', 'tagsByDate', req.body.date, null, function (newDateBucket) {
      return res.send({old:oldDateBucket, new:newDateBucket});
    });
  });
});

app.post('/admin/getTag', function(req, res) {
  adminGate(req, res, function () {
    dbReadOneByID(req, res, 'errMsg', 'tagsByTag', req.body.tag, null, function (tagBucket) {
      return res.send(tagBucket);
    });
  });
});

app.post('/admin/deletePost', function(req, res) {
  adminGate(req, res, function () {
    if (!req.body.post_id) {return res.send({error:"malformed request 6813"});}

    dbReadOneByID(req, res, 'adminErrMsg', 'posts', req.body.post_id, getProjection(['date','authorID']), function (post) {
      if (!post) {return res.send({error:"post not found! we can't delete what don't exist!"});}
      if (!post.authorID) {return res.send({error:"missing authorID... is this post already deleted?"});}
      if (!post.date) {return res.send({error:"the post data does not include a date? but it did have an authorID????"});}

      readUser(req, res, 'adminErrMsg', post.authorID, {list:['posts','postList', 'postListPending','postListUpdatedOn', 'pendingUpdates', 'bio', 'customURLs']}, function (user) {
        pushNewToPostlist(user); //in case they want to delete a post from today that is still in pendingList
        // before changing anything, verify the postID corresponds with the date
        if (user.posts[post.date] && user.posts[post.date][0].post_id === req.body.post_id) {
          deletePost(req, res, 'adminErrMsg', user, post.date, function () {
            return res.send({error:false});
          });
        } else {return res.send({error:"postID and date miscoresponce"});}
      });
    });
  });
});



// ********** clicker game *********** //
app.get('/~click', function(req, res) {
  renderLayout(req, res, {panel:"clicker"});
});
app.post('/~clicker', function(req, res) {
  var errMsg = "error fetching clicker game info<br><br>";
  idCheck(req, function (userID) {
    getUserIdFromName(req, res, errMsg, "admin", function (adminUserID) {
      readUser(req, res, errMsg, adminUserID, {list:['clicker',]}, function(admin) {
        if (!admin) {return sendError(req, res, errMsg+"data not found");}
        // if game not init, then init
        if (!admin.clicker) {admin.clicker = {totalScore:0, lastClickDate:pool.getCurDate(), clickerRef:{}}}
        // perform night audit if needed
        if (admin.clicker.lastClickDate !== pool.getCurDate()) {
          admin.clicker.lastClickDate = pool.getCurDate();
          for (var personWhoClicked in admin.clicker.clickerRef) {
            if (admin.clicker.clickerRef.hasOwnProperty(personWhoClicked)) {
              admin.clicker.totalScore++;
            }
          }
          admin.clicker.clickerRef = {};
        }
        //
        var signedIn = false;
        var eligible = false;
        if (userID) {
          signedIn = true;
          if (!admin.clicker.clickerRef[userID]) {
            eligible = true;
          }
        }
        writeToUser(req, res, errMsg, admin, function () {
          return res.send({totalScore:admin.clicker.totalScore, signedIn:signedIn, eligible:eligible});
        });
      })
    })
  })
});
app.post('/~clickClicker', function(req, res) {
  var errMsg = "error executing click<br><br>";
  idScreen(req, res, errMsg, function (userID) {
    getUserIdFromName(req, res, errMsg, "admin", function (adminUserID) {
      readUser(req, res, errMsg, adminUserID, {list:['clicker',]}, function(admin) {
        if (!admin) {return sendError(req, res, errMsg+"data not found");}
        if (!admin.clicker || !admin.clicker.lastClickDate || admin.clicker.lastClickDate !== pool.getCurDate()) {
          return sendError(req, res, errMsg+"malformed request 318");
        } else if (admin.clicker.clickerRef[userID]) {
          sendError(req, res, errMsg+"pretty sneaky sis!");
        } else {
          admin.clicker.clickerRef[userID] = true;
          writeToUser(req, res, errMsg, admin, function () {
            return res.send({error:false});
          });
        }
      });
    });
  });
});


// ********** schlaunquer game *********** //
app.get('/~schlaunquer', function(req, res) {
  renderLayout(req, res, {panel:"schlaunquer"});
});
app.get('/~schlaunquer/:game_id', function(req, res) {
  renderLayout(req, res, {panel:"schlaunquer", game_id:req.params.game_id});
});
app.get('/~schlaunquer/:game_id/:day', function(req, res) {
  renderLayout(req, res, {panel:"schlaunquer", game_id:req.params.game_id, day:req.params.day});
});
app.post('/~getSchlaunquer', function(req, res) {
  var errMsg = "error fetching schlaunquer game info<br><br>";
  if (!req.body.game_id) {return sendError(req, res, errMsg+"malformed request 6048");}
  idCheck(req, function (userID) {
    dbReadOneByID(req, res, errMsg, 'schlaunquerMatches', req.body.game_id, null, function (match) {
      if (!match) {return res.send({notFound:true});}

      var updateMatch = schlaunquer.nightAudit(match);

      if (updateMatch) {
        // now save audit to DB
        dbWriteByID(req, res, errMsg, 'schlaunquerMatches', req.body.game_id, updateMatch, function () {
          return schlaunquer.tidyUp(userID, updateMatch, res, errMsg, devFlag);
        });
      } else {
        return schlaunquer.tidyUp(userID, match, res, errMsg, devFlag);
      }
    });
  });
});
app.post('/~moveSchlaunquer', function(req, res) {
  var errMsg = "error updating schlaunquer<br><br>";
  if (!req.body.game_id) {return sendError(req, res, errMsg+"malformed request 5048");}
  idScreen(req, res, errMsg, function (userID) {
    dbReadOneByID(req, res, errMsg, 'schlaunquerMatches', req.body.game_id, null, function (match) {
      if (!match) {return sendError(req, res, errMsg+'match not found? 8871, please refresh and try again');}

      var match = schlaunquer.validateMove(match, req, res, devFlag, userID);
      if (match.error) { return sendError(req, res, errMsg+match.error);}

      // all requirements have been met, save the move
      dbWriteByID(req, res, errMsg, 'schlaunquerMatches', req.body.game_id, match, function () {
        return res.send({error:false});
      });
    });
  });
});
app.post('/~initSchlaunquerMatch', function(req, res) {
  var errMsg = "failed schlaunquer match creations<br><br>";
  if (!req.body.players || !Number.isInteger(req.body.players)) {return sendError(req, res, errMsg+"malformed request 9048");}
  if (!(req.body.players === 6 || req.body.players === 3 || req.body.players === 4 || req.body.players === 2)) {return sendError(req, res, errMsg+"malformed request 9046");}
  readCurrentUser(req, res, errMsg, {list:['username', 'iconURI', 'games']}, function (user) {
    //
    if (user.games && user.games.schlaunquer && user.games.schlaunquer.pending) {
      var count = 0;
      for (var match in user.games.schlaunquer.pending) {if (user.games.schlaunquer.pending.hasOwnProperty(match)) {
        count++;
      }}
    }
    if (count > 20) {return sendError(req, res, errMsg+`woah there cowboy!<br>it seems you're already enrolled in an awful lot of schlaunquer matches. If you'd genuinely like to create additional matches, message @staff and I can bump the limit higher for you. I had to put the limit somewhere and I did not imagine anyone would legitimately want to be in this many matches at once`);}

    //
    genID(req, res, errMsg, 'schlaunquerMatches', 7, function (newID) {
      //
      var match = {}
      match._id = newID;
      match.totalPlayers = req.body.players;
      match.lastUpdatedOn = pool.getCurDate();
      match.gameState = "pending";
      match.version = 2;
      //
      if (req.body.opaqueEnemyUnits) {
        match.opaqueEnemyUnits = true;
      }
      //
      match.spawnValue = schlaunquer.gameRef.spawnValue;
      if (typeof req.body.spawnValue !== "undefined" && Number.isInteger(req.body.spawnValue) && req.body.spawnValue > -1) {match.spawnValue = req.body.spawnValue;}
      //
      match.unitCap = schlaunquer.gameRef.unitCap;
      if (typeof req.body.unitCap !== "undefined" && Number.isInteger(req.body.unitCap) && req.body.unitCap > -1) {match.unitCap = req.body.unitCap;}
      //
      match.players = {};
      match.players[user._id] = {
        username: user.username,
        iconURI: user.iconURI,
      }
      //
      dbCreateOne(req, res, errMsg, 'schlaunquerMatches', match, function (newID) {
        if (!user.games) {user.games = {}};
        if (!user.games.schlaunquer) {user.games.schlaunquer = {}};
        if (!user.games.schlaunquer.pending) {user.games.schlaunquer.pending = {}};
        user.games.schlaunquer.pending[match._id] = true;
        //
        writeToUser(req, res, errMsg, user, function () {
          return res.send({error:false, game_id:match._id});
        });
      });
    });
  });
});
app.post('/~joinSchlaunquerMatch', function(req, res) { // also handles de-joining
  var errMsg = "failed schlaunquer join<br><br>";
  if (!req.body.game_id) {return sendError(req, res, errMsg+"malformed request 7048");}
  readCurrentUser(req, res, errMsg, {list:['username', 'iconURI', 'games']}, function (user) {
    dbReadOneByID(req, res, errMsg, 'schlaunquerMatches', req.body.game_id, null, function (match) {
      if (!match) {return sendError(req, res, errMsg+'match not found');}
      if (!match.gameState || match.gameState !== "pending") {return sendError(req, res, errMsg+'this match is not accepting entrants');}
      if (!match.lastUpdatedOn || match.lastUpdatedOn !== pool.getCurDate()) {return sendError(req, res, errMsg+'match is out of date');}
      //
      if (!match.pendingPlayers) {match.pendingPlayers = {};}
      var empty = false;
      if (req.body.remove) {
        delete match.pendingPlayers[user._id];
        delete match.players[user._id];
        delete user.games.schlaunquer.pending[req.body.game_id];
        // check if match is now empty, and should be deleted
        empty = true;
        for (var player in match.pendingPlayers) {if (match.pendingPlayers.hasOwnProperty(player)) {
          empty = false;
          break;
        }}
        for (var player in match.players) {if (match.players.hasOwnProperty(player)) {
          empty = false;
          break;
        }}
      } else {
        if (match.players[user._id]) { // don't add a player that's already enrolled
          return sendError(req, res, errMsg+'user is already registered for this match');
        }
        match.pendingPlayers[user._id] = {
          username: user.username,
          iconURI: user.iconURI,
        };
        if (!user.games) {user.games = {}};
        if (!user.games.schlaunquer) {user.games.schlaunquer = {}};
        if (!user.games.schlaunquer.pending) {user.games.schlaunquer.pending = {}};
        user.games.schlaunquer.pending[req.body.game_id] = true;
      }
      writeToUser(req, res, errMsg, user, function () {
        if (empty) {
          dbDeleteByID(req, res, errMsg, 'schlaunquerMatches', req.body.game_id, function () {
            return res.send({error:false});
          });
        } else {
          dbWriteByID(req, res, errMsg, 'schlaunquerMatches', req.body.game_id, match, function () {
            return res.send({error:false});
          });
        }
      });
    });
  });
});
app.post('/~checkPendingSchlaunquerMatches', function(req, res) {
  var errMsg = "failed pending schlaunquer match check<br><br>";
  readCurrentUser(req, res, errMsg, {list:['games']}, function (user) {
    if (!user.games || !user.games.schlaunquer || !user.games.schlaunquer.pending) {return res.send({noUpdate:true});}
    if (user.games.schlaunquer.matchListsLastUpdatedOn === pool.getCurDate()) {return res.send({noUpdate:true});}


    user.games.schlaunquer.matchListsLastUpdatedOn = pool.getCurDate();

    checkPendingSchlaunquerMatches(req, res, errMsg, user, function (user) {
      checkActiveSchlaunquerMatches(req, res, errMsg, user, function (user) {
        writeToUser(req, res, errMsg, user, function () {
          return res.send(user.games.schlaunquer);
        });
      });
    });
  });
});
var checkPendingSchlaunquerMatches = function (req, res, errMsg, user, callback, matchArr, i) {
  if (!i) { // init
    i = 0;
    matchArr = [];
    for (var match in user.games.schlaunquer.pending) {if (user.games.schlaunquer.pending.hasOwnProperty(match)) {
      matchArr.push(match);
    }}
    if (matchArr.length === 0) {
      return callback(user);
    }
  }
  //
  dbReadOneByID(req, res, errMsg, 'schlaunquerMatches', matchArr[i], null, function (match) {
    if (!match) {return sendError(req, res, errMsg+"match "+matchArr[i]+" not found");}

    var updatedMatch = schlaunquer.nightAudit(match);

    // move/remove the match in the user's records if necesary
    var curMatch = updatedMatch || match;
    if (curMatch.gameState !== 'pending') {
      delete user.games.schlaunquer.pending[matchArr[i]];
      //
      if (curMatch.players[user._id]) {   // are they in the game?
        if (!user.games.schlaunquer[curMatch.gameState]) {user.games.schlaunquer[curMatch.gameState] = {}}
        user.games.schlaunquer[curMatch.gameState][matchArr[i]] = true;
      }
    }

    // save the updated match
    if (updatedMatch) {
      dbWriteByID(req, res, errMsg, 'schlaunquerMatches', matchArr[i], updatedMatch, function () {
        i++;
        if (matchArr.length === i) { return callback(user);}
        else {return checkPendingSchlaunquerMatches(req, res, errMsg, user, callback, matchArr, i);}
      });
    } else {
      i++;
      if (matchArr.length === i) { return callback(user);}
      else {return checkPendingSchlaunquerMatches(req, res, errMsg, user, callback, matchArr, i);}
    }
  });
}
var checkActiveSchlaunquerMatches = function (req, res, errMsg, user, callback) {
  // this is a passive check of if a match victor has already been declared,
  // we do NOT want this to actually go through and perform an audit and check for victory on these matches
  if (!user.games || !user.games.schlaunquer || !user.games.schlaunquer.active) {return callback(user);}
  var matchArr = [];
  for (var match in user.games.schlaunquer.active) {if (user.games.schlaunquer.active.hasOwnProperty(match)) {
    matchArr.push(match);
  }}
  if (matchArr.length === 0) { return callback(user); }
  if (!user.games.schlaunquer.finished) {user.games.schlaunquer.finished = {}}

  dbReadMany(req, res, errMsg, 'schlaunquerMatches', matchArr, getProjection(['victor','dates','players']), function (matchList) {
    for (var i = 0; i < matchList.length; i++) {
      if (matchList[i].victor && !matchList[i].dates[pool.getCurDate()]) {  // if there IS a map for today, then the game ended today, and we want to leave it in active until tomorrow
        user.games.schlaunquer.finished[matchList[i]._id] = true;
        delete user.games.schlaunquer.active[matchList[i]._id];
      } else if (matchList[i].players[user._id].active === false) {
        user.games.schlaunquer.active[matchList[i]._id] = 'dead';
      }
    }
    return callback(user);
  });
}
app.post('/~setSchlaunquerReminder', function(req, res) {
  var errMsg = "schlaunquer reminder status not successfully updated<br><br>";
  if (!req.body || !req.body.date || !pool.isStringValidDate(req.body.date)) {return sendError(req, res, errMsg+"malformed request 294");}
  readCurrentUser(req, res, errMsg, {list:['games']}, function (user) {
    //
    if (!user.games) {user.games = {}};
    if (!user.games.schlaunquer) {user.games.schlaunquer = {}};
    user.games.schlaunquer.remindNextOn = req.body.date;
    //
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});
app.post('/~setSchlaunquerBookmark', function(req, res) {
  var errMsg = "schlaunquer bookmark not successfully updated<br><br>";
  if (!req.body || !req.body.game_id) {return sendError(req, res, errMsg+"malformed request");}
  readCurrentUser(req, res, errMsg, {list:['games']}, function (user) {

    //
    if (!user.games) {user.games = {}};
    if (!user.games.schlaunquer) {user.games.schlaunquer = {}};
    if (!user.games.schlaunquer.bookmarked) {user.games.schlaunquer.bookmarked = {};}
    //
    if (req.body.remove) {
      delete user.games.schlaunquer.bookmarked[req.body.game_id];
    } else {
      user.games.schlaunquer.bookmarked[req.body.game_id] = true;
    }
    //
    writeToUser(req, res, errMsg, user, function () {
      res.send(user.games.schlaunquer.bookmarked);
    });
  });
});



// main page, and panels
app.get('/', function(req, res) {
  if (!req.session.user) {
    incrementStat("rawLoads");
  }
  renderLayout(req, res, {panel:"posts"});
});
app.get('/~posts', function(req, res) {
  renderLayout(req, res, {panel:"posts"});
});
app.get('/~write', function(req, res) {
  renderLayout(req, res, {panel:"write"});
});
app.get('/~inbox', function(req, res) {
  renderLayout(req, res, {panel:"inbox"});
});
app.get('/~settings', function(req, res) {
  renderLayout(req, res, {panel:"settings"});
});

// payload
app.get('/~payload', function(req, res) {
  // for the "cookieless" version this should be a POST
  if (!req.session.user) {return sendError(req, res, "no user session 7194");}
  else {
    getPayload(req, res, function (payload) {
      if (!payload) {return sendError(req, res, "failure to retrieve payload, 7195");}
      return res.send({payload:payload});
    });
  }
});

var sessions = {}
// check for pendingPost changes and openEditors
app.post('/~pingPong', function(req, res) {
  var errMsg = "failure to check for pendingPost update<br><br>";
  if (!req.body || !req.body.key) {return sendError(req, res, errMsg+"malformed request 117");}
  idScreen(req, res, errMsg, function (userID) {
    var frequency = 25; // seconds between pings
    //
    if (!sessions[userID]) {sessions[userID] = {}}
    if (!sessions[userID][req.body.key]) {sessions[userID][req.body.key] = {}}
    //
    var openEditorCount = clearGarbageAndCountEditors(userID);
    // have editors expired such that this client needs an update?
    if ((req.body.editorOpenElsewhere && openEditorCount === 0) || (req.body.editorOpenElsewhere && openEditorCount === 1 && sessions[userID][req.body.key].isEditorOpen)) {
      return res.send({key:req.body.key, editorOpenElsewhere:false});
    } else if (req.body.editorOpenElsewhere === undefined) {              // init
      if (openEditorCount > 1 || (openEditorCount === 1 && !sessions[userID][req.body.key].isEditorOpen)) {
        return res.send({key:req.body.key, editorOpenElsewhere:true});
      } else {
        return res.send({key:req.body.key, editorOpenElsewhere:false});
      }
    } else {
      // freshen
      sessions[userID][req.body.key].response = res;    // fudge, sometimes this line bugs, "Cannot set property 'response' of undefined" ????
      sessions[userID][req.body.key].lastPing = new Date();
      sessions[userID][req.body.key].timer = setTimeout(function () {
        if (!res.headersSent) {return res.send({key:req.body.key});}
      }, frequency*1000);
    }
  });
});

var clearGarbageAndCountEditors = function (userID) {
  var count = 0;
  for (var key in sessions[userID]) {
    if (sessions[userID].hasOwnProperty(key)) {
      // remove OLD JUNK
      var now = new Date();
      if ((now - sessions[userID][key].lastPing) > 120000) {  // if it's been > 2min since last ping
        delete sessions[userID][key];
      } else if (sessions[userID][key].isEditorOpen) {
        count++;
      }
    }
  }
  return count;
}

app.post('/~postEditorOpen', function(req, res) {
  var errMsg = "failure to update openEditor status<br><br>";
  if (!req.body || !req.body.key) {return sendError(req, res, errMsg+"malformed request 118");}
  idScreen(req, res, errMsg, function (userID) {
    if (!sessions[userID]) {sessions[userID] = {}}
    if (!sessions[userID][req.body.key]) {sessions[userID][req.body.key] = {}}
    //
    sessions[userID][req.body.key].isEditorOpen = req.body.isEditorOpen;
    //
    pongAllClients(userID);
    res.send({error:false});
  });
});

var pongAllClients = function (userID, activeKey, post) {
  var openEditorCount = clearGarbageAndCountEditors(userID);
  for (var key in sessions[userID]) {
    if (sessions[userID].hasOwnProperty(key)) {
      var submittedHere = false;
      var includePost = undefined;
      var editorOpenElsewhere = false;
      clearTimeout(sessions[userID][key].timer);
      if (sessions[userID][key].response && !sessions[userID][key].response.headersSent) {
        if (activeKey && activeKey === key) {submittedHere = true}
        else {includePost = post;}
        if (openEditorCount > 1 || (openEditorCount === 1 && !sessions[userID][key].isEditorOpen)) {
          editorOpenElsewhere = true
        }
        sessions[userID][key].response.send({key:key, editorOpenElsewhere:editorOpenElsewhere, post:includePost, submittedHere:submittedHere});
      }
    }
  }
}

var pongOnPostSubmit = function (userID, activeKey, post) {
  if (!sessions[userID]) {sessions[userID] = {}}
  if (!sessions[userID][activeKey]) {sessions[userID][activeKey] = {}}
  //
  sessions[userID][activeKey].isEditorOpen = false;
  //
  pongAllClients(userID, activeKey, post);
}

// new/edit/delete (current) post
app.post('/postPost', function(req, res) {
  var errMsg = "your post was not successfully saved<br><br>";
  if (!req.body || !req.body.key) {return sendError(req, res, errMsg+"malformed request 119");}
  //
  readCurrentUser(req, res, errMsg, {list:['posts','username', 'postList', 'postListPending','postListUpdatedOn', 'customURLs']}, function (user) {
    var userID = user._id;
    pushNewToPostlist(user);

    var tmrw = pool.getCurDate(-1);
    var x = pool.cleanseInputText(req.body.body);
    if (req.body.remove || (x[1] === "" && !req.body.tags && !req.body.title)) {                 //remove pending post, do not replace
      deletePost(req, res, errMsg, user, tmrw, function () {
        pongOnPostSubmit(userID, req.body.key, false);
        return res.send({error:false, body:"", tags:{}, title:""});
      });
    } else {
      linkValidate(x[2], function (linkProblems) {
        //
        var tags = parseInboundTags(req.body.tags);
        if (typeof tags === 'string') {return sendError(req, res, errMsg+tags);}
        var title = validatePostTitle(req.body.title);
        if (title.error) {return sendError(req, res, errMsg+title.error);}
        //
        var urlVal = validatePostURL(user, tmrw, req.body.url);
        if (urlVal.error) {return sendError(req, res, errMsg+urlVal.error);}
        if (urlVal.deny) {return res.send(urlVal);}
        var url = urlVal.url;
        user = urlVal.user;
        //
        imageValidate(x[0], function (resp) {
          if (resp.error) {return sendError(req, res, errMsg+resp.error);}
          updateUserPost(req, res, errMsg, x[1], tags, title, url, userID, user, function () {
            writeToUser(req, res, errMsg, user, function () {
              pongOnPostSubmit(userID, req.body.key, {body:x[1], tags:tags, title:title, url:url});
              return res.send({error:false, body:x[1], tags:tags, title:title, url:url, linkProblems:linkProblems});
            });
          });
        });
      });
    }
  });
});

// new/edit/delete a pending edit to an old post, also handles bios
app.post('/editOldPost', function (req, res) {
  var errMsg = "the post was not successfully edited<br><br>";
  if (!req.body.post_id || !req.body.date) {return sendError(req, res, errMsg+"malformed request 154");}
  if (req.body.post_id !== "bio" && req.body.date > pool.getCurDate()) {return sendError(req, res, errMsg+"you would seek to edit your future? fool!");}
  idScreen(req, res, errMsg, function (userID) {
    // pending updates MUST be fresh when we add to it, else all goes to shit
    checkForUserUpdates(req, res, errMsg, userID, function () {
      readCurrentUser(req, res, errMsg, {list:['posts', 'pendingUpdates', 'bio', 'customURLs', 'username', 'iconURI']}, function (user) {
        // before changing anything, verify the postID corresponds with the date
        var date = req.body.date;
        if ((date === "bio" && req.body.post_id === "bio") || (user.posts[date] && user.posts[date][0].post_id === req.body.post_id)) {
          var x = pool.cleanseInputText(req.body.text);

          // are we deleting a pending edit?
          if (x.error || x[1] === "") {
            if (user.pendingUpdates && user.pendingUpdates.updates && user.pendingUpdates.updates[date]) {
              delete user.pendingUpdates.updates[date];
              writeToUser(req, res, errMsg, user, function () {
                return res.send({error:false, body:"", tags:{}, title:"", url:"",});
              });
            } else {return sendError(req, res, errMsg+"edit not found");}
          } else {
            // no, it's a new edit or an edit edit

            var today = pool.getCurDate();
            if (!user.pendingUpdates) {user.pendingUpdates = {updates:{}, lastUpdatedOn:today};}
            if (!user.pendingUpdates.updates) {user.pendingUpdates.updates = {};}
            if (!user.pendingUpdates.lastUpdatedOn) {user.pendingUpdates.lastUpdatedOn = today;}

            // is it a bio?
            if (req.body.post_id === "bio") {
              var tags = {};
              var title = "";
              var url = "";
            } else {
              // no, it's a post
              var tags = parseInboundTags(req.body.tags);
              if (typeof tags === 'string') {return sendError(req, res, errMsg+tags);}
              var title = validatePostTitle(req.body.title);
              if (title.error) {return sendError(req, res, errMsg+title.error);}
              //
              var urlVal = validatePostURL(user, date, req.body.url);
              if (urlVal.error) {return sendError(req, res, errMsg+urlVal.error);}
              if (urlVal.deny) {return res.send(urlVal);}
              var url = urlVal.url;
              user = urlVal.user;
              // on a new post, the following happens as part of updating the rest of the post,
              // here, the post goes into pendingUpdates, so we need to do it separately right away
              user.posts[date][0].url = url;
              if (req.body.onlyTheUrlHasBeenChanged) {
                return writeToUser(req, res, errMsg, user, function () {
                  return res.send({error:false, body:"", onlyTheUrlHasBeenChanged:true, url:url, date:date});
                });
              }
            }
            //
            linkValidate(x[2], function (linkProblems) {
              //
              imageValidate(x[0], function (resp) {
                if (resp.error) {return sendError(req, res, errMsg+resp.error);}
                if (req.body.post_id === "bio") {
                  var newPost = x[1];
                } else {
                  var newPost = [{
                    body: x[1],
                    tags: tags,
                    title: title,
                    url: url,
                    post_id: req.body.post_id,
                    edited: true,
                  }];
                }
                user.pendingUpdates.updates[date] = newPost;
                writeToUser(req, res, errMsg, user, function () {
                  return res.send({error:false, body:x[1], tags:tags, title:title, url:url, linkProblems:linkProblems});
                });
              });
            });
          }
        } else {
          return sendError(req, res, errMsg+"postID and date miscoresponce");
        }
      });
    });
  });
});

//
app.post('/makePostPrivate', function (req, res) {
  var errMsg = "the post privacy was not successfully toggled<br><br>";
  if (!req.body.postData.post_id || !req.body.postData.date) {return sendError(req, res, errMsg+"malformed request 1514");}
  readCurrentUser(req, res, errMsg, {list:['posts',],}, function (user) {

    // first verify the postID corresponds with the date (this makes sure a user is privating their own post)
    if (user.posts[req.body.postData.date] && user.posts[req.body.postData.date][0].post_id === req.body.postData.post_id) {
      user.posts[req.body.postData.date][0].private = req.body.postData.private;
      //
      writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
    } else {
      return sendError(req, res, errMsg+"postID and date miscoresponce");
    }
  });
});

// delete an already posted(non pending) post, also bio
app.post('/deleteOldPost', function (req, res) {
  var errMsg = "the post was not successfully deleted<br><br>";
  if (!req.body.post_id || !req.body.date) {return sendError(req, res, errMsg+"malformed request 813");}
  readCurrentUser(req, res, errMsg, {list:['posts','postList', 'postListPending','postListUpdatedOn', 'pendingUpdates', 'bio', 'customURLs']}, function (user) {
    if (req.body.date === "bio" && req.body.post_id === "bio") {
      user.bio = "";
      writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
    } else {
      pushNewToPostlist(user); //in case they want to delete a post from today that is still in pendingList
      // before changing anything, verify the postID corresponds with the date
      if (user.posts[req.body.date] && user.posts[req.body.date][0].post_id === req.body.post_id) {
        deletePost(req, res, errMsg, user, req.body.date, function () {
          return res.send({error:false});
        });
      } else {return sendError(req, res, errMsg+"postID and date miscoresponce");}
    }
  });
});

// add/remove to/from bookmarks
app.post('/bookmarks', function(req, res) {
  var errMsg = "bookmark list not successfully updated<br><br>";
  if (!req.body || !req.body.author_id || !req.body.date) {return sendError(req, res, errMsg+"malformed request 644");}
  if (req.body.date > pool.getCurDate()) {return sendError(req, res, errMsg+"pretty sneaky sis");}
  readCurrentUser(req, res, errMsg, {list:['bookmarks']}, function (user) {
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
    if (!found && !req.body.remove) {
      user.bookmarks.push({
        author_id: ObjectId(req.body.author_id),
        date: req.body.date
      });
    }
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// save/unsave tags
app.post('/saveTag', function(req, res) {
  var errMsg = "tag not successfully saved<br><br>";
  if (!req.body || !req.body.tag || typeof(req.body.tag) !== "string") {return sendError(req, res, errMsg+"malformed request 552");}
  readCurrentUser(req, res, errMsg, {list:['savedTags']}, function (user) {
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
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// mute/unmute users
app.post('/mute', function(req, res) {
  var errMsg = "mute status not successfully saved<br><br>";
  if (!req.body || !req.body.userID) {return sendError(req, res, errMsg+"malformed request 553");}
  readCurrentUser(req, res, errMsg, {list:['muted']}, function (user) {
    if (!user.muted) {user.muted = {};}
    if (req.body.muting) {
      user.muted[req.body.userID] = true;
    } else {                            //unmute
      delete user.muted[req.body.userID];
    }
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// follow/unfollow
app.post('/follow', function(req, res) {
  var errMsg = "following list not successfully updated<br><br>";
  if (!req.body || !req.body.id) {return sendError(req, res, errMsg+"malformed request 283");}
  readCurrentUser(req, res, errMsg, {list:['following']}, function (user) {
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
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// new/edit/delete message
app.post('/inbox', function(req, res) {
  var errMsg = "your message has not been successfully sent/saved<br><br>";
  // the incoming text is encrypted, so we can not cleanse it
  if (!req.body.recipient || typeof req.body.encSenderText === 'undefined' || typeof req.body.encRecText === 'undefined') {return sendError(req, res, errMsg+"malformed request");}
  if (String(req.body.recipient) === String(req.session.user._id)) {return sendError(req, res, errMsg+"you want to message yourself??? freak.");}

  // make both sender and recipient DB calls first
  readCurrentUser(req, res, errMsg, {list:['inbox', 'username', 'keyPublic', 'iconURI']}, function (sender) {
    if (!sender.keyPublic) {return sendError(req, res, errMsg+"missing sender key<br><br>"+sender.keyPublic);}

    readUser(req, res, errMsg, String(req.body.recipient), {list:['inbox', 'username', 'keyPublic', 'iconURI',]}, function(recipient) {
      if (!recipient) {return sendError(req, res, errMsg+"recipient not found");}
      //
      if (!recipient.keyPublic) {return sendError(req, res, errMsg+"missing recipient key<br><br>"+recipient.keyPublic);}
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

      if (checkObjForProp(sender.inbox.threads, recipient._id, {name:recipient.username, unread:false, image:recipientPic, thread:[], key:recipient.keyPublic})) {
        // and create the corresponding refference on the list
        sender.inbox.list.push(recipient._id);
      } else {
        // there is an extant thread, so
        // is either person blocking the other?
        if (sender.inbox.threads[recipient._id].blocking || sender.inbox.threads[recipient._id].blocked) {
          return sendError(req, res, errMsg+"this message is not allowed");
        }
        // check/update the key
        if (!sender.inbox.threads[recipient._id].key || sender.inbox.threads[recipient._id].key !== recipient.keyPublic) {
          // key is OLD AND BAD, head back to FE w/ new Key to re-encrypt
          noReKey = false;
          sender.inbox.threads[recipient._id].key = recipient.keyPublic;
          writeToUser(req, res, errMsg, sender, function () {
            return res.send({error:false, reKey:recipient.keyPublic});
          });
        } else {
          // check the last two items, overwrite if there is already a pending message
          if (checkLastTwoForPending(sender.inbox.threads[recipient._id].thread, req.body.remove, req.body.encSenderText, tmrw, false)) {
            overwrite = true;
            removeListRefIfRemovingOnlyMessage(sender.inbox, recipient._id, req.body.remove, tmrw);
          }
          // check that there is a ref on the list, (an extant thread does not nec. imply this)
          if (!req.body.remove) {
            var foundMatch = false;
            for (var i = 0; i < sender.inbox.list.length; i++) {
              if (String(sender.inbox.list[i]) === String(recipient._id)) {
                foundMatch = true;
                break;
              }
            }
            if (!foundMatch) {sender.inbox.list.push(recipient._id);}
          }
          // check/update the thread "name"
          if (!sender.inbox.threads[recipient._id].name || sender.inbox.threads[recipient._id].name !== recipient.username) {
            sender.inbox.threads[recipient._id].name = recipient.username;
          }
          // check/update pic
          if (!sender.inbox.threads[recipient._id].image || sender.inbox.threads[recipient._id].image !== recipientPic) {
            sender.inbox.threads[recipient._id].image = recipientPic;
          }
        }
      }
      if (!overwrite) { //no message to overwrite, so push new message
        sender.inbox.threads[recipient._id].thread.push({
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
        if (!checkObjForProp(recipient.inbox.threads, sender._id, {name:sender.username, unread:false, image:senderPic, thread:[], key:sender.keyPublic})) {
          // there is an extant thread, so
          // is either person blocking the other?
          if (recipient.inbox.threads[sender._id].blocking || recipient.inbox.threads[sender._id].blocked) {
            return sendError(req, res, errMsg+"this message is not allowed");
          }
          // check the last two items, overwrite if there is already a pending message
          if (checkLastTwoForPending(recipient.inbox.threads[sender._id].thread, req.body.remove, req.body.encRecText, tmrw, true)) {
            overwrite = true;
            // if deleting a message, then remove the listing in 'pending'
            if (req.body.remove) {
              delete recipient.inbox.pending[sender._id];
            }
          }
          // check/update the key
          if (!recipient.inbox.threads[sender._id].key || recipient.inbox.threads[sender._id].key !== sender.keyPublic) {
            recipient.inbox.threads[sender._id].key = sender.keyPublic;
          }
          // check/update the thread "name"
          if (!recipient.inbox.threads[sender._id].name || recipient.inbox.threads[sender._id].name !== sender.username) {
            recipient.inbox.threads[sender._id].name = sender.username;
          }
          // check/update pic
          if (!recipient.inbox.threads[sender._id].image || recipient.inbox.threads[sender._id].image !== senderPic) {
            recipient.inbox.threads[sender._id].image = senderPic;
          }
        }
        if (!overwrite) { //no message to overwrite, so push new message
          recipient.inbox.threads[sender._id].thread.push({
            inbound: true,
            date: tmrw,
            body: req.body.encRecText,
          });
          // add to the 'pending' collection
          recipient.inbox.pending[sender._id] = true;
        }
        writeToUser(req, res, errMsg, sender, function () {
          writeToUser(req, res, errMsg, recipient, function () {
            return res.send({error:false, reKey:false});
          });
        });
      }
    });
  });
});

// get inbox
app.post('/getInbox', function (req,res) {
  var errMsg = "unable to retrieve message data<br><br>";
  readCurrentUser(req, res, errMsg, {list:['inbox']}, function (user) {
    var threads = [];
    if (user.inbox) {
      var bump = bumpThreadList(user.inbox);
      if (bump) {
        writeToUser(req, null, errMsg, user);
      }
      var list = user.inbox.list;
      //reverse thread order so as to send a list ordered newest to oldest
      for (var i = list.length-1; i > -1; i--) {
        if (user.inbox.threads[list[i]] && user.inbox.threads[list[i]].thread && user.inbox.threads[list[i]].thread.length !== undefined) {
          //check the last two messages of each thread, see if they are allowed
          var x = checkLastTwoMessages(user.inbox.threads[list[i]].thread, pool.getCurDate(-1), true);
          if (x !== false) {user.inbox.threads[list[i]].thread.splice(x, 1);}
          // add in the authorID for the FE
          user.inbox.threads[list[i]]._id = list[i];
          // all threads are locked until unlocked on the FE
          user.inbox.threads[list[i]].locked = true;
          threads.push(user.inbox.threads[list[i]]);
        }
      }
      res.send({error: false, threads:threads});
    } else {
      res.send({error: false, threads:threads});
    }
  });
});

// block/unblock a user from messaging you
app.post('/block', function(req, res) {
  var errMsg = "block/unblock error<br><br>"
  if (!req.body || !req.body.blockeeID) {return sendError(req, res, errMsg+"malformed request");}
  readCurrentUser(req, res, errMsg, {list:['inbox']}, function (blocker) {
    readUser(req, res, errMsg, req.body.blockeeID, {list:['inbox',]}, function(blockee) {
      if (!blockee) {return sendError(req, res, errMsg+"user not found, blockee");}
      var inboxTemplate = {name:'', unread:false, image:'', thread:[], key:''}
      if (!blocker.inbox) {blocker.inbox = genInboxTemplate();}
      if (!blockee.inbox) {blockee.inbox = genInboxTemplate();}
      if (!blocker.inbox.threads) {blocker.inbox.threads = {};}
      if (!blockee.inbox.threads) {blockee.inbox.threads = {};}
      if (!blocker.inbox.threads[blockee._id]) {blocker.inbox.threads[blockee._id] = inboxTemplate}
      if (!blockee.inbox.threads[blocker._id]) {blockee.inbox.threads[blocker._id] = inboxTemplate}
      if (req.body.blocking === true) {
        blocker.inbox.threads[blockee._id].blocking = true;
        blockee.inbox.threads[blocker._id].blocked = true;
        // delete pending message from recipient (if one exists)
        var tmrw = pool.getCurDate(-1);
        if (checkLastTwoForPending(blocker.inbox.threads[blockee._id].thread, true, "", tmrw, false)) {
          removeListRefIfRemovingOnlyMessage(blocker.inbox, blockee._id, true, tmrw);
        }
        if (checkLastTwoForPending(blockee.inbox.threads[blocker._id].thread, true, "", tmrw, true)) {
          if (blockee.inbox.pending[blocker._id]) {delete blockee.inbox.pending[blocker._id];}
        }
      } else {          // unblocking
        blocker.inbox.threads[blockee._id].blocking = false;
        blockee.inbox.threads[blocker._id].blocked = false;
      }
      writeToUser(req, res, errMsg, blocker, function () {
        writeToUser(req, res, errMsg, blockee, function () {
          return res.send({error: false});
        });
      });
    });
  });
});

// validate images, for messages
app.post('/image', function(req, res) {
  // cant do this on the FE cause CORS
  if (req.body && typeof req.body === "object" && req.body.length) {
    imageValidate(req.body, function (resp) {
      if (resp.error) {return sendError(req, res, resp.error);}
      res.send({error:false});
    });
  } else {return sendError(req, res, errMsg+"malformed request 1504");}
});

// validate links
app.post('/link', function(req, res) {
  // cant do this on the FE cause CORS
  var errMsg = "URL validation error<br><br>";
  if (req.body && typeof req.body.url === "string") {
    linkValidate([req.body.url], function (linkProblems) {
      res.send({linkProblems:linkProblems});
    });
  } else {return sendError(req, res, errMsg+"malformed request 503");}
});

// toggle collapsed status of posts
app.post('/collapse', function(req, res) {
  var errMsg = "collapsed property error<br><br>";
  if (!req.body.id) {return sendError(req, res, errMsg+"malformed request 501");}
  readCurrentUser(req, res, errMsg, {list:['collapsed']}, function (user) {
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
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// toggle unread status of threads
app.post('/unread', function(req, res) {
  var errMsg = "unread property error<br><br>";
  if (!req.body._id || typeof req.body.bool === 'undefined') {return sendError(req, res, errMsg+"malformed request");}
  readCurrentUser(req, res, errMsg, {list:['inbox']}, function (user) {
    if (!user.inbox) {user.inbox = genInboxTemplate();}
    if (!user.inbox.threads) {user.inbox.threads = {};}
    if (!user.inbox.threads[req.body._id]) {return sendError(req, res, errMsg+ "thread not found");}
    user.inbox.threads[req.body._id].unread = req.body.bool;
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// change user picture URL
app.post('/changePic', function(req, res) {
  var errMsg = "error updating user image<br><br>";
  if (!req.body || req.body.url === undefined || typeof req.body.url !== "string") {return sendError(req, res, errMsg+"malformed request 7227");}
  idScreen(req, res, errMsg, function (userID) {
    checkForUserUpdates(req, res, errMsg, userID, function () {
      readCurrentUser(req, res, errMsg, {list:['iconURI', 'pendingUpdates']}, function (user) {
        //
        if (req.body.url === "" && !req.body.pending) {   // we're removing the non-pending image, not replacing, do it now
          user.iconURI = "";
          writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
        } else {
          var today = pool.getCurDate();
          if (!user.pendingUpdates) {user.pendingUpdates = {updates:{}, lastUpdatedOn:today};}
          if (!user.pendingUpdates.updates) {user.pendingUpdates.updates = {};}
          if (!user.pendingUpdates.lastUpdatedOn) {user.pendingUpdates.lastUpdatedOn = today;}
          //
          if (req.body.url === "") {
            delete user.pendingUpdates.updates.iconURI;
            writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
          } else {
            //
            imageValidate([req.body.url], function (resp) {
              if (resp.error) {return sendError(req, res, errMsg+resp.error);}
              //
              user.pendingUpdates.updates.iconURI = req.body.url;
              //
              writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
            }, 10485760);
          }
        }
      });
    });
  });
});

// save custom display colors
app.post('/saveAppearance', function(req, res) {
  var errMsg = "appearance settings not successfully updated<br><br>";
  readCurrentUser(req, res, errMsg, {list:['settings']}, function (user) {
    if (!user.settings) {user.settings = {};}
    if (!user.settings.colors) {user.settings.colors = {};}
    if (req.body.colors && typeof req.body.colors === "object") {
      for (var prop in req.body.colors) {
        if (req.body.colors.hasOwnProperty(prop)) {
          user.settings.colors[prop] = req.body.colors[prop];
        }
      }
    }
    var props = ['preset', 'font-family', 'font-size', 'line-height', 'letter-spacing', 'max-width'];
    for (var i = 0; i < props.length; i++) {
      if (req.body[props[i]] && typeof req.body[props[i]] === "string") {
        user.settings[props[i]] = req.body[props[i]];
      }
    }
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// flip a boolean setting
app.post('/toggleSetting', function(req, res) {
  var errMsg = "settings not successfully updated<br><br>";
  if (!req.body.setting) {return sendError(req, res, errMsg+"malformed request");}
  readCurrentUser(req, res, errMsg, {list:['settings']}, function (user) {
    var setting = req.body.setting;
    if (user.settings[setting]) {
      user.settings[setting] = false;
    } else {
      user.settings[setting] = true;
    }
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// set number of posts rendered on each page for paginated streams
app.post('/setPostsPerPage', function(req, res) {
  var errMsg = "PostsPerPage setting not successfully updated<br><br>";
  if (!req.body || !req.body.number || !Number.isInteger(req.body.number) || req.body.number < 1) {return sendError(req, res, errMsg+"malformed request");}
  readCurrentUser(req, res, errMsg, {list:['settings']}, function (user) {
    user.settings.postsPerPage = Number(req.body.number);
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// set a date on which the user will be re-notified of something
app.post('/setReminder', function(req, res) {
  var errMsg = "reminder not successfully set<br><br>";
  if (!req.body || !req.body.setting || req.body.days === undefined || !Number.isInteger(req.body.days) || req.body.days < 0) {return sendError(req, res, errMsg+"malformed request 993");}
  readCurrentUser(req, res, errMsg, {list:['settings']}, function (user) {
    var date = pool.getCurDate(-(req.body.days));
    user.settings[req.body.setting] = date;
    writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
  });
});

// new user sign up
app.post('/register', function(req, res) {
  var errMsg = 'user registration failure<br><br>'
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {return sendError(req, res, errMsg+err+"malformed request 7217");}
  if (email && typeof email !== 'string') {return sendError(req, res, errMsg+err+"malformed request 7217");}

  // validate
  var x = pool.userNameValidate(username);
  if (x) {return res.send({error:x});}
  var y = pool.passwordValidate(password);
  if (y) {return res.send({error:y});}
  //check if there is already a user w/ that name
  getUserIdFromName(req, res, errMsg, username, function (userID) {
    if (userID) {return res.send({error:"we're sorry<br>that username is<br><br>unavailable"});}
    //
    bcrypt.hash(password, 10, function(err, passHash) {
      if (err) {return sendError(req, res, errMsg+err);}
      bcrypt.hash(email, 10, function(err, emailHash) {
        if (err) {return sendError(req, res, errMsg+err);}
        //
        var newUserObject = createNewUserObject(username, passHash, emailHash);
        dbCreateOne(req, res, errMsg, 'users', newUserObject, function (newID) {
          // the id is only created when the new db listing is created, so things that need the id have to happen after that
          newID = ObjectId(newID);
          createUserUrl(req, res, errMsg, username, newID, function (resp) {
            var setValue = {
              following: [
                ObjectId("5a0ea8429adb2100146f7568"),     //staff
                newID,                                    //self
              ],
              _id: newID,
            };
            writeToUser(req, res, errMsg, setValue, function () {
              incrementStat("signUps");
              // "sign in" the user
              req.session.user = { _id: newID };
              return res.send({error:false, needKeys:true, newUser: true,
                message: `welcome to schlaugh!<br><br>i'll be your staff. Can i get you started with something to drink?<br><br>this thing you're reading right now is a private message. Like everything else on schlaugh, messages are only sent at the schlaupdate. So don't sweat hitting that "save message" button! If you change your mind you have until the end of the day to edit it<br><br>please don't hesitate to ask any questions, that's what i'm here for. if anything at all is even slightly confusing to you, you're doing me a huge favor by letting me know so that i can fix it for everyone else too. you can find the site FAQ <a href="https://www.schlaugh.com/~">here</a>.<br><br>may i ask what brought you here today? How did you hear about schlaugh?<br><br>i'd prefer you communicate by messaging me right here, but if need be, you can also reach me at "schlaugh@protonmail.com"<br><br>&lt;3`,
              });
            });
          });
        });
      });
    });
  });
});
var createNewUserObject = function (username, passHash, emailHash) {
  var today = pool.getCurDate();
  var object = {
    username: username,
    password: passHash,
    email: emailHash,
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
    accountCreatedOn: today,
    iconURI: snakeBank[Math.floor(Math.random() * (snakeBank.length))],
    settings: {includeTaggedPosts:true},
    savedTags: ["@"+username, "milkshake"],
  }
  return object;
}

// log in (aslo password verify)
app.post('/login', function(req, res) {
  var errMsg = "login error<br><br>"
  if (!req.body.username || !req.body.password) {return sendError(req, res, errMsg+"malformed request 147")}
  var nope = "invalid username/password";
  getUserIdFromName(req, res, errMsg, req.body.username, function (userID) {
    if (!userID) {return res.send({error:nope});}
    readUser(req, res, errMsg, userID, {list:['password',]}, function(user) {
      if (!user) {return res.send({error:nope});}
      // Match Password
      bcrypt.compare(req.body.password, user.password, function(err, isMatch) {
        if (err) {return sendError(req, res, errMsg+err);}
        else if (isMatch) {
          if (req.session.user && req.body.forDecryption) { // is there already a logged in user? (via cookie)
            // then this (should be)is a password check to unlock an inbox
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
            if (!req.body.fromPopUp) {        // is this NOT a login from the popup prompt?
              incrementStat("logIns");
            }
            getPayload(req, res, function (payload) {
              if (!payload) {return sendError(req, res, errMsg+"failure to retrieve payload");}
              return res.send({error:false, payload:payload});
            });
          }
        } else {
          return res.send({error:nope});
        }
      });
    });
  });
});

// set keys
app.post('/keys', function(req, res) {
  var errMsg = "error setting encryption keys<br>";
  if (!req.body.privKey || !req.body.pubKey) {return sendError(req, res, errMsg+"malformed request");}

  readCurrentUser(req, res, errMsg, {list:['inbox', 'keyPublic', 'keyPrivate']}, function (user) {

    // do not overwrite existing keys! (when we need to change keys, we clear them elsewhere)
    if (!user.keyPublic && !user.keyPrivate) {
      user.keyPublic = req.body.pubKey;
      user.keyPrivate = req.body.privKey;
    }
    if (req.body.newUserMessage) {    // new user, send welcome message
      getUserIdFromName(req, res, errMsg, "staff", function (staffID) {
        if (!staffID) { sendError(req, res, errMsg+"staff account not found") }

        readUser(req, res, errMsg, staffID, {list:['keyPublic', 'iconURI',]}, function(staff) {
          var staffPic = staff.iconURI;
          if (typeof staffPic !== 'string') {staffPic = "";}
          user.inbox.threads[staffID] = {name:"staff", unread:true, image:staffPic, thread:[], key:staff.keyPublic};
          user.inbox.threads[staffID].thread.push({
            inbound: true,
            date: pool.getCurDate(),
            body: req.body.newUserMessage,
          });
          user.inbox.list.push(staffID);
          //
          writeToUser(req, res, errMsg, user, function () {
            getPayload(req, res, function (payload) {
              return res.send({error:false, payload:payload});
            });
          });
        });
      });
    } else {
      writeToUser(req, res, errMsg, user, function () {
        getPayload(req, res, function (payload) {
          return res.send({error:false, payload:payload});
        });
      });
    }
  });
});

// logout
app.get('/~logout', function(req, res) {
  req.session.user = null;
  res.send({error: false});
});

// change user name
app.post('/changeUsername', function (req, res) {
  var errMsg = "username change error<br><br>";
  var x = pool.userNameValidate(req.body.newName);
  if (x) {return res.send({error:x});}
  readCurrentUser(req, res, errMsg, {list:['settings', 'username']}, function (user) {
    if (user.settings && user.settings.dateOfPreviousNameChange === pool.getCurDate()) {
      return res.send({error:"seems you've already changed your name today...i think once a day is enough, try again tomorrow"});
    } else {
      getUserIdFromName(req, res, errMsg, req.body.newName, function (otherUserID) {
        if (otherUserID && String(otherUserID) !== String(user._id)) {return res.send({error: "we regret to inform you that this username is already taken"});}
        //
        var oldName = user.username.toLowerCase();
        user.username = req.body.newName;
        if (!user.settings) {user.settings = {}};
        user.settings.dateOfPreviousNameChange = pool.getCurDate();
        if (req.body.newName.toLowerCase() !== oldName) { // this check is in case they were only changing capitalization
          createUserUrl(req, res, errMsg, req.body.newName.toLowerCase(), user._id, function () {
            dbDeleteByID(req, res, errMsg, 'userUrls', oldName, function () {
              writeToUser(req, res, errMsg, user, function () {
                res.send({error: false, name: req.body.newName});
              });
            });
          });
        } else {
          writeToUser(req, res, errMsg, user, function () {
            res.send({error: false, name: req.body.newName});
          });
        }
      });
    }
  });
});

// verify hashed email
app.post('/verifyEmail', function (req, res) {
  var errMsg = "email verification error<br><br>";
  if (!req.body.email) {return sendError(req, res, errMsg+"malformed request");}
  readCurrentUser(req, res, errMsg, {list:['email']}, function (user) {
    if (!user.email) {res.send({error: false, match:false});}
    else {
      bcrypt.compare(req.body.email, user.email, function(err, isMatch){
        if (err) {return sendError(req, res, errMsg+err);}
        else if (isMatch) {
          res.send({error: false, match:true});
        } else {
          res.send({error: false, match:false});
        }
      });
    }
  });
});

// change user email
app.post('/changeEmail', function (req, res) {
  var errMsg = "email change error<br><br>";
  if (!req.body.email) {return sendError(req, res, errMsg+"malformed request");}
  readCurrentUser(req, res, errMsg, {list:['email']}, function (user) {
    bcrypt.hash(req.body.email, 10, function(err, emailHash) {
      if (err) {return sendError(req, res, errMsg+err);}
      else {
        user.email = emailHash;
        writeToUser(req, res, errMsg, user, function () {
          return res.send({error: false, email: req.body.email});
        });
      }
    });
  });
});

// change user password
app.post('/changePasswordStart', function (req, res) {
  var errMsg = "password change error1<br><br>";
  if (!req.body.oldPass || !req.body.newPass) {return sendError(req, res, errMsg+"malformed request")}

  readCurrentUser(req, res, errMsg, {list:['password','keyPublic','keyPrivate','inbox']}, function (user) {
    if (!user.keyPrivate || !user.keyPublic) {return sendError(req, res, "user has no keys???");}
    else {
      bcrypt.compare(req.body.oldPass, user.password, function(err, isMatch){
        if (err) {return sendError(req, res, err);}
        else if (!isMatch) {return res.send({error: false, noMatch:true});}
        else {
          var y = pool.passwordValidate(req.body.newPass);
          if (y) {return res.send({error:y});}
          else {
            if (!user.inbox) {user.inbox = {}}
            return res.send({error: false, threads:user.inbox.threads, key:user.keyPrivate});
          }
        }
      });
    }
  });
});

// swap in re-encrypted inbox and new keys
app.post('/changePasswordFin', function (req, res) {
  if (!req.body.newKeys || !req.body.newPass || !req.body.newThreads) {return sendError(req, res, errMsg+"malformed request")}
  var errMsg = "password change error2<br><br>";

  readCurrentUser(req, res, errMsg, {list:['password','keyPublic','keyPrivate','inbox']}, function (user) {
    var y = pool.passwordValidate(req.body.newPass);
    if (y) {return res.send({error:y});}
    else {
      bcrypt.hash(req.body.newPass, 10, function(err, passHash) {
        if (err) {return sendError(req, res, err);}
        else {
          user.password = passHash;
          user.inbox.threads = req.body.newThreads;
          user.keyPublic = req.body.newKeys.pubKey;
          user.keyPrivate = req.body.newKeys.privKey;
          writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
        }
      });
    }
  });
});

// request password reset code
app.post('/passResetRequest', function (req, res) {
  var errMsg = "password reset request error<br><br>";
  if (!req.body.username || !req.body.email) {return sendError(req, res, errMsg+"malformed request 258")}
  getUserIdFromName(req, res, errMsg, req.body.username, function (userID) {
    if (!userID) {return res.send({error: false});}  // if username is not registered, don't tell them that... i guess
    readUser(req, res, errMsg, userID, {list:['email', 'settings',]}, function(user) {
      if (!user) {return sendError(req, res, errMsg+"username is registered but user record not found");}
      // first check if user already has an active reset code
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
        if (err) {return sendError(req, res, errMsg+err);}
        else if (!isMatch) {res.send({error: false});}    // DO NOT send ANY indication of if there was a match
        else {
          // generate code, and send email
          genID(req, res, errMsg, 'resetCodes', 20, function (codeID) {
            bcrypt.hash(req.body.username.toLowerCase(), 10, function(err, usernameHash){
              if (err) {return sendError(req, res, errMsg+err);}
              else {
                var msg = {
                  to: req.body.email,
                  from: 'noreply@schlaugh.com',
                  subject: 'schlaugh account recovery',
                  text: `visit the following link to reset your schlaugh password: https://www.schlaugh.com/~recovery/`+codeID+`\n\nIf you did not request a password reset for your schlaugh account, then kindly do nothing at all and the reset link will shortly be deactivated.\n\nplease do not reply to this email, or otherwise allow anyone to see its contents, as the reset link is a powerful secret`,
                  html: `<a href="https://www.schlaugh.com/~recovery/`+codeID+`">click here to reset your schlaugh password</a><br><br>or paste the following link into your browser: schlaugh.com/~recovery/`+codeID+`<br><br>If you did not request a password reset for your schlaugh account, then kindly do nothing at all and the reset link will shortly be deactivated.<br><br>please do not reply to this email, or otherwise allow anyone to see its contents, as the reset link is a powerful secret. But if you need additional assistance accessing your account please do contact schlaugh@protonmail.com`,
                };
                // sgMail.send(msg, (error, result) => {
                //   if (error) {return sendError(req, res, errMsg+"email server malapropriationologification");}
                //   else {
                    var newCode = {
                      _id: codeID,
                      username: usernameHash,
                      attempts: 0,
                      creationTime: new Date(),
                    }
                    dbCreateOne(req, res, errMsg, 'resetCodes', newCode, function (newID) {
                      user.settings.recovery[today].push(newCode.creationTime);
                      // victory state
                      writeToUser(req, res, errMsg, user, function () { return res.send({error: false}); });
                    });
                //   }
                // });
              }
            });
          });
        }
      });
    });
  });
});

// use password recovery code/link, VIEW
app.get('/~recovery/:code', function (req, res) {
  var errMsg = "recovery pageload error";
  //if (!req.session.user) { 'you are accessing this recovery page, but you seem to aleady be signed in...erm what?'}
  req.session.user = null;
  dbReadOneByID(req, res, errMsg, 'resetCodes', req.params.code, null, function (code) {
    if (!code) {
      return res.render('layout', {initProps:{user:false, recovery:true, code: false}});
    } else {
      var now = new Date();
      if ((now - code.creationTime) > 4000000) {  // code is too old, delete
        dbDeleteByID(req, res, errMsg, 'resetCodes', code._id, function () {
          return res.render('layout', {initProps:{user:false, recovery:true, code: false}});
        });
      } else {
        return res.render('layout', {initProps:{user:false, recovery:true, code: code._id}});
      }
    }
  });
});

// recovery verify username/change pass
app.post('/resetNameCheck', function (req, res) {
  var errMsg = "password reset request error<br><br>";
  if (!req.body.username || !req.body.code) {return sendError(req, res, errMsg+"malformed request")}
  dbReadOneByID(req, res, errMsg, 'resetCodes', req.body.code, null, function (code) {
    if (!code) {return sendError(req, res, errMsg+'code not found');}
    else {
      var now = new Date();
      if ((now - code.creationTime) > 5000000) {  // code is too old, delete
        dbDeleteByID(req, res, errMsg, 'resetCodes', code._id, function () {
          return sendError(req, res, errMsg+'code has expired');
        });
      } else {
        bcrypt.compare(req.body.username.toLowerCase(), code.username, function(err, isMatch) {
          if (err) {return sendError(req, res, errMsg+err);}
          else if (isMatch) {
            if (req.body.password) {
              var y = pool.passwordValidate(req.body.password);
              if (y) {return res.send({error: errMsg+y});}
              else {
                bcrypt.hash(req.body.password, 10, function(err, passHash){
                  if (err) {return sendError(req, res, errMsg+err);}

                  getUserIdFromName(req, res, errMsg, req.body.username, function (userID) {
                    if (!userID) {return sendError(req, res, errMsg+"user not found");}

                    // keys are tied to pass, clear keys, new keys created on sign in

                    var userObj = {password: passHash, keyPublic:null, keyPrivate:null, _id:userID}

                    writeToUser(req, res, errMsg, userObj, function () {
                      dbDeleteByID(req, res, errMsg, 'resetCodes', code._id, function () {
                        return res.send({error: false, victory:true});
                      });
                    });
                  });
                });
              }
            } else {res.send({error: false, verify:true});}  //victory state
          } else {
            code.attempts++;
            if (code.attempts === 5) {
              dbDeleteByID(req, res, errMsg, 'resetCodes', code._id, function () {
                res.send({error: false, attempt:5});     // total fail state
              });
            } else {
              var attempt = code.attempts;
              dbWriteByID(req, res, errMsg, 'resetCodes', ObjectId(code._id), code, function (err) {
                res.send({error: false, attempt:attempt});  //fail state
              });
            }
          }
        });
      }
    }
  });
});

// VIEW about page for site
app.get('/~', function (req, res) {
  renderLayout(req, res, {panel:"meta"});
});
app.get('/~faq', function (req, res) {
  renderLayout(req, res, {panel:"meta"});
});

///////////////

var renderLayout = function (req, res, data) {
  getSettings(req, res, function (resp) {
    if (!resp.user && (data.postCode === "MARK" || data.postCode === "FFTF" || data.postCode === "FFTT")) {
      data.postCode = undefined;
    }
    var initProps = {};
    for (var key in data) {if (data.hasOwnProperty(key)) {
        initProps[key] = data[key];
    }}
    for (var key in resp) {if (resp.hasOwnProperty(key)) {
        initProps[key] = resp[key];
    }}

    res.render('layout', {initProps:initProps});
  });
}

var return404author = function (req, res) {
  return renderLayout(req, res, {author: false, postCode:"TFFF", notFound: true,});
}

var getPostsOfFollowingWithTrackedTagsForADate = function(req, res) {   // get FEED
  var errMsg = "error retrieving the posts of following<br><br>";
  if (!req.body.date) {return sendError(req, res, errMsg+"malformed request 412");}
  readCurrentUser(req, res, errMsg, {list:['following', 'savedTags', 'muted']}, function (user) {
    if (!user.following || !user.following.length) {user.following = [];}
    if (!user.savedTags || !user.savedTags.length) {user.savedTags = [];}
    //
    var followingRef = null;
    if (req.body.getFollowingList) {
      followingRef = {};
      for (var i = 0; i < user.following.length; i++) {
        followingRef[user.following[i]] = true;
      }
    }
    getAuthorListFromTagListAndDate(req, res, errMsg, user.savedTags, req.body.date, function (resp) {
      // filter muted authors
      // if a user is being followed and muted, they get filtered out then added back in, this is intended
      if (user.muted) {
        for (var i = 0; i < resp.authorList.length; i++) {
          if (user.muted[resp.authorList[i]]) {
            resp.authorList.splice(i, 1);
            i--;
          }
        }
      }
      var authorList = resp.authorList.concat(user.following);
      postsFromAuthorListAndDate(req, res, errMsg, authorList, req.body.date, followingRef, req.body.postRef, function (resp) {
        return res.send({error:false, posts:resp.posts, followingList:resp.followingList, tagList:user.savedTags});
      });
    });
  });
}

var getOnePageOfAnAuthorsPosts = function(req, res) {
  var errMsg = "author lookup error<br><br>";
  if (req.body.page === undefined) {req.body.page = 0;}
  req.body.page = parseInt(req.body.page);
  if (!Number.isInteger(req.body.page) || req.body.page < 0) {return sendError(req, res, errMsg+"malformed request 301");}
  if (!req.body.author) {return sendError(req, res, errMsg+"malformed request 3020");}
  var authorID = req.body.author;
  //
  checkForUserUpdates(req, res, errMsg, authorID, function () {

    readUser(req, res, errMsg, authorID, {list:['username', 'posts', 'postList', 'iconURI', 'keyPublic', 'inbox', 'bio']}, function(author) {
      if (!author) {
        return res.send({error: false, four04: true,});      //404
      } else {

        var authorPic = getUserPic(author);
        var posts = [];

        var postsPerPage = getPostsPerPage(req);

        var pL = author.postList;
        // is the logged in user the very same author?
        if (!req.session.user || !ObjectId.isValid(req.session.user._id) || String(req.session.user._id) !== String(authorID)) {
          // no, so strip out private posts
          for (var i = 0; i < pL.length; i++) {
            if (pL[i] && author.posts[pL[i].date]) {
              if (author.posts[pL[i].date][pL[i].num].private) {
                pL.splice(i, 1);
                i--;
              }
            }
          }
        }

        var pages = Math.ceil(pL.length /postsPerPage);
        if (req.body.page === 0) {  // 0 indicates no page number given, open the last/most recent page
          var page = pages;
        } else {
          var page = req.body.page;
        }
        var start = (page * postsPerPage) - 1;
        for (var i = start; i > start - postsPerPage; i--) {
          if (pL[i] && author.posts[pL[i].date]) {
            // strip out posts we already have on FE in the postRef
            if (!req.body.postRef[author.posts[pL[i].date][pL[i].num].post_id]) {
              posts.push({
                body: author.posts[pL[i].date][pL[i].num].body,
                tags: author.posts[pL[i].date][pL[i].num].tags,
                title: author.posts[pL[i].date][pL[i].num].title,
                url: author.posts[pL[i].date][pL[i].num].url,
                post_id: author.posts[pL[i].date][pL[i].num].post_id,
                date: pL[i].date,
                private: author.posts[pL[i].date][pL[i].num].private,
              });
            } else {
              posts.push({post_id: author.posts[pL[i].date][pL[i].num].post_id,})
            }
          }
        }
        var data = {
          error: false,
          posts: posts,
          authorData: {
            author: author.username,
            _id: author._id,
            authorPic: authorPic,
          },
          pages:pages,
        }
        if (req.body.needAuthorInfo) {
          data.authorInfo = getAuthorInfo(author, req);
        }
        return res.send(data);
      }
    });
  });
}

var getAllOfAnAuthorsPosts = function(req, res) { // this is the hack for "search"
  var errMsg = "author lookup error<br><br>";
  if (!req.body.author) {return sendError(req, res, errMsg+"malformed request 3010");}
  var authorID = req.body.author;
  //
  checkForUserUpdates(req, res, errMsg, authorID, function () {

    readUser(req, res, errMsg, authorID, {list:['username', 'posts', 'postList', 'iconURI', 'keyPublic', 'inbox', 'bio']}, function(author) {
      if (!author) {
        return res.send({error: false, four04: true,});      //404
      } else {
        var authorPic = getUserPic(author);

        var posts = [];
        var pL = author.postList;

        for (var i = pL.length-1; i > -1; i--) {
          if (pL[i]) {
            // strip out private posts
            if (!author.posts[pL[i].date][pL[i].num].private || (req.session.user && ObjectId.isValid(req.session.user._id) && String(req.session.user._id) === String(authorID))) {
              //
              if (!req.body.postRef[author.posts[pL[i].date][pL[i].num].post_id]) {
                posts.push({
                  body: author.posts[pL[i].date][pL[i].num].body,
                  tags: author.posts[pL[i].date][pL[i].num].tags,
                  title: author.posts[pL[i].date][pL[i].num].title,
                  url: author.posts[pL[i].date][pL[i].num].url,
                  post_id: author.posts[pL[i].date][pL[i].num].post_id,
                  private: author.posts[pL[i].date][pL[i].num].private,
                  date: pL[i].date,
                });
              } else {
                posts.push({post_id: author.posts[pL[i].date][pL[i].num].post_id,})
              }
            }
          }
        }
        var data = {
          error: false,
          posts: posts,
          authorData: {
            author: author.username,
            _id: author._id,
            authorPic: authorPic,
          },
        }
        if (req.body.needAuthorInfo) {
          data.authorInfo = getAuthorInfo(author, req);
        }
        return res.send(data);
      }
    });
  });
}

var getAuthorInfo = function (author, req) {
  var bio = author.bio;
  if (typeof bio !== 'string') {bio = "";}
  var key = null;
  if (req.session.user) {
    var userID = ObjectId(req.session.user._id);
    if (author.inbox && author.inbox.threads) {
      if (!author.inbox.threads[userID] || (!author.inbox.threads[userID].blocking && !author.inbox.threads[userID].blocked)) {
        if (author.keyPublic) {key = author.keyPublic}
      }
    }
  }
  var authorInfo = {
    bio: bio,
    key: key,
    _id: author._id,
    author: author.username,
    authorPic: getUserPic(author),
  }
  return authorInfo;
}

var getSinglePostFromAuthorAndDate = function (req, res) {
  var errMsg = "post retrieval error<br><br>";
  if (!req.body.author) {return sendError(req, res, errMsg+"malformed request 513");}
  var authorID = req.body.author;
  checkForUserUpdates(req, res, errMsg, authorID, function () {

    readUser(req, res, errMsg, authorID, {list:['username', 'iconURI', 'keyPublic', 'inbox', 'bio'], dates:[req.body.date]}, function(author) {
      var data = {error: false,}
      //
      if (!author) {data.four04 = true;}
      else {
        if (req.body.needAuthorInfo) {
          data.authorInfo = getAuthorInfo(author, req);
        }

        if (req.body.date && pool.isStringValidDate(req.body.date) && req.body.date <= pool.getCurDate() && author.posts && author.posts[req.body.date]) {
          // strip out private posts
          if (!author.posts[req.body.date][0].private || (req.session.user && ObjectId.isValid(req.session.user._id) && String(req.session.user._id) === String(authorID))) {
            var authorPic = getUserPic(author);
            author.posts[req.body.date][0].authorPic = authorPic;
            author.posts[req.body.date][0].author = author.username;
            author.posts[req.body.date][0]._id = author._id;
            author.posts[req.body.date][0].date = req.body.date;
            data.posts = [author.posts[req.body.date][0]];
          } else {
            data.authorInfo = null;
            data.four04 = true;
            data.existed = true;
          }
        } else {
          data.four04 = true;
        }
      }
      //
      return res.send(data);
    });
  });
}

var getAllOfAnAuthorsPostsWithTag = function (req, res) {
  var errMsg = "author/tag lookup error<br><br>";
  if (!req.body || !req.body.author || req.body.tag === undefined) {return sendError(req, res, errMsg+"malformed request 400");}
  var authorID = req.body.author;
  checkForUserUpdates(req, res, errMsg, authorID, function () {

    readUser(req, res, errMsg, authorID, {list:['username','posts','postList', 'iconURI', 'keyPublic', 'inbox', 'bio']}, function(author) {
      if (!author) { return res.send({error: false, four04: true,}); }      //404
      //
      var authorPic = getUserPic(author);
      var posts = [];
      var pL = author.postList;
      for (var i = pL.length-1; i > -1; i--) {
        // if the post object exists where it should in the first place
        if (author.posts[pL[i].date] && author.posts[pL[i].date][pL[i].num]) {
          // strip out private posts
          if (!author.posts[pL[i].date][pL[i].num].private || (req.session.user && ObjectId.isValid(req.session.user._id) && String(req.session.user._id) === String(authorID))) {
            // does it have the tags we want?
            if (author.posts[pL[i].date][pL[i].num].tags && author.posts[pL[i].date][pL[i].num].tags[req.body.tag]) {
              //
              if (!req.body.postRef[author.posts[pL[i].date][pL[i].num].post_id]) {
                posts.push({
                  body: author.posts[pL[i].date][pL[i].num].body,
                  tags: author.posts[pL[i].date][pL[i].num].tags,
                  title: author.posts[pL[i].date][pL[i].num].title,
                  url: author.posts[pL[i].date][pL[i].num].url,
                  post_id: author.posts[pL[i].date][pL[i].num].post_id,
                  private: author.posts[pL[i].date][pL[i].num].private,
                  date: pL[i].date,
                });
              } else {
                posts.push({
                  post_id: author.posts[pL[i].date][pL[i].num].post_id,
                });
              }
            }
          }
        }
      }
      var data = {
        error: false,
        posts: posts,
        authorData: {
          author: author.username,
          _id: author._id,
          authorPic: authorPic,
        }
      }
      if (req.body.needAuthorInfo) {
        data.authorInfo = getAuthorInfo(author, req);
      }
      return res.send(data);
    });
  });
}

var getPostsPerPage = function (req) {
  var postsPerPage = 7;
  if (req.body.postsPerPage && pool.isNumeric(req.body.postsPerPage) && Number.isInteger(req.body.postsPerPage) && req.body.postsPerPage > 0) {
    postsPerPage = req.body.postsPerPage;
  }
  return postsPerPage;
}

var getNthPageOfTaggedPostsByAnyAuthor = function (req, res) {
  var errMsg = "tag by page fetch error<br><br>"
  if (req.body.page === undefined) {req.body.page = 0;}
  req.body.page = parseInt(req.body.page);
  if (!req.body.tag || !Number.isInteger(req.body.page) || req.body.page < 0) {return sendError(req, res, errMsg+"malformed request 710");}

  dbReadOneByID(req, res, errMsg, 'tagsByTag', req.body.tag.toLowerCase(), null, function (tagListing) {
    if (!tagListing || !tagListing.list || !tagListing.list.length) {  // tag does not exist/is empty
      return res.send({
        error:false,
        posts: [],
        list: [],
        pages: 0,
      });
    } else {
      var dateFilter = function (i) {
        if (tagListing.list[i] && tagListing.list[i].date > pool.getCurDate()) {
          tagListing.list.splice(i,1);
          dateFilter(i-1);
        }
      }
      dateFilter(tagListing.list.length-1);

      var postsPerPage = getPostsPerPage(req);

      filterMutedAuthors(req, res, errMsg, tagListing.list, function (filteredList) {
        var lookUpList = [];
        var totalPageCount = Math.ceil(filteredList.length /postsPerPage);
        if (req.body.page === 0) {  // 0 indicates no page number given, open the last/most recent page
          var page = totalPageCount;
        } else {
          var page = req.body.page;
        }
        var start = (page * postsPerPage) - 1;
        for (var i = start; i > start - postsPerPage; i--) {
          if (filteredList[i]) {
            lookUpList.push(filteredList[i]);
          }
        }
        postsFromListOfAuthorsAndDates(req, res, errMsg, lookUpList, req.body.postRef, function (resp) {
          if (resp.error) {return sendError(req, res, errMsg+resp.error);}
          else {
            return res.send({
              error:false,
              posts: resp.posts,
              pages: totalPageCount,
            });
          }
        });
      });
    }
  });
}

var getAllPostsWithTagOnDate = function (req, res) {
  var errMsg = "tag fetch error<br><br>"
  if (!req.body.date || !req.body.tag) {return sendError(req, res, errMsg+"malformed request 712");}
  if (req.body.date > pool.getCurDate()) {return res.send({error:false, posts:[{body: 'IT DOES NOT DO TO DWELL ON DREAMS AND FORGET TO LIVE', author:"APWBD", authorPic:"https://i.imgur.com/D7HXWeX.png", _id:"5a1f1c2b57c0020014bbd5b7", key:adminB.dumbleKey}]});}
  getAuthorListFromTagListAndDate(req, res, errMsg, [req.body.tag], req.body.date, function (resp) {
    if (resp.authorList.length === 0) {
      return res.send({error:false, posts:[],});
    } else {
      filterMutedAuthors(req, res, errMsg, resp.authorList, function (authorList) {
        postsFromAuthorListAndDate(req, res, errMsg, authorList, req.body.date, null, req.body.postRef, function (resp) {
          return res.send({error:false, posts:resp.posts,});
        });
      });
    }
  });
}

var filterMutedAuthors = function (req, res, errMsg, authorList, callback) {
  idCheck(req, function (userID) {
    if (userID) {
      readCurrentUser(req, res, errMsg, {list:['muted']}, function (user) {
        if (user.muted) {
          if (authorList && authorList[0] && authorList[0].authorID) {         // for a post list, really
            for (var i = 0; i < authorList.length; i++) {
              if (user.muted[authorList[i].authorID]) {
                authorList.splice(i, 1);
                i--;
              }
            }
          } else {                              // for straight up list of authors
            for (var i = 0; i < authorList.length; i++) {
              if (user.muted[authorList[i]]) {
                authorList.splice(i, 1);
                i--;
              }
            }
          }
        }
        callback(authorList);
      });
    } else {
      callback(authorList);
    }
  });
}

var getBookMarkedPosts = function (req, res) {
  var errMsg = "bookmark list not successfully retrieved<br><br>";
  readCurrentUser(req, res, errMsg, {list:['bookmarks']}, function (user) {
    if (!user.bookmarks || user.bookmarks.length === undefined) {
      return res.send({error:false, posts:[],});
    } else {
      postsFromListOfAuthorsAndDates(req, res, errMsg, user.bookmarks, req.body.postRef, function (resp) {
        if (resp.error) {return sendError(req, res, errMsg+resp.error);}
        else {return res.send({error:false, posts:resp.posts,});}
      });
    }
  });
}

app.post('/getPosts', function (req, res) {
  var errMsg = "post fetch error<br><br>"
  if (!req.body.postCode) {return sendError(req, res, errMsg+"malformed request 284");}
  var postCode = req.body.postCode;
  if (!req.body.postRef) {req.body.postRef = {}};
  if (req.body.date && req.body.date > pool.getCurDate() && postCode !== "TFTF") {return res.send({error:false, posts:[{body: 'DIDYOUPUTYOURNAMEINTHEGOBLETOFFIRE', author:"APWBD", authorPic:"https://i.imgur.com/D7HXWeX.png", _id: "5a1f1c2b57c0020014bbd5b7", tags:{"swiper no swiping":true}, post_id: "01234567"}],followingList:[], tagList:[]});}
  //
  // repsonse must have 'posts', and ,if not included w/ posts: 'authorData'
  if (postCode === "FTTT") {return sendError(req, res, errMsg+"this is not(yet) a valid option...you must have typed this in yourself to see if it exsisted. Do you want this to be paginated? Nag staff if you want this actually to be built.");}
  else if (postCode === "FTTF") {return getAllPostsWithTagOnDate(req, res);}
  else if (postCode === "FTFT" || postCode === "FTFF") {return getNthPageOfTaggedPostsByAnyAuthor(req, res);}
  else if (postCode === "FFTT") {return sendError(req, res, errMsg+"this is not(yet) a valid option...you must have typed this in yourself to see if it exsisted. Do you want this to be paginated? Nag staff if you want this actually to be built.");}
  else if (postCode === "FFTF") {return getPostsOfFollowingWithTrackedTagsForADate(req, res);}
  else if (postCode === "TTFT") {return sendError(req, res, errMsg+"this is not(yet) a valid option...you must have typed this in yourself to see if it exsisted. Do you want this to be paginated? Nag staff if you want this actually to be built.");}
  else if (postCode === "TTFF") {return getAllOfAnAuthorsPostsWithTag(req, res);}
  else if (postCode === "TFTF") {return getSinglePostFromAuthorAndDate(req, res);}
  else if (postCode === "TFFT" || postCode === "TFFF") {return getOnePageOfAnAuthorsPosts(req, res);}
  else if (postCode === "MARK") {return getBookMarkedPosts(req, res);}
  else if (postCode === "ALL") {return getAllOfAnAuthorsPosts(req, res);}
  else {return sendError(req, res, errMsg+"malformed request 433");}
});



// RSS feed for schlaugh, general ping
app.get('/~rss', function (req, res) {
  var errMsg = "rss error<br><br>";

  var feed = new RSS({
    title: 'schlaugh',
    description: "schlaugh is a quiet place for reading and writing",
    site_url: "https://www.schlaugh.com/",
    feed_url: "https://www.schlaugh.com/~rss",
    image_url: "https://i.imgur.com/22V1kHY.png",
  });

  // get the minutes until schlaupdate, no need to check the feed again until then (:
  var time = new Date(new Date().getTime() - 9*3600*1000);  //UTC offset by -9
  var hoursRemaining = 23 - time.getUTCHours();
  var minutesRemaining = 60 - time.getUTCMinutes();
  feed.ttl = (hoursRemaining*60) + minutesRemaining;

  for (var i = 0; i < 11; i++) {
    var date = pool.getCurDate(i);
    var description = "it is schlaupdate'o'clock on "+date+" and schlaugh still exists!";
    var title = date + " schlaupdate ping";

    feed.item({
      title: title,
      description: description,
      url: "https://www.schlaugh.com/~posts/" + date,
      date: date+"T09:00:00",
    });
  }

  var fileName = "feed.xml";
  var xml = feed.xml({ indent: true });
        // save the xml file, just so we have a path from which to send it
  fs.writeFile(fileName, xml, function (err) {
    if (err) {return sendError(req, res, errMsg+err);}
    fileName = path.resolve(fileName);      // get the full path
    //
    res.sendFile(fileName, function (err) {
      if (err) {return sendError(req, res, errMsg+err);}
      // delete the file
      fs.unlink(fileName, (err) => {
        if (err) throw err;
      });
    });
  });
});

// RSS feed route for an author
app.get('/:author/~rss', function (req, res) {
  var errMsg = "rss error<br><br>";
  if (!req.params.author) {return sendError(req, res, errMsg+"malformed request 3041");}

  getUserIdFromName(req, res, errMsg, req.params.author, function (authorID) {
    if (!authorID) {return res.send("author not found");}
    //
    checkForUserUpdates(req, res, errMsg, authorID, function () {
      readUser(req, res, errMsg, authorID, {list:['username','posts','postList','iconURI',]}, function(author) {
        if (!author) { return sendError(req, res, errMsg+"name found but unable to look up author's data"); }      //404
        //
        var feed = new RSS({
          title: author.username,
          description: "posts on schlaugh.com by "+author.username,
          site_url: "https://www.schlaugh.com/" +author.username,
          feed_url: "https://www.schlaugh.com/" +author.username+"/~rss",
        });
        if (author.iconURI) {
          feed.image_url = author.iconURI;
        }
        // get the minutes until schlaupdate, no need to check the feed again until then (:
        var time = new Date(new Date().getTime() - 9*3600*1000);  //UTC offset by -9
        var hoursRemaining = 23 - time.getUTCHours();
        var minutesRemaining = 60 - time.getUTCMinutes();
        feed.ttl = (hoursRemaining*60) + minutesRemaining;

        for (var i = 0; i < author.postList.length && i < 11; i++) {
          var post = author.postList[author.postList.length-1-i];
          var description = "schlaugh post by "+author.username+" for "+post.date;
          if (post && author.posts[post.date]) {
            if (author.posts[post.date][post.num].title) {
              var title = author.posts[post.date][post.num].title;
            } else {
              var title = description;
            }
            var tagString = "";
            if (author.posts[post.date][post.num].tags) {
              for (var tag in author.posts[post.date][post.num].tags) {
                if (author.posts[post.date][post.num].tags.hasOwnProperty(tag)) {
                  tagString += tag + ", "
                }
              }
            }
            if (tagString !== "") {
              tagString = tagString.substr(0, (tagString.length-2));
              description = description + ", tagged:" +tagString;
            }
            feed.item({
              title: title,
              description: description,
              url: "https://www.schlaugh.com/~/" + author.posts[post.date][post.num].post_id,
              // categories: // eh? i could put the tags there i guess?
              //tags: author.posts[post.date][post.num].tags,
              date: post.date+"T09:00:00",
            });
          }
        }

        var fileName = "feed.xml";
        var xml = feed.xml({ indent: true });
        // save the xml file, just so we have a path from which to send it
        fs.writeFile(fileName, xml, function (err) {
          if (err) {return sendError(req, res, errMsg+err);}
          fileName = path.resolve(fileName);      // get the full path
          //
          res.sendFile(fileName, function (err) {
            if (err) {return sendError(req, res, errMsg+err);}
            // delete the file
            fs.unlink(fileName, (err) => {
              if (err) throw err;
            });
          });
        });

      });
    });
  });
});


// ------- **** ~ THE 14 ROUTES OF POST VIEWING ~ **** ------- //
// https://docs.google.com/spreadsheets/d/1JM39RfQonAbxT3VBbNwMEsqEO_96DG76RHoGStNMDJo/edit?usp=sharing
// #### = author/tag/date/page

//  MARK
app.get('/~bookmarks', function(req, res) {
  renderLayout(req, res, {postCode:"MARK"});
});
//	FTTT
app.get('/~tagged/:tag/:date/:page', function(req, res) {
  if (!pool.isStringValidDate(req.params.date)) {return return404author(req, res);}
  var page = parseInt(req.params.page);
  if (!Number.isInteger(page) || page < 0) {return return404author(req, res);}
  renderLayout(req, res, {tag:req.params.tag, page:page, date:req.params.date, postCode:"FTTT",});
});
//	FTTF and FTFT
app.get('/~tagged/:tag/:num', function(req, res) {
  var target = req.params.num;
  if (pool.isStringValidDate(target)) {
    renderLayout(req, res, {tag:req.params.tag, date:target, postCode:"FTTF",});
  } else {
    target = parseInt(target);
    if (Number.isInteger(target) && target >= -1) {
      renderLayout(req, res, {tag:req.params.tag, page:target, postCode:"FTFT"});
    } else {
      return return404author(req, res);
    }
  }
});
//	FTFF
app.get('/~tagged/:tag', function(req, res) {
  renderLayout(req, res, {tag:req.params.tag, page:0, postCode:"FTFF"});
});
//	FFTT
app.get('/~posts/:date/:page', function(req, res) {
  renderLayout(req, res, {date:req.params.date, page:req.params.page, postCode:"FFTT",});
});
//	FFTF
app.get('/~posts/:date', function(req, res) {
  renderLayout(req, res, {date:req.params.date, postCode:"FFTF",});
});
//	TTFT
app.get('/:author/~tagged/:tag/:page', function(req, res) {
  var author = req.params.author.toLowerCase();
  if (author === "admin" || author === "apwbd") {return return404author(req, res);}
  var page = parseInt(req.params.page);
  if (!Number.isInteger(page) || target < 0) {return return404author(req, res);}
  getUserIdFromName(req, res, errMsg, author, function (authorID) {
    if (!authorID) {
      return return404author(req, res);
    } else {
      renderLayout(req, res, {author:authorID, tag:req.params.tag, page:page, postCode:"TTFT",});
    }
  });
});
//	TTFF
app.get('/:author/~tagged/:tag', function(req, res) {
  var author = req.params.author.toLowerCase();
  if (author === "admin" || author === "apwbd") {return return404author(req, res);}
  var errMsg = "author lookup error<br><br>";
  getUserIdFromName(req, res, errMsg, author, function (authorID) {
    if (!authorID) {
      return return404author(req, res);
    } else {
      renderLayout(req, res, {author:authorID, tag:req.params.tag, postCode:"TTFF",});
    }
  });
});
//	TFTF
app.get('/~/:post_id', function (req, res) {
  var errMsg = "post lookup error";
  if (ObjectId.isValid(req.params.post_id)) {req.params.post_id = ObjectId(req.params.post_id);}
  dbReadOneByID(req, res, errMsg, 'posts', req.params.post_id, getProjection(['date','authorID']), function (post) {
    if (!post) {    //404
      return renderLayout(req, res, {error: false, notFound: true, postCode:'TFTF', post_id: req.params.post_id});
    } else if (!post.authorID) {
      return renderLayout(req, res, {error: false, existed: true, notFound: true, postCode:'TFTF', post_id: req.params.post_id});
    } else {
      return renderLayout(req, res, {error: false, author:post.authorID, date:post.date, postCode:'TFTF', post_id: req.params.post_id});
    }
  });
});
//	TFFT and TFTF
app.get('/:author/~/:num', function(req, res) {
  var author = req.params.author.toLowerCase();
  if (author === "admin" || author === "apwbd") {return return404author(req, res);}
  var errMsg = "author lookup error<br><br>";
  var page = undefined;
  var date = undefined;
  var target = req.params.num;
  if (pool.isStringValidDate(target)) {
    date = target;
    var postCode = "TFTF";
  } else {
    target = parseInt(target);
    if (Number.isInteger(target) && target >= -1) {
      page = target;
      var postCode = "TFFT";
    } else {
      return return404author(req, res);
    }
  }
  getUserIdFromName(req, res, errMsg, author, function (authorID) {
    if (!authorID) {
      return return404author(req, res);
    } else {
      renderLayout(req, res, {author:authorID, page:page, date:date, postCode:postCode,});
    }
  });
});
//  ALL
app.get('/:author/~all', function(req, res) {
  var author = req.params.author.toLowerCase();
  if (author === "admin" || author === "apwbd") {return return404author(req, res);}
  var errMsg = "author lookup error<br><br>";
  getUserIdFromName(req, res, errMsg, author, function (authorID) {
    if (!authorID) {
      return return404author(req, res);
    }
    else {
      return renderLayout(req, res, {author: authorID, postCode:"ALL",});
    }
  });
});
// author custom URL
app.get('/:author/:path', function(req, res) {
  var author = req.params.author.toLowerCase();
  if (author === "admin" || author === "apwbd") {return return404author(req, res);}
  var errMsg = "author lookup error<br><br>";
  getUserIdFromName(req, res, errMsg, author, function (authorID) {
    if (!authorID) {return return404author(req, res);}
    readUser(req, res, errMsg, authorID, {list:['customURLs',]}, function(author) {
      if (!author) {return return404author(req, res);}
      if (author.customURLs && author.customURLs[req.params.path]) {
        // is the proposed custom url keyed to a post?
        return renderLayout(req, res, {author:authorID, date:author.customURLs[req.params.path].date, post_url:req.params.path, postCode:"TFTF",});
      } else {
        return renderLayout(req, res, {author: authorID, date:null, post_url:req.params.path, postCode:"TFTF",});
      }
    });
  });
});
//	TFFF
app.get('/:author', function(req, res) {
  var authorName = req.params.author.toLowerCase();
  var author = authorName.toLowerCase();
  if (author === "admin" || author === "apwbd") {return return404author(req, res);}
  var errMsg = "author lookup error<br><br>";
  getUserIdFromName(req, res, errMsg, author, function (authorID) {
    if (!authorID) {
      return return404author(req, res);
    }
    else {
      return renderLayout(req, res, {author: authorID, page:0, postCode:"TFFF", authorName:authorName});
    }
  });
});


///////////
app.set('port', (process.env.PORT || 3000));
// Start Server
app.listen(app.get('port'), function(){
  //
});

// If the Node process ends, close the DB connection
process.on('SIGINT', function() {
  db.close();
  process.exit(0);
});
