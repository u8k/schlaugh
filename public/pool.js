"use strict";

(function(exports){

  exports.runTests = function (tests) {
    var results = [];
    for (var i = 0; i < tests.length; i++) {
      if (tests[i][0] !== tests[i][1]) {
        tests[i][0] = i;
        results.push(tests[i]);
      }
    }
    return results;
  }

  exports.userNameValidate = function (x) {
    if (x === undefined || x === "") {
      return "need a name!";
    }
    if (/[^a-z0-9-_]/.test(x)) {
      return 'invalid name, a-z0-9-_ only';
    }
    if (x.length > 30) {
      return 'name is too long';
    }
    else {return false;}  // false indicates good, no problems
  }

  exports.passwordValidate = function (x) {
    if (x === "") {
      return "need a pass!"
    }
    if (/[^ a-zA-Z0-9-_!@#$%&*?]/.test(x)) {
      return 'invalid pass, a-zA-Z0-9-_!@#$%&*? only';
    }
    else {return false;}  // false indicates good, no problems
  }

  exports.getCurDate = function (minusDays) {
    if (!minusDays) {minusDays = 0} //negative into the future
    var now = new Date(new Date().getTime() - 9*3600*1000 - minusDays*24*3600000);   //UTC offset by -9
    var year = now.getUTCFullYear();
    var mon = now.getUTCMonth()+1;
    if (mon < 10) {mon = "0"+mon}
    var date = now.getUTCDate();
    if (date < 10) {date = "0"+date}
    return year+"-"+mon+"-"+date;
  }

  exports.checkForCuts = function (string, id) {
    var recurse = function (pos, count) {
      var next = string.substr(pos).search(/<cut>/);
      if (next === -1) {return string;}
      else {
        pos += next;
        var gap = string.substr(pos).search('</cut>');
        if (gap === -1) { //this is ONLY for backwards compat w/ the one/first day this worked differently
          var offset = 5;
          if (string[pos+4] !== '>') {offset = 6;}
          string = string.substr(0,pos)
            +"<a class='clicky' onclick='$("+'"'+id+"-"+count+'"'+").classList.remove("
            +'"'+"removed"+'"'+"); this.classList.add("+'"'+"removed"+'"'
            +");'>more</a>"+"<div class='removed' id='"+id+"-"+count+"'>"
            +string.substr(pos+offset)+"</div>";
        } else {
        string = string.substr(0,pos)
          +"<a class='clicky' onclick='$("+'"'+id+"-"+count+'"'+").classList.remove("
          +'"'+"removed"+'"'+"); this.classList.add("+'"'+"removed"+'"'+");'>"
          +string.substr(pos+5, gap-5)
          +"</a>"+"<div class='removed' id='"+id+"-"+count+"'>"
          +string.substr(pos+gap)+"</div>";
        }
      }
      return recurse(pos+1, count+1);
    }
    return recurse(0,0);
  }

}(typeof exports === 'undefined' ? this.pool = {} : exports));
