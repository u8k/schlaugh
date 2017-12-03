"use strict";

(function(exports){

  exports.userNameValidate = function (x) {
    if (x === "") {
      return "need a name!";
    }
    if (/[^a-z0-9-_]/.test(x)) {
      return 'invalid name, a-z0-9-_ only';
    }
    if (x.length > 30) {
      return 'name is too long';
    }
    else {return false;}
  }

  exports.passwordValidate = function (x) {
    if (x === "") {
      return "need a pass!"
    }
    if (/[^ a-zA-Z0-9-_!@#$%&*?]/.test(x)) {
      return 'invalid pass, a-zA-Z0-9-_!@#$%&*? only';
    }
    else {return false;}
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

}(typeof exports === 'undefined' ? this.pool = {} : exports));
