"use strict";

var glo = {
  dateOffset: -1, //negative into the future
}

var $ = function (id) {return document.getElementById(id);}

var submitPost = function (remove) {  //also handles editing and deleting
  if (remove) {var text = null;}
  else {var text = CKEDITOR.instances.postEditor.getData();}
  var data = {text: text, remove:remove }
  ajaxCall("/", 'POST', data, function(json) {
    if (json === 'success') {
      if (remove) {
        CKEDITOR.instances.postEditor.setData("");
        $('pending-status').innerHTML = "no pending post";
        $('delete-pending-post').classList.add("removed");
      } else {
        $('pending-status').innerHTML = "pending post for tomorrow:";
        $('delete-pending-post').classList.remove("removed");
      }
      $('pending-post').innerHTML = text;
    } else {
      console.log('error submitting post');
      //$('loginError').innerHTML = json;
    }
  });
}

var showThread = function (index) {
  var oldex = glo.activeThreadIndex;
  if (oldex === index) {return;}
  $(index+'-mutual').classList.add('highlight');
  var conf = true;
  //hide current thread, if there is one
  if (oldex !== undefined) {
    $(oldex+'-mutual').classList.remove('highlight');
    $(oldex+"-thread").classList.add('removed');
    // check for and ask about unsaved text
    var text = CKEDITOR.instances.messageEditor.getData();
    if (text !== "") {
      var last = glo.threads[oldex].thread[glo.threads[oldex].thread.length-1];
      if (!last || last.date !== getCurDate(-1) || text !== last.body) {
        conf = confirm("lose current unposted text?");
      }
    }
  }
  if (conf) {
    var pending = "";
    //check the last message for a current pending message
    var last = glo.threads[index].thread[glo.threads[index].thread.length-1];
    if (last && last.date === getCurDate(-1)) {
      pending = last.body;
      $('delete-message').classList.remove('removed');
    } else {
      $('delete-message').classList.add('removed');
    }
    CKEDITOR.instances.messageEditor.setData(pending);
    $('messageWriter').classList.remove('removed');
    glo.activeThreadIndex = index;
    $(index+"-thread").classList.remove('removed');
  }
}

var submitMessage = function (remove) {  //also handles editing and deleting
  var text = CKEDITOR.instances.messageEditor.getData();
  if (text === "") {return;}
  var i = glo.activeThreadIndex;
  var data = {
    recipient: glo.threads[i]._id,
    text: text,
    remove: remove,
  };
  ajaxCall('inbox', 'POST', data, function(json) {
    if (json === 'success') {
      //check the last message for a current pending message
      var len = glo.threads[i].thread.length-1;
      var last = glo.threads[i].thread[len];
      if (last && last.date === getCurDate(-1)) {
        if (remove) {
          //is the current pending the ONLY message?
          if (glo.threads[i].thread.length === 1) {
            $(i+"-"+(len)+"-message-body").innerHTML = "no messages"
            $(i+"-"+(len)+"-message-date").innerHTML = ""
          } else {
            $(i+"-"+(len)+"-message").parentNode.removeChild($(i+"-"+(len)+"-message"));
          }
          $('delete-message').classList.add('removed');
          CKEDITOR.instances.messageEditor.setData("");
          glo.threads[i].thread.splice(len,1);
        } else {
          last.body = text;
          $(i+"-"+(len)+"-message-body").innerHTML = text;
          $('delete-message').classList.remove('removed');
        }
      } else {
        $('delete-message').classList.remove('removed');
        glo.threads[i].thread.push({
          incoming: false,
          date: getCurDate(-1),
          body: text,
        });
        //is this the first message in the thread?
        if (glo.threads[i].thread.length === 1) {
          $(i+"-0-message-body").innerHTML = text;
          $(i+"-0-message-date").innerHTML = getCurDate(-1);
        } else {
          createMessage(i, len+1);
        }
      }
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

var changeDay = function (dir) {
  var date = getCurDate(glo.dateOffset);
  if ($('posts-for-'+ date)) {
    $('posts-for-'+ date).classList.add('removed');
  }
  glo.dateOffset += dir;
  if (glo.dateOffset === 0) {
    $("day-forward").classList.add("hidden");
  } else if (glo.dateOffset === 1 && dir === 1) {
    $("day-forward").classList.remove("hidden");
  }
  date = getCurDate(glo.dateOffset);
  $('date-display').innerHTML = date;
  // check if we already have the post data for that day
  if ($('posts-for-'+date)) {
    $('posts-for-'+date).classList.remove('removed');
  } else {
    // we don't, so make the ajax call
    var data = {date: date};
    var url = 'posts'
    ajaxCall(url, 'POST', data, function(json) {
      var bucket = document.createElement("div");
      bucket.setAttribute('class', 'post-bucket');
      bucket.setAttribute('id', 'posts-for-'+date);
      $('posts').appendChild(bucket);
      json = JSON.parse(json)
      if (json.length === 0) {
        var post = document.createElement("div");
        post.setAttribute('class', 'post');
        var text = document.createElement("p");
        text.innerHTML = "No Posts!";
        post.appendChild(text);
        bucket.appendChild(post);
      } else {
        for (var i = 0; i < json.length; i++) {
          var post = document.createElement("div");
          post.setAttribute('class', 'post');
          var text = document.createElement("p");
          text.innerHTML = json[i].body;
          post.appendChild(text);
          var author = document.createElement("p");
          author.innerHTML = json[i].author;
          post.appendChild(author);
          bucket.appendChild(post);
        }
      }
    });
  }
}

var showPanel = function(panelName) {
  closePanel();
  $(panelName).classList.remove('removed');
  $('panel-backing').classList.remove('removed');
}

var closePanel = function(currentPanel) {
  $('panel-backing').classList.add('removed');
  $('user-info-panel').classList.add('removed');
  if ($('inbox-panel')) {
    $('inbox-panel').classList.add('removed');
  }
  /*
  if (currentPanel) {
    $('options-button').onclick = function(){showPanel(currentPanel);};
  }
  */
}

var signOut = function() {
  var url = 'logout'
  ajaxCall(url, 'GET', '', function(json) {
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
  var orrientation = "outgoing";
  if (glo.threads[i].thread[j]) {
    var text = glo.threads[i].thread[j].body;
    var date = glo.threads[i].thread[j].date;
    if (glo.threads[i].thread[j].incoming === true) {orrientation = "incoming";}
  } else {
    var text = "no messages";
    var date = '';
  }
  if (date === getCurDate(-1)) {var orrientation = "pending"}
  var message = document.createElement("div");
  message.setAttribute('class', 'message '+orrientation);
  message.setAttribute('id', i+"-"+j+"-message");
  $(i+"-thread").appendChild(message);
  var body = document.createElement("div");
  body.setAttribute('class', 'message-body');
  body.setAttribute('id', i+"-"+j+"-message-body");
  body.innerHTML = text;
  message.appendChild(body);
  var dateStamp = document.createElement("div");
  dateStamp.setAttribute('class', 'message-date');
  dateStamp.setAttribute('id', i+"-"+j+"-message-date");
  dateStamp.innerHTML = date;
  message.appendChild(dateStamp);
}

changeDay(1);

//fetch thread data for inbox
(function () {
  ajaxCall('inbox', 'GET', "", function(json) {
    json = JSON.parse(json);
    glo.threads = json;
    var parent = $("mutuals-list");
    if (json.length === 0) {
      var mutual = document.createElement("div");
      mutual.setAttribute('class', 'mutual');
      mutual.setAttribute('id', '0-mutual');
      mutual.innerHTML = "No Friends!"
      parent.appendChild(mutual);
      //TODO? add an onclick function that pops up a message explaining 'mutuals'???
    } else {
      for (var i = 0; i < json.length; i++) {
        //populate list of mutuals
        var mutual = document.createElement("div");
        mutual.setAttribute('class', 'mutual');
        mutual.setAttribute('id', i+'-mutual');
        mutual.innerHTML = json[i].name;
        (function (index) {
          mutual.onclick = function(){showThread(index);}
        })(i);
        parent.appendChild(mutual);
        //thread for each mutual
        var thread = document.createElement("div");
        thread.setAttribute('class', 'thread removed');
        thread.setAttribute('id', i+'-thread');
        $('thread-box').appendChild(thread);
        //populate threads with messages
        createMessage(i, 0);
        for (var j = 1; j < json[i].thread.length; j++) {
          createMessage(i, j);
        }
      }
    }
  });
})();
