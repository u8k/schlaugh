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
    if (x.length > 64) {
      return 'name is too long';
    }
    if (/[^a-zA-Z0-9-_]/.test(x)) {
      return 'invalid name<br><br> valid characters include letters, numbers, "-" and "_"';
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
      return 'invalid password<br><br> valid characters include letters(upper and lowercase), numbers, spaces, and the following special characters: -_!@#$%&*?';
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
    if (typeof string !== "string") {return "";}

    var buttonUp = function (b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList) {
      if (b) {string += "</b>"}
      if (i) {string += "</i>"}
      if (a) {string += "</a>"}
      if (u) {string += "</u>"}
      if (s) {string += "</s>"}
      if (cut) {string += "</cut>"}
      if (code) {string += "</code>"}
      if (ascii) {string += "</ascii>"}
      if (secret) {string += "</secret>"}
      if (spoil) {string += "</spoil>"}
      if (li) {string += "</li>"}
      if (ul) {string += "</ul>"}
      if (ol) {string += "</ol>"}
      if (l) {string += "</l>"}
      if (r) {string += "</r>"}
      if (c) {string += "</c>"}
      if (quote) {string += "</quote>"}
      if (note) {string += "</note>"}
      return [imgList, string, linkList];
    }

    var removeExtraBreak = function (pos) {
      if (string.substr(pos+1,4) === "<br>") {
        string = string.substr(0,pos)+string.substr(pos+4);
      }
    }

    var recurse = function (pos, b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList) {
      var next = string.substr(pos).search(/</);
      if (next === -1) {return buttonUp(b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList);}
      else {
        pos += next;
        if (string.substr(pos+1,2) === "b>" && !b) {
          b = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "i>" && !i) {
          i = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "u>" && !u) {
          u = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "s>" && !s) {
          s = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "l>") {
          l = true;
          pos += 2;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,2) === "c>") {
          c = true;
          pos += 2;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,2) === "r>") {
          r = true;
          pos += 2;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "cut>" && !cut) {
          cut = true;
          pos += 4;
        } else if (string.substr(pos+1,5) === "code>" && !code) {
          code = true;
          pos += 5;
        } else if (string.substr(pos+1,6) === "ascii>") {
          ascii = true;
          pos += 6;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,7) === "secret>") {
          secret = true;
          pos += 7;
        } else if (string.substr(pos+1,6) === "spoil>") {
          spoil = true;
          pos += 6;
        } else if (string.substr(pos+1,6) === "quote>") {
          quote = true;
          pos += 6;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "li>") {
          li = true;
          pos += 3;
        } else if (string.substr(pos+1,3) === "ul>") {
          ul = true;
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "ol>") {
          ol = true;
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "/b>") {
          b = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/i>") {
          i = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/u>") {
          u = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/s>") {
          s = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/l>") {
          l = false;
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "/c>") {
          c = false;
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "/r>") {
          r = false;
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,5) === "/cut>") {
          cut = false;
          pos += 5;
        } else if (string.substr(pos+1,6) === "/code>") {
          code = false;
          pos += 6;
        } else if (string.substr(pos+1,7) === "/ascii>") {
          ascii = false;
          pos += 7;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,8) === "/secret>") {
          secret = false;
          pos += 8;
        } else if (string.substr(pos+1,7) === "/spoil>") {
          spoil = false;
          pos += 7;
        } else if (string.substr(pos+1,7) === "/quote>") {
          quote = false;
          pos += 7;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "/li>") {
          li = false;
          pos += 4;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "/ul>") {
          ul = false;
          pos += 4;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "/ol>") {
          ol = false;
          pos += 4;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,3) === "br>") {
          pos += 3;
        } else if (string.substr(pos+1,3) === "hr>") {
          pos += 3;
          removeExtraBreak(pos);
        } else if (string.substr(pos+1,4) === "br/>") {
          pos += 4;
        } else if (string.substr(pos+1,8) === 'a href="') {
          a = true;
          pos += 8;
          var qPos = string.substr(pos+1).search(/"/);
          if (qPos === -1) {
            string += '">';
            return buttonUp(b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList);
          } else {
            if (string.substr(pos+1, 1) !== "/") {
              if (string.substr(pos+1, 4) !== "http") {
                string = string.substr(0,pos+1) + 'http://' + string.substr(pos+1);
                qPos += 7;
              }
              var link = string.substr(pos+1, qPos);
              linkList.push(link);
            }
            pos += qPos;
          }
          if (string[pos+2] !== ">") {
            string = string.substr(0,pos+2) + '>' + string.substr(pos+2);
          }
          else {pos += 1;}
        } else if (string.substr(pos+1,3) === "/a>") {
          a = false;
          pos += 3;
        } else if (string.substr(pos+1,15) === 'note linkText="') {
          note = true;
          pos += 15;
          var closePos = string.substr(pos+1).search(/">/);
          if (closePos === -1) {
            string += '">';
            return buttonUp(b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList);
          }
          //else {pos += qPos;}
          /*
          // commenting this out for now, it was blocking having images nested in noteButts
          // it is currently unclear to me how necesary it is to enforce tags to be closed at all
          if (string[pos+qPos+2] !== ">") {
            string = string.substr(0,pos+qPos+2) + '>' + string.substr(pos+qPos+2);
          }
          */
          //else {pos += 2;}
          removeExtraBreak(pos+closePos+2);
        } else if (string.substr(pos+1,5) === "note>") {
          note = true;
          pos += 5;
        } else if (string.substr(pos+1,6) === "/note>") {
          note = false;
          pos += 6;
        } else if (string.substr(pos+1,9) === 'img src="' || string.substr(pos+1,9) === `img src='`) {
          pos += 9;
          if (string.substr(pos,1) === "'") {
            var qPos = string.substr(pos+1).search(/'/);
            var singleQuote = true;
          } else {
            var qPos = string.substr(pos+1).search(/"/);
          }
          if (qPos === -1) {
            imgList.push(string.substr(pos+1));
            if (singleQuote) {
              string += `'>`;
            } else {
              string += '">';
            }
            return buttonUp(b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList);
          } else {
            imgList.push(string.substr(pos+1,qPos))
            pos += qPos+1;
          }
          if (string.substr(pos+1,8) === ' title="' || string.substr(pos+1,8) === ` title='`) {
            pos += 8;
            if (string.substr(pos,1) === "'") {
              var qPos = string.substr(pos+1).search(/'/);
              var singleQuote = true;
            } else {
              var qPos = string.substr(pos+1).search(/"/);
            }
            if (qPos === -1) {
              imgList.push(string.substr(pos+1));
              if (singleQuote) {string += `'>`;}
              else {string += '">';}
              return buttonUp(b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList);
            } else {
              pos += qPos+1;
            }
          }
          if (string.substr(pos+1,6) === ' alt="' || string.substr(pos+1,6) === ` alt='`) {
            pos += 6;
            if (string.substr(pos,1) === "'") {
              var qPos = string.substr(pos+1).search(/'/);
              var singleQuote = true;
            } else {
              var qPos = string.substr(pos+1).search(/"/);
            }
            if (qPos === -1) {
              imgList.push(string.substr(pos+1));
              if (singleQuote) {string += `'>`;}
              else {string += '">';}
              return buttonUp(b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList);
            } else {
              pos += qPos+1;
            }
          }
          if (string[pos+1] !== ">") {
            string = string.substr(0,pos+1) + '>' + string.substr(pos+1);
          }
          else {pos += 1;}
          removeExtraBreak(pos);



        } else {  // the found tag is not on the sanctioned list, so kill it
          string = string.substr(0,pos) + '&lt;' + string.substr(pos+1);
        }
        return recurse(pos+1, b, i, a, u, s, cut, code, ascii, secret, spoil, li, ul, ol, l, r, c, quote, note, imgList, linkList);
      }
    }
    return recurse(0, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, [], []);
  }

}(typeof exports === 'undefined' ? this.pool = {} : exports));
