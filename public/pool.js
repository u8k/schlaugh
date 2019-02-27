"use strict";

// a file for functions that are used on both front and back end

(function(exports){

  exports.runTests = function (tests) {
    var results = [];
    for (var i = 0; i < tests.length; i++) {
      if (tests[i][0] !== tests[i][1]) {
        tests[i][0] = i;
        results.push(tests[i]);
      }
    }
    if (results.length === 0) {
      results = "all "+tests.length+" tests are passing!"
    }
    return results;
  }

  exports.userNameValidate = function (x) {
    if (x === undefined || x === "") {
      return "empty string is not a valid username, sorry";
    }
    if (x.length > 30) {
      return 'name is too long';
    }
    if (/[^a-z0-9-_]/.test(x)) {
      return 'invalid name<br><br> valid characters include letters a-z(lowercase), numbers 0-9, "-" and "_"';
    }
    else {return false;}  // false indicates good, no problems
  }

  exports.passwordValidate = function (x) {
    if (x === "") {
      return "empty string is not a valid password, sorry"
    }
    if (x.length > 40) {
      return 'password is too long';
    }
    if (/[^ a-zA-Z0-9-_!@#$%&*?]/.test(x)) {
      return 'invalid password<br><br> valid characters include letters A-Z(upper/lowercase), numbers 0-9, spaces, and the following special characters: -_!@#$%&*?';
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

  exports.cleanseInputText = function (string) { // returns an "imgList" and the cleaned text
    if (typeof string !== "string") {return {error:"not string"}}
    string = string.replace(/\r?\n|\r/g, '<br>');

    string = string.replace(/  /g, ' &nbsp;');

    var buttonUp = function (bOpen, iOpen, aOpen, uOpen, sOpen, cutOpen, codeOpen, imgList) {
      if (aOpen) {string += "</a>"}
      if (bOpen) {string += "</b>"}
      if (iOpen) {string += "</i>"}
      if (uOpen) {string += "</u>"}
      if (sOpen) {string += "</s>"}
      if (cutOpen) {string += "</cut>"}
      if (codeOpen) {string += "</code>"}
      return [imgList, string];
    }

    var removeExtraBreak = function (pos) {
      if (string.substr(pos+1,4) === "<br>") {
        string = string.substr(0,pos)+string.substr(pos+4);
      }
    }

    var recurse = function (pos, bOpen, iOpen, aOpen, uOpen, sOpen, cutOpen, codeOpen, imgList) {
      var next = string.substr(pos).search(/</);
      if (next === -1) {return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, cutOpen, codeOpen, imgList);}
      else {
        pos += next;
        if (string.substr(pos+1,2) === "b>" && !bOpen) {
          bOpen = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "i>" && !iOpen) {
          iOpen = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "u>" && !uOpen) {
          uOpen = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "s>" && !sOpen) {
          sOpen = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "l>") {
          pos += 2;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,2) === "c>") {
          pos += 2;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,2) === "r>") {
          pos += 2;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "cut>" && !cutOpen) {
          cutOpen = true;
          pos += 4;
        } else if (string.substr(pos+1,5) === "code>" && !codeOpen) {
          codeOpen = true;
          pos += 5;
        } else if (string.substr(pos+1,6) === "quote>") {
          pos += 6;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "li>") {
          pos += 3;
        } else if (string.substr(pos+1,3) === "ul>") {
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "ol>") {
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "/b>") {
          bOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/i>") {
          iOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/u>") {
          uOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/s>") {
          sOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/l>") {
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "/c>") {
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "/r>") {
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,5) === "/cut>") {
          cutOpen = false;
          pos += 5;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,6) === "/code>") {
          codeOpen = false;
          pos += 6;
        } else if (string.substr(pos+1,7) === "/quote>") {
          pos += 7;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "/li>") {
          pos += 4;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "/ul>") {
          pos += 4;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "/ol>") {
          pos += 4;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "br>") {
          pos += 3;
        } else if (string.substr(pos+1,4) === "br/>") {
          pos += 4;
        } else if (string.substr(pos+1,8) === 'a href="') {
          aOpen = true;
          pos += 8;
          var qPos = string.substr(pos+1).search(/"/);
          if (qPos === -1) {
            string += '">';
            return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, cutOpen, codeOpen, imgList);
          }
          else {pos += qPos;}
          if (string[pos+2] !== ">") {
            string = string.substr(0,pos+2) + '>' + string.substr(pos+2);
          }
          else {pos += 1;}
        } else if (string.substr(pos+1,3) === "/a>") {
          aOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,9) === 'img src="') {
          pos += 9;
          var qPos = string.substr(pos+1).search(/"/);
          if (qPos === -1) {
            imgList.push(string.substr(pos+1))
            string += '">';
            return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, cutOpen, codeOpen, imgList);
          }
          else {
            imgList.push(string.substr(pos+1,qPos))
            pos += qPos;
          }
          if (string[pos+2] !== ">") {
            string = string.substr(0,pos+2) + '>' + string.substr(pos+2);
          }
          else {pos += 2;}
          removeExtraBreak(pos);
        } else {  // the found tag is not on the sanctioned list, so replace it
          string = string.substr(0,pos) + '&lt;' + string.substr(pos+1);
        }
        return recurse(pos+1, bOpen, iOpen, aOpen, uOpen, sOpen, cutOpen, codeOpen, imgList);
      }
    }
    return recurse(0, false, false, false, false, false, false, false, []);
  }


}(typeof exports === 'undefined' ? this.pool = {} : exports));
