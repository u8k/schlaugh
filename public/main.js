"use strict";

var glo = {
  dateOffset: -1, //negative into the future
}

var switchPanel = function (panelName) {
  $('inbox-panel').classList.add('removed');
  $('posts-panel').classList.add('removed');
  $('write-panel').classList.add('removed');
  $(panelName).classList.remove('removed');
}

var prompt = function (options) {
  // options is an object that can include props for
  //  'label', 'placeholder', 'value', 'password'(boolean), 'callback'(function)
  if (!options) {  //close the prompt
    $("prompt").classList.add("hidden");
    $("prompt-backing").classList.add("hidden");
  } else {
    $("prompt").classList.remove("hidden");
    $("prompt-backing").classList.remove("hidden");
    //
    $("prompt-label").innerHTML = options.label;
    if (options.placeholder) {$("prompt-input").placeholder = options.placeholder;}
    if (options.value) {$("prompt-input").value = options.value;}
    else {$("prompt-input").value = "";}
    if (options.password) {$("prompt-input").type = "password";}
    else {$("prompt-input").type = "";}
    setCursorPosition($("prompt-input"), 0, $("prompt-input").value.length)
    //
    $("prompt-submit").onclick = function(){
      prompt(false);
      options.callback($("prompt-input").value);
    }
    var exit = function(){
      options.callback(null);
      prompt(false);
    }
    $("prompt-close").onclick = exit;
    $("prompt-backing").onclick = exit;
  }
}

var changeDay = function (dir) { // load and display all posts for a given day
  //don't allow changing day if currently loading
  if (glo.loading) {return;}
  else {glo.loading = true;}
  var date = pool.getCurDate(glo.dateOffset);
  // hide the previously displayed day
  if ($('posts-for-'+ date)) {
    $('posts-for-'+ date).classList.add('removed');
  }
  glo.dateOffset += dir;
  date = pool.getCurDate(glo.dateOffset);
  // hide/unhide nextDay button as needed
  if (glo.dateOffset === 0) {
    $("day-forward").classList.add("hidden");
  } else if (glo.dateOffset === 1 && dir === 1) {
    $("day-forward").classList.remove("hidden");
  }
  $('date-display').innerHTML = date;
  // check if we already have the post data for that day
  if ($('posts-for-'+date)) {
    $('posts-for-'+date).classList.remove('removed');
    glo.loading = false;
  } else {
    // we don't, so make the ajax call
    $('loading').classList.remove('removed');
    ajaxCall('posts', 'POST', {date: date}, function(json) {
      var bucket = document.createElement("div");
      bucket.setAttribute('class', 'post-bucket');
      bucket.setAttribute('id', 'posts-for-'+date);
      json = JSON.parse(json)
      // if there are no posts for the day
      if (json.length === 0) {
        var post = document.createElement("div");
        post.innerHTML = "Not Schlaugh!";
        bucket.appendChild(post);
      } else {
        // create temporary randomizing helper array
        var rando = [];
        for (var i = 0; i < json.length; i++) {
          rando.push(i);
        }
        // create posts
        while(rando.length !== 0) {
          var i = Math.floor(Math.random() * (rando.length));
          var post = document.createElement("div");
          post.setAttribute('class', 'post');
          // pic
          if (json[rando[i]].authorPic !== "") {
            var authorPic = document.createElement("img");
            authorPic.setAttribute('src', json[rando[i]].authorPic);
          } else {
            var authorPic = document.createElement("div");
          }
          var authorPicBox = document.createElement("a");
          authorPicBox.setAttribute('href', '/'+json[rando[i]].author);
          post.appendChild(authorPicBox);
          authorPic.setAttribute('class', 'author-pic');
          authorPicBox.appendChild(authorPic);
          // author/meta text
          var authorBox = document.createElement("div");
          authorBox.setAttribute('class', 'meta-text');
          var author = document.createElement("a");
          author.setAttribute('href', '/'+json[rando[i]].author);
          author.setAttribute('class', 'author');
          author.innerHTML = "<clicky>"+json[rando[i]].author+"</clicky>";
          authorBox.appendChild(author);
          authorBox.appendChild(document.createElement("br"));
          // message button, if user !== author
          if (json[rando[i]].author !== glo.username) {
            // and only if the author has a public key
            if (json[rando[i]].key) {
              var message = document.createElement("clicky");
              //message.setAttribute('class', 'meta-text');
              message.innerHTML = "message";
              (function (index) {
                message.onclick = function(){
                  //look for a thread btwn the author and logged in user
                  checkForThread({
                    name: json[index].author,
                    _id: json[index]._id,
                    key: json[index].key,
                    image: json[index].authorPic,
                  });
                }
              })(rando[i]);
              authorBox.appendChild(message);
            }
          }
          post.appendChild(authorBox);
          // actual post body
          var text = document.createElement("text");
          text.setAttribute('class', 'body-text');
          text.innerHTML = json[rando[i]].body;
          post.appendChild(text);
          bucket.appendChild(post);
          //remove the current index refference from the randomizing helper array
          rando.splice(i,1);
        }
      }
      $('loading').classList.add('removed');
      $('posts').appendChild(bucket);
      glo.loading = false;
    });
  }
}

var showWriter = function (kind) {
  $(kind+'-writer').classList.remove('removed');
  $(kind+'-preview').classList.add('removed');
}
var hideWriter = function (kind) {
  $(kind+'-writer').classList.add('removed');
  $(kind+'-preview').classList.remove('removed');
}

var submitPost = function (remove) {  //also handles editing and deleting
  if (remove) {
    if (!confirm("you sure you want me should delete it?")) {return;}
    var text = null;
  }
  else {var text = $('postEditor').value;}
  if (text === "") {
    hideWriter('post');
    return;
    }
  var data = {text:text, remove:remove}
  ajaxCall("/", 'POST', data, function(json) {
    json = JSON.parse(json)
    if (!json[0]) {
      alert(json[1]);
      return;
    }
    if (remove) {
      $('pending-status').innerHTML = "no pending post";
      $('delete-pending-post').classList.add("removed");
      $('pending-post').classList.add("removed");
      $('write-post-button').innerHTML = "new post";
    } else {
      $('pending-status').innerHTML = "your pending post for tomorrow:";
      $('delete-pending-post').classList.remove("removed");
      $('pending-post').classList.remove("removed");
      $('write-post-button').innerHTML = "edit post";
    }
    $('pending-post').innerHTML = pool.checkForCuts(json[1], 'pending');
    var x = json[1].replace(/<br>/g, '\n');
    $('postEditor').innerHTML = x;
    $('postEditor').value = x;
    hideWriter('post');
  });
}

var getCursorPosition = function (elem) {
	// IE < 9 Support
	if (document.selection) {
		elem.focus();
		var range = document.selection.createRange();
		var rangelen = range.text.length;
		range.moveStart ('character', -elem.value.length);
		var start = range.text.length - rangelen;
		return {'start': start, 'end': start + rangelen };
	}
	// IE >=9 and other browsers
	else if (elem.selectionStart || elem.selectionStart === 0) {
		return {'start': elem.selectionStart, 'end': elem.selectionEnd };
	} else {
		return {'start': 0, 'end': 0};
	}
}
var setCursorPosition = function (elem, start, end) {
	// IE >= 9 and other browsers
	if (elem.setSelectionRange) {
		elem.focus();
		elem.setSelectionRange(start, end);
	}
	// IE < 9
	else if (elem.createTextRange) {
		var range = elem.createTextRange();
		range.collapse(true);
		range.moveEnd('character', end);
		range.moveStart('character', start);
		range.select();
	}
}

var styleText = function (s, src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end + 3;
  var y = area.value;
  area.value = y.slice(0, a)+'<'+s+'>'+y.slice(a, b-3)+'</'+s+'>'+y.slice(b-3);
  setCursorPosition(area, a+2+s.length, b-1+s.length);
}
var hyperlink = function (src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var linkText;
  if (a !== b) {linkText = y.substr(a,b-a)}
  prompt({
    label: "target url:",
    placeholder: "http://www.butts.cash/",
    callback: function(target) {
      if (target !== null) {
        prompt({
          placeholder: "butts.cash",
          value: linkText,
          label: "link text:",
          callback: function(linkText) {
            if (linkText !== null) {
              if (target.substr(0,4) !== "http") {
                target = "http://" + target;
              }
              area.value = y.slice(0, a)+'<a href="'+target+'">'+linkText+'</a>'+y.slice(b);
              var bump = a+target.length+linkText.length+15;
              setCursorPosition(area, bump, bump);
            }
          }
        });
      }
    }
  });
}
var image = function (src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  prompt({
    label: "image url:",
    value:"https://i.imgur.com/hDEXSt7.jpg",
    callback: function(target) {
      if (target !== null) {
        area.value = y.slice(0, a)+'<img src="'+target+'">'+y.slice(b);
        var bump = a+target.length+12;
        setCursorPosition(area, bump, bump);
      }
    }
  });
}
var insertCut = function (src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var cutText = "more";
  if (a !== b) {cutText = y.substr(a,b-a)}
  prompt({
    label:"text:",
    value:cutText,
    callback: function(cutText) {
      if (cutText != null) {
        area.value = y.slice(0, a)+'<cut>'+cutText+'</cut>'+y.slice(b);
        var bump = a+cutText.length+11;
        setCursorPosition(area, bump, bump);
      }
    }
  });
}


var closeThread = function () { // returns true for threadClosed, false for NO
  if (glo.activeThreadIndex === undefined) {return true;}
  var i = glo.activeThreadIndex;
  //does the open thread have unsaved text?
  var text = $('messageEditor').value;
  if (text !== "") {
    var last = glo.threads[i].thread[glo.threads[i].thread.length-1];
    if (!last || last.date !== pool.getCurDate(-1) || text !== last.body.replace(/<br>/g, '\n')) {
      //is it okay to lose that unsaved text?
      if (!confirm("lose current unsaved message text?")) {
        //and then take to the thread?

        return false;
      }
    }
  }
  //hide current thread
  glo.activeThreadIndex = undefined;
  $("back-arrow").classList.add('removed');
  $(i+"-thread").classList.add('removed');
  $("message-writer").classList.add('removed');
  $("message-preview").classList.add('removed');
  $("thread-title").classList.add('removed');
  $("mark-unread").classList.add('removed');
  $("thread-list").classList.remove('removed');
  return true;
}

var openThread = function (i) {
  // close/check for an already open thread
  if (closeThread()) {
    var actuallyOpenTheThread = function (i) {
      updatePendingMessage(i);
      if (glo.threads[i].unread) {
        ajaxCall('unread', 'POST', {_id:glo.threads[i]._id, bool:false}, function(json) {})
        glo.threads[i].unread = false;
        $(i+'-thread-name').classList.remove("special");
        glo.unread--;
        if (glo.unread === 0) {
          var elems = document.getElementsByClassName('message-panel-title');
          for (var j = 0; j < elems.length; j++) {elems[j].classList.remove("special");}
        }
      }
      glo.activeThreadIndex = i;
      $("thread-list").classList.add('removed');
      $("mark-unread").classList.remove('removed');
      $(i+"-thread").classList.remove('removed');
      $("message-preview").classList.remove('removed');
      $("back-arrow").classList.remove('removed');
      $("thread-title").innerHTML = glo.threads[i].name;
      $("thread-title").classList.remove('removed');
    }
    //
    if (glo.threads[i].locked) {
      unlock( function () {
        actuallyOpenTheThread(i);
      });
    } else {actuallyOpenTheThread(i);}
  }
}

var markUnread = function () {
  var i = glo.activeThreadIndex;
  glo.threads[i].unread = true;
  $(i+'-thread-name').classList.add("special");
  closeThread();
  glo.unread++;
  ajaxCall('unread', 'POST', {_id:glo.threads[i]._id, bool:true}, function(json) {})
  var elems = document.getElementsByClassName('message-panel-title');
  for (var j = 0; j < elems.length; j++) {elems[j].classList.add("special");}
}

var updatePendingMessage = function (index) {
  var pending = "";
  var last = glo.threads[index].thread[glo.threads[index].thread.length-1];
  // does the thread have a pending message?
  if (last && last.date === pool.getCurDate(-1)) {
    pending = last.body;
    $('delete-message').classList.remove('removed');
    $('pending-message').classList.remove('removed');
    $('write-message-button').innerHTML = "edit message";
    $('pending-message-status').innerHTML = "pending:";
    $('pending-message').innerHTML = pool.checkForCuts(pending, 'pending'+glo.threads[index]._id);
  } else {
    $('delete-message').classList.add('removed');
    $('pending-message').classList.add('removed');
    $('write-message-button').innerHTML = "new message";
    $('pending-message-status').innerHTML = "no pending message";
    $('pending-message').innerHTML = "";
  }
  $('messageEditor').value = pending.replace(/<br>/g, '\n');
  //$('messageEditor').value = pending;
  hideWriter('message');
}

var submitMessage = function (remove) {  //also handles editing and deleting
  if (remove && !confirm("you sure you want me should delete it?")) {return;}
  var text = $('messageEditor').value;
  if (text === "") {return;}
  var i = glo.activeThreadIndex;
  if (!glo.threads[i].key) {return alert("you cannot message the person you are trying to message, you shouldn't have this option, sorry this is a bug please note all details and tell staff sorry");}
  //
  var encryptAndSend = function () {
    encrypt(text, glo.keys.pubKey, glo.threads[i].key, function (encSenderText, encRecText) {
      var data = {
        recipient: glo.threads[i]._id,
        encSenderText: encSenderText,
        encRecText: encRecText,
        remove: remove,
      };
      ajaxCall('inbox', 'POST', data, function(json) {
        json = JSON.parse(json)
        if (!json[0]) {
          alert(json[1]);
          return;
        }
        var len = glo.threads[i].thread.length-1;
        var last = glo.threads[i].thread[len];
        // is the thread's last message already a pending message?
        if (last && last.date === pool.getCurDate(-1)) {
          if (remove) {glo.threads[i].thread.splice(len,1);}
          else {last.body = text;}    //overwrite
        } else {
          glo.threads[i].thread.push({
            inbound: false,
            date: pool.getCurDate(-1),
            body: text,
          });
        }
        updatePendingMessage(i);
      });
    });
  }

  // cleanse and image validate
  var x = pool.cleanseInputText(text);
  text = x[1];
  if (x[0].length !== 0) {
    ajaxCall('image', 'POST', x[0], function(json) {
      json = JSON.parse(json);
      if (!json[0]) {
        alert(json[1]);
        return;
      } else {encryptAndSend();}
    });
  } else {encryptAndSend();}
}

var checkForThread = function (user) {
  // if the thread already exists, open it
  if (glo.threadRef[user._id] !== undefined) {openThread(glo.threadRef[user._id]);}
  else {  //create a new thread
    user.thread = [];
    var index = glo.threads.length;
    glo.threadRef[user._id] = index;
    glo.threads.push(user);
    if (index === 0) {
      $("thread-list").removeChild($("thread-list").childNodes[0]);
    }
    createThread(index, true);
    openThread(index);
  }
  switchPanel('inbox-panel');
  //showWriter('message');
}

var createMessage = function (i, j) {
  var x = glo.threads[i].thread[j];
  if (!x || (x.date === pool.getCurDate(-1) && j === 0)) {
    // show "no messages"
    var message = document.createElement("div");
    message.innerHTML = "no messages";
    $(i+"-thread").appendChild(message);
  } else if (x.date === pool.getCurDate(-1)) {
    // do nothing
    return;
  } else {  // show the message
    var orri = "inbound";
    if (x.inbound === false) {orri = "outbound";}
    var message = document.createElement("div");
    message.setAttribute('class', 'message '+orri);
    //message.setAttribute('id', i+"-"+j+"-message");
    $(i+"-thread").appendChild(message);
    var dateStamp = document.createElement("div");
    dateStamp.setAttribute('class', 'meta-text');
    dateStamp.innerHTML = x.date;
    message.appendChild(dateStamp);
    var body = document.createElement("div");
    body.setAttribute('class', 'message-body');
    body.innerHTML = pool.checkForCuts(x.body, glo.threads[i]._id+'-'+x.date+orri);
    //body.innerHTML = pool.checkForCuts(x.body, glo.threads[i]._id+'-'+x.date);
    message.appendChild(body);
  }
}

var createThread = function (i, top) {
  //creates the name and the box where messages will go
  glo.threadRef[glo.threads[i]._id] = i;
  var nameBox = document.createElement("div");
  var name = document.createElement("clicky");
  name.innerHTML = glo.threads[i].name;
  name.setAttribute('class', 'thread-name');
  name.setAttribute('id', i+'-thread-name');
  (function (index) {
    name.onclick = function(){openThread(index);}
  })(i);
  nameBox.appendChild(name);
  // append the new thread name to either top or bottom
  var parent = $("thread-list");
  if (top) {parent.insertBefore(nameBox, parent.childNodes[0]);}
  else {parent.appendChild(nameBox);}
  //
  if (glo.threads[i].unread) {
    $(i+'-thread-name').classList.add("special");
    glo.unread++;
  }
  //thread for each name
  var thread = document.createElement("div");
  thread.setAttribute('class', 'thread removed');
  thread.setAttribute('id', i+'-thread');
  $('thread-box').appendChild(thread);
  //
  populateThread(i);
}

var populateThread = function (i) {
  if (!glo.threads[i].locked) {
    for (var j = glo.threads[i].thread.length-1; j > 0; j--) {
      createMessage(i, j);
    }
    createMessage(i, 0);
  }
}

var fetchData = function () {
  glo.username = $("user-name").innerHTML;
  glo.unread = 0;
  ajaxCall('inbox', 'GET', "", function(json) {
    //keys are created at sign in, this will force out people who are already in
    // ,with a persistent login cookie, such that they will have to sign in and make keys
    json = JSON.parse(json);
    if (!json.keys) {return signOut();}
    glo.threads = json.threads;
    glo.keys = json.keys;
    glo.threadRef = {};
    //
    var parent = $("thread-list");
    if (json.threads.length === 0) {
      var name = document.createElement("div");
      name.innerHTML = "no threads!";
      parent.appendChild(name);
    } else {
      for (var i = 0; i < json.threads.length; i++) {
        createThread(i);
      }
      if (glo.unread > 0) {
        var elems = document.getElementsByClassName('message-panel-title');
        for (var i = 0; i < elems.length; i++) {elems[i].classList.add("special");}
      }
    }
  });
}


openpgp.initWorker({ path:'openpgp.worker.min.js' });

var encrypt = function (text, senderPubKey, recipientPubKey, callback) {
  openpgp.encrypt({
    data: text,
    publicKeys: openpgp.key.readArmored(senderPubKey).keys,
  }).then(function(encryptedDataSender) {
    openpgp.encrypt({
      data: text,
      publicKeys: openpgp.key.readArmored(recipientPubKey).keys,
    }).then(function(encryptedDataRecipient) {
      callback(encryptedDataSender.data, encryptedDataRecipient.data);
    });
  });
}

var decryptPrivKey = function (pass, privKey) {
  var key = openpgp.key.readArmored(privKey).keys[0];
  try {
    key.decrypt(pass);
  } catch(err) {
    alert("EEErrrorrr?????");
  }
  return key;
}

var decrypt = function (text, key, callback) {
  var options = {
    message: openpgp.message.readArmored(text),
    privateKeys: [key]
  };
  openpgp.decrypt(options).then(decryptedMessage => {
    callback(decryptedMessage.data);
  });
}

var unlock = function (callback) {
  prompt({
    label:"Please re-enter your password to decrypt your messages",
    placeholder:"mimbulus mimbletonia",
    password:true,
    callback: function(password) {
      if (password === null) {return;}
      var data = {
        username: glo.username,
        password: password,
      }
      ajaxCall('login', 'POST', data, function(json) {
        json = JSON.parse(json);
        if (json[0]) {      //password is good, do they need keys?
          if (json[1]) {  // (no)
            var key = decryptPrivKey(data.password, glo.keys.privKey);
            // each thread
            var threadCount = glo.threads.length;
            var msgCount = {};
            for (var i = 0; i < glo.threads.length; i++) {
              if (!glo.threads[i].locked) {threadCount--;}
              else {
                // each message
                msgCount[i] = glo.threads[i].thread.length;
                for (var j = 0; j < glo.threads[i].thread.length; j++) {
                  (function (i,j) {
                    decrypt(glo.threads[i].thread[j].body, key, function (text) {
                      glo.threads[i].thread[j].body = text;
                      msgCount[i]--;
                      if (msgCount[i] === 0) {
                        glo.threads[i].locked = false;
                        populateThread(i);
                        threadCount--;
                        if (threadCount === 0) {
                          callback();
                        }
                      }
                    })
                  })(i,j)
                }
              }
            }
          } else {     //they don't have keys... somehow???
          alert("HMM the thing that is occurring should not be possible, and yet here we are. SORRY! We're gonna log you out and hope that when you sign back in everything is all better")
        }
      } else {
        alert(json[1]);
        signOut();
      }
    });
    }
  });
}
