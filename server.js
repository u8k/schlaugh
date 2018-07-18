var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var bcrypt = require('bcryptjs');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var request = require('request');
var pool = require('./public/pool.js');

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
  maxAge: 90 * 24 * 60 * 60 * 1000 // (90 days?)
}))


//*******//HELPER FUNCTIONS//*******//

var checkFreshness = function (user) {
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
              return res.send([false, 'the url for image '+(index+1)+' seems to be invalid\n\nyour post has not been saved']);
            } else if (resp.headers['content-type'].substr(0,5) !== "image") {
              count = 0;
              return res.send([false, 'the url for image '+(index+1)+' is not a url for an image\n\nyour post has not been saved']);
            } else {bitCount -= resp.headers['content-length'];}
            if (count === 0) {
              if (bitCount < 0) {
                return res.send([false, "your images exceed the byte limit by "+(-bitCount)+" bytes\n\nyour post has not been saved"]);
              } else {return callback(res);}
            }
          }
        });
      })(i);
    }     // no images to check
  } else {return callback(res);}
}

var writeToDB = function (userID, data, callback) {
  userID = ObjectId(userID);
  db.collection('users').updateOne({_id: userID},
    {$set: data},
    function(err, user) {
      if (err) {throw err;}
      else {callback()}
    }
  );
}

var getUserPic = function (user) {
  var userPic = user.iconURI;
  if (typeof userPic !== 'string') {userPic = "";}
  return userPic;
}

var getUserColors = function (user) {
  if (user.settings.colors) {return user.settings.colors;}
  else {return {
    postBackground: '#32363F',
    text: '#D8D8D8',
    linkText: '#BFA5FF',
    background: '#324144',
  };}
}

var getUser = function (user, callback) {
  db.collection('users').findOne({_id: ObjectId(user._id)}
  , {_id:0, username:1, iconURI:1, settings:1}
  , function (err, user) {
    if (err) {throw err;}
    if (!user) {return null;}
    else {
      user.pic = getUserPic(user);
      user.colors = getUserColors(user);
      return callback(user);
    }
  });
}

var serve404 = function (res, user) {
  if (user) {
    getUser(user, function (user) {
      if (user) {
        res.render('layout', {
          pagename:'404',
          username: user.username,
          userPic: user.pic,
          colors: user.colors,
        });
      } else {res.render('layout', {pagename:'404'});}
    });  // doubled like this because asynch
  } else {res.render('layout', {pagename:'404'});}
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
  var len = t.length;
  if (t[len-1] && t[len-1].date === tmrw) {
    if (t[len-1].inbound === inbound) {
      return len-1;
    } else if (t[len-2] && t[len-2].date === tmrw && t[len-2].inbound === inbound) {
      return len-2;
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

var removeListRefIfRemovingOnlyMessage = function (box, id, b, tmrw) {
  if (b.remove && box.threads[id].thread.length < 2) {
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

//*******//ROUTING//*******// 

// main page
app.get('/', function(req, res) {
  if (!req.session.user) {res.render('layout', {pagename:'login'});}
  else {
    db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
    , {_id:0, username:1, posts:1, iconURI:1, settings:1}
    , function (err, user) {
      if (err) {throw err;}
      else if (!user) {res.render('layout', {pagename:'login'});}
      else {
        var pending;
        var pendingWriter;
        var tmrw = pool.getCurDate(-1)
        if (user.posts[tmrw]) {
          pending = user.posts[tmrw][0].body;
          pendingWriter = pending.replace(/<br>/g, '\n');
        }
        var userPic = getUserPic(user);
        var colors = getUserColors(user);
        res.render('layout', {pagename:'main', username:user.username, pending:pending, pendingWriter:pendingWriter, userPic:userPic, colors:colors});
      }
    });
  }
});

// new/edit/delete post
app.post('/', function(req, res) {
  if (!req.session.user) {return res.send([false, "we've encountered an unexpected complication while submitting your post, your post might not be saved, please copy all of your text to be safe, refresh the page and try again"]);}
  var userID = ObjectId(req.session.user._id)
  db.collection('users').findOne({_id: userID}
  , {_id:0, posts:1, postList:1, postListPending:1}
  , function (err, user) {
    if (err) {throw err;}
    else {
        //TODO SANITIZE!?!?!?!?!?!?!?!?!

      checkFreshness(user);
      var tmrw = pool.getCurDate(-1);
      if (req.body.remove) {                     //remove pending post, do not replace
        delete user.posts[tmrw];
        var text = "";
        user.postListPending.pop();   //currently assumes that postListPending only ever contains 1 post
        return writeToDB(userID, user, function () {res.send([true, text]);});
      }

      var updateUserPost = function (text) {
        if (user.posts[tmrw]) {                   //edit existing
          user.posts[tmrw][0].body = text;
        } else {                                  //create new
          user.posts[tmrw] = [{
            body: text,
            tags: {}
          }];
          var num = user.posts[tmrw].length-1;
          user.postListPending.push({
            date: tmrw,
            num: num
          });
        }
      }

      var x = pool.cleanseInputText(req.body.text);
      imageValidate(x[0], res, function (res) {
        updateUserPost(x[1]);
        return writeToDB(userID, user, function () {res.send([true, x[1]]);});
      });
    }
  });
});

// get posts-(should maybe be a "GET"? ehhhh(following list?))
app.post('/posts', function(req, res) {
  if (req.body.date === pool.getCurDate(-1)) {
    return res.send([{body: 'DIDYOUPUTYOURNAMEINTHEGOBLETOFFIRE', author: "APWBD"}]);
  }
  //later make this▼ only check "following" instead of all users
  db.collection('users').find({},{ posts:1, username:1, iconURI:1, inbox:1, keys:1 }).toArray(function(err, users) {
    //can i make that^ only return the post for the date i want instead of all posts?
    //TODO: later make that^ also return "settings" and then check post visibility permissions
    if (err) {throw err;}
    else {
      var posts = [];
      for (var i = 0; i < users.length; i++) {
        if (users[i].posts[req.body.date]) {
          var authorPic = users[i].iconURI;
          if (typeof authorPic !== 'string') {authorPic = "";}
          var key = null;
          if (users[i].keys) {key = users[i].keys.pubKey}
          posts.push({
            body: pool.checkForCuts(users[i].posts[req.body.date][0].body, users[i]._id+'-'+req.body.date),
            author: users[i].username,
            authorPic: authorPic,
            _id: users[i]._id,
            key: key,
          });
        }
      }
      return res.send(posts);
    }
  });
});

// get all messages
app.get('/inbox', function(req, res) {
  if (!req.session.user) {return res.send('you seem to not be logged in?\nwhy/how are you even here then?\nplease screenshot everything and tell staff about this please');}
  db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
  , {_id:0, inbox:1, keys:1}
  , function (err, user) {
    if (err) {throw err;}
    else {
      var payload = {
        keys: user.keys,
      }
      var threads = [];
      if (user.inbox) {
        var tmrw = pool.getCurDate(-1);
        bumpThreadList(user.inbox);
        writeToDB(ObjectId(req.session.user._id), user, function () {});
        var list = user.inbox.list;
        //reverse thread order so as to send a list ordered newest to oldest
        for (var i = list.length-1; i > -1; i--) {
          //check the last two messages of each thread, see if they are allowed
          var x = checkLastTwoMessages(user.inbox.threads[list[i]].thread, tmrw, true);
          if (x !== false) {user.inbox.threads[list[i]].thread.splice(x, 1);}
          //
          if (user.inbox.threads[list[i]].thread.length !== 0) {
            // add in the authorID for the FE
            user.inbox.threads[list[i]]._id = list[i];
            user.inbox.threads[list[i]].locked = true;
            threads.push(user.inbox.threads[list[i]]);
          }
        }
      }
      payload.threads = threads;
      return res.send(payload);
    }
  });
});

// new/edit/delete message
app.post('/inbox', function(req, res) {
  if (!req.session.user) {return res.send([false, "we've encountered an unexpected complication while submitting your message, your message might not be saved, please copy all of your text to be safe, refresh the page and try again"]);}
  // the incoming text is encrypted, so we can not cleanse it
  if (!req.body.encSenderText || !req.body.encRecText) {return res.send([false, "ERROR! SORRY! your message is not saved, please copy all of your text if you want to keep it, please screenshot everything/note all details of the situation and show this to staff, logging in and out might fix this? SORRY   "+req.body.encSenderText+"    "+req.body.encRecText]);}
  var recipientID = String(req.body.recipient);
  var senderID = String(req.session.user._id);
  if (recipientID === senderID) {return res.send([false, "you want to message yourself??? freak."]);}
  // make both sender and recipient DB calls first
  db.collection('users').findOne({_id: ObjectId(senderID)}
  , {_id:0, inbox:1, username:1, keys:1, iconURI:1}
  , function (err, sender) {
    if (err) {throw err;}
    else {
      if (!sender.keys) {return res.send([false, "you don't have keys yet? how are you here? this is odd. your message is not saved, please copy all of your text if you want to keep it, please screenshot everything and show this to staff, logging in and out might fix this? "+sender.keys]);}
      db.collection('users').findOne({_id: ObjectId(recipientID)}
      , {_id:0, inbox:1, username:1, keys:1, iconURI:1}
      , function (err, recipient) {
        if (err) {throw err;}
        else {
          if (!recipient.keys) {return res.send([false, "the person you are trying to message has no keys? how are you here? this is odd. your message is not saved, please copy all of your text if you want to keep it, please screenshot everything and show this to staff, logging in and out might fix this? "+recipient.keys]);}
          var tmrw = pool.getCurDate(-1);
          var overwrite = false;
          // update the sender's end first
          var inboxTemplate = {threads: {}, list: [], updatedOn: pool.getCurDate(), pending: {}};
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
            // check the last two items, overwrite if there is already a pending message
            if (checkLastTwoForPending(sender.inbox.threads[recipientID].thread, req.body.remove, req.body.encSenderText, tmrw, false)) {
              overwrite = true;
              removeListRefIfRemovingOnlyMessage(sender.inbox, recipientID, req.body, tmrw);
            }
            // check/update the thread "name"
            if (sender.inbox.threads[recipientID].name !== recipient.username) {
              sender.inbox.threads[recipientID].name = recipient.username;
            }
            // check/update pic
            if (sender.inbox.threads[recipientID].image !== recipientPic) {
              sender.inbox.threads[recipientID].image = recipientPic;
            }
          }
          if (!overwrite) { //no message to overwrite, so push new message
            sender.inbox.threads[recipientID].thread.push({
              inbound: false,
              date: tmrw,
              body: req.body.encSenderText,
            });
          }
          //remove the thread if it is now empty
          if (!sender.inbox.threads[recipientID].thread[0]) {delete sender.inbox.threads[recipientID];}
          // AND AGAIN: now update the symetric data on the recipient's side
          if (!checkObjForProp(recipient, 'inbox', inboxTemplate)) {
            bumpThreadList(recipient.inbox);
          }
          var senderPic = sender.iconURI;
          if (typeof senderPic !== 'string') {senderPic = "";}
          // if the recipient does not already have a thread w/ the sender, create one
          if (!checkObjForProp(recipient.inbox.threads, senderID, {name:sender.username, unread:false, image:senderPic, thread:[], key:sender.keys.pubKey})) {
            // there is an extant thread, so
            // check the last two items, overwrite if there is already a pending message
            if (checkLastTwoForPending(recipient.inbox.threads[senderID].thread, req.body.remove, req.body.encRecText, tmrw, true)) {
              overwrite = true;
              // if deleting a message, then remove the listing in 'pending'
              if (req.body.remove) {
                delete recipient.inbox.pending[senderID];
              }
            }
            // check/update the thread "name"
            if (recipient.inbox.threads[senderID].name !== sender.username) {
              recipient.inbox.threads[senderID].name = sender.username;
            }
            // check/update pic
            if (recipient.inbox.threads[senderID].image !== senderPic) {
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
          //remove the thread if it is now empty
          if (!recipient.inbox.threads[senderID].thread[0]) {delete recipient.inbox.threads[senderID];}
          writeToDB(senderID, sender, function () {
            writeToDB(recipientID, recipient, function () {
              res.send([true]);
            });
          });
        }
      });
    }
  });
})

// validate images
app.post('/image', function(req, res) {
  // cant do this on the FE cause CORS
  if (req.body) {
    imageValidate(req.body, res, function () {
      res.send([true]);
    });
  } else {res.send([false, "boy i hope no one ever sees this error message!"]);}
});

// toggle unread status of threads
app.post('/unread', function(req, res) {
  if (!req.session.user) {return res.send('you seem to not be logged in?\nwhy/how are you even here then?\nplease screenshot everything and tell staff about this please');}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, inbox:1}
  , function (err, user) {
    if (err) {res.send(err); throw err;}
    else {
      if (user.inbox && user.inbox.threads[req.body._id]) {
        user.inbox.threads[req.body._id].unread = req.body.bool;
        writeToDB(userID, user, function () {res.send("success");})
      } else {res.send("nahh");}
    }
  });
});

// change user picture URL
app.post('/changePic', function(req, res) {
  if (!req.session.user) {return res.send('you seem to not be logged in?\nwhy/how are you even here then?\nplease screenshot everything and tell staff about this please');}
  var userID = ObjectId(req.session.user._id)
  var updateUrl = function (url) {
    db.collection('users').findOne({_id: userID}
    , {_id:0, iconURI:1}
    , function (err, user) {
      if (err) {throw err;}
      else {
        user.iconURI = url;
        writeToDB(userID, user, function () {res.send("success");})
      }
    });
  }
  var url = req.body.url;
  //validate URL
  if (url === "") {updateUrl(url);}
  else {
    request.head(url, function (error, resp) {
      if (error || resp.statusCode !== 200) {
        return res.send('your url seems to be invalid');
      } else if (resp.headers['content-type'].substr(0,5) !== "image") {
        return res.send('i have seen an image\n\nand that is no image');
      } else if (resp.headers['content-length'] > 10485760) {
        return res.send("your image is "+resp.headers['content-length']+" bytes\nwhich is "+(resp.headers['content-length'] - 10485760)+" bytes too many\n\nsorry pal");
      } else {
        updateUrl(url);
      }
    });
  }
});

// save custom display colors
app.post('/saveColors', function(req, res) {
  if (!req.session.user) {return res.send('you seem to not be logged in?\nwhy/how are you even here then?\nplease screenshot everything and tell staff about this please');}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, settings:1}
  , function (err, user) {
    if (err) {res.send(err); throw err;}
    else {
      user.settings.colors = req.body;
      writeToDB(userID, user, function () {res.send("success");})
    }
  });
});

// new user sign up
app.post('/register', function(req, res) {
    // !!!!!!!! SANITIZE THESE INPUTS!!!!!!!!!!!!!!!!!!!!!
	var username = req.body.username;
	var password = req.body.password;
	var email = req.body.email;
	var secretCode = req.body.secretCode;
                      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // validate
  var x = pool.userNameValidate(username);
  if (x) {return res.send(x);}
  var y = pool.passwordValidate(password);
  if (y) {return res.send(y);}
  /*
  // look up current active/valid secret access codes
  db.collection('users').findOne({ username: "admin" }
  , { codes:1 }
  , function (err, admin) {
    if (err) {throw err;}
    // check if the provided code is a match
    else if (!admin.codes[secretCode]) {return res.send("invalid code");}
    else {
      */
      //check if there is already a user w/ that name
      db.collection('users').findOne({username: username}, {}, function (err, user) {
        if (err) throw err;
    		if (user) {return res.send("name taken");}
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
            following: {},
            followers: {},
            about: {
              oldText: "",
              newText: "",
              updatedOn: today,
            },
            iconURI: "",
            settings: {},
          }, {}, function (err, result) {
            if (err) {throw err;}
            newID = ObjectId(result.insertedId);
            bcrypt.hash(password, 10, function(err, passHash){
              if (err) {throw err;}
              else {
                bcrypt.hash(email, 10, function(err, emailHash){
                  if (err) {throw err;}
                  else {
                    var setValue = {password: passHash, email: emailHash};
                    db.collection('users').updateOne({_id: newID},
                      {$set: setValue }, {},
                      function(err, r) {
                        if (err) {throw err;}
                        else {
                          // "sign in" the user
                          req.session.user = { _id: newID };
                          // the 'false' indicates to make keys for the new user
                          return res.send([true, false]);
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

// log in
app.post('/login', function(req, res) {
  if (!req.body.username || !req.body.password) {return res.send([false, "ERROR! SORRY! your message is not saved, please copy all of your text if you want to keep it, please screenshot everything/note all details of the situation and show this to staff, logging in and out might fix this? SORRY   "+req.body.username+"    "+req.body.password])}
  var username = req.body.username;
	var password = req.body.password;
  // validate
  var x = pool.userNameValidate(username);
  if (x) {return res.send(x);}
  var y = pool.passwordValidate(password);
  if (y) {return res.send(y);}
      // is that ^ neccesary????
  var nope = "invalid username/password";
  db.collection('users').findOne({username: username}
    , { password:1, keys:1 }
    , function (err, user) {
      //check if username is registered
      if (!user) {return res.send([false, nope]);}
      else {
        // Match Password
        bcrypt.compare(password, user.password, function(err, isMatch){
          if (err) {throw err;}
          else if (isMatch) {
            req.session.user = { _id: ObjectId(user._id) };
            // check if user already has keys, send privKey if so
            if (user.keys) {return res.send([true, user.keys.privKey]);}
            else {return res.send([true, false]);}
          } else {
            return res.send([false, nope]);
          }
        });
      }
  });
});

// set keys
app.post('/keys', function(req, res) {
  if (!req.session.user) {return res.send('you seem to not be logged in?\nwhy/how are you even here then?\nplease screenshot everything and tell staff about this please');}
  var userID = ObjectId(req.session.user._id);
  db.collection('users').findOne({_id: userID}
  , {_id:0, inbox:1, keys:1}
  , function (err, user) {
    if (err) {res.send(err); throw err;}
    else {
      if (req.body.privKey && req.body.pubKey) {
        user.keys = req.body;
        writeToDB(userID, user, function () {res.send("success");})
      } else {res.send("nahh");}
    }
  });
});

// logout
app.get('/logout', function(req, res) {
  req.session.user = null;
  res.send("success");
});


// admin
var adminGate = function (req, res, callback) {
  if (req.session.user) {
    db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
    , {_id:0, username:1, codes:1, iconURI:1, settings:1}
    , function (err, user) {
      if (err) {throw err;}
      else if (user && user.username === "admin") {callback(res, user);} //no need to pass 'user' once we take out the code nonsense
      else if (!user) {res.render('layout', {pagename:'404'});}
      else {
        res.render('layout', {
          pagename:'404',
          username: user.username,
          userPic: getUserPic(user),
          colors: getUserColors(user),
        });
      }
    });
  } else {res.render('layout', {pagename:'404'});}
}

app.get('/admin', function(req, res) {
  adminGate(req, res, function (res, user) {
    var results = pool.runTests(
      [ //array of arrays, each inner array contains two statements that are supposed to be equal
        [pool.userNameValidate(), "need a name!", "pool.userNameValidate()"],
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
        [bumpThreadList({updatedOn: pool.getCurDate(1), threads:{5454:{unread:true}, 1234:{unread:true}, 9876:{unread:true}}, pending:{5454:true, 1234:true, 9876:true}, list:[54545, 12345, 9876]}).list.length, 5],
        //
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[]},3:{}}, list:[1,2,3]}, 2, {remove:true}, 3).length, 2],
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[7,7,7,7]},3:{}}, list:[1,2,3]}, 2, {remove:true}, 3), false],
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[{date:8}]},3:{}}, list:[1,2,3]}, 2, {remove:true}, 3), false],
        [removeListRefIfRemovingOnlyMessage({threads:{1:{},2:{thread:[{date:3}]},3:{}}, list:[8,6,1,2,3]}, 2, {remove:true}, 3).length, 4],
        //
      ]
    );
    res.render('admin', { codes:user.codes, results:results });
  });
});

app.get('/admin/users', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').find({},{}).toArray(function(err, users) {
      if (err) {throw err;}
      else {
        return res.send(users);
      }
    });
  });
});

app.post('/admin/resetTest', function(req, res) {
  adminGate(req, res, function (res, user) {
    var today = pool.getCurDate();
    var tmrw = pool.getCurDate(-1);
    var ystr = pool.getCurDate(1);
    var smeeKeys = {pubKey:`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xjMEW02YyRYJKwYBBAHaRw8BAQdAKO/kW0bt6Mvay5IRTHA79ydgsZT00VCr
FPSTmeGp73HNFWJvYiA8Ym9iQGV4YW1wbGUuY29tPsJ3BBAWCgApBQJbTZjJ
BgsJBwgDAgkQoWxpC/plDt0EFQgKAgMWAgECGQECGwMCHgEAAF6gAQD0Tv7v
/JsbvAS76+jbu/9fjxsgvevrpXtGiZ3OShg8ZAD9E9tmyg7JPKz1IdR6ecTP
FYu0HlvMNiH6Xvv5+ws3kw7OOARbTZjJEgorBgEEAZdVAQUBAQdAG+GXxfrJ
hSz3652DzWxer+6PFLdV7z+5BCXKemRgm0EDAQgHwmEEGBYIABMFAltNmMkJ
EKFsaQv6ZQ7dAhsMAADbBQEA4w9RZ4ycBiu1iDFfw5E6LbJFOTyuQyF/gJEu
3VoGlyEA/0mt3MJ9gBJ2tgqhn/dL81ZYfeMou4G+vLrvEzGw30gG
=SwgW
-----END PGP PUBLIC KEY BLOCK-----`,
      privKey:`-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xYYEW02YyRYJKwYBBAHaRw8BAQdAKO/kW0bt6Mvay5IRTHA79ydgsZT00VCr
FPSTmeGp73H+CQMI/iNrn7dzZOZg1z8UF+UPrg+oct1QNkrSj4zAvnrq5M4X
hzRg8p3sfF48hNJ471dnL4oZV5aMNuSzMgw957p+Qc+8am5FxmG0d1pen7kN
PM0VYm9iIDxib2JAZXhhbXBsZS5jb20+wncEEBYKACkFAltNmMkGCwkHCAMC
CRChbGkL+mUO3QQVCAoCAxYCAQIZAQIbAwIeAQAAXqABAPRO/u/8mxu8BLvr
6Nu7/1+PGyC96+ule0aJnc5KGDxkAP0T22bKDsk8rPUh1Hp5xM8Vi7QeW8w2
Ifpe+/n7CzeTDseLBFtNmMkSCisGAQQBl1UBBQEBB0Ab4ZfF+smFLPfrnYPN
bF6v7o8Ut1XvP7kEJcp6ZGCbQQMBCAf+CQMIccINf+9PC9FgV763u79kz3YF
rEnzDlbvv+jrtfLSggqgly4h98WVCUQ6ljQRnmUDRSpNJ3odfNS8YV6kczle
8QfIPD3I7cWgpSG01YilrMJhBBgWCAATBQJbTZjJCRChbGkL+mUO3QIbDAAA
2wUBAOMPUWeMnAYrtYgxX8OROi2yRTk8rkMhf4CRLt1aBpchAP9JrdzCfYAS
drYKoZ/3S/NWWH3jKLuBvry67xMxsN9IBg==
=MdT9
-----END PGP PRIVATE KEY BLOCK-----`
    }
    var ninkKeys = {pubKey:`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xjMEW02aAhYJKwYBBAHaRw8BAQdAQDBbCTTC/9CkoPdVAOQmvyivkx3gaMyx
Njbms2usjdnNFWJvYiA8Ym9iQGV4YW1wbGUuY29tPsJ3BBAWCgApBQJbTZoC
BgsJBwgDAgkQL/dZbwaWv88EFQgKAgMWAgECGQECGwMCHgEAAJpFAQDOEioJ
vMh3t/nAb3tKPhZHYNDiwrj/A3iM14LTmQ5ofQEA5BMQuIK8QAIkf7xTWclK
WqzlOYJ7H6OEr69oFQDgYwbOOARbTZoCEgorBgEEAZdVAQUBAQdA4yMgcJsl
bs0t1vngiLg7MWiwhrKktZfoIGOHVwUWxRkDAQgHwmEEGBYIABMFAltNmgIJ
EC/3WW8Glr/PAhsMAAA7SgD+PkGXbhIOLfjJfFuVnIKZVVjgsCQYoIHnPUQQ
4fEx+SoBAN3eybRrsd9QyJYiCJhjA+lfccjzSRL2xhX6gkwwxuYP
=adY6
-----END PGP PUBLIC KEY BLOCK-----`,
      privKey:`-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xYYEW02aAhYJKwYBBAHaRw8BAQdAQDBbCTTC/9CkoPdVAOQmvyivkx3gaMyx
Njbms2usjdn+CQMIYcOdz1UihqpgRklV7DLZ8fj1S8zKwcFWFBtMZeiVMZSp
Y3q56OtgIlAoWxBlsWGxYTsImnytjwSWdcg00Ts/Ic7DuNOEqHnhVpRD6bbW
980VYm9iIDxib2JAZXhhbXBsZS5jb20+wncEEBYKACkFAltNmgIGCwkHCAMC
CRAv91lvBpa/zwQVCAoCAxYCAQIZAQIbAwIeAQAAmkUBAM4SKgm8yHe3+cBv
e0o+Fkdg0OLCuP8DeIzXgtOZDmh9AQDkExC4grxAAiR/vFNZyUparOU5gnsf
o4Svr2gVAOBjBseLBFtNmgISCisGAQQBl1UBBQEBB0DjIyBwmyVuzS3W+eCI
uDsxaLCGsqS1l+ggY4dXBRbFGQMBCAf+CQMI7YvN0HdkSX9gM2pLZtBjqvuH
6ceJM7AGkX75VA9UKccJTnSmY65zhStLUTB0moNiZ5r4rYE4zPK2j1o+WolE
W9hJWUr4P8sOrCQrWCWYkMJhBBgWCAATBQJbTZoCCRAv91lvBpa/zwIbDAAA
O0oA/j5Bl24SDi34yXxblZyCmVVY4LAkGKCB5z1EEOHxMfkqAQDd3sm0a7Hf
UMiWIgiYYwPpX3HI80kS9sYV+oJMMMbmDw==
=bQHK
-----END PGP PRIVATE KEY BLOCK-----`
    }
    var drooKeys = {pubKey:`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xjMEW02f/BYJKwYBBAHaRw8BAQdAOcj8lyu7i37bvxvpf6P5Yn+C7fDN3KLU
Ky8lRrJzYr3NFWJvYiA8Ym9iQGV4YW1wbGUuY29tPsJ3BBAWCgApBQJbTZ/8
BgsJBwgDAgkQoil15yboAyAEFQgKAgMWAgECGQECGwMCHgEAAEozAQCZsa2m
mBz9kxF81YkJSfFK8kxIiF54aj6iSrc8TbVzLwD/cMUQARGYpVPWaURCfhsg
b9lmbKWVs5kgzQx2KG9jAwrOOARbTZ/8EgorBgEEAZdVAQUBAQdAljggpvGc
3ghhxolf0No6itZ5nl0boOLDNFL+1ljwZBYDAQgHwmEEGBYIABMFAltNn/wJ
EKIpdecm6AMgAhsMAAABtQEAm8xJ6iVcAlFRpDXRiiE7AQJBugLEFK3DyWlN
yg3nUnYBAPLQVONkbi6q8Tca6Wp6NeUc1kF36Wql2xXmGp/51xUN
=HXH3
-----END PGP PUBLIC KEY BLOCK-----`,
      privKey:`-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

xYYEW02f/BYJKwYBBAHaRw8BAQdAOcj8lyu7i37bvxvpf6P5Yn+C7fDN3KLU
Ky8lRrJzYr3+CQMISRgWGFW8h1Rg/ilSXo4NDg3lviVtLusCo+ylQgaIsxZg
E6xst8lFk2ZjfSSRWVvHA4nbydOhB2uhAqA+ptD2A+Krm7f4mDL70Y9yzLaB
1c0VYm9iIDxib2JAZXhhbXBsZS5jb20+wncEEBYKACkFAltNn/wGCwkHCAMC
CRCiKXXnJugDIAQVCAoCAxYCAQIZAQIbAwIeAQAASjMBAJmxraaYHP2TEXzV
iQlJ8UryTEiIXnhqPqJKtzxNtXMvAP9wxRABEZilU9ZpREJ+GyBv2WZspZWz
mSDNDHYob2MDCseLBFtNn/wSCisGAQQBl1UBBQEBB0CWOCCm8ZzeCGHGiV/Q
2jqK1nmeXRug4sM0Uv7WWPBkFgMBCAf+CQMIZzajpUsVHZ1goABHaPhqHJZy
ibPEPHjdtCAh0ZuikNsyvM1RHVf2WHGvtRRu2rLObt4uSgzvcLxhNJY8cEoL
t6bRLHHgiJwewHVLXmfsWsJhBBgWCAATBQJbTZ/8CRCiKXXnJugDIAIbDAAA
AbUBAJvMSeolXAJRUaQ10YohOwECQboCxBStw8lpTcoN51J2AQDy0FTjZG4u
qvE3GulqejXlHNZBd+lqpdsV5hqf+dcVDQ==
=g+do
-----END PGP PRIVATE KEY BLOCK-----`
    }
    var password123 = "$2a$10$fTP6I9.t7Z4wlNm3E.Ex2.TwbYjRMIAmEsDQyMaFC5YRHY2UOk92K";
    var smeeMsg = `-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

wV4DmPpsKFcY+UISAQdAJHOoI24XMBNw4NwchS0RJyZxNdOVrokOU4l241/1
5XMwwCKuQNY6dxWplDZcsxncpmoX8d4gtxbDV05IjsVpzVSGAvAtZsuBcMHR
5lzZXYzo0lEBNPeWBKyO4Qf7s60XY0EpdVDNIeTDaTlqzK1bnSOwDGsDfWMU
QanViiZbfurOI55nSr0qF0AoRvQjYfUV8HFuP660Ka2+fzZX3Z5vt/bl6J0=
=Z7GM
-----END PGP MESSAGE-----
`;
    var ninkMsg = `-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

wV4Dyo3NEoX50ZoSAQdAKomboxwh3CfGJadSNIDoMsExUiUnCCxkTtHHbdxV
d20wI5VuwNMD/iN+onkglTRYCvBiWpuvTtXCMWZZlV22tUyYQe7w6LhjY7Hd
GB7dRTal0lEBTW1LR/ReIC4dID5O0+u5eUSRj12n2caE57SJkQt5+k0KPvOx
ZZmDD9eYtWw/Y6oKcOTTJ8f0qm6iuo8ifSCHozMKlK1Fa0uoUesQFg1J/XQ=
=UVFq
-----END PGP MESSAGE-----
`;
    var drooMsg = `-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v3.0.13
Comment: https://openpgpjs.org

wV4D+UPf1p/rWf0SAQdA1qcCLft9w+CTo+ZFESf+FBdv9m1BfBCHk5I6JAZN
vwowJNU1UquiasDIjaFUrPyXOq+wiing9Si4UC/Qhtq7jnG0F5+7gsP52ctq
TeZo0Gm70lYBgSJ+yqGal/amCVWFg9d/baX5b7N4Zs35BBe5zZ+gGQGVwlEo
xZEzxul2Np7+cc88Ejb9Xt7JJ/sNZg+vezPX5EQrMDAePMMHatfb5MWWxZLw
svhUtw==
=k9z9
-----END PGP MESSAGE-----
`;
    var testPost1 = `<b>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In tristique congue aliquet. Phasellus rutrum sit amet nisi sed lacinia. </b>Maecenas porta pulvinar vestibulum. Integer quis elit quam. <c>Etiam quis urna id lacus pulvinar tincidunt.</c> Quisque semper risus eget elit ornare, eu finibus lectus vulputate. Ut tortor leo, rutrum et facilisis et, imperdiet ut metus. Maecenas accumsan <i>fringilla lorem, vitae pretium ligula varius at.</i> Proin ex tellus, venenatis vehicula venenatis in, pulvinar eget ex.<br><br><img src="https://68.media.tumblr.com/708a562ba83f035812b6363558a79947/tumblr_o9h0kjFeB51vymizko1_1280.jpg"><br><br><u>Proin imperdiet libero turpis, sit amet iaculis</u> diam mattis vitae. Quisque ac nisl eget nibh euismod feugiat in ut erat. Nulla leo ligula, tristique vitae est ac, auctor efficitur sem. <ol><li>Maecenas pellentesque</li><li> sapien et maximus laoreet,</li></ol> magna nulla viverra <s>dui, ac ultrices velit nisi ut ligula. Integer pellentesque </s>nec nunc vel accumsan. Fusce vel eleifend arcu, vitae dignissim massa. Morbi vel interdum massa, quis consectetur nisi. Nullam mollis sed mi non accumsan.<br><br><a href="http://www.butts.cash/">butts.cash</a><br><br><ul><li>Phasellus</li><li> non turpis</li> <li>non libero</li> </ul>faucibus molestie non sit amet velit. Sed ornare commodo facilisis. Nullam ornare aliquet ultricies. Cras in maximus erat. Interdum et malesuada fames ac ante ipsum primis in faucibus. Donec lobortis turpis et mauris ullamcorper viverra.<br><cut>more</cut><br><r>Nullam pharetra suscipit nibh eget lacinia. Integer venenatis est et rhoncus ullamcorper. Sed sit amet enim velit. In tellus massa, iaculis ac libero in, sagittis mollis erat. Donec porttitor nunc at efficitur faucibus. Donec ut aliquet mauris. Etiam est justo, molestie lacinia congue at, fringilla sit amet ex.</r>`
    var posts = {};
    posts[tmrw] = [{body: testPost1}];
    posts[today] = [{body: testPost1}];
    posts[ystr] = [{body: testPost1}];
    var postList = [{date: ystr, num: 0},{date: today, num: 0}];
    var postListPending = [{date: tmrw, num: 0}];
    var testers = [
      {username:'smee', _id:ObjectId('000000000000000000000001'), password:password123, keys:smeeKeys, inbox:{
        threads:{
          '000000000000000000000002':{name:'droo', unread:true, key:drooKeys.pubKey, thread:[{inbound: false, date: "2018-07-09", body:smeeMsg},{inbound: false, date: "2018-07-10", body:smeeMsg},{inbound: false, date: "2018-07-11", body:smeeMsg},{inbound: false, date: "2018-07-11", body:smeeMsg}]},
        }, list:['000000000000000000000002'], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}},
      {username:'droo', _id:ObjectId('000000000000000000000002'), password:password123, keys:drooKeys, inbox:{
        threads: {
          '000000000000000000000001':{name:'smee', unread:true, key:smeeKeys.pubKey, thread:[{inbound: true, date: "2018-07-09", body:drooMsg},{inbound: true, date: "2018-07-10", body:drooMsg},{inbound: true, date: "2018-07-11", body:drooMsg},{inbound: true, date: "2018-07-11", body:drooMsg}]},
          '000000000000000000000004':{name:'shitnink', unread:true, key:ninkKeys.pubKey, thread:[{inbound: true, date: "2018-07-09", body:drooMsg},{inbound: false, date: "2018-07-10", body:drooMsg},{inbound: false, date: "2018-07-11", body:drooMsg},{inbound: true, date: "2018-07-11", body:drooMsg}]},
        }, list:['000000000000000000000001','000000000000000000000004'], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}},
      {username:'mrah', _id:ObjectId('000000000000000000000003'), password:password123, inbox:{
        threads: {}, list:[], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}},
      {username:'nink', _id:ObjectId('000000000000000000000004'), password:password123, keys:ninkKeys, inbox:{
        threads: {
          '000000000000000000000002':{name:'droo', unread:true, key:drooKeys.pubKey, thread:[{inbound: false, date: "2018-07-09", body:ninkMsg},{inbound: true, date: "2018-07-10", body:ninkMsg},{inbound: true, date: "2018-07-11", body:ninkMsg},{inbound: false, date: "2018-07-11", body:ninkMsg}]},
        }, list:['000000000000000000000002'], updatedOn:today, pending:{}
      }, posts:posts, postList:postList, postListPending:postListPending, postListUpdatedOn:today, settings:{}}
    ];
    var count = testers.length;
    for (var i = 0; i < testers.length; i++) {
      db.collection('users').updateOne({username: testers[i].username},
        {$set: testers[i]},
        {upsert: true},
        function(err, user) {
          if (err) {throw err;}
          else {
            count--;
            if (count === 0) {
              res.send("success");
            }
          }
        }
      );
    }
  });
});

app.post('/admin/removeUser', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').remove({username: req.body.name},
      function(err, user) {
        if (err) {throw err;}
        else {
          res.send("success");
        }
      }
    );
  });
});

app.post('/admin/purge', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').find({},{}).toArray(function(err, users) {
      if (err) {throw err;}
      else {
        var count = users.length;
        for (var i = 0; i < users.length; i++) {
          db.collection('users').updateOne({_id: ObjectId(users[i]._id)},
            {$unset: {threadListUpdatedOn:"", threadListPending:"", threadList:"", threads:""}},
            function(err, user) {
              if (err) {throw err;}
              else {
                count--;
                if (count === 0) {
                  res.send("success");
                }
              }
            }
          );
        }
      }
    });
  });
});

app.get('/admin/:num', function(req, res) {
  serve404(res, req.session.user);
});

app.post('/admin', function(req, res) {
  if (req.session.user) {
    var userID = ObjectId(req.session.user._id)
    db.collection('users').findOne({_id: userID}
      , {_id:0, username:1, codes:1}
      , function (err, admin) {
        if (err) {throw err;}
        else if (!admin || admin.username !== "admin") {
          res.render('layout', {pagename:'404', type:'user'});
        } else {
          if (!admin.codes) {admin.codes = {};}
          admin.codes[req.body.code] = true;
          db.collection('users').updateOne({_id: userID},
            {$set: admin },
            function(err, user) {
              if (err) {throw err;}
              else {res.render('admin', { codes: admin.codes });}
            }
          );
        }
      }
    );
  } else {
    res.render('layout', {pagename:'404', type:'user'});
  }
});


// user routes must be placed last
// view all of a users posts
app.get('/:username', function(req, res) {
  db.collection('users').findOne({username: req.params.username}
  , { posts:1, postList:1, postListPending:1, iconURI:1}
  //TODO: later make that^ also return "settings" to check post visibility permissions
  , function (err, author) {
    if (err) {throw err; res.send(err);}
    else {
      if (author) {
        checkFreshness(author);
        var posts = [];
        var pL = author.postList;
        var tmrw = pool.getCurDate(-1);
        for (var i = 0; i < pL.length; i++) {
          if (pL[i].date !== tmrw) {
            posts.push({
              body: pool.checkForCuts(author.posts[pL[i].date][pL[i].num].body, author._id+"-"+pL[i].date+"-"+pL[i].num),
              date: pL[i].date,
            });
          }
        }
        var authorPic = getUserPic(author);
        var showAuthorToNonUser = function () {
          res.render('layout', {
            pagename:'user',
            authorName:req.params.username,
            posts:posts,
            authorPic: authorPic
          });
        }
        if (req.session.user) {
          getUser(req.session.user, function (user) {
            if (user) {
              res.render('layout', {
                pagename:'user',
                authorName:req.params.username,
                posts:posts,
                authorPic: authorPic,
                username: user.username,
                userPic: user.pic,
                colors: user.colors,
              });
            } else {showAuthorToNonUser();}
          }); // doubled like this because asynch
        } else {showAuthorToNonUser();}
      } else {serve404(res, req.session.user);}
    }
  });
});

// view a single post
app.get('/:username/:num', function(req, res) {
  db.collection('users').findOne({username: req.params.username}
  , { posts:1, postList:1, postListPending:1, iconURI:1}
  //TODO: later make that^ also return "settings" to check post visibility permissions
  , function (err, author) {
    if (err) {throw err; res.send(err);}
    else {
      if (author) {
        checkFreshness(author);
        var i = req.params.num;
        if (author.postList[i] && author.postList[i].date !== pool.getCurDate(-1)) {
          var postBody = pool.checkForCuts(author.posts[author.postList[i].date][author.postList[i].num].body, author._id+"-"+author.postList[i].date+"-"+author.postList[i].num)
          var date = author.postList[i].date;
        } else {
          var postBody = "<c>not even a single thing</c>";
          var date = null;
        }
        var authorPic = getUserPic(author);
        var showPostToNonUser = function () {
          res.render('layout', {
            pagename:'post',
            authorName:req.params.username,
            body: postBody,
            date: date,
            authorPic: authorPic,
          });
        }
        if (req.session.user) {
          getUser(req.session.user, function (user) {
            if (user) {
              res.render('layout', {
                pagename:'post',
                authorName:req.params.username,
                body: postBody,
                date: date,
                authorPic: authorPic,
                username: user.username,
                userPic: user.pic,
                colors: user.colors,
              });
            } else {showPostToNonUser();}
          });  // doubled like this because asynch
        } else {showPostToNonUser();}
      } else {serve404(res, req.session.user);}
    }
  });
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
