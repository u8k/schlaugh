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

var makeKeys = function (pass, callback) {
  openpgp.initWorker({ path:'openpgp.worker.min.js' });
  openpgp.generateKey({
    userIds: [{ name:'bob', email:'bob@example.com' }],
    curve: "curve25519",
    passphrase: pass,
  }).then(function(key) {
    callback({
      privKey: key.privateKeyArmored,
      pubKey: key.publicKeyArmored,
    });
  });
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
    json = JSON.parse(json);
    if (json[0]) {    //password is good, do they need keys?
      if (json[1]) {  // (no)

        //        MODIFY HERE

        location.reload();
      } else {        //they need keys
        makeKeys(data.password, function (keys) {
          ajaxCall('keys', 'POST', keys, function(json) {

            // check for 'success'? what kind of error could happen, and what
            // would we do about it?

            //    MODIFY HERE

            location.reload();
          });
        });
      }
    } else {
      $('loginError').innerHTML = json[1];
    }
  });
  return false;
}
