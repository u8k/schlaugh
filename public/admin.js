"use strict";

var tests = [ //array of arrays, each inner array contains two statements that are supposed to be equal
  [pool.userNameValidate(), "need a name!", "pool.userNameValidate()"],
  [pool.userNameValidate(0), false, "pool.userNameValidate(0)"],
  [pool.userNameValidate('6as5df4'), false, "pool.userNameValidate(0)"],
]

var displayTests = function (results) {
  if (results.length === 0) {
    $('test-title').innerHTML = "all "+tests.length+" tests are passing!"
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
