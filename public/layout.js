"use strict";

var $ = function (id) {return document.getElementById(id);}

var accountSettings = function (x) { // open/close
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
    $("remove-pic").classList.add('removed');
  }
  var picURL = $('pic-url').value;
  ajaxCall('/changePic', 'POST', {url:picURL}, function(json) {
    if (json === 'success') {
      $("user-pic").setAttribute('src', picURL);
      $("user-pic").classList.remove('removed');
      $("remove-pic").classList.remove('removed');
    } else {
      alert(json);
    }
  });
}

var changeColor = function (jscolor, type) {
  var sheet = document.styleSheets[1];
  switch (type) {
    case 0:                 //post background
      var selector = ".post, .message, .editor, #account-settings, button, #prompt";
      var attribute = "background-color";
      break;
    case 1:                 //text
      var selector = "body, h1, input, .post, .message, .editor, #account-settings, button";
      var attribute = "color";
      for (var i = sheet.cssRules.length-1; i > -1; i--) {
        if (sheet.cssRules[i].selectorText === 'button') {
          sheet.deleteRule(i);
          i = -1;
        }
      }
      sheet.insertRule("button {border-color: #"+jscolor+";}", sheet.cssRules.length);
      break;
    case 2:                 //link text
      var selector = "a, a.visited";
      var attribute = "color";
      break;
    case 3:                 //background
      var selector = "body, h1, input";
      var attribute = "background-color";
      break;
  }
  for (var i = sheet.cssRules.length-1; i > -1; i--) {
    if (sheet.cssRules[i].selectorText === selector) {
      sheet.deleteRule(i);
      i = -1;
    }
  }
  sheet.insertRule(selector+" {"+attribute+": #"+jscolor+";}", sheet.cssRules.length);
  $('save-colors').classList.remove('hidden');
}

var saveColors = function () {
  var data = {};
  data.postBackground = $('post-background-color').style.backgroundColor;
  data.text = $('text-color').style.backgroundColor;
  data.linkText = $('link-text-color').style.backgroundColor;
  data.background = $('background-color').style.backgroundColor;
  ajaxCall('/saveColors', 'POST', data, function(json) {
    if (json === 'success') {
      $('save-colors').classList.add('hidden');
    } else {
      alert(json);
    }
  });
}

var signOut = function() {
  ajaxCall('/logout', 'GET', {}, function(json) {
    if (json === 'success') {
      location.reload();
    } else {
      alert("something has gone wrong... please screenshot this and show staff", json);
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
