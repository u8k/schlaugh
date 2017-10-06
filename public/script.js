"use strict";

var submit = function () {
  var data = {text: CKEDITOR.instances.editor.getData()}
  var url = '/'
  ajaxCall(url, 'POST', data, function(json) {
    if (json === 'success') {
      console.log('yisss');
      //location.reload();
    } else {
      console.log('error submitting post');
      //document.getElementById('loginError').innerHTML = json;
    }
  });
}

var dateOffset = 0;
//date helper function
var getCurDate = function (minusDays) {
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
  dateOffset += dir;
  if (dateOffset === 0) {
    document.getElementById("day-forward").classList.add("hidden");
  } else if (dateOffset === 1 && dir === 1) {
    document.getElementById("day-forward").classList.remove("hidden");
  }

  var data = {date: getCurDate(dateOffset)}
  document.getElementById('date-display').innerHTML = getCurDate(dateOffset);
  var url = 'posts'
  ajaxCall(url, 'POST', data, function(json) {
    var parent = document.getElementById('posts');
    var children = parent.childNodes.length;
    for (var i = 0; i < children; i++) {
      parent.removeChild(parent.childNodes[0]);
    }
    json = JSON.parse(json)
    if (json.posts.length === 0) {
      var post = document.createElement("div");
      post.setAttribute('class', 'post');
      var text = document.createElement("p");
      text.appendChild(document.createTextNode("No Posts!"));
      post.appendChild(text);
      parent.appendChild(post);
    } else {
      for (var i = 0; i < json.posts.length; i++) {
        var post = document.createElement("div");
        post.setAttribute('class', 'post');
        var text = document.createElement("p");
        text.innerHTML = json.posts[i].body;
        post.appendChild(text);
        var author = document.createElement("p");
        author.appendChild(document.createTextNode(json.posts[i].author));
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
  /*
  if (currentPanel) {
    document.getElementById('options-button').onclick = function(){showPanel(currentPanel);};
  }
  */
}

var sign = function(inOrUp) {
  var data = {
    username: document.getElementById('nameInput').value,
    password: document.getElementById('passInput').value
  }
  if (data.username === "") {
    document.getElementById('loginError').innerHTML = 'need a name!';
    return;
  }
  if (data.password === "") {
    document.getElementById('loginError').innerHTML = 'need a pass!';
    return;
  }
  if (inOrUp === 'in') {var url = 'login'}
  else {var url = 'register'}
  ajaxCall(url, 'POST', data, function(json) {
    if (json === 'success') {
      location.reload();
    } else {
      document.getElementById('loginError').innerHTML = json;
    }
  });
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

function ajaxCall(url, method, data, callback) {
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

window.onkeyup = function(e) {
  var key = e.keyCode;
  //console.log(key);
  switch (key) {
    case 32:  // space
      //action();
      break;
    case 65:  // A

      break;
    case 83:  // S

      break;
  }
}
