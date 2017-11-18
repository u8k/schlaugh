"use strict";

var glo = {
  dateOffset: -1, //negative into the future
}

var $ = function (id) {return document.getElementById(id);}

var submitPost = function (remove) {  //also handles editing and deleting
  if (remove) {var text = null;}
  else {var text = CKEDITOR.instances.postEditor.getData();}
  if (text === "") {return;}
  var data = {text: text, remove:remove }
  ajaxCall("/", 'POST', data, function(json) {
    if (json === 'success') {
      if (remove) {
        CKEDITOR.instances.postEditor.setData("");
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
      $('pending-post').innerHTML = text;
      hideWriter('post');
    } else {
      console.log('error submitting post');
      //$('loginError').innerHTML = json;
    }
  });
}

var showWriter = function (kind) {
  $(kind+'-writer').classList.remove('removed');
  $(kind+'-preview').classList.add('removed');
}
var hideWriter = function (kind) {
  $(kind+'-writer').classList.add('removed');
  $(kind+'-preview').classList.remove('removed');
}

var closeThread = function () {
  var i = glo.activeThreadIndex;
  //does the open thread have unsaved text?
  var text = CKEDITOR.instances.messageEditor.getData();
  if (text !== "") {
    var last = glo.threads[i].thread[glo.threads[i].thread.length-1];
    if (!last || last.date !== getCurDate(-1) || text !== last.body) {
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
  if (last && last.date === getCurDate(-1)) {
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
      if (last && last.date === getCurDate(-1)) {
        if (remove) {glo.threads[i].thread.splice(len,1);}
        else {last.body = text;}    //overwrite
      } else {
        glo.threads[i].thread.push({
          sender: 0,
          date: getCurDate(-1),
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

var getCurDate = function (minusDays) { //date helper function
  if (!minusDays) {minusDays = 0}
  var now = new Date(new Date().getTime() - 9*3600*1000 - minusDays*24*3600000);   //UTC offset by -9
  var year = now.getUTCFullYear();
  var mon = now.getUTCMonth()+1;
  if (mon < 10) {mon = "0"+mon}
  var date = now.getUTCDate();
  if (date < 10) {date = "0"+date}
  return year+"-"+mon+"-"+date;
}

var changeDay = function (dir) { // load and display all posts for a given day
  //don't allow changing day if currently loading
  if (glo.loading) {return;}
  else {glo.loading = true;}
  var date = getCurDate(glo.dateOffset);
  // hide the previously displayed day
  if ($('posts-for-'+ date)) {
    $('posts-for-'+ date).classList.add('removed');
  }
  glo.dateOffset += dir;
  date = getCurDate(glo.dateOffset);
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
          })(i);
          post.appendChild(author);
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
    });
  }
  glo.loading = false;
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

var switchPanel = function (panelName) {
  $('inbox-panel').classList.add('removed');
  $('posts-panel').classList.add('removed');
  $('write-panel').classList.add('removed');
  $(panelName).classList.remove('removed');
}

var accountSettings = function () {
  console.log("burp");
}

var signOut = function() {
  var url = 'logout'
  ajaxCall(url, 'GET', {}, function(json) {
    if (json === 'success') {
      location.reload();
    } else {
      console.log(json);
    }
  });
}

var ajaxCall = function(url, method, data, callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.open(method, url, true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var json = (xhttp.responseText);
      callback(json);
    }
  }
  xhttp.send(JSON.stringify(data));
}

var createMessage = function (i, j) {
  var x = glo.threads[i].thread[j];
  if (!x || (x.date === getCurDate(-1) && j === 0)) {
    // show "no messages"
    var message = document.createElement("div");
    message.innerHTML = "no messages";
    $(i+"-thread").appendChild(message);
  } else if (x.date === getCurDate(-1)) {
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

changeDay(1);

//fetch thread data for inbox
(function () {
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
        populateThread(i)
      }
    }
  });
})();
