var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var bcrypt = require('bcryptjs');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var pool = require('./public/pool.js');

//connect and check mongoDB
var db;
var uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/owlpost';
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

//*******//HELPTER FUNCTIONS//*******//

var checkFreshness = function (user, type) {
  var today = pool.getCurDate();
  if (user[type + 'ListUpdatedOn'] !== today) {
    user[type + 'ListUpdatedOn'] = today;
    if (type === 'thread') {
      var tlp = user.threadListPending;
      var i = tlp.length-1;
      // clear the "prevPos" fields on the threadListPending
      while (tlp[i] && tlp[i].prevPos !== null) {
        tlp[i].prevPos = null;
        i--;
      }
      user.threadList = tlp;
    } else {  //type is "post"
      var plp = user.postListPending;
      while (plp[0] && plp[0].date <= today) {
        user.postList.push({
          date: plp[0].date,
          num: plp[0].num,
        });
        plp.splice(0,1);
      }
    }
  }
}

var findThreadInPending = function (user, threadID) {
  for (var i = 0; i < user.threadListPending.length; i++) {
    if (String(user.threadListPending[i].id) === String(threadID)) {
      return i;
    }
  }
}

var convertEditorInput = function (string) {
  string = string.replace(/\r?\n|\r/g, '<br>');

  var buttonUp = function (bOpen, iOpen, aOpen, uOpen, sOpen, cOpen) {
    if (aOpen) {string += "</a>"}
    if (bOpen) {string += "</b>"}
    if (iOpen) {string += "</i>"}
    if (uOpen) {string += "</u>"}
    if (sOpen) {string += "</s>"}
    if (cOpen) {string += "</cut>"}
    return string;
  }
  var recurse = function (pos, bOpen, iOpen, aOpen, uOpen, sOpen, cOpen) {
    var next = string.substr(pos).search(/</);
    if (next === -1) {return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, cOpen);}
    else {
      pos += next;
      if (string.substr(pos+1,2) === "b>" && !bOpen) {
        bOpen = true;
        pos += 2;
      } else if (string.substr(pos+1,2) === "i>" && !iOpen) {
        iOpen = true;
        pos += 2;
      } else if (string.substr(pos+1,2) === "u>" && !uOpen) {
        uOpen = true;
        pos += 2;
      } else if (string.substr(pos+1,2) === "s>" && !sOpen) {
        sOpen = true;
        pos += 2;
      } else if (string.substr(pos+1,4) === "cut>" && !cOpen) {
        cOpen = true;
        pos += 4;
      } else if (string.substr(pos+1,3) === "li>") {
        pos += 3;
      } else if (string.substr(pos+1,3) === "ul>") {
        pos += 3;
      } else if (string.substr(pos+1,3) === "ol>") {
        pos += 3;
      } else if (string.substr(pos+1,3) === "/b>") {
        bOpen = false;
        pos += 3;
      } else if (string.substr(pos+1,3) === "/i>") {
        iOpen = false;
        pos += 3;
      } else if (string.substr(pos+1,3) === "/u>") {
        uOpen = false;
        pos += 3;
      } else if (string.substr(pos+1,3) === "/s>") {
        sOpen = false;
        pos += 3;
      } else if (string.substr(pos+1,5) === "/cut>") {
        cOpen = false;
        pos += 5;
      } else if (string.substr(pos+1,4) === "/li>") {
        pos += 4;
      } else if (string.substr(pos+1,4) === "/ul>") {
        pos += 4;
      } else if (string.substr(pos+1,4) === "/ol>") {
        pos += 4;
      } else if (string.substr(pos+1,3) === "br>") {
        pos += 3;
      } else if (string.substr(pos+1,4) === "br/>") {
        pos += 4;
      } else if (string.substr(pos+1,8) === 'a href="') {
        aOpen = true;
        pos += 8;
        var qPos = string.substr(pos+1).search(/"/);
        if (qPos === -1) {
          string += '">';
          return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, cOpen);
        }
        else {pos += qPos;}
        if (string[pos+2] !== ">") {
          string = string.substr(0,pos+2) + '>' + string.substr(pos+2);
        }
        else {pos += 1;}
      } else if (string.substr(pos+1,3) === "/a>") {
        aOpen = false;
        pos += 3;
      } else if (string.substr(pos+1,9) === 'img src="') {
        pos += 9;
        var qPos = string.substr(pos+1).search(/"/);
        if (qPos === -1) {
          string += '">';
          return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, cOpen);
        }
        else {pos += qPos;}
        if (string[pos+2] !== ">") {
          string = string.substr(0,pos+2) + '>' + string.substr(pos+2);
        }
        else {pos += 1;}
      } else {
        string = string.substr(0,pos) + '&lt;' + string.substr(pos+1);
      }
      return recurse(pos+1, bOpen, iOpen, aOpen, uOpen, sOpen, cOpen);
    }
  }
  return recurse(0, false, false, false, false, false);
}

//*******//ROUTING//*******//

// main/only page
app.get('/', function(req, res) {
  if (!req.session.user) {res.render('layout', {pagename:'login'});}
  else {
    db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
    , {_id:0, username:1, posts:1}
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
        res.render('layout', {pagename:'main', username:user.username, pending:pending, pendingWriter:pendingWriter});
      }
    });
  }
});

// new/edit/delete post
app.post('/', function(req, res) {
  if (!req.session.user) {res.send('error');}
  else {
    var userID = ObjectId(req.session.user._id)
    db.collection('users').findOne({_id: userID}
    , {_id:0, posts:1, postList:1, postListPending:1}
    , function (err, user) {
      if (err) {throw err;}
      else {
          //TODO SANITIZE!?!!!!!!!!

        checkFreshness(user, "post");
        var tmrw = pool.getCurDate(-1);
        if (req.body.remove) {                       //remove
          delete user.posts[tmrw];
          var text = "";
          user.postListPending.pop();   //currently assumes that postListPending only ever contains 1 post
        } else {
          var text = convertEditorInput(req.body.text);
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
        db.collection('users').updateOne({_id: userID},
          {$set: user },
          function(err, user) {
            if (err) {throw err;}
            else {res.send(text);}
          }
        );
      }
    });
  }
});

// get posts-(should maybe be a "GET"? ehhhh(following list))
app.post('/posts', function(req, res) {
  if (req.body.date === pool.getCurDate(-1)) {
    return res.send([{body: 'DIDYOUPUTYOURNAMEINTHEGOBLETOFFIRE', author: "APWBD"}]);
  }
  //later make this▼ only check "following" instead of all users
  db.collection('users').find({},{ posts:1, username:1 }).toArray(function(err, users) {
    //can i make that^ only return the post for the date i want instead of all posts?
    //TODO: later make that^ also return "settings" and then check post visibility permissions
    if (err) {throw err;}
    else {
      var posts = [];
      for (var i = 0; i < users.length; i++) {
        if (users[i].posts[req.body.date]) {
          posts.push({
            body: pool.checkForCuts(users[i].posts[req.body.date][0].body, users[i]._id+'-'+req.body.date),
            author: users[i].username,
            _id: users[i]._id,
          });
        }
      }
      return res.send(posts);
    }
  });
});

// get all messages
app.get('/inbox', function(req, res) {
  res.send(null);
});
/*
  if (!req.session.user) {return res.render('layout', {pagename:'login'});}
  db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
  , {_id:0, threads:1, threadList:1, threadListUpdatedOn:1, threadListPending: 1}
  , function (err, user) {
    if (err) {throw err;}
    else {
      //*****************temp db checker/fixer************************
      //remove duplicates/glitches
      var tlp = user.threadListPending;
      var ref = {};
      for (var i = 0; i < tlp.length; i++) {
        if (!user.threads[tlp[i].id]) { ///////////!!!!!?!??!?!??!?!
          console.log("ln203", tlp[i].id);
        }
        if (ref[ObjectId(tlp[i].id)]) {
          tlp.splice(i,1);
          i--;
        } else {
          ref[ObjectId(tlp[i].id)] = true;
        }
      }
      //make sure everything is accounted for
      for (var x in user.threads) {
        if (user.threads.hasOwnProperty(x)) {
          var missing = true;
          for (var i = 0; i < tlp.length; i++) {
            if (String(tlp[i].id) === String(x)) {
              missing = false;
              break;
            }
          }
          if (missing) {
            tlp.push({id: ObjectId(x), prevPos: Infinity})
          }
        }
      }
      db.collection('users').updateOne({_id: ObjectId(req.session.user._id)},
        {$set: user },
        function(err, user) {
          if (err) {throw err;}
          else {}
        });
      //***************************************************************

      console.log(user.threadListUpdatedOn);
      console.log("threadList", user.threadList);
      console.log(" ");
      console.log("threadListPending", user.threadListPending);
      console.log("________");
      checkFreshness(user, "thread");
      console.log("threadList", user.threadList);
      console.log(" ");
      console.log("threadListPending", user.threadListPending);
      console.log("________");
      console.log("________");
      console.log(" ");

      var threads = [];
        // later have "pagination" options here, ie, only grab the X most recent threads
      var count = user.threadList.length-1;
      if (count === -1) {return res.send(threads);}
      for (var i = count; i >= 0; i--) {
        var t = user.threads[user.threadList[i].id];
        //check the last two messages of each thread, see if they are allowed
        for (var j = 1; j < 3; j++) {
          var x = t.length-j;
          if (t[x] && t[x].date === pool.getCurDate(-1) && t[x].sender !== 0) {
            t.splice(x, 1);
            j+=2;
          }
        }
        //populate the the array
        if (t.length !== 0) {
          var j = threads.length
          threads.push({
            _ids: [user.threadList[i].id],
            thread: t,
          });
          // back to the db for names, db calls don't necesarilly return in order, hence the...mess
          (function (i,t,j) {
            // this currently assumes 1-on-1 threads, and will have to be
            // changed to look up multiple users for group threads
            db.collection('users').findOne({_id: ObjectId(user.threadList[i].id)}
            , {_id:0, username:1}
            , function (err, otherUser) {
              if (err) {throw err;}
              else {
                if (otherUser) {
                  threads[j]['names'] = [otherUser.username];
                } else {
                  //console.log('ln214, id not found???');
                }
                if (count === 0) {
                  res.send(threads);
                }
                count--;
              }
            });
          })(i,t,j);
        } else {count--};
      }
    }
  });
});
*/

// new/edit/delete message
app.post('/inbox', function(req, res) {
  res.send(null);
});
/*
  var recipient = ObjectId(req.body.recipient);
  var sender = ObjectId(req.session.user._id);
  //modification needed here^ for group threads
    //and for checking if the message is allowed by the recipient's settings
  db.collection('users').findOne({_id: sender}
  , {_id:0, threads:1, threadList:1, threadListPending: 1}
  , function (err, user) {
    if (err) {throw err;}
    else {
      var tmrw = pool.getCurDate(-1);
      var overwrite = false;
      // if the sender does not already have a thread w/ the recipient, create one
      if (!user.threads[recipient]) {
        user.threads[recipient] = [];
        // and create the corresponding refference on threadlists
        user.threadListPending.push({id:recipient, prevPos: Infinity});
        user.threadList.push({id:recipient});
      } else {
        // there is an extant thread, so
        // check the last two items, overwrite if there is already a pending message
        var t = user.threads[recipient];
        var len = t.length;
        for (var j = len-1; j > len-3; j--) {
          if (t[j] && t[j].date === tmrw && t[j].sender === 0) {
            overwrite = true;
            if (req.body.remove) {t.splice(j, 1);}
            else {t[j].body = req.body.text;}
            j-=2;
          }
        }
      }
      if (!overwrite) { //no message to overwrite, so push new message
        user.threads[recipient].push({
          sender: 0,
          date: tmrw,
          body: req.body.text,
          unread: false,
        });
      }
      db.collection('users').updateOne({_id: sender},
        {$set: user },
        function(err, user) {
          if (err) {throw err;}
          else {
            // AND AGAIN, now update the symetric data on the recipient's side
            // AND also update their threadListPending
            db.collection('users').findOne({_id: recipient}
              //modification needed here^ for group threads, loop through recipients
            , {_id:0, threads:1, threadList:1, threadListUpdatedOn:1, threadListPending: 1}
            , function (err, user) {
              if (err) {throw err;}
              else {
                checkFreshness(user, "thread");
                var p = user.threadListPending;
                // if the recipient does not already have a thread w/ the sender, create one
                if (!user.threads[sender]) {
                  user.threads[sender] = [];
                  p.push({id:sender, prevPos: Infinity});
                  var newThread = true;
                }
                if (overwrite) {
                  // find the message to be overwritten
                  var t = user.threads[sender];
                  var len = t.length;
                  for (var j = len-1; j > len-3; j--) {
                    if (t[j] && t[j].date === tmrw && t[j].sender !== 0) {
                      if (req.body.remove) {
                        t.splice(j, 1);            // remove
                        // restore the threadListPending position to the previous
                        var index = findThreadInPending(user, sender);
                        console.log('index', index);
                        if (index) {// this should always be true, we're checking
                                    // so as to limit  damage in case it's not
                          // did it have a previous position?
                          var bump = 0;
                          if (p[index].prevPos !== Infinity) {
                            // calc adjustments needed due to other moves
                            var adj = 0;
                            var i = p.length-1;
                            while (p[i] && p[i].prevPos !== undefined) {
                              if (p[i].prevPos < p[index].prevPos) {adj++;}
                              i--;
                            }
                            // put a copy of the threadRef back in it's old position
                            p.splice(p[index].prevPos-adj, 0, {id: sender});
                            bump = 1;
                          }
                          // remove the threadRef from it's current position
                          console.log(index - bump);
                          p.splice(index - bump, 1);
                        }
                      } else {t[j].body = req.body.text;} // overwrite
                      j-=2;
                    }
                  }
                } else {  //not overwriting/removing, so push a new message
                  user.threads[sender].push({
                    sender: 1,  // change this < for groups
                    date: tmrw,
                    body: req.body.text,
                    unread: false,
                  });
                  // and update the threadListPending
                  if (!newThread) {
                    var cur = findThreadInPending(user, sender);
                    console.log("ln 389", p.cur);
                    if (cur) {p.splice(cur, 1);}                //remove the old
                  // it *should* always find an old one to remove, but in the event
                  //   of a glitch such that it doesn't I'd rather not overwrite
                  //   something else and make the problem worse
                    p.push({id: sender, prevPos: cur})  //add the new
                  }
                }
                db.collection('users').updateOne({_id: recipient},
                  {$set: user },
                  function(err, user) {
                    if (err) {throw err;}
                    else {res.send('success');}
                  }
                );
              }
            });
          }
        }
      );
    }
  });
})
*/

// new user sign up
app.post('/register', function(req, res){
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
  // look up current active/valid secret access codes
  db.collection('users').findOne({ username: "admin" }
  , { codes:1 }
  , function (err, admin) {
    if (err) {throw err;}
    // check if the provided code is a match
    else if (!admin.codes[secretCode]) {return res.send("invalid code");}
    else {
      //check if there is already a user w/ that name
      db.collection('users').findOne({username: username}, {}, function (err, user) {
        if (err) throw err;
    		if (user) {return res.send("name taken");}
    		else {
          var today = pool.getCurDate();
          db.collection('users').insertOne({
            username: username,
            password: password,
            email: email,
            posts: {},
            postList: [],
            postListPending: [],
            postListUpdatedOn: today,
            threads: {},
            threadList: [],
            threadListPending: [],
            threadListUpdatedOn: today,
            following: {},
            followers: {},
            about: {
              oldText: "",
              newText: "",
              updatedOn: today,
            },
            iconURI: {
              oldLink: "",
              newLink: "",
              updatedOn: today,
            },
            settings: {},
          }, {}, function (err, result) {
            if (err) {throw err;}
            newID = ObjectId(result.insertedId);
            bcrypt.hash(password, 10, function(err, passHash){
              if (err) {throw err;}
              else {
                bcrypt.hash(password, 10, function(err, emailHash){
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
                          // remove the code from the admin stash so it can't be used again
                          delete admin.codes[secretCode];
                          db.collection('users').updateOne({_id: admin._id},
                            {$set: admin },
                            function(err, user) {
                              if (err) {throw err;}
                              else {return res.send("success");}
                            }
                          );
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
    }
  });
});

// log in
app.post('/login', function(req, res) {
  var username = req.body.username;
	var password = req.body.password;
  // validate
  var x = pool.userNameValidate(username);
  if (x) {return res.send(x);}
  var y = pool.passwordValidate(password);
  if (y) {return res.send(y);}
      // is that ^ neccesary????
  var nope = "invalid username/password"
  db.collection('users').findOne({username: username}
    , { password:1 }
    , function (err, user) {
      //check if username is registered
      if (!user) {return res.send(nope);}
      else {
        // Match Password
        bcrypt.compare(password, user.password, function(err, isMatch){
          if (err) {throw err;}
          else if (isMatch) {
            req.session.user = { _id: ObjectId(user._id) };
            return res.send("success");
          } else {
            return res.send(nope);
          }
        });
      }
  });
});

// logout
app.get('/logout', function(req, res){
  req.session.user = null;
  res.send("success");
});

// admin
app.get('/shavingmypiano', function(req, res){
  if (req.session.user) {
    db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
    , {_id:0, username:1, codes:1}
    , function (err, user) {
      if (err) {throw err;}
      else if (!user || user.username !== "admin") {res.send('but there was nobody home');}
      else {
        res.render('admin', { codes: user.codes });
      }
    });
  } else {
    res.send('but there was nobody home');
  }
});
app.post('/shavingmypiano', function(req, res){
  if (req.session.user) {
    var userID = ObjectId(req.session.user._id)
    db.collection('users').findOne({_id: userID}
    , {_id:0, username:1, codes:1}
    , function (err, admin) {
      if (err) {throw err;}
      else if (!admin || admin.username !== "admin") {
        res.send('but there was nobody home');
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
    });
  } else {
    res.send('but there was nobody home');
  }
});

// view all of a users posts
app.get('/:username', function(req, res) {
  db.collection('users').findOne({username: req.params.username}
  , { posts:1, postList:1, postListPending:1}
  //TODO: later make that^ also return "settings" to check post visibility permissions
  , function (err, user) {
    if (err) {throw err; res.send(err);}
    else {
      if (!user) {
        res.send('but there was nobody home');
      } else {
        checkFreshness(user, "post");
        var posts = [];
        var pL = user.postList;
        var tmrw = pool.getCurDate(-1);
        // reverse the array to order posts by most recent?
        for (var i = 0; i < pL.length; i++) {
          if (pL[i].date !== tmrw) {
            posts.push({
              body: pool.checkForCuts(user.posts[pL[i].date][pL[i].num].body, user._id+"-"+pL[i].date+"-"+pL[i].num),
              date: pL[i].date,
            });
          }
        }
        if (req.session.user) {
          db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
          , {_id:0, username:1}
          , function (err, user) {
            if (err) {throw err;}
            else {
              res.render('layout', {
                pagename:'user',
                authorName:req.params.username,
                posts:posts,
                username: user.username,
              });
            }
          });
        } else {
          res.render('layout', {
            pagename:'user',
            authorName:req.params.username,
            posts:posts,
          });
        }
      }
    }
  });
});

// view a single post
app.get('/:username/:num', function(req, res) {
  db.collection('users').findOne({username: req.params.username}
  , { posts:1, postList:1, postListPending:1 }
  //TODO: later make that^ also return "settings" to check post visibility permissions
  , function (err, author) {
    if (err) {throw err; res.send(err);}
    else {
      if (author) {
        checkFreshness(author, "post");
        var i = req.params.num;
        if (author.postList[i] && author.postList[i].date !== pool.getCurDate(-1)) {
          var postBody = pool.checkForCuts(author.posts[author.postList[i].date][author.postList[i].num].body, author._id+"-"+author.postList[i].date+"-"+author.postList[i].num)
          if (req.session.user) {
            db.collection('users').findOne({_id: ObjectId(req.session.user._id)}
            , {_id:0, username:1}
            , function (err, user) {
              if (err) {throw err;}
              else {
                res.render('layout', {
                  pagename:'post',
                  authorName:req.params.username,
                  body: postBody,
                  date: author.postList[i].date,
                  username: user.username,
                });
              }
            });
          } else {
            res.render('layout', {
              pagename:'post',
              authorName:req.params.username,
              body: postBody,
              date: author.postList[i].date,
            });
          }
        } else {res.send("not even a single thing");}
      } else {res.send('but there was nobody home');}
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
