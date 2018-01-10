"use strict";

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
      username: $('in-name-input').value.toLowerCase(),
      password: $('in-pass-input').value,
    }
  } else {
    var data = {
      username: $('name-input').value,
      password: $('pass-input').value,
    }
  }
  // validate
  var x = pool.userNameValidate(data.username);
  if (x) {
    $('loginError').innerHTML = x;
    return false;
  }
  var y = pool.passwordValidate(data.password);
  if (y) {
    $('loginError').innerHTML = y;
    return false;
  }
  if (inOrUp === 'in') {
    var url = 'login';
  } else {
    var url = 'register';
    data.email = $('email-input').value;
    data.secretCode = $('secret-code').value;
    if (data.password !== $('pass-input-two').value) {
      $('loginError').innerHTML = 'passwords are not the same';
      return false;
    }
  }
  ajaxCall(url, 'POST', data, function(json) {
    if (json === 'success') {
      location.reload();
    } else {
      $('loginError').innerHTML = json;
    }
  });
  return false;
}
