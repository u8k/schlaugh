"use strict";

var glo = {
  dateOffset: -1, //negative into the future
}

var switchPanel = function (panelName) {
  //$('inbox-panel').classList.add('removed');
  $('posts-panel').classList.add('removed');
  $('write-panel').classList.add('removed');
  $(panelName).classList.remove('removed');
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
        post.innerHTML = "No Posts!";
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
          //
          if (json[rando[i]].authorPic !== "") {
            var authorPicBox = document.createElement("a");
            authorPicBox.setAttribute('href', '/'+json[rando[i]].author);
            post.appendChild(authorPicBox);
            var authorPic = document.createElement("img");
            authorPic.setAttribute('src', json[rando[i]].authorPic);
            authorPic.setAttribute('class', 'author-pic');
            authorPicBox.appendChild(authorPic);
          }
          // temporary simple author link while threads are down
          var authorBox = document.createElement("div");
          authorBox.setAttribute('class', 'meta-text');
          var author = document.createElement("a");
          author.setAttribute('href', '/'+json[rando[i]].author);
          author.innerHTML = "<clicky>"+json[rando[i]].author+"</clicky>";
          /* thread stuff that we'll put back later

          var author = document.createElement("div");
          author.setAttribute('class', 'meta-text');
          author.innerHTML = "<clicky>"+json[rando[i]].author+"</clicky>";
          // click handler for author name
          (function (index) {
            author.onclick = function(){
              //is this a post of the logged in user's own?
              if (json[index].author === glo.user) {
                accountSettings();
              } else {
                //look for a thread btwn the author and logged in user
                checkForThread({
                  names: [json[index].author],
                  _ids: [json[index]._id],
                });
              }
            }
          })(rando[i]);
          */

          authorBox.appendChild(author);
          post.appendChild(authorBox);
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

var styleText = function (s) {
  var area = $('postEditor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end + 3;
  var y = area.value;
  area.value = y.slice(0, a)+'<'+s+'>'+y.slice(a, b-3)+'</'+s+'>'+y.slice(b-3);
  setCursorPosition(area, a+2+s.length, b-1+s.length);
}
var hyperlink = function () {
  var area = $('postEditor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var linkText = "butts.cash"
  if (a !== b) {linkText = y.substr(a,b-a)}
  var target = prompt("target url:", "http://www.butts.cash/");
  if (target !== null) {
    linkText = prompt("link text:", linkText);
    if (linkText !== null) {
      if (target.substr(0,4) !== "http") {
        target = "http://" + target;
        console.log(target);
      }
      area.value = y.slice(0, a)+'<a href="'+target+'">'+linkText+'</a>'+y.slice(b);
    }
  }
}
var image = function () {
  var area = $('postEditor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var target = prompt("image url:", "https://68.media.tumblr.com/708a562ba83f035812b6363558a79947/tumblr_o9h0kjFeB51vymizko1_1280.jpg");
  if (target !== null) {
    area.value = y.slice(0, a)+'<img src="'+target+'">'+y.slice(b);
  }
}
var insertCut = function () {
  var area = $('postEditor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var linkText = "more"
  if (a !== b) {linkText = y.substr(a,b-a)}
  linkText = prompt("text:", linkText);
  if (linkText != null) {
      area.value = y.slice(0, a)+'<cut>'+linkText+'</cut>'+y.slice(b);
  }
}

/*
var closeThread = function () {
  var i = glo.activeThreadIndex;
  //does the open thread have unsaved text?
  var text = CKEDITOR.instances.messageEditor.getData();
  if (text !== "") {
    var last = glo.threads[i].thread[glo.threads[i].thread.length-1];
    if (!last || last.date !== pool.getCurDate(-1) || text !== last.body) {
      //is it okay to lose that unsaved text?
      if (!confirm("lose current unposted text?")) {return;}
    }
  }
  //hide current thread
  $("back-arrow").classList.add('removed');
  $("thread-list").classList.remove('removed');
  $(i+"-thread").classList.add('removed');
  $("message-writer").classList.add('removed');
  glo.activeThreadIndex = undefined;
  $("message-preview").classList.add('removed');
  $("thread-title").innerHTML = "threads";
}

var openThread = function (i) {
  // check for an already open thread
  if (glo.activeThreadIndex !== undefined) {closeThread();}
  updatePendingMessage(i);
  glo.activeThreadIndex = i;
  $(i+"-thread").classList.remove('removed');
  $("message-preview").classList.remove('removed');
  $("back-arrow").classList.remove('removed');
  $("thread-list").classList.add('removed');
  $("thread-title").innerHTML = glo.threads[i].names;
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
    $('pending-message').innerHTML = pending;
  } else {
    $('delete-message').classList.add('removed');
    $('pending-message').classList.add('removed');
    $('write-message-button').innerHTML = "new message";
    $('pending-message-status').innerHTML = "no pending message";
    $('pending-message').innerHTML = "";
  }
  CKEDITOR.instances.messageEditor.setData(pending);
  hideWriter('message');
}

var submitMessage = function (remove) {  //also handles editing and deleting
  var text = CKEDITOR.instances.messageEditor.getData();
  if (text === "") {return;}
  var i = glo.activeThreadIndex;
  var data = {
    recipient: glo.threads[i]._ids[0],  //CHANGE THIS FOR GROUPS
    text: text,
    remove: remove,
  };
  ajaxCall('inbox', 'POST', data, function(json) {
    if (json === 'success') {
      var len = glo.threads[i].thread.length-1;
      var last = glo.threads[i].thread[len];
      // is the thread's last message already a pending message?
      if (last && last.date === pool.getCurDate(-1)) {
        if (remove) {glo.threads[i].thread.splice(len,1);}
        else {last.body = text;}    //overwrite
      } else {
        glo.threads[i].thread.push({
          sender: 0,
          date: pool.getCurDate(-1),
          body: text,
        });
      }
      updatePendingMessage(i);
    } else {
      console.log('error submitting message',json);
      //$('loginError').innerHTML = json;
    }
  });
}

var checkForThread = function (x) {
  // if the thread already exists, open it
  if (glo.threadRef[x.names] !== undefined) {openThread(glo.threadRef[x.names]);}
  else {  //create a new thread
    x.thread = [];
    var index = glo.threads.length;
    glo.threadRef[x.names] = index;
    glo.threads.push(x);
    if (index === 0) {
      $("thread-list").removeChild($("thread-list").childNodes[0]);
    }
    populateThread(index);
    openThread(index);
  }
  switchPanel('inbox-panel');
  showWriter('message');
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
    var orri = "incoming";
    if (x.sender === 0) {orri = "outgoing";}
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
    body.innerHTML = x.body;
    message.appendChild(body);
  }
}

var populateThread = function (i) {
  var parent = $("thread-list");
  glo.threadRef[glo.threads[i].names] = i;
  //populate thread list
  var name = document.createElement("div");
  name.innerHTML = glo.threads[i].names;
  name.setAttribute('class', 'clicky');
  (function (index) {
    name.onclick = function(){openThread(index);}
  })(i);
  parent.appendChild(name);
  //thread for each name
  var thread = document.createElement("div");
  thread.setAttribute('class', 'thread removed');
  thread.setAttribute('id', i+'-thread');
  $('thread-box').appendChild(thread);
  //populate threads with messages
  createMessage(i, 0);
  for (var j = 1; j < glo.threads[i].thread.length; j++) {
    createMessage(i, j);
  }
}

var fetchThreads = function () {
  glo.user = $("user-name").innerHTML;
  ajaxCall('inbox', 'GET', "", function(json) {
    json = JSON.parse(json);
    glo.threads = json;
    glo.threadRef = {};
    var parent = $("thread-list");
    if (json.length === 0) {
      var name = document.createElement("div");
      name.innerHTML = "no threads!";
      parent.appendChild(name);
    } else {
      for (var i = 0; i < json.length; i++) {
        populateThread(i);
      }
    }
  });
}

fetchThreads();
*/

changeDay(1);
$('pending-post').innerHTML = pool.checkForCuts($('pending-post').innerHTML, 'pending');
