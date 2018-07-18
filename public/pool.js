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
    if (results.length === 0) {
      results = "all "+tests.length+" tests are passing!"
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
    // changes cut tags into functional cuts, needs id so that every cut has a unique id tag on the front end, this will need alteration if multiple posts per user are allowed
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

  exports.cleanseInputText = function (string) { // returns an "imgList" and the cleaned text
    string = string.replace(/\r?\n|\r/g, '<br>');

    var buttonUp = function (bOpen, iOpen, aOpen, uOpen, sOpen, lOpen, cOpen, rOpen, cutOpen, imgList) {
      if (aOpen) {string += "</a>"}
      if (bOpen) {string += "</b>"}
      if (iOpen) {string += "</i>"}
      if (uOpen) {string += "</u>"}
      if (sOpen) {string += "</s>"}
      if (lOpen) {string += "</l>"}
      if (cOpen) {string += "</c>"}
      if (rOpen) {string += "</r>"}
      if (cutOpen) {string += "</cut>"}
      return [imgList, string];
    }
    var recurse = function (pos, bOpen, iOpen, aOpen, uOpen, sOpen, lOpen, cOpen, rOpen, cutOpen, imgList) {
      var next = string.substr(pos).search(/</);
      if (next === -1) {return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, lOpen, cOpen, rOpen, cutOpen, imgList);}
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
        } else if (string.substr(pos+1,2) === "l>" && !lOpen) {
          lOpen = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "c>" && !cOpen) {
          cOpen = true;
          pos += 2;
        } else if (string.substr(pos+1,2) === "r>" && !rOpen) {
          rOpen = true;
          pos += 2;
        } else if (string.substr(pos+1,4) === "cut>" && !cutOpen) {
          cutOpen = true;
          pos += 4;
        } else if (string.substr(pos+1,3) === "li>") {
          pos += 3;
        } else if (string.substr(pos+1,3) === "ul>") {
          pos += 3;
        } else if (string.substr(pos+1,3) === "ol>") {
          pos += 3;
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
          lOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/c>") {
          cOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,3) === "/r>") {
          rOpen = false;
          pos += 3;
        } else if (string.substr(pos+1,5) === "/cut>") {
          cutOpen = false;
          pos += 5;
        } else if (string.substr(pos+1,4) === "/li>") {
          pos += 4;
        } else if (string.substr(pos+1,4) === "/ul>") {
          pos += 4;
        } else if (string.substr(pos+1,4) === "/ol>") {
          pos += 4;
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
            return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, lOpen, cOpen, rOpen, cutOpen, imgList);
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
            return buttonUp(bOpen, iOpen, aOpen, uOpen, sOpen, lOpen, cOpen, rOpen, cutOpen, imgList);
          }
          else {
            imgList.push(string.substr(pos+1,qPos))
            pos += qPos;
          }
          if (string[pos+2] !== ">") {
            string = string.substr(0,pos+2) + '>' + string.substr(pos+2);
          }
          else {pos += 1;}
        } else {  // the found tag is not on the sanctioned list, so replace it
          string = string.substr(0,pos) + '&lt;' + string.substr(pos+1);
        }
        return recurse(pos+1, bOpen, iOpen, aOpen, uOpen, sOpen, lOpen, cOpen, rOpen, cutOpen, imgList);
      }
    }
    return recurse(0, false, false, false, false, false, false, false, false, false, []);
  }


}(typeof exports === 'undefined' ? this.pool = {} : exports));
