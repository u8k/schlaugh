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

  exports.isStringValidDate = function (string) {
    if (typeof string !== 'string') {return false;}
    if (string.length !== 10 || string[4] !== "-" || string[7] !== "-" || !exports.isNumeric(string.slice(0,4)) || !exports.isNumeric(string.slice(5,7)) || !exports.isNumeric(string.slice(8,10))) {
      return false;
    } else {
      return true;
    }
  }

  exports.isNumeric = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  exports.screenInputTextForImagesAndLinks = function (string) {
    if (typeof string !== "string") {return "";}

    var buttonUp = function (imgList, linkList) {
      return {string:string ,imgList:imgList, linkList:linkList};
    }

    var recurse = function (pos, imgList, linkList) {
      var next = string.substr(pos).search(/</);
      if (next === -1) {return buttonUp(imgList, linkList);}
      else {
        pos += next;

        // links
        if (string.substr(pos+1,2) === 'a ') {
          if (string.substr(pos+1,8) !== 'a href="') {
            string = string.substr(0,pos) + '&lt;' + string.substr(pos+1);
            pos += 3;
          } else {
            pos += 8;
            var qPos = string.substr(pos+1).search(/"/);
            if (qPos === -1) {
              string += '">';
              return buttonUp(imgList, linkList);
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
          }

        // images
        } else if (string.substr(pos+1,3) === 'img') {
          if (string.substr(pos+1,9) !== 'img src="' && string.substr(pos+1,9) !== `img src='`) {

            string = string.substr(0,pos) + '&lt;' + string.substr(pos+1);
            pos += 3;

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
              return buttonUp(imgList, linkList);
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
                return buttonUp(imgList, linkList);
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
                return buttonUp(imgList, linkList);
              } else {
                pos += qPos+1;
              }
            }
            if (string[pos+1] !== ">") {
              string = string.substr(0,pos+1) + '>' + string.substr(pos+1);
            }
            else {pos += 1;}
          }
        }

        return recurse(pos+1, imgList, linkList);
      }
    }

    return recurse(0, [], []);
  }

}(typeof exports === 'undefined' ? this.pool = {} : exports));
