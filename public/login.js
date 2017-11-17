
var $ = function (id) {return document.getElementById(id);}

var show = function (up) {
  if (up === true) {$('up').classList.remove('removed');}
  else {$('in').classList.remove('removed');}
  $('inOrUp').classList.add('removed');
}

var back = function () {
  $('up').classList.add('removed');
  $('in').classList.add('removed');
  $('inOrUp').classList.remove('removed');
  $('loginError').innerHTML = "";
}

var sign = function(inOrUp) {
  if (inOrUp === 'in') {
    var data = {
      username: $('in-name-input').value,
      password: $('in-pass-input').value,
    }
  } else {
    var data = {
      username: $('name-input').value,
      password: $('pass-input').value,
    }
  }
  if (data.username === "") {
    $('loginError').innerHTML = 'need a name!';
    return;
  }
  if (/[^a-z0-9-_]/.test(data.username)) {
    $('loginError').innerHTML = 'invalid name, a-z0-9-_ only';
    return;
  }
  if (data.username.length > 30) {
    $('loginError').innerHTML = 'name is too long';
    return;
  }
  if (data.password === "") {
    $('loginError').innerHTML = 'need a pass!';
    return;
  }
  if (/[^a-zA-Z0-9-_!@#$%&*?]/.test(data.password)) {
    $('loginError').innerHTML = 'invalid pass, a-zA-Z0-9-_!@#$%&*? only';
    return;
  }
  if (inOrUp === 'in') {
    var url = 'login';
  } else {
    var url = 'register';
    data.email = $('email-input').value;

    //TODO validate email format

    if (data.password !== $('pass-input-two').value) {
      $('loginError').innerHTML = 'passwords are not the same';
      return;
    }
  }
  ajaxCall(url, 'POST', data, function(json) {
    if (json === 'success') {
      location.reload();
    } else {
      $('loginError').innerHTML = json;
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
