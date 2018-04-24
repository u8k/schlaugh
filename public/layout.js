"use strict";

var $ = function (id) {return document.getElementById(id);}

var accountSettings = function (x) {
  if (x) {
    $('account-settings').classList.remove('removed');
    $('user-name').onclick = function(){accountSettings(false);}
  }
  else {
    $('account-settings').classList.add('removed');
    $('user-name').onclick = function(){accountSettings(true);}
  }
}

var submitPic = function (remove) {
  if (remove) {
    $('pic-url').value = "";
  }
  var picURL = $('pic-url').value;
  ajaxCall('/changePic', 'POST', {url:picURL}, function(json) {
    if (json === 'success') {
      $("user-pic").setAttribute('src', picURL);
      $("user-pic").classList.remove('removed');
    } else {
      alert(json);
    }
  });
}

var signOut = function() {
  var url = '/logout'
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
