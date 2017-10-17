"use strict";

var glo = {
  dateOffset: -1, //negative into the future
}

var submitPost = function (remove) {  //also handles editing and deleting
  var data = {text: CKEDITOR.instances.postEditor.getData(), remove:remove }
  var url = '/'
  ajaxCall(url, 'POST', data, function(json) {
    if (json === 'success') {
      // refresh view
    } else {
      console.log('error submitting post');
      //document.getElementById('loginError').innerHTML = json;
    }
  });
}

var showThread = function (index) {
  document.getElementById('messageWriter').classList.remove('removed');
  glo.activeThreadIndex = index;
  console.log(glo.threads[index].thread);
  // visually indicate active thread
}

var submitMessage = function (remove) {
  var data = {
    recipient: glo.threads[glo.activeThreadIndex]._id,
    text: CKEDITOR.instances.messageEditor.getData(),
    remove: remove,
  };
  ajaxCall('inbox', 'POST', data, function(json) {
    if (json === 'success') {
      glo.threads[glo.activeThreadIndex].thread.push({
        incoming: false,
        date: getCurDate(-1),
        body: CKEDITOR.instances.messageEditor.getData(),
      });
      // refresh view
    } else {
      console.log('error submitting message',json);
      //document.getElementById('loginError').innerHTML = json;
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
  glo.dateOffset += dir;
  if (glo.dateOffset === 0) {
    document.getElementById("day-forward").classList.add("hidden");
  } else if (glo.dateOffset === 1 && dir === 1) {
    document.getElementById("day-forward").classList.remove("hidden");
  }
  var data = {date: getCurDate(glo.dateOffset)}
  document.getElementById('date-display').innerHTML = getCurDate(glo.dateOffset);
  var url = 'posts'
  ajaxCall(url, 'POST', data, function(json) {
    var parent = document.getElementById('posts');
    var children = parent.childNodes.length;
    for (var i = 0; i < children; i++) {
      parent.removeChild(parent.childNodes[0]);
    }
    json = JSON.parse(json)
    if (json.length === 0) {
      var post = document.createElement("div");
      post.setAttribute('class', 'post');
      var text = document.createElement("p");
      text.appendChild(document.createTextNode("No Posts!"));
      post.appendChild(text);
      parent.appendChild(post);
    } else {
      for (var i = 0; i < json.length; i++) {
        var post = document.createElement("div");
        post.setAttribute('class', 'post');
        var text = document.createElement("p");
        text.innerHTML = json[i].body;
        post.appendChild(text);
        var author = document.createElement("p");
        author.appendChild(document.createTextNode(json[i].author));
        post.appendChild(author);
        parent.appendChild(post);
      }
    }
  });
}

var showPanel = function(panelName) {
  closePanel();
  document.getElementById(panelName).classList.remove('removed');
  document.getElementById('panel-backing').classList.remove('removed');
}

var closePanel = function(currentPanel) {
  document.getElementById('panel-backing').classList.add('removed');
  document.getElementById('user-info-panel').classList.add('removed');
  if (document.getElementById('inbox-panel')) {
    document.getElementById('inbox-panel').classList.add('removed');
  }
  /*
  if (currentPanel) {
    document.getElementById('options-button').onclick = function(){showPanel(currentPanel);};
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

changeDay(1);

//fetch thread data for inbox
(function () {
  ajaxCall('inbox', 'GET', "", function(json) {
    json = JSON.parse(json)
    console.log(json);
    glo.threads = json;
    var parent = document.getElementById("mutuals-list");
    if (json.length === 0) {
      var mutual = document.createElement("div");
      mutual.setAttribute('class', 'mutual');
      var text = document.createElement("p");
      text.appendChild(document.createTextNode("No Friends!"));
      mutual.appendChild(text);
      parent.appendChild(mutual);
    } else {
      for (var i = 0; i < json.length; i++) {
        var mutual = document.createElement("div");
        mutual.setAttribute('class', 'mutual');
        mutual.innerHTML = json[i].name;
        (function (index) {
          mutual.onclick = function(){showThread(index);}
        })(i);
        parent.appendChild(mutual);
      }
    }
  });
})();
