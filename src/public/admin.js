"use strict";

var tests = [ //array of arrays, each inner array contains two statements that are supposed to be equal
  [pool.userNameValidate(), "empty string is not a valid username, sorry", "pool.userNameValidate()"],
  [pool.userNameValidate(0), false, "pool.userNameValidate(0)"],
  [pool.userNameValidate('6as5df4'), false, "pool.userNameValidate('6as5df4')"],
  [pool.userNameValidate('AOEUHTS'), false, "pool.userNameValidate('AOEUHTS')"],
  [pool.userNameValidate('--__'), false, "pool.userNameValidate('--__')"],
  [pool.userNameValidate('--__?'), `invalid name<br><br> valid characters include letters, numbers, "-" and "_"`, "pool.userNameValidate('--__?')"],
]

/* this is a test of the cryption stuff, but it's asynch,
                            so figure out how to put it in the tester...
makeKeys('password', function (key) {
  encrypt("mmeessssaaggee", key.pubKey, function (crypt) {
    decrypt(crypt, decryptPrivKey('password', key.privKey), function (text) {
      console.log(text);
    });
  });
});
*/

var displayTests = function (results) {
  if (typeof results === "string") {
    $('test-title').innerHTML = results;
  } else {
    $('test-title').innerHTML = "failing tests:";
    var bucket = document.createElement("ul");
    for (var i = 0; i < results.length; i++) {
      var x = document.createElement("li");
      x.innerHTML = results[i][0] + ".  " + results[i][2]+" === "+results[i][1];
      bucket.appendChild(x);
    }
    $('test-results').appendChild(bucket);
  }
}

var getUsers = function () {
  ajaxCall('/admin/users', 'POST', {text:$('data-field').value}, function(json) {
    console.log(json);
  });
}

var getPosts = function () {
  ajaxCall('/admin/posts', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getTags = function () {
  ajaxCall('/admin/tags', 'POST', {date: $('date-of-tags').value}, function(json) {
    console.log(json);
  });
}

var getPost = function () {
  ajaxCall('/admin/getPost', 'POST', {_id: $("id-of-post-to-get").value}, function(json) {
    console.log(json);
  });
}

var editPost = function () {
  ajaxCall('/admin/editPost', 'POST', {_id: $("id-of-post-to-edit").value, input:$("editor-input").value}, function(json) {
    console.log(json);
  });
}

var resetTest = function () {
  if (!confirm("ARE YOU SURE!? You aren't doing this on production, ARE YOU?!?")) {return;}
  ajaxCall('/admin/resetTest', 'POST', {}, function(json) {
    console.log(json);
  });
}

var makePostIDs = function () {
  if (!confirm("ARE YOU SURE!? Just the once, RIGHT?!?")) {return;}
  ajaxCall('/admin/makePostIDs', 'POST', {}, function(json) {
    console.log(json);
  });
}

var allFollowStaff = function () {
  if (!confirm("ARE YOU SURE!? Just the once, RIGHT?!?")) {return;}
  ajaxCall('/admin/followStaff', 'POST', {}, function(json) {
    console.log(json);
  });
}

/*var letStaffCheat = function () {
  if (!confirm("ARE YOU SURE!? Just the once, RIGHT?!?")) {return;}
  ajaxCall('/admin/staffCheat', 'POST', {text:preCleanText($('staffCheatText').value)}, function(json) {
    console.log(json);
  });
}*/

var removeUser = function () {
  if (!confirm("ARE YOU SURE!? THIS CAN NON BE UNDONE. YOU PROBABLY DONT REALLY WANT TO DO THIS")) {return;}
  ajaxCall('/admin/removeUser', 'POST', {name: $("name-to-be-removed").value}, function(json) {
    console.log(json);
  });
}

var removePost = function () {
  if (!confirm("ARE YOU SURE!? THIS CAN NON BE UNDONE. YOU PROBABLY DONT REALLY WANT TO DO THIS")) {return;}
  ajaxCall('/admin/removePost', 'POST', {_id: $("post-to-be-removed").value}, function(json) {
    console.log(json);
  });
}

var testEmail = function () {
  ajaxCall('/admin/testEmail', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getResetCodes = function () {
  ajaxCall('/admin/resetCodes', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getUser = function () {
  ajaxCall('/admin/user', 'POST', {name: $("get-user-input").value}, function(json) {
    console.log(json);
  });
}

var createPostID = function () {
  ajaxCall('/admin/makePostIDs', 'POST', {
    name: $("author-of-post").value,
    date: $("date-of-post").value,
  }, function(json) {
    console.log(json);
  });
}

var publishFAQ = function () {
  ajaxCall('/admin/faq', 'POST', {text: preCleanText($("faq-input").value)}, function(json) {
    console.log(json);
  });
}

var fetchFAQ = function () {
  ajaxCall('/~faqText', 'GET', {}, function(json) {
    $("faq-input").value = prepTextForEditor(json.text);
  });
}

var getUserUrls = function () {
  ajaxCall('/admin/getUserUrls', 'POST', {}, function(json) {
    console.log(json);
  });
}

var getTagIndex = function () {
  ajaxCall('/admin/getTagIndex', 'POST', {}, function(json) {
    console.log(json);
  });
}

var deCaseSensitizeTags = function (daysAgo) {
  if (daysAgo === undefined) {daysAgo = 900;}
  var date = pool.getCurDate(daysAgo);
  ajaxCall('/admin/deCaseSensitizeTags', 'POST', {date:date}, function(json) {
    console.log(date);
    if (daysAgo > -2) {
      deCaseSensitizeTags(daysAgo-1);
    } else {
      console.log('done!');
    }
  });
}

var genShitPosts = function (total) {
  ajaxCall('/admin/genPosts', 'POST', {}, function(json) {
    json.progress = 0;
    json.total = total;
    genShitPostsBounce(json);
  });
}

var genShitPostsBounce = function (data) {
  ajaxCall('/admin/genPostsBounce', 'POST', data, function(json) {
    console.log(json.progress+" of "+json.total);
    if (json.progress < json.total) {
      genShitPostsBounce(json);
    } else {
      console.log('done!');
    }
  });
}

var testCreateTagIndexItem = function (obj) {
  ajaxCall('/admin/testCreateTagIndexItem', 'POST', obj, function(json) {
    console.log(json);
  });
}

var setDelayTest = function (obj) {
  ajaxCall('/admin/setDelayTest', 'POST', obj, function(json) {
    console.log(json);
  });
}

var tripDelayTest = function () {
  ajaxCall('/admin/tripDelayTest', 'POST', {}, function(json) {
    console.log(json);
  });
}
