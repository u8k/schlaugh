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
var devFlag = false;
  // ^ NEVER EVER LET THAT BE TRUE ON THE LIVE PRODUCTION VERSION, FOR LOCAL TESTING ONLY
var adminGate = function (req, res, callback) {
  if (devFlag) {return callback(res);}
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
        [devFlag, false, "IN DEV MODE"],
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
    if (!devFlag) {return res.render('admin', { codes:user.codes, results:results });}
    else {res.render('admin', { results:results });}
  });
});

app.get('/admin/users', function(req, res) {
  adminGate(req, res, function (res, user) {
    db.collection('users').find({},{_id:0, username:1, inbox:1}).toArray(function(err, users) {
      if (err) {throw err;}
      else {
        return res.send(users);
      }
    });
  });
});

app.post('/admin/resetTest', function(req, res) {
  adminGate(req, res, function (res, user) {
    var testers = adminB.getTesters();
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
