"use strict";

var glo = {};

var $ = function (id) {return document.getElementById(id);}

var isAnEditorOpen = function () {
  var anyOpen = false;
  if (glo.openEditors) {
    for (var editor in glo.openEditors) {
      if (glo.openEditors.hasOwnProperty(editor)) {
        if (glo.openEditors[editor]) {
          anyOpen = true;
        }
      }
    }
  }
  return anyOpen;
}

window.addEventListener('beforeunload', function (e) {
  if (isAnEditorOpen()) {
    e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    (e || window.event).returnValue = "";
    return "";
  } else {
    return undefined;
  }
});

var submitPic = function (remove) {
  if (remove) {$('pic-url').value = "";}
  var picURL = $('pic-url').value;
  loading();
  ajaxCall('/changePic', 'POST', {url:picURL}, function(json) {
    updateUserPic(remove, picURL);
    loading(true);
  });
}

var updateUserPic = function (remove, picURL) {
  if (remove) {
    $("remove-pic").classList.add('removed');
    $("user-pic").classList.add('removed');
    $("no-user-pic").classList.remove('removed');
  } else {
    $("user-pic").setAttribute('src', picURL);
    $("user-pic").classList.remove('removed');
    $("no-user-pic").classList.add('removed');
    $("remove-pic").classList.remove('removed');
    $('pic-url').value = picURL;
  }
}

var saveAppearance = function () {
  if (glo.username) {
    ajaxCall('/saveAppearance', 'POST', glo.newSettings, function(json) {
      for (var prop in glo.newSettings.colors) {
        if (glo.newSettings.colors.hasOwnProperty(prop)) {
          glo.settings.colors[prop] = glo.newSettings.colors[prop];
          delete glo.newSettings.colors[prop];
        }
      }
      var props = ['preset', 'font-family', 'font-size', 'line-height', 'letter-spacing'];
      for (var i = 0; i < props.length; i++) {
        if (glo.newSettings[props[i]]) {
          glo.settings[props[i]] = glo.newSettings[props[i]];
          delete glo.newSettings[props[i]];
        }
      }
      //$('save-appearance').classList.add('hidden');
      $('save-appearance2').classList.add('removed');
      $('save-appearance3').classList.add('removed');
      $('revert-appearance2').classList.add('removed');
      $('revert-appearance3').classList.add('removed');
    });
  }
}

var revertAppearance = function () {
  for (var prop in glo.newSettings.colors) {
    if (glo.newSettings.colors.hasOwnProperty(prop)) {
      changeColor(glo.settings.colors[prop], prop);
      $(prop+'-color-button2').jscolor.fromString(String(glo.settings.colors[prop]).slice(1));
      delete glo.newSettings.colors[prop];
    }
  }
  var props = ['preset', 'font-family', 'font-size', 'line-height', 'letter-spacing'];
  for (var i = 0; i < props.length; i++) {
    if (glo.newSettings[props[i]]) {
      changeFont(glo.settings[props[i]], props[i]);
      $(props[i]+'-select2').value = glo.settings[props[i]];
      delete glo.newSettings[props[i]];
    }
  }
  $('save-appearance2').classList.add('removed');
  $('save-appearance3').classList.add('removed');
  $('revert-appearance2').classList.add('removed');
  $('revert-appearance3').classList.add('removed');
  $('sign-to-save2').classList.add('removed');
  $('sign-to-save3').classList.add('removed');
}

var changeColor = function (colorCode, type) {          // makes the new CSS rule
  var sheet = document.styleSheets[document.styleSheets.length-1];
  if (type === "postBackground") {
    var selector = ".post, .message, .editor, #settings-box, #thread-list, button, .pop-up, .post-background";
    var attribute = "background-color";
    // selected(highlighted) text color
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === '::selection, .fake-text-color-class') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("::selection, .fake-text-color-class {color: "+colorCode+";}", sheet.cssRules.length);
  } else if (type === "text") {
    var selector = "body, h1, input, select, .post, .message, .editor, #settings-box, #thread-list, button, .not-special, .pop-up, .post-background";
    var attribute = "color";
    // border color
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === 'button') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("button {border-color: "+colorCode+";}", sheet.cssRules.length);
    // selected(highlighted) background
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === '::selection, .fake-background-class') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("::selection, .fake-background-class {background-color: "+colorCode+";}", sheet.cssRules.length);
    // this is fine in chrome but is crashing firefox????
    /*
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === 'input:-webkit-autofill, .fake-input-text-color') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("input:-webkit-autofill, .fake-input-text-color {-webkit-text-fill-color: "+colorCode+";}", sheet.cssRules.length);
    */
  } else if (type === "linkText") {
    var selector = ".special, a, a.visited, a.hover";
    var attribute = "color";
  } else if (type === "background") {
    var selector = "body, h1, input, select";
    var attribute = "background-color";
    // this is fine in chrome but is crashing firefox????
    /*
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === 'input:-webkit-autofill, .fake-input-shadow-class') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("input:-webkit-autofill, .fake-input-shadow-class {-webkit-box-shadow: 0 0 0 1000px "+colorCode+" inset;}", sheet.cssRules.length);
    */
  }
  // actually do the main rule swap w/ the above set variables
  for (var i = sheet.cssRules.length-1; i > -1; i--) {
    if (sheet.cssRules[i].selectorText === selector) {
      sheet.deleteRule(i);
      i = -1;
    }
  }
  sheet.insertRule(selector+" {"+attribute+": "+colorCode+";}", sheet.cssRules.length);
}

var changeFont = function (value, attribute) {          // makes the new CSS rule
  if (attribute === "font-family" && fontBank[value]) {
    value = value +", "+ fontBank[value];
  }
  var sheet = document.styleSheets[document.styleSheets.length-1];
  sheet.insertRule(".reader-font"+" {"+attribute+": "+value+";}", sheet.cssRules.length);
}

var selectColor = function (colorCode, type) {
  colorCode = String(colorCode);
  if (colorCode.slice(0,3) !== "rgb" && colorCode.slice(0,1) !== "#") {
    colorCode = "#"+colorCode;
  }
  changeColor(colorCode, type);
  _npa(['glo', 'newSettings', 'colors', type], colorCode);
  if (glo.username) {
    //$('save-appearance').classList.remove('hidden');
    $('save-appearance2').classList.remove('removed');
    $('save-appearance3').classList.remove('removed');
  } else {
    $('sign-to-save2').classList.remove('removed');
    $('sign-to-save3').classList.remove('removed');
  }
  $('revert-appearance2').classList.remove('removed');
  $('revert-appearance3').classList.remove('removed');
  //$('preset-select').value = "custom";
  $('preset-select2').value = "custom";
  glo.newSettings.preset = "custom";
}

var selectFont = function (elem, prop) {
  var value = $(elem).value;
  if (!(!glo.newSettings[prop] && glo.settings[prop] === value) && glo.newSettings[prop] !== value && value !== "*more*") {
    changeFont(value, prop);
    glo.newSettings[prop] = value;
    if (glo.username) {
      //$('save-appearance').classList.remove('hidden');
      $('save-appearance2').classList.remove('removed');
      $('save-appearance3').classList.remove('removed');
    } else {
      $('sign-to-save2').classList.remove('removed');
      $('sign-to-save3').classList.remove('removed');
    }
    $('revert-appearance2').classList.remove('removed');
    $('revert-appearance3').classList.remove('removed');
  } else if (value === "*more*") {

  }
}

var themeSelect = function (elem) {
  var theme = $(elem).value;
  if (!(!glo.newSettings.preset && glo.settings.preset === theme) && glo.newSettings.preset !== theme && theme !== "custom") {
    changeAllColors(themeBank[theme]);
    glo.newSettings.preset = theme;
    for (var prop in themeBank[theme]) {
      if (themeBank[theme].hasOwnProperty(prop)) {
        glo.newSettings.colors[prop] = themeBank[theme][prop];
      }
    }
    if (glo.username) {
      //$('save-appearance').classList.remove('hidden');
      $('save-appearance2').classList.remove('removed');
      $('save-appearance3').classList.remove('removed');
    } else {
      $('sign-to-save2').classList.remove('removed');
      $('sign-to-save3').classList.remove('removed');
    }
    $('revert-appearance2').classList.remove('removed');
    $('revert-appearance3').classList.remove('removed');
  }
}

var themeBank = {
  "classic":{
    postBackground: '#32363F',
    text: '#D8D8D8',
    linkText: '#BFA5FF',
    background: '#324144',
  },
  "slate":{
    postBackground: '#3c4654',
    text: '#FFFCEA',
    linkText: '#9CB1FF',
    background: '#1c1922',
  },
  "evan's theme":{
    postBackground: '#0E0E0E',
    text: '#FFFFFF',
    linkText: '#64C6FF',
    background: '#000000',
  },
  "steve":{
    postBackground: '#FFFFFF',
    text: '#000000',
    linkText: '#0500FF',
    background: '#E4E4E4',
  },
  "duckling":{
    postBackground: '#C6FFC1',
    text: '#00518B',
    linkText: '#A41A90',
    background: '#BCFAFF',
  },
  "midnight":{
    postBackground: '#000000',
    text: '#FFFFFF',
    linkText: '#FF3FF3',
    background: '#4D3059',
  },
  "hoth":{
    postBackground: '#CAD1D9',
    text: '#383F45',
    linkText: '#8B1313',
    background: '#FAF8FA',
  },
  "valentine":{
    postBackground: '#E66689',
    text: '#543A3C',
    linkText: '#A4009C',
    background: '#DC4160',
  },
  "hot dog stand":{
    postBackground: '#E0E000',
    text: '#000000',
    linkText: '#0077F6',
    background: '#8A0000',
  },
  "shamrock":{
    postBackground: '#F4FF78',
    text: '#92800C',
    linkText: '#28D800',
    background: '#106926',
  },
  "rain":{
    postBackground: '#B4E7DC',
    text: '#464E74',
    linkText: '#407FD6',
    background: '#7B98A9',
  },
  "floral":{
    postBackground: '#C4EB98',
    text: '#6F0524',
    linkText: '#72328E',
    background: '#F9627D',
  },
  "purple":{
    postBackground: '#EFE6F6',
    text: '#401962',
    linkText: '#5C45A9',
    background: '#AB7DD2',
  },
  "campground":{
    postBackground: '#E5D6AB',
    text: '#074D07',
    linkText: '#698C8E',
    background: '#97BD74',
  },
  "seashore":{
    postBackground: '#D8D0B9',
    text: '#6E5E52',
    linkText: '#B52F35',
    background: '#92CBDB',
  },
  "schoolbus":{
    postBackground: '#E1D800',
    text: '#000000',
    linkText: '#CE2029',
    background: '#DCDCDC',
  },
  "jack-o-lantern":{
    postBackground: '#FF7700',
    text: '#000000',
    linkText: '#FCF574',
    background: '#BD6B19',
  },
  "wicked witch":{
    postBackground: '#A5E058',
    text: '#000000',
    linkText: '#5E2C8B',
    background: '#C6A6E2',
  },
  "turkey dinner":{
    postBackground: '#FFFDB9',
    text: '#884A3B',
    linkText: '#AF9D6E',
    background: '#D9C183',
  },
  "christmas tree":{
    postBackground: '#085000',
    text: '#E9E206',
    linkText: '#2BFF00',
    background: '#510000',
  },
  "lorelei":{
    postBackground: '#B2C4D6',
    text: '#383F45',
    linkText: '#0004FF',
    background: '#AFDCFA',
  },
  "pearl":{
    postBackground: '#FFFFF1',
    text: '#3E6897',
    linkText: '#FDB6BC',
    background: '#D6FFF5',
  },
  "steven":{
    postBackground: '#2070A0',
    text: '#FFCF50',
    linkText: '#201000',
    background: '#E25563',
  },
  "garnet":{
    postBackground: '#0B0000',
    text: '#F7BB22',
    linkText: '#FF75A9',
    background: '#72002A',
  },
  "amethyst":{
    postBackground: '#C08FCA',
    text: '#232228',
    linkText: '#EAE0FF',
    background: '#AC04F3',
  },
  "lapis":{
    postBackground: '#3268B3',
    text: '#EBEBEB',
    linkText: '#4FCAF3',
    background: '#1E1C51',
  },
  "peridot":{
    postBackground: '#F4FDA4',
    text: '#154F40',
    linkText: '#11A44A',
    background: '#98FF72',
  },
}
var loadThemesFromBank = function () {
  if ($('preset-select2').options.length < 2) { //check if already loaded
    for (var theme in themeBank) {
      if (themeBank.hasOwnProperty(theme)) {
        var option = document.createElement("option");
        option.text = theme;
        $('preset-select2').add(option);
      }
    }
  }
}

var fontBank = {
  'Roboto': 'sans-serif',
  'Open Sans': 'sans-serif',
  'Montserrat': 'sans-serif',
  'Lora': 'serif',
  'Crimson Pro': 'serif',
  'Roboto Slab': 'serif',
  'Space Mono': 'monospace',
  'Source Code Pro': 'monospace',
  'Rajdhani': 'sans-serif',
  'Gurajada': 'serif',
  'serif': 'serif',
  'sans-serif': 'sans-serif',
  'monospace': 'monospace',
}
var loadFontsFromBank = function () {
  if ($('font-family-select2').options.length < 2) { //check if already loaded
    for (var font in fontBank) {
      if (fontBank.hasOwnProperty(font)) {
        var option = document.createElement("option");
        option.text = font;
        $('font-family-select2').add(option);
      }
    }
  }
}

var getStats = function () {
  ajaxCall('/admin/stats', 'POST', {}, function(json) {
    console.log(json);
    var latest = json[json.length-1];
    console.log(latest._id +": "+ String(latest.signUps) +" of "+ String(latest.rawLoads-latest.logIns))
  });
}

var openClickerGame = function () {
  loading();
  ajaxCall('/~clicker', 'POST', {}, function(json) {
    $('click-count-preamble').innerHTML = "total clicks by all schlusers through "+pool.getCurDate(1)+":";
    $('click-count').innerHTML = json.totalScore;
    $('post-click').classList.add("removed");
    if (json.signedIn && json.eligible) {
      $("click-button").classList.remove("removed");
      $("cant-click").classList.add("removed");
      $("must-sign-in").classList.add("removed");
    } else if (json.signedIn) {
      $("click-button").classList.add("removed");
      $("cant-click").classList.remove("removed");
      $("must-sign-in").classList.add("removed");
    } else {
      $("click-button").classList.add("removed");
      $("cant-click").classList.add("removed");
      $("must-sign-in").classList.remove("removed");
    }
    loading(true);
    $("panel-buttons").classList.add("removed");
    switchPanel("clicker-panel");
    simulatePageLoad('~click', false);
  });
}
var clickClicker = function () {
  ajaxCall('/~clickClicker', 'POST', {}, function(json) {
    $("click-button").classList.add("removed");
    $("post-click").classList.remove("removed");
  });
}

var getCursorPosition = function (elem) {
	// IE < 9 Support
	if (document.selection) {
		elem.focus();
		var range = document.selection.createRange();
		var rangelen = range.text.length;
		range.moveStart ('character', -elem.value.length);
		var start = range.text.length - rangelen;
		return {'start': start, 'end': start + rangelen };
	}
	// IE >=9 and other browsers
	else if (elem.selectionStart || elem.selectionStart === 0) {
		return {'start': elem.selectionStart, 'end': elem.selectionEnd };
	} else {
		return {'start': 0, 'end': 0};
	}
}
var setCursorPosition = function (elem, start, end) {
	// IE >= 9 and other browsers
	if (elem.setSelectionRange) {
		elem.focus();
		elem.setSelectionRange(start, end);
	}
	// IE < 9
	else if (elem.createTextRange) {
		var range = elem.createTextRange();
		range.collapse(true);
		range.moveEnd('character', end);
		range.moveStart('character', start);
		range.select();
	}
}

var isNumeric = function (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

var uiPrompt = function (options) {
  // options is an object that can include props for
  //      'label', 'placeholder', 'value', 'callback'(function)
  if (!options) {  //close the prompt
    $("prompt").classList.add("hidden");
    blackBacking(true);
  } else {
    $("prompt").classList.remove("hidden");
    blackBacking();
    //
    $("prompt-label").innerHTML = options.label;
    if (options.placeholder) {$("prompt-input").placeholder = options.placeholder;}
    if (options.value) {$("prompt-input").value = options.value;}
    else {$("prompt-input").value = "";}
    $("prompt-input").type = "";
    setCursorPosition($("prompt-input"), 0, $("prompt-input").value.length);
    //
    $("prompt-submit").onclick = function(){
      uiPrompt(false);
      options.callback($("prompt-input").value);
    }
    var exit = function(){
      options.callback(null);
      uiPrompt(false);
    }
    $("prompt-close").onclick = exit;
    $("pop-up-backing").onclick = exit;
  }
}

var passPrompt = function (options) {
  // options is an object that can include props for
  //      'label', 'username', 'orUp'(boolean), 'callback'(function)
  if (!options) {  //close the prompt
    $("password-prompt").classList.add("hidden");
    blackBacking(true);
  } else {
    $("password-prompt").classList.remove("hidden");
    blackBacking();
    //
    $("password-prompt-label").innerHTML = options.label;
    if (typeof glo !== undefined && glo.username) {
      $("prompt-username").value = glo.username;
      setCursorPosition($("prompt-password"), 0, $("prompt-password").value.length);
    } else {
      setCursorPosition($("prompt-username"), 0, $("prompt-username").value.length);
    }
    if (options.orUp) {$("or-schlaugh-up").classList.remove("removed");}
    else {$("or-schlaugh-up").classList.add("removed");}
    //
    $("password-prompt-submit").onclick = function(){
      passPrompt(false);
      options.callback({
        username: $('prompt-username').value,
        password: $('prompt-password').value,
      });
    }
    var exit = function(){
      options.callback(null);
      passPrompt(false);
    }
    $("password-prompt-close").onclick = exit;
    $("pop-up-backing").onclick = exit;
  }
}

var orSchlaughUp = function (e) {
  e.preventDefault();
  switchPanel("login-panel");
  passPrompt(false);
  chooseInOrUp(true);
  simulatePageLoad();
}

var passPromptSubmit = function () {  // from the prompt box an a user/post page
  passPrompt({
    label:"schlaugh in",
    orUp:true,
    callback: function(data) {
      if (data === null) {return;}
      else {
        data.fromPopUp = true;
        signIn('/login', data, function (resp) {
          if (glo.postPanelStatus) {
            fetchPosts(true);
          } else if (glo.openPanel = "clicker-panel") {
            openClickerGame();
          }
        });
      }
    }
  });
}

var uiAlert = function (message, btnTxt, callback) {
  if (!$("alert")) {return console.log(message);}
  loading(true, true);
  if (!message) {  //close the alert
    $("alert").classList.add("hidden");
    blackBacking(true);
  } else {
    var oldFocus = document.activeElement;
    $("alert").classList.remove("hidden");
    blackBacking();
    $('alert-submit').focus();
    $("alert-text").innerHTML = message;
    if (btnTxt) {$('alert-submit').innerHTML = btnTxt;}
    else {$('alert-submit').innerHTML = "'kay";}
    var exit = function(){
      if (callback) {callback();}
      oldFocus.focus();
      uiAlert(false);
    }
    $("alert-submit").onclick = exit;
    $("pop-up-backing").onclick = exit;
  }
}

var verify = function (message, yesText, noText, callback) {
  loading(true, true);
  if (!message) {  //close the confirm
    $("confirm").classList.add("hidden");
    blackBacking(true);
  } else {
    $("confirm").classList.remove("hidden");
    blackBacking();
    var oldFocus = document.activeElement;
    $('confirm-no').focus();
    $("confirm-text").innerHTML = message;
    if (yesText) {$("confirm-yes").innerHTML = yesText;}
    else {$("confirm-yes").innerHTML = 'yeah';}
    if (noText) {$("confirm-no").innerHTML = noText;}
    else {$("confirm-no").innerHTML = 'nope';}
    $("confirm-yes").onclick = function () {
      verify(false);
      if (callback) {callback(true);}
    }
    var exit = function(){
      verify(false);
      oldFocus.focus();
      if (callback) {callback(false);}
    }
    $("confirm-no").onclick = exit;
    $("pop-up-backing").onclick = exit;
  }
}

var blackBacking = function (away) {
  if (away) {
    $("pop-up-backing").style.opacity="0";
    glo.backingTimer = setTimeout(function () {
      $("pop-up-backing").classList.add('hidden');
    }, 300);
  } else {
    clearTimeout(glo.backingTimer);
    $("pop-up-backing").classList.remove('hidden');
    $("pop-up-backing").style.opacity="1";
  }
}

var loading = function (stop, keepBacking) {
  if (stop) {
    if (!keepBacking) {
      blackBacking(true);
    }
    $("loading-box").style.opacity="0";
    glo.loadingTimer = setTimeout(function () {
      $("loading-box").classList.add('hidden');
    }, 300);
  } else {
    blackBacking();
    clearTimeout(glo.loadingTimer);
    $("loading-box").classList.remove('hidden');
    $("loading-box").style.opacity="1";
  }
}

var signOut = function() {
  if (isAnEditorOpen()) {
    verify(`hold up partner, seems ye've left an editor open, potentially with some unsaved text. Are you sure you'd like to sign out and lose those changes?`, 'YES! BURN IT', 'well, no', function (resp) {
      if (!resp) {return}
      else {
        glo.openEditors = false;
        loading();
        ajaxCall('/~logout', 'GET', {}, function(json) {
          location.reload();
        });
      }
    });
  } else {
    loading();
    ajaxCall('/~logout', 'GET', {}, function(json) {
      location.reload();
    });
  }

}

var simulatePageLoad = function (newPath, newTitle, faviconSrc) {
  // scrolls to top, updates the url, and the browser/tab title
  // defaults to home if no args given, second arg defaults to first if not given
  // if path parmeter === true, then it doesn't change
  setTimeout(function () {
    window.scroll(0, 0);
  }, 100);
  if (!newPath) {
    newPath = "";
  }
  if (!newPath || newTitle === false) {
    newTitle = "s c h l a u g h";
  }
  if (newPath === true) {     //leave the path, still change the other stuff
    document.title = newTitle;
  } else if ("/"+newPath !== window.location.pathname) {
    history.pushState(null, null, "/"+newPath);
    if (!newTitle) {newTitle = newPath;}
    document.title = newTitle;
  }
  //
  if (faviconSrc) {changeFavicon(faviconSrc);}
  else {changeFavicon(null);}
}

window.onpopstate = function(event) {
  //window.history.back();
  location.reload();
}

var changeFavicon = function (src) {
  var oldLink = $('dynamic-favicon');
  var link = document.createElement('link');
  link.id = 'dynamic-favicon';
  link.rel = 'icon';
  link.type = "image/png";
  if (src) {link.href = src;}
  else {link.href = "/assets/favicon.png";}
  if (oldLink) {document.head.removeChild(oldLink);}
  document.head.appendChild(link);
}

var ajaxCall = function(url, method, data, callback, shushError) {
  var xhttp = new XMLHttpRequest();
  xhttp.open(method, url, true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        var json = (xhttp.responseText);
        json = JSON.parse(json);
        if (json.error) {uiAlert(json.error);}
        else {if (callback) {callback(json);}}
      } else {
        if (!shushError) {
          uiAlert("error, sorry!<br><br>unethical response from server, please show this to staff<br><br>"+url+"<br>"+this.statusText+"<br>"+this.responseText)
        } else {
          if (callback) {callback(false);}
        }
      }
    }
  }
  xhttp.send(JSON.stringify(data));
}

var convertCuts = function (string, id) {
  // changes cut tags into functional cuts, needs id so that every cut has a unique id tag on the front end,
  // this will need alteration if multiple posts per user(per day) are allowed
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

var convertNotes = function (string, id) {
  // changes note tags into functional notes, needs id so that every note has a unique id tag on the front end,
  var recurse = function (pos, count) {
    var next = string.substr(pos).search(/<note linkText="/);
    if (next === -1) {return string;}
    else {
      pos += next;
      var qPos = string.substr(pos+16).search(/"/);
      if (qPos === -1) { // 'should' never be the case since "cleanse" already ran
        return string += '">';
      } else {
        var linkText = string.substr(pos+16, qPos);
        var cPos = string.substr(pos+qPos+18).search('</note>');
        if (cPos === -1) { // 'should' never be the case since "cleanse" already ran
          return string += '</note>';
        } else {
          var noteText = string.substr(pos+qPos+18, cPos);
          var uniqueID = "note-"+id+"-"+count;
          if (string.substr(pos+qPos+cPos+25, 4) === "<br>") {
            string = string.substr(0, pos+qPos+cPos+25)+'<br id="'+uniqueID+'-br">'+string.substr(pos+qPos+cPos+29);
          }
          string = string.substr(0,pos)
            +`<a class='clicky' id="`+uniqueID+`-note-open" onclick="collapseNote('`+uniqueID+`', true)">`
            +linkText
            +"</a>"+"<ul class='note removed' id='"+uniqueID+"'>"
            +`<clicky onclick="collapseNote('`+uniqueID+`')" class="collapse-button-top"><i class="far fa-minus-square"></i></clicky>`
            +`<clicky onclick="collapseNote('`+uniqueID+`', false, '`+id+`')" class="collapse-button-bottom hidden" id="`+uniqueID+`-note-close" ><i class="far fa-minus-square"></i></clicky>`
            +noteText+"</ul>"+ string.substr(pos+qPos+cPos+25);
        }
      }
    }
    return recurse(pos+1, count+1);
  }
  return recurse(0,0);
}

var convertLinks = function (string) {
  // adds the " target="_blank" " property to links in user posts/messages
  //        (so that they open in new tabs automatically)
  if (typeof string !== "string") {return;}
  var b = ' target="_blank"';
  var recurse = function (pos) {
    var next = string.substr(pos).search(/a href="/);
    if (next === -1) {return string;}
    else {
      pos += next+8;
      var qPos = string.substr(pos).search(/"/);
      if (qPos === -1) { // 'should' never be the case since "cleanse" has alread ran
        string += '">';
      } else {
        pos += qPos+1;
        string = string.substr(0,pos)+ b +string.substr(pos);
      }
      return recurse(pos+1);
    }
  }
  return recurse(0);
}

var convertText = function (string, id) {
  return convertLinks(convertNotes(convertCuts(string, id), id));
}

var preCleanText = function (string) {  //prep editor text for backEnd, prior to cleanse
  if (typeof string !== "string") {return;}
  // check the text between code tags,
  //    replacing "&" with "&amp;"
  //    and THEN replace "<" with "&lt;"
  var recurse = function (pos) {
    var next = string.substr(pos).search(/<code>/);
    if (next === -1) {return string;}
    else {
      pos += next+6;
      var endPos = string.substr(pos).search("</code>");
      if (endPos === -1) { //unpaired code tag
        var newString = string.substr(pos).replace(/&/g, '&amp;');
        newString = newString.replace(/</g, '&lt;');
        string = string.substr(0,pos)+newString+"</code>";
      } else {
        var newString = string.substr(pos, endPos).replace(/&/g, '&amp;');
        newString = newString.replace(/</g, '&lt;');
        string = string.substr(0,pos)+newString+string.substr(pos+endPos);
        pos += endPos+1;
      }
      return recurse(pos+1);
    }
  }                               //change /n for <br>
  return recurse(0).replace(/\r?\n|\r/g, '<br>');
}

var collapseNote = function (id, dir, postID) {
  if (dir) {  // expand
    $(id).classList.remove('removed')
    $(id+"-note-open").onclick = function () {collapseNote(id, false);}
    if ($(id+"-br")) {
      $(id+"-br").classList.add('removed');
    }
    if ($(id).offsetHeight > (.75 * window.innerHeight)) {
      $(id +'-note-close').classList.remove("hidden");
    }
  } else {  // collapse
    if (postID) {
      var initScroll = window.scrollY;
      var initHeight = $(postID).offsetHeight;
    }
    $(id).classList.add('removed');
    if (postID) {
      if (initScroll === window.scrollY) {
        window.scrollBy(0, $(postID).offsetHeight - initHeight);
      }
    }
    $(id+"-note-open").onclick = function () {collapseNote(id, true);}
    if ($(id+"-br")) {
      $(id+"-br").classList.remove('removed');
    }
  }
}

var backToMain = function (event) {
  modKeyCheck(event, function () {
    if (glo.username) {
      panelButtonClick(event, "posts");
      $("panel-buttons").classList.remove("removed");
      //fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
    } else {
      switchPanel('login-panel');
      simulatePageLoad();
    }
  });
}

var openFAQ = function () {
  if ($('faq-body')) {
    switchPanel('~faq-panel');
    simulatePageLoad('~faq', false);
  } else {
    loading();
    ajaxCall('/~faqText', 'GET', {}, function(json) {
      var faqBody = document.createElement("div");
      faqBody.setAttribute('id', 'faq-body');
      faqBody.setAttribute('class', 'post reader-font');
      faqBody.innerHTML = convertText(json.text, "~faq~");
      $("faq-bucket").appendChild(faqBody)
      switchPanel('~faq-panel');
      simulatePageLoad('~faq', false);
      loading(true);
    });
  }
}

var modKeyCheck = function (event, callback) {
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault();
    callback();
  }
}

var panelButtonClick = function (event, type) {
  modKeyCheck(event, function() {
    if (type === "posts") {
      fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
    } else {
      simulatePageLoad("~"+type, false);
      switchPanel(type + "-panel");
    }
  });
}

var switchPanel = function (panelName, noPanelButtonHighlight) {
  if (glo.openPanel && glo.openPanel === panelName) {
    if (panelName === "write-panel") {
      // open the editor if editPanelButton is clicked when editPanel is already open
      showPostWriter();
    }
    return; // panel is already open, do nothing
  }
  // hide the old stuff
  if (glo.openPanel) {
    $(glo.openPanel).classList.add('removed');
    if ($(glo.openPanel+"-button")) {$(glo.openPanel+"-button").classList.remove('highlight');}
  }
  // highlight the new panel button
  if ($(panelName+"-button") && !noPanelButtonHighlight) {
    $(panelName+"-button").classList.add('highlight');
  }
  // remove header/user stuff in special cases
  if (panelName === "login-panel" || panelName === "bad-recovery-panel" || panelName === "recovery-panel") {
    $("sign-in").classList.add('removed');
    $("username-recovery").value = "";
    $("password-recovery1").value = "";
    $("password-recovery2").value = "";
  }
  // the one actual line that displays the panel
  $(panelName).classList.remove('removed');
  // init
  if (panelName === "posts-panel" && !glo.postPanelStatus) {
    fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
  }
  glo.openPanel = panelName;
}

var followingListDisplay = function (open) {
  if (_npa(['glo','pRef','date'])) {
    if (open) {
      $('following-list').classList.remove('hidden');
      blackBacking();
      $("pop-up-backing").onclick = function () {
        followingListDisplay(false);
      }
    }
    else {
      $('following-list').classList.add('hidden');
      blackBacking(true);
    }
  } else {  // following list has not been fetched/rendered, so do that
    fetchPosts(false, {postCode:"FFTF", date:pool.getCurDate(),}, function () {
      followingListDisplay(open);
    });
  }
}

var openDateJump = function (close) {
  if (close) {
    $('date-jump').classList.add('removed');
    $('bryce-buttons').classList.remove('removed');
  } else {
    $('date-jump').classList.remove('removed');
    $('bryce-buttons').classList.add('removed');
  }
}

var dateJump = function (target) {
  if (!target) {target = $("date-picker").value;}
  if (target.length !== 10 || target[4] !== "-" || target[7] !== "-" || !isNumeric(target.slice(0,4)) || !isNumeric(target.slice(5,7)) || !isNumeric(target.slice(8,10))) {
    return uiAlert("date must be formatted YYYY-MM-DD");
  } else {
    var year = target.slice(0,4);
    var month = target.slice(5,7)-1;
    var day = Number(target.slice(8,10));
    var computedDate = new Date(year,month,day);
    //
    var newYear = computedDate.getFullYear();
    var newMon = computedDate.getMonth()+1;
    if (newMon < 10) {newMon = "0"+newMon}
    var newDay = computedDate.getDate();
    if (newDay < 10) {newDay = "0"+newDay}
    var newDateString = newYear+"-"+newMon+"-"+newDay;

    if (newDateString > pool.getCurDate()) {
      return uiAlert("and no future vision either!");
    } else {
      if (glo.postPanelStatus.date) {   // this is already a dated post, and the only thing we need to change is the date
        glo.postPanelStatus.date = newDateString;
        fetchPosts(true);
      } else {            // we're coming from an "All days" tag page, and need to change postCode
        fetchPosts(true, {date:newDateString, postCode:"FTTF", tag: glo.postPanelStatus.tag});
      }
    }
  }
}

var moveDateByOneDay = function (dir) {
  if (glo.postPanelStatus.date) {
    var curDateStamp = glo.postPanelStatus.date
    if (typeof curDateStamp === 'string' && curDateStamp.length === 10) {
      var year = curDateStamp.slice(0,4);
      var month = Number(curDateStamp.slice(5,7))-1;
      var day = Number(curDateStamp.slice(8,10))+ Number(dir);
      var computedDate = new Date(year,month,day);
      //
      var newYear = computedDate.getFullYear();
      var newMon = computedDate.getMonth()+1;
      if (newMon < 10) {newMon = "0"+newMon}
      var newDay = computedDate.getDate();
      if (newDay < 10) {newDay = "0"+newDay}
      var newDateString = newYear+"-"+newMon+"-"+newDay;
      //
      glo.postPanelStatus.date = newDateString;
      fetchPosts(true);
    }
  }
}

var pageJump = function (input, loc) {
  if (input) {
    var newPage = glo.postPanelStatus.page + input;
  } else {
    var newPage = parseInt($(loc+'-page-number-left-input').value);
    if (newPage === 69) {uiAlert("<br>...<br><br>...<br><br>nice", "nice");}
  }
  if (!Number.isInteger(newPage) || newPage < 1 || newPage > glo.postPanelStatus.totalPages) {
    uiAlert("oh do <i>please</i> at least would you <i>try</i> to only input integers between 1 and the total number of pages, inclusive?", "yes doctor i will try");
  } else {
    glo.postPanelStatus.page = newPage;
    if (glo.postPanelStatus.postCode.slice(3) === "F") {
      glo.postPanelStatus.postCode = glo.postPanelStatus.postCode.slice(0,3) + "T";
    }
    fetchPosts(true);
  }
}

var _npa = function (arr, item, i, cur) { //(safe) NestedPropertyAccess
  // optional "item", designates to write(and overwrite) to the property specified by path in arr
  if (!arr) {return false;}
  if (!i) {i = 0;}
  if (!cur) {if (window) {cur = window} else {cur = global}}
  if (arr[i+1] === undefined) {
    if (item !== undefined) {
      cur[arr[i]] = item;
    }
    return cur[arr[i]];
  } else if (!cur[arr[i]]) {
    if (item !== undefined) {cur[arr[i]] = {};} else {return false;}
  }
  return _npa(arr, item, i+1, cur[arr[i]]);
}

var tagCaseDeSensitize = function (ref) {
  var newRef = {};
  for (var tag in ref) {
    if (ref.hasOwnProperty(tag)) {
        if (!newRef[tag.toLowerCase()]) {
          newRef[tag.toLowerCase()] = true;
        }
    }
  }
  return newRef;
}

var open404 = function (display, input, callback) {
  glo.postPanelStatus = input;
  simulatePageLoad(true, "404s and Heartbreak", null);
  if (input.postCode === 'TFTF') {
    if (input.existed) {
      if (display) {switchPanel('404-panel-existed');}
      if (callback) {return callback();} else {return;}
    } else {
      if (display) {switchPanel('404-panel-post');}
      if (callback) {return callback();} else {return;}
    }
  } else {
    if (display) {switchPanel('404-panel-author');}
    if (callback) {return callback();} else {return;}
  }
}

var fetchPosts = function (display, input, callback) {
  if (!input) {input = glo.postPanelStatus;}
  //404
  if (input.notFound) {
    return open404(display, input, callback);
  }
  if (input.tag) {input.tag = input.tag.toLowerCase()}
  //
  var pc = input.postCode;
  // do we have the data already?   ...what data?
  if (pc === "FTTT") {var arr = ['glo','pRef','tag',input.tag,'date',input.date,'page',input.page];}
  else if (pc === "FTTF") {var arr = ['glo','pRef','tag',input.tag,'date',input.date,];}
  else if (pc === "FTFT") {var arr = ['glo','pRef','tag',input.tag,'page',input.page];}
  else if (pc === "FTFF") {var arr = ['glo','pRef','tag',input.tag,'page',0];}
  else if (pc === "FFTT") {var arr = ['glo','pRef','date',input.date,'page',input.page];}
  else if (pc === "FFTF") {var arr = ['glo','pRef','date',input.date];}
  else if (pc === "TTFT") {var arr = ['glo','pRef','author',input.author,'tag',input.tag,'page',input.page];}
  else if (pc === "TTFF") {var arr = ['glo','pRef','author',input.author,'tag',input.tag,]}
  else if (pc === "TFTF") {
    if (input.post_id) {var arr = ['glo','pRef','post',input.post_id,];}
  }
  else if (pc === "TFFT") {var arr = ['glo','pRef','author',input.author,'page',input.page];}
  else if (pc === "TFFF") {var arr = ['glo','pRef','author',input.author,'page', 0];}
  else if (pc === "MARK") {var arr = ['glo','pRef','bookmarks'];}
  else {return uiAlert('eerrrrrrrrrrrrrr')}
  //
  var x = _npa(arr);
  // if perma post and i already have the post, do i already have the author data?
  if (x && pc === "TFTF" && input.post_id) {
    var authorID = _npa(['glo', 'postStash', input.post_id, '_id']);
    if (authorID && !_npa(['glo','pRef','author',authorID,'info'])) {
      x = false;
      input.author = authorID;
    } else {
      x = [input.post_id];
    }
  }
  // total page number shiz
  if (pc === "FTTT" || pc === "FTTF") {var totalPageNumberPointer = ['glo','pRef','tag',input.tag,'date',input.date,'totalPages'];} //not actualy paginated currently
  else if (pc === "FTFT" || pc === "FTFF") {var totalPageNumberPointer = ['glo','pRef','tag',input.tag,'totalPages'];}
  else if (pc === "FFTT" || pc === "FFTF") {var totalPageNumberPointer = ['glo','pRef','date',input.date,'totalPages'];}             //not actualy paginated currently
  else if (pc === "TTFT" || pc === "TTFF") {var totalPageNumberPointer = ['glo','pRef','author',input.author,'tag',input.tag,'totalPages'];}   //not actualy paginated currently
  else if (pc === "TFFT" || pc === "TFFF") {var totalPageNumberPointer = ['glo','pRef','author',input.author,'totalPages'];}

  if (x) {          // we got it
    input.totalPages = _npa(totalPageNumberPointer);

    if (display) {displayPosts(x, input, callback);}
    else if (callback) {callback();}
  } else {          //  call for it
    if (display || callback) {loading();}
    // send the postRef
    if (_npa(['glo','pRef','post'])) {input.postRef = glo.pRef.post;}
    // do we need author data?
    if (input.author && !_npa(['glo','pRef','author',input.author,'info'])) {
      input.needAuthorInfo = true;
    }
    // do we need the followingList?
    if ((pc === 'FFTT' || pc === 'FFTF') && !_npa(['glo','pRef','date'])) {
      input.getFollowingList = true;
    }
    ajaxCall('/getPosts', 'POST', input, function(json) {
      if (!json.posts || json.four04) {
        loading(true);
        return open404(display, input, callback);
      }
      var postList = [];
      for (var i = 0; i < json.posts.length; i++) {
        addToPostStash(json.posts[i], json.authorData);
        postList.push(json.posts[i].post_id);
      }
      // sort the postList by the postIDs to randomize for dated feeds
      if (pc === "FTTT" || pc === "FTTF" || pc === "FFTT" || pc === "FFTF") {
        postList.sort();
      }
      if (input.needAuthorInfo) {
        _npa(['glo','pRef','author',input.author,'info'], json.authorInfo);
        input.needAuthorInfo = undefined;
      }
      if (input.getFollowingList && json.followingList) {
        renderFollowingList(json.followingList);
        input.getFollowingList = undefined;
      }
      // store the total number of available pages of a thing, to use in pagination displays later
      if (json.pages) {
        _npa(totalPageNumberPointer, json.pages);
        input.totalPages = json.pages;
      }
      if (input.page === 0 && json.pages) {
        if (pc === "FTTT" || pc === "FTTF") {arr = ['glo','pRef','tag',input.tag,'date',input.date,'page',json.pages];}
        else if (pc === "FTFT" || pc === "FTFF") {arr = ['glo','pRef','tag',input.tag,'page',json.pages];}
        else if (pc === "FFTT" || pc === "FFTF") {arr = ['glo','pRef','date',input.date,'page',json.pages];}
        else if (pc === "TTFT" || pc === "TTFF") {arr = ['glo','pRef','author',input.author,'tag',input.tag,'page',json.pages];}
        else if (pc === "TFFT" || pc === "TFFF") {arr = ['glo','pRef','author',input.author,'page',json.pages];}
        else {return uiAlert('eerrrrrrrrrrrrrr2')}
      }
      if (pc === 'FFTT' || pc === 'FFTF') { //    date only "feed" posts
        // from returned post list, parse into lists for each tag
        var postListForTags = [];
        for (var i = 0; i < json.posts.length; i++) {             // have we previously fetched this post?
          if (json.posts[i].date === undefined) {                 // then grab it's tags and author from postStash
            postListForTags.push({
              post_id:json.posts[i].post_id,
              tags:glo.postStash[json.posts[i].post_id].tags,
              _id:glo.postStash[json.posts[i].post_id]._id,
            })
          } else {
            postListForTags.push(json.posts[i]);
          }
        }
        for (var i = 0; i < postListForTags.length; i++) {
          if (_npa(['glo', 'muteingRef', postListForTags[i]._id])) {  // don't put a muted user into a tag list
            postListForTags.splice(i, 1);
            i--;
          } else {
            postListForTags[i].tags = tagCaseDeSensitize(postListForTags[i].tags);
          }
        }
        for (var i = 0; i < json.tagList.length; i++) {
          var tagListAddress = ['glo','pRef','tag',json.tagList[i],'date',input.date,];
          if (!_npa(tagListAddress)) {          // if no home(post list) at this address, build one
            var tagArr = _npa(tagListAddress, []);
            for (var j = 0; j < postListForTags.length; j++) {
              if (postListForTags[j].tags && postListForTags[j].tags[json.tagList[i].toLowerCase()]) {
                tagArr.push(postListForTags[j].post_id);
              }
            }
            tagArr.sort();  // for the "randomized" by post order thing
          }
        }
      }
      //
      _npa(arr, postList);
      if (display) {
        displayPosts(postList, input, callback);
        loading(true);
      } else if (callback) {
        callback();
        loading(true);
      }
    });
  }
}

var displayPosts = function (idArr, input, callback) {
  $("post-bucket").classList.add("removed");
  destroyAllChildrenOfElement($("post-bucket"));

  var pc = input.postCode;
  // filter out posts from non-followers, if feed and not includeTaggedPosts
  if ((pc === 'FFTT' || pc === 'FFTF') && !_npa(['glo','settings','includeTaggedPosts']) && input.date <= pool.getCurDate()) {
    var filtered = [];
    for (var i = 0; i < idArr.length; i++) {
      if (_npa(['glo','followingRef', _npa(['glo','postStash', idArr[i], '_id'])])) {
        filtered.push(idArr[i]);
      }
    }
    idArr = filtered;
  }

  var postType = null;
  if (pc === "TTFT" || pc === "TTFF" || pc === "TFFT" || pc === "TFFF") {
    postType = "author";
  } else if (pc === "FTTT" || pc === "FTTF" || pc === "FFTT" || pc === "FFTF") {
    postType = "dated";
  } else if (pc === "TFTF") {
    postType = "perma"
  }

  // the actual display of the literal posts
  if (pc === 'MARK') {
    for (var i = idArr.length-1; i > -1; i--) {
      $("post-bucket").appendChild(renderOnePost(null, postType, idArr[i]));
    }
  } else {
    for (var i = 0; i < idArr.length; i++) {
      $("post-bucket").appendChild(renderOnePost(null, postType, idArr[i]));
    }
  }
  if (idArr.length === 0) {
    $("post-bucket").appendChild(notSchlaugh(pc, input.date));
    $("bot-page-and-date-nav").classList.add("removed");
  } else {
    $("bot-page-and-date-nav").classList.remove("removed");
  }

  $("post-bucket").classList.remove("removed");
  //
  glo.postPanelStatus = input;
  if (postType === 'author' || pc === "FTFF" || pc === "FTFT") {
    switchPanel('posts-panel', true);
  } else {
    switchPanel('posts-panel');
  }


  ///////////////////////// pagination stuff
  if (input.totalPages) {
    if (input.page === undefined || input.page === 0) {input.page = input.totalPages}
    setPageNumbersAndArrows(input.page, input.totalPages, "top");
    setPageNumbersAndArrows(input.page, input.totalPages, "bot");

    $("top-page-box").classList.remove("removed")
    $("bot-page-box").classList.remove("removed")
  } else {
    $("top-page-box").classList.add("removed")
    $("bot-page-box").classList.add("removed")
  }

////////////////////////////////////// date display / arrows
  if (postType === "dated") {      //"dated"/feed posts
    $("top-date-box").classList.remove('removed');
    $("bot-date-box").classList.remove('removed');
    $("top-date-display").innerHTML = input.date;
    $("bot-date-display").innerHTML = input.date;
    if (input.date >= pool.getCurDate()) {
      $("top-right-date-arrow").classList.add('hidden');
      $("bot-right-date-arrow").classList.add('hidden');
    } else {
      $("top-right-date-arrow").classList.remove('hidden');
      $("bot-right-date-arrow").classList.remove('hidden');
    }
  } else {
    $("top-date-box").classList.add('removed');
    $("bot-date-box").classList.add('removed');
  }


///////////////////////////////////// tag option stuff
  if (input.author || pc === "MARK") {              // don't display any tag/date option stuff
    $("date-and-tag-options").classList.add("removed");
    $("posts-panel-button").classList.remove('highlight');
    if (pc === "MARK") {
      $("top-tag-display").innerHTML = 'bookmarked posts';
      $("bot-tag-display").innerHTML = 'bookmarked posts';
      $("top-tag-display").classList.remove("removed");
      $("bot-tag-display").classList.remove("removed");
    } else {
      if (input.tag) {                    // but if tag filtering, then show that/clear button
        $("top-tag-display").innerHTML = 'posts tagged <i>"'+input.tag+'"</i>';
        $("bot-tag-display").innerHTML = 'posts tagged <i>"'+input.tag+'"</i>';
        $("top-tag-display").classList.remove("removed");
        $("bot-tag-display").classList.remove("removed");
        $("author-clear-tag-top").classList.remove("removed");
        $("author-clear-tag-bot").classList.remove("removed");
      } else {
        $("top-tag-display").classList.add("removed");
        $("bot-tag-display").classList.add("removed");
        $("author-clear-tag-top").classList.add("removed");
        $("author-clear-tag-bot").classList.add("removed");
      }
    }
  } else {
    $("posts-panel-button").classList.add('highlight');
    $("date-and-tag-options").classList.remove("removed");
    $("author-clear-tag-top").classList.add("removed");
    $("author-clear-tag-bot").classList.add("removed");
    if ((pc === 'FFTT' || pc === 'FFTF') && !input.tag) {          //dateFeeds, no tag, so tag option
      renderAllTagListings(input.date);

      $("top-tag-display").classList.add("removed");
      $("bot-tag-display").classList.add("removed");

      $("clear-tag").classList.add("removed");
      $("all-days").classList.add("removed");
      $("save-tag").classList.add("removed");
    } else {
      if (input.date && input.tag) {                            ////////// tag by date,
        renderAllTagListings(input.date);

        $("top-tag-display").innerHTML = 'posts tagged <i>"'+input.tag+'"</i> on';
        $("bot-tag-display").innerHTML = 'posts tagged <i>"'+input.tag+'"</i> on';
        $("all-days").classList.remove("removed");
      } else if (pc === "FTFT" || pc === "FTFF") {                  ///// all days tag page
        renderAllTagListings();

        $("top-tag-display").innerHTML = 'posts tagged <i>"'+input.tag+'"</i>';
        $("bot-tag-display").innerHTML = 'posts tagged <i>"'+input.tag+'"</i>';
        $("all-days").classList.add("removed");
      }
      $("clear-tag").classList.remove("removed");
      if (glo.savedTags && !glo.savedTags[input.tag]) {$("save-tag").classList.remove("removed");}
      else {$("save-tag").classList.add("removed");}
      $("top-tag-display").classList.remove('removed');
      $("bot-tag-display").classList.remove('removed');
    }
    if (!glo.username) {
      $("clear-tag").classList.add("removed");
      $("save-tag").classList.add("removed");
    }
  }

//////////////////////////////////         bios
  if (input.author) {
    var authorInfo = _npa(['glo','pRef','author',input.author,'info']);
    if (authorInfo) {
      var authorPicUrl = authorInfo.authorPic;
      var authorName = authorInfo.author;
    }
  }
  if (pc === "TFTF") { // perma, solo post
    // show author bio on bottom
    setAuthorHeader('bot', authorInfo);
    $("author-header-top").classList.add("removed");
  } else if (postType === "author") {  // author, not perma
    // show author stuff on top
    setAuthorHeader('top', authorInfo);
    $("author-header-bot").classList.add("removed");
  } else {
    $("author-header-top").classList.add("removed");
    $("author-header-bot").classList.add("removed");
  }

/////////////////////////////////////stuff for updating the address bar, browser history, favicon, page title, etc

  if (pc === "FTTT") {simulatePageLoad("~tagged/"+input.tag+"/"+input.date+"/"+input.page, false, false)}
  else if (pc === "FTTF") {simulatePageLoad("~tagged/"+input.tag+"/"+input.date, false, false)}
  else if (pc === "FTFT") {simulatePageLoad("~tagged/"+input.tag+"/"+input.page, false, false)}
  else if (pc === "FTFF") {simulatePageLoad("~tagged/"+input.tag, false, false)}
  else if (pc === "MARK") {simulatePageLoad("~bookmarks", false, false)}
  else if (pc === "FFTT") {simulatePageLoad("~posts/"+input.date+"/"+input.page, false, false)}
  else if (pc === "FFTF") {
    if (input.date === pool.getCurDate()) {simulatePageLoad("~posts", false, false)}
    else {simulatePageLoad("~posts/"+input.date, false, false)}
  }
  else if (pc === "TTFT") {simulatePageLoad(authorName+"/~tagged/"+input.tag+"/"+input.page, authorName, authorPicUrl)}
  else if (pc === "TTFF") {simulatePageLoad(authorName+"/~tagged/"+input.tag, authorName, authorPicUrl)}
  else if (pc === "TFTF") {
    var postTitle = _npa(['glo','postStash', idArr[0], 'title']);
    if (!postTitle) {postTitle = authorName}
    if (input.post_id) {
      simulatePageLoad("~/"+input.post_id, postTitle, authorPicUrl)
    } else {
      simulatePageLoad(authorName+"/~/"+input.date, postTitle, authorPicUrl)
    }
  }
  else if (pc === "TFFT") {simulatePageLoad(authorName+"/~/"+input.page, authorName, authorPicUrl)}
  else if (pc === "TFFF") {simulatePageLoad(authorName, authorName, authorPicUrl)}
  else {return uiAlert('eerrrrrrrrrrrrrr3')}
  //
  if (callback) {callback();}
}

var notSchlaugh = function (postCode, date) {
  var div = document.createElement("div");
  div.classList.add('not-schlaugh');
  div.appendChild(document.createElement("br"));
  div.appendChild(document.createElement("br"));
  var post = document.createElement("div");
  if ((postCode === "FFTF" || postCode === "FFTT") && date) {
    post.innerHTML = '~not schlaugh~<br><clicky onclick="uiAlert(`for the day you are viewing, '+date+', none of the people or tags you are following have made posts`)" class="special">(?)</clicky>';
  } else {
    post.innerHTML = "~no posts~";
  }
  div.appendChild(post);
  div.appendChild(document.createElement("br"));
  div.appendChild(document.createElement("br"));
  return div;
}

var setAuthorHeader = function (loc, aInfo) {
  if (!loc || !aInfo) {return;}

  // pic
  if (aInfo.authorPic !== "") {
    $("author-panel-pic-"+loc).setAttribute('src', aInfo.authorPic);
    $("author-panel-pic-"+loc).classList.remove('removed');
  } else {
    $("author-panel-pic-"+loc).classList.add('removed');
  }

  // title
  var title = $("author-page-title-"+loc);
  // text sizing based on name length
  if (aInfo.author.length < 6) {title.setAttribute('class','author-page-title-0 not-special')}
  else if (aInfo.author.length < 12) {title.setAttribute('class','author-page-title-1 not-special')}
  else if (aInfo.author.length < 20) {title.setAttribute('class','author-page-title-2 not-special')}
  else if (aInfo.author.length < 30) {title.setAttribute('class','author-page-title-3 not-special')}
  else if (aInfo.author.length < 40) {title.setAttribute('class','author-page-title-4 not-special')}
  else if (aInfo.author.length < 50) {title.setAttribute('class','author-page-title-5 not-special')}
  else {title.setAttribute('class','author-page-title-6 not-special')}
  //
  if (loc === "bot") {
    title.onclick = function (event) {
      modKeyCheck(event, function(){
        fetchPosts(true, {postCode:'TFFF', author:aInfo._id});
      });
    }
    title.classList.add("clicky");
    title.classList.remove('not-special');
    title.setAttribute('href', "/"+aInfo.author);
  }
  title.innerHTML = aInfo.author;

  // follow and message and bio buttons
  setFollowButton(loc, aInfo);
  setMuteButton(loc, aInfo);
  setMessageButton(loc, aInfo);
  setEditBioButtons(loc, aInfo);

  // header-right
  if (aInfo.bio && aInfo.bio !== "") {
    $("author-header-right-"+loc).innerHTML = convertText(aInfo.bio, aInfo.author+"-bio");
    $("author-header-right-"+loc).classList.remove('removed');
  } else {
    $("author-header-right-"+loc).classList.add('removed');
  }
  $("author-header-"+loc).classList.remove("removed")
}

var setFollowButton = function (loc, authInf) {
  var follow = $("follow-button-"+loc);
  follow.classList.remove("removed")
  if (glo.username && authInf._id) {
    // is the user already following the author?
    if (_npa(['glo', 'followingRef', authInf._id])) {
      follow.innerHTML = "defollow";
      var remove = true;
    } else {
      follow.innerHTML = "follow";
      var remove = false;
    }
    if (loc === "edit") {
      follow.onclick= function () {
        uiAlert(`Y'ALL<br>DONE<br>DID<br>GET<br>GOT<br>BY<br>A<br>FAKE BUTTON`,'doh');
      }
    } else {
      follow.onclick = function(){
        ajaxCall('/follow', 'POST', {id:authInf._id, remove:remove}, function(json) {
          if (remove) {_npa(['glo', 'followingRef', authInf._id], false);}
          else {_npa(['glo', 'followingRef', authInf._id], true);}
          // refresh button
          setFollowButton(loc, authInf);
        });
      }
    }
  } else {
    follow.classList.add("removed")
  }
}

var setMuteButton = function (loc, authInf) {
  var muteBtnElem = $("mute-button-"+loc);
  muteBtnElem.classList.remove("removed")
  if (glo.username && authInf._id) {
    // is the user already muteing the author?
    if (_npa(['glo', 'muteingRef', authInf._id])) {
      muteBtnElem.innerHTML = "unmute";
      var muting = false;
    } else {
      muteBtnElem.innerHTML = "mute";
      var muting = true;
    }
    if (loc === "edit") {
      muteBtnElem.onclick= function () {
        uiAlert(`Y'ALL<br>DONE<br>DID<br>GET<br>GOT<br>BY<br>A<br>FAKE BUTTON`,'doh');
      }
    } else {
      muteBtnElem.onclick = function(){
        if (muting) {
          verify(`"muting" a schluser will stop their posts from showing up in tag searches and in your feed via tags. If you are following AND muting someone, their posts will show up in your daily feed but NOT in tag searches. Muting a schluser doesn't prevent you from going directly to their page and seeing their posts that way<br><br>go ahead and mute em?`, "DO IT", "actually, i'd rather not", function (result) {
            if (!result) {return;}
            ajaxCall('/mute', 'POST', {userID:authInf._id, muting:muting}, function(json) {
              _npa(['glo', 'muteingRef', authInf._id], true);
              // refresh button
              setMuteButton(loc, authInf);
            });
          });
        } else {
          ajaxCall('/mute', 'POST', {userID:authInf._id, muting:muting}, function(json) {
            _npa(['glo', 'muteingRef', authInf._id], false);
            // refresh button
            setMuteButton(loc, authInf);
          });
        }
      }
    }
  } else {
    muteBtnElem.classList.add("removed")
  }
}

var setMessageButton = function (loc, authInf) {
  var message = $("message-button-"+loc);
  message.classList.add('removed');
  if (glo.username && authInf.author !== glo.username && authInf.key) {
    message.onclick = function(){
      //look for a thread btwn the author and logged in user
      checkForThread({
        name: authInf.author,
        _id: authInf._id,
        key: authInf.key,
        image: authInf.authorPic,
      });
    }
    message.classList.remove('removed');
  } else {
    message.classList.add('removed');
  }
}

var setEditBioButtons = function (loc, authInf) {
  // edit bio button,
  if (loc !== "edit" && glo.username && glo.username === authInf.author) {
    $("edit-bio-button-"+loc).classList.remove('removed');
  } else {
    $("edit-bio-button-"+loc).classList.add('removed');
  }
  // delete bio button
  if (loc !== "edit" && glo.username && glo.username === authInf.author && authInf.bio && authInf.bio !== "") {
    $("delete-bio-button-"+loc).classList.remove('removed');
  } else {
    $("delete-bio-button-"+loc).classList.add('removed');
  }
}

var setPageNumbersAndArrows = function (page, totalPages, macguffin) {
  $(macguffin+"-page-jump").classList.add('hidden')
  // page numbers
  if (totalPages > 1) {
    $(macguffin+'-page-number-left-text').classList.add('removed');
    var pageNumberLeft = $(macguffin+'-page-number-left-input');
    pageNumberLeft.value = page;
    if (totalPages < 10) {
      pageNumberLeft.setAttribute('class', "monospace post-background page-number-left");
    } else if (totalPages < 100) {
      pageNumberLeft.setAttribute('class', "monospace post-background page-number-left-double-digit");
    } else {
      pageNumberLeft.setAttribute('class', "monospace post-background page-number-left-triple-digit");
    }
  } else {
    var pageNumberLeft = $(macguffin+'-page-number-left-text');
    pageNumberLeft.innerHTML = page;
    pageNumberLeft.classList.remove('removed');
    $(macguffin+'-page-number-left-input').classList.add('removed');
  }
  var pageNumberRight = $(macguffin+"-page-number-right");
  pageNumberRight.innerHTML = totalPages;
  if (totalPages < 2) {
    pageNumberRight.setAttribute('class', "monospace");
  } else if (totalPages < 10) {
    pageNumberRight.setAttribute('class', "monospace page-number-right");
  } else if (totalPages < 100) {
    pageNumberRight.setAttribute('class', "monospace page-number-right-double-digit");
  } else {
    pageNumberRight.setAttribute('class', "monospace page-number-right-triple-digit");
  }
  // arrow visibility
  if (page == 1) {
    $(macguffin+"-left-page-arrow").classList.add('hidden');
  } else {
    $(macguffin+"-left-page-arrow").classList.remove('hidden');
  }
  if (page == totalPages) {
    $(macguffin+"-right-page-arrow").classList.add('hidden');
  } else {
    $(macguffin+"-right-page-arrow").classList.remove('hidden');
  }
}

var renderAllTagListings = function (date) {
  destroyAllChildrenOfElement($("tag-bucket"));
  var noTags = true;
  if (glo.savedTags) {
    for (var tagName in glo.savedTags) {
      if (glo.savedTags.hasOwnProperty(tagName) && glo.savedTags[tagName] === true) {
        noTags = false;
        if (date) {
          var arrOfPostsForTagOnDate = _npa(['glo','pRef','tag',tagName,'date',date,]);
          if (arrOfPostsForTagOnDate) {
            renderTagListing(tagName, arrOfPostsForTagOnDate.length)
          }
        } else {
          renderTagListing(tagName)
        }
      }
    }
  }
  if (noTags) {$("none-tags").classList.remove('removed');}
  else {$("none-tags").classList.add('removed');}
}

var renderTagListing = function (tagName, count) {
  var tagShell = document.createElement("div");
  var tagElem = document.createElement("text");
  tagElem.setAttribute('class', 'clicky top-tag special');
  if (count !== undefined) {
    tagElem.innerHTML = tagName + "("+count+")";
  } else {
    tagElem.innerHTML = tagName;
  }
  (function (tagString) {
    tagElem.onclick = function(){
      openTagMenu(true);
      if (glo.postPanelStatus.date) {
        fetchPosts(true, {postCode: "FTTF", tag:tagString, date:glo.postPanelStatus.date});
      } else {
        fetchPosts(true, {postCode: "FTFF", tag:tagString,});
      }
    }
  })(tagName);
  var detag = document.createElement("text");
  detag.setAttribute('class', 'clicky de-tag-button special');
  detag.innerHTML = ' &nbsp; <icon class="fas fa-trash-alt"></icon>';
  (function (tagString) {
    detag.onclick = function(){
      saveTag(true, tagString);
    }
  })(tagName);
  tagShell.appendChild(tagElem);
  tagShell.appendChild(detag);
  $("tag-bucket").appendChild(tagShell);
}

var renderFollowingList = function (followingList) {
  var followingBucket = $("following-bucket");
  for (var i = 0; i < followingList.length; i++) {
    var listing = document.createElement("div");
    listing.setAttribute('class', 'following-listing');
    var link = document.createElement("a");
    link.setAttribute('href', "/"+followingList[i].name);
    link.setAttribute('class', 'not-special');
    (function (id) {
      link.onclick = function(){
        modKeyCheck(event, function(){
          fetchPosts(true, {postCode:'TFFF', author:id});
          followingListDisplay(false);
        });
      }
    })(followingList[i]._id);
    var name = document.createElement("text");
    name.innerHTML = followingList[i].name;
    var pic = document.createElement("img");
    pic.setAttribute('class', 'little-pic');
    pic.setAttribute('src', followingList[i].pic);
    link.appendChild(pic);
    link.appendChild(name);
    listing.appendChild(link);
    followingBucket.appendChild(listing);
  }
}

var addToPostStash = function (postData, authorData) {
  // no no no, i said poststash, not mustache!
  if (!glo.postStash) {glo.postStash = {}}
  var ps = glo.postStash;
  if (!ps[postData.post_id]) {
    ps[postData.post_id] = {
      post_id:postData.post_id,
      date:postData.date,
      body:postData.body,
      tags:postData.tags,
      title:postData.title,
    };
    if (authorData) {
      ps[postData.post_id].authorPic = authorData.authorPic;
      ps[postData.post_id].author = authorData.author;
      ps[postData.post_id]._id = authorData._id;
    } else {
      ps[postData.post_id].authorPic = postData.authorPic;
      ps[postData.post_id].author = postData.author;
      ps[postData.post_id]._id = postData._id;
    }
  }
  // add id to pRef.post
  _npa(['glo','pRef','post',postData.post_id,], true);
}

var renderOnePost = function (postData, type, postID) {
  // type = 'author', 'preview', 'preview-edit', "dated", "perma" or NULL
  // postData needs fields: post_id, date, authorPic, author, body, tags, _id,

  if (postData === null && postID && glo.postStash) {
    if (glo.postStash[postID]) {
      postData = glo.postStash[postID];
    } else {
      var tombstone = document.createElement("noPost");
      return tombstone;
    }
  }

  if (type !== 'preview' && type !== 'preview-edit') {
    addToPostStash(postData);
  }

  var uniqueID = 'post-'+postData.post_id;
  var post = document.createElement("div");
  post.setAttribute('id', uniqueID);
  post.setAttribute('class', 'post');

  // collapse button(s)
  var collapseBtn = document.createElement("clicky");
  collapseBtn.setAttribute('class', 'collapse-button-top');
  collapseBtn.setAttribute('id', uniqueID+'-collapse-button-top');
  if (glo.collapsed && glo.collapsed[postData.post_id] && type !== 'preview-edit') {
    collapseBtn.innerHTML = '<i class="far fa-plus-square"></i>';
    collapseBtn.title = 'expand';
  } else {
    collapseBtn.innerHTML = '<i class="far fa-minus-square"></i>';
    collapseBtn.title = 'collapse';
  }
  collapseBtn.onclick = function () {collapsePost(uniqueID, postData.post_id, false);}
  post.appendChild(collapseBtn);
  var collapseBtn2 = collapseBtn.cloneNode(true);
  collapseBtn2.setAttribute('class', 'collapse-button-bottom hidden');
  collapseBtn2.setAttribute('id', uniqueID+'-collapse-button-bottom');
  collapseBtn2.onclick = function () {collapsePost(uniqueID, postData.post_id, true);}
  post.appendChild(collapseBtn2);
  // post header
  var postHeader = document.createElement("div");
  post.appendChild(postHeader);
  // author stuff in header
  if (type !== 'author' && type !== 'preview-edit') {
    postHeader.setAttribute('class', 'post-header-feed');
    var authorBox = document.createElement("div");
    postHeader.appendChild(authorBox);
    // authorPic
    if (postData.authorPic && postData.authorPic !== "") {
      var authorPicWrapper = document.createElement("a");
      var authorPic = document.createElement("img");
      authorPic.setAttribute('src', postData.authorPic);
      (function (id) {
        authorPicWrapper.onclick = function(event){
          modKeyCheck(event, function(){fetchPosts(true, {postCode:'TFFF', author:id});});
        }
      })(postData._id);
      authorPicWrapper.setAttribute('href', "/"+postData.author);
      authorPic.setAttribute('class', 'author-pic clicky');
      authorPicWrapper.appendChild(authorPic);
      /*
      if (glo.collapsed && glo.collapsed[postData.post_id]) {
        authorPicWrapper.classList.add('removed');
      }
      */
      authorBox.appendChild(authorPicWrapper);
      //
      authorBox.appendChild(document.createElement("br"));
    }
    // authorName
    var author = document.createElement("a");
    (function (id) {
      author.onclick = function(event) {
        modKeyCheck(event, function(){fetchPosts(true, {postCode:'TFFF', author:id});});
      }
    })(postData._id);
    author.setAttribute('class', 'author-on-post special');
    // text sizing based on name length
    if (postData.author.length < 6) {author.classList.add('author-size-0')}
    else if (postData.author.length < 12) {author.classList.add('author-size-1')}
    else if (postData.author.length < 20) {author.classList.add('author-size-2')}
    else if (postData.author.length < 30) {author.classList.add('author-size-3')}
    else if (postData.author.length < 40) {author.classList.add('author-size-4')}
    else if (postData.author.length < 50) {author.classList.add('author-size-5')}
    else {author.classList.add('author-size-6')}
    //
    author.setAttribute('href', "/"+postData.author);
    author.innerHTML = "<clicky>"+postData.author+"</clicky>";
    authorBox.appendChild(author);
  } else {
    postHeader.setAttribute('class', 'post-header');
  }
  // post title
  if (postData.title) {
    var title = document.createElement("text");
    title.innerHTML = postData.title;
    title.setAttribute('class', 'post-title');
    // click handler goes here if we want that
    postHeader.appendChild(title);
  }
  // actual post body
  var body = document.createElement("div");
  body.setAttribute('class', 'reader-font');
  body.setAttribute('id', uniqueID+'body');
  body.innerHTML = convertText(postData.body, uniqueID);
  if (glo.collapsed && glo.collapsed[postData.post_id]) {
    post.classList.add('faded');
    body.classList.add('removed');
  }
  post.appendChild(body);
  // tags
  var authorOption = null;
  var datedOption = null;
  if (type === 'author' || type === 'preview-edit') {authorOption = {_id:postData._id, name:postData.author}}
  if (type === 'dated') {datedOption = postData.date;}
  var tagString = formatTags(postData.tags, authorOption, datedOption);
  var tagElem = document.createElement("div");
  tagElem.setAttribute('class', 'tag-section reader-font');
  tagElem.innerHTML = tagString;
  post.appendChild(tagElem);
  // footer
  if (type !== 'preview' && type !== 'preview-edit') {
    createPostFooter(post, postData, type);
  }

  // give a bit for images to load then check if posts are long enough for bottom collapse button
  setTimeout(function () {
    if ($(uniqueID).offsetHeight > (.75 * window.innerHeight)) {
      $(uniqueID +'-collapse-button-bottom').classList.remove("hidden");
    }
  }, 500);
  //
  return post;
}

var allDaysButton = function () {
  fetchPosts(true, {postCode: 'FTFF', tag: glo.postPanelStatus.tag})
}

var clearTagButton = function () {
  if (!glo.postPanelStatus.date) {
    glo.postPanelStatus.date = pool.getCurDate();
  }
  fetchPosts(true, {postCode:'FFTF', date:glo.postPanelStatus.date});
}
var clearAuthorTagButton = function () {
  fetchPosts(true, {postCode:'TFFF', author:glo.postPanelStatus.author});
}

var collapsePost = function (uniqueID, postID, isBtmBtn) {
  var btnElem = $(uniqueID+'-collapse-button-top');
  var btnElem2 = $(uniqueID+'-collapse-button-bottom');
  if (btnElem.title === 'expand') {     // expand the post
    $(uniqueID).classList.remove('faded');
    $(uniqueID+'body').classList.remove('removed');
    //$(uniqueID+"-authorPic").classList.remove('removed');
    btnElem.title = 'collapse';
    btnElem.innerHTML = '<i class="far fa-minus-square"></i>';
    btnElem2.title = 'collapse';
    btnElem2.innerHTML = '<i class="far fa-minus-square"></i>';
    if ($(uniqueID).offsetHeight > (.75 * window.innerHeight)) {
      btnElem2.classList.remove("hidden");
    }
    var collapse = false;
    if (glo.collapsed) {glo.collapsed[postID] = false;}
  } else {                             // collapse the post
    $(uniqueID).classList.add('faded');
    //$(uniqueID+"-authorPic").classList.add('removed');
    btnElem.title = 'expand';
    btnElem.innerHTML = '<i class="far fa-plus-square"></i>';
    btnElem2.classList.add('hidden');

    if (isBtmBtn) {
      var initScroll = window.scrollY;
      var initHeight = $(uniqueID).offsetHeight;
    }
    $(uniqueID+'body').classList.add('removed');
    if (isBtmBtn) {
      if (initScroll === window.scrollY) {  //huh? "6435886"
        window.scrollBy(0, $(uniqueID).offsetHeight - initHeight);
      }
    }

    var collapse = true;
    if (glo.collapsed) {glo.collapsed[postID] = true;}
  }
  if (glo.collapsed && postID) {
    ajaxCall('/collapse', 'POST', {id:postID, collapse:collapse}, function(json) {
      //
    });
  }
}

var displayBookmarks = function () {
  fetchPosts(true, {postCode:"MARK"});
}

var createPostFooter = function (postElem, postData, type) {
  var footer = document.createElement("div");
  footer.setAttribute('class', 'post-footer');
  postElem.appendChild(footer);
  // footer left, datestamp
  if (type !== 'dated') {
    var footerLeft = document.createElement("div");
    footerLeft.setAttribute('class', 'post-footer-left');
    footer.appendChild(footerLeft);
    var dateStamp = document.createElement("text");
    dateStamp.innerHTML = postData.date;
    dateStamp.setAttribute('class', 'date-stamp');
    if (glo.username) {
      dateStamp.setAttribute('class', 'clicky special date-stamp');
      dateStamp.onclick = function(){
        fetchPosts(true, {postCode:"FFTF", date:postData.date,});
      }
    }
    footerLeft.appendChild(dateStamp);
  }
  // footer buttons(right side of post footer)
  if (type !== "preview") {
    var footerButtons = document.createElement("div");
    footerButtons.setAttribute('class', 'post-footer-right');
    footer.appendChild(footerButtons);
    if (glo.username) {
      if (postData.post_id && postData.post_id.length !== 8) {  // IDs are length 7, 8 indicates it's a dumby that isn't actualy linkable
        // quote button
        var quoteBtn = document.createElement("footerButton");
        quoteBtn.innerHTML = '<icon class="fas fa-quote-left"></icon>';
        quoteBtn.title = "quote";
        quoteBtn.onclick = function() {
          if (glo.postStash && glo.postStash[postData.post_id]) {     // is it already stashed?
            var text = "<quote>"+glo.postStash[postData.post_id].body+
            '<r><a href="/~/'+postData.post_id+'">-'+postData.author+"</a></r></quote>"
            if ($('post-editor').value !== "") {text = '<br>'+text;}
            $('post-editor').value += prepTextForEditor(text);
            showPostWriter(function () {
              addTag(postData.author);
              switchPanel('write-panel');
              simulatePageLoad("~write", false);
            });
          } else {
            return uiAlert("eRoRr! post not found???<br>how did you even get here?");
          }
        }
        footerButtons.appendChild(quoteBtn);
      }
      //
      createBookmarkButton(footerButtons, postData);
    }
    // perma-link
    if (postData.post_id && postData.post_id.length !== 8) { // IDs are length 7, 8 indicates it's a dumby that isn't actualy linkable
      var permalinkWrapper = document.createElement("a");
      permalinkWrapper.setAttribute('href', "/~/"+postData.post_id);
      permalinkWrapper.setAttribute('class', 'not-special');
      var permalink = document.createElement("footerButton");
      permalink.innerHTML = '<i class="fas fa-link"></i>';
      permalink.title = "permalink";
      permalink.onclick = function(event) {
        modKeyCheck(event, function(){
          fetchPosts(true, {postCode:"TFTF", author:postData._id , date:postData.date , post_id:postData.post_id})
        });
      }
      permalinkWrapper.appendChild(permalink);
      footerButtons.appendChild(permalinkWrapper);
    }
    //
    if ((type === 'author' || type === 'perma') && glo.username && glo.username === postData.author) {
      //edit button
      var editBtn = document.createElement("footerButton");
      editBtn.innerHTML = '<i class="fas fa-pen"></i>';
      editBtn.title = "edit";
      editBtn.onclick = function() {
        editPost(postData);
      }
      footerButtons.appendChild(editBtn);
      // delete button
      var deleteBtn = document.createElement("footerButton");
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.title = "delete";
      deleteBtn.onclick = function() {
        deletePost(postData);
      }
      footerButtons.appendChild(deleteBtn);
    }
  }
}

var addTag = function (authorName) {
  $('tag-input').value = $('tag-input').value + "@"+authorName+", ";
}

var createBookmarkButton = function (parent, post) {
  if (!parent || !post._id || !post.date || !post.post_id) {return;}
  var author_id = post._id;
  // is there an extant bookmark button?
  var x = parent.childNodes;
  if (x[x.length-2] && x[1].classList[0] === "bookmark-button") {
    var insert = x[1];
  }
  var elem = document.createElement("footerButton");
  elem.setAttribute('class', "bookmark-button");
  var alreadyMarked = false;
  if (!glo.bookmarks) {glo.bookmarks = {}}
  if (glo.bookmarks[author_id] && glo.bookmarks[author_id][post.date]) {
    alreadyMarked = true;
    elem.innerHTML = '<icon class="fas fa-bookmark"></icon>';
    elem.title = "un-bookmark";
  } else {
    elem.innerHTML = '<icon class="far fa-bookmark"></icon>';
    elem.title = "bookmark";
  }
  elem.onclick = function() {
    if (alreadyMarked) {    // so we're removing it
      if (glo.bookmarks[author_id] && glo.bookmarks[author_id][post.date]) {
        glo.bookmarks[author_id][post.date] = false;
      }
      //
      _npa(['glo','pRef','bookmarks'], false);
    } else {
      if (!glo.bookmarks[author_id]) {glo.bookmarks[author_id] = {}}
      glo.bookmarks[author_id][post.date] = true;
      //
      var markArray = _npa(['glo','pRef','bookmarks']);
      if (markArray && markArray.length !== undefined) {
        markArray.push(post.post_id);
      } else {
        markArray = [post.post_id];
      }
      if (glo.postPanelStatus.postCode === "MARK") {
        fetchPosts(true);
      }
    }
    // update bookmark button
    createBookmarkButton(parent, post);
    //
    ajaxCall('/bookmarks', 'POST', {author_id:author_id, date:post.date, remove:alreadyMarked}, function(json) {
      // are we looking at the page of bookmarked posts right NOW??
      if (alreadyMarked && glo.postPanelStatus.postCode === "MARK") {
        fetchPosts(true);
      }
    });
  }
  if (insert) {
    parent.insertBefore(elem, insert);
    removeElement(insert);
  } else {
    parent.appendChild(elem);
  }
}

var deletePost = function (post) {
  verify('you would like to Permanently and Immediately delete this post?', 'yeah', 'nope', function (resp) {
    if (!resp) {return}
    verify('YOU SURE???', 'YES!', '...no', function (resp) {
      if (!resp) {return}
      loading();
      ajaxCall('/deleteOldPost', 'POST', post, function(json) {
        loading(true);
        glo.postStash[post.post_id] = undefined;
        fetchPosts(true);
      });
    });
  });
}

var deleteBio = function () {
  verify('you would like to Permanently and Immediately delete your bio?', 'yeah', 'nope', function (resp) {
    if (!resp) {return}
    verify('YOU SURE???', 'YES!', '...no', function (resp) {
      if (!resp) {return}
      loading();
      var data = {post_id:'bio' ,date:'bio'};
      ajaxCall('/deleteOldPost', 'POST', data, function(json) {
        loading(true);
        _npa(['glo','pRef','author',glo.userID,'info',"bio"], "");
        glo.bio = "";
        fetchPosts(true);
      });
    });
  });
}

var editPost = function (post) {
  $('pending-post-edit').classList.remove("removed");
  $('author-header-edit').classList.add("removed");
  //
  $("old-post-editor-title").innerHTML = "<l>editing your post for "+post.date+'</l>';
  $('edit-post-button').onclick = function () {
    showWriter('old-post');
  }
  //
  $("old-tag-box").classList.remove("removed");
  if (glo.pendingUpdates[post.date]) {                 // there is already a pending edit
    var savedPost = glo.pendingUpdates[post.date][0];
    $('old-post-editor').value = prepTextForEditor(savedPost.body);
    $("old-post-status").innerHTML = "pending edit for your post on "+post.date;
    updatePendingEdit(savedPost);
    hideWriter('old-post');
    $('edit-post-button').innerHTML = "edit edit";
    switchPanel("edit-panel");
  } else {                                            // there is not a pending edit
    if (glo.postStash && glo.postStash[post.post_id]) {     // is it already stashed?
      var tags = getTagString(glo.postStash[post.post_id].tags);
      glo.fetchedPosts[post.date] = [glo.postStash[post.post_id]];
      $('old-tag-input').value = tags;
      if (glo.postStash[post.post_id].title) {$('old-title-input').value = post.title;}
      $("old-post-status").innerHTML = "no pending edit for your post on "+post.date;
      $('old-post-editor').value = prepTextForEditor(glo.postStash[post.post_id].body);
      $('delete-pending-old-post').classList.add("removed");
      $('pending-post-edit').classList.add("removed");
      $('edit-post-button').innerHTML = "new edit";
      switchPanel("edit-panel");
      showWriter('old-post');
    } else {
      return uiAlert("eRoRr! post not found???<br>how did you even get here?<br>plz tell staff about this");
    }
  }
  // set submit button
  var data = {date: post.date, post_id:post.post_id}
  $('submit-editing-old-post').onclick = function () {
    data.text = $('old-post-editor').value;
    data.tags = $('old-tag-input').value;
    data.title = $('old-title-input').value;
    // have changes been made?
    if (glo.fetchedPosts[post.date][0]) {   // make sure thing even exists first...
      if (prepTextForEditor(glo.fetchedPosts[post.date][0].body) === data.text) {
        var oldTitle = glo.fetchedPosts[post.date][0].title || "";
        if (oldTitle === data.title) {
          if (getTagString(glo.fetchedPosts[post.date][0].tags) === data.tags) {
            return hideWriter('old-post');
          }
        }
      }
    }
    loading();
    data.text = preCleanText(data.text);
    ajaxCall("/editOldPost", 'POST', data, function(json) {
      updatePendingEdit(json);
      if (!glo.pendingUpdates[post.date]) {glo.pendingUpdates[post.date] = [{}];}
      glo.pendingUpdates[post.date][0].body = json.body;
      glo.pendingUpdates[post.date][0].tags = json.tags;
      glo.fetchedPosts[post.date][0].body = json.body;
      glo.fetchedPosts[post.date][0].tags = json.tags;
    });
  }
  //set cancel button
  $('cancel-edit-button').onclick = function () {
    var oldText = prepTextForEditor(glo.fetchedPosts[post.date][0].body);
    var oldTags = getTagString(glo.fetchedPosts[post.date][0].tags);
    var oldTitle = glo.fetchedPosts[post.date][0].title;
    if (!oldTitle) {oldTitle = "";}
    // have changes been made?
    if (oldText === $('old-post-editor').value && oldTags === $('old-tag-input').value && oldTitle === $('old-title-input').value) {
      return hideWriter('old-post');
    }
    verify("revert any unsaved changes?", null, null, function (result) {
      if (!result) {return;}
      $('old-post-editor').value = oldText;
      $('old-tag-input').value = oldTags;
      $('old-title-input').value = oldTitle;
      return hideWriter('old-post');
    });
  }
  // set delete button
  $('delete-pending-old-post').onclick = function () {
    verify("you sure you want me should delete it?", null, null, function (result) {
      if (!result) {return;}
      loading();
      data.text = "";
      data.tags = "";
      ajaxCall("/editOldPost", 'POST', data, function(json) {
        glo.pendingUpdates[post.date] = null;
        glo.fetchedPosts[post.date] = null;
        updatePendingEdit(json);
        $('edit-post-button').onclick = function () {
          editPost(post);
          showWriter('old-post');
        }
      });
    });
  }
}

var updatePendingEdit = function (post, bio) {
  if (post.body === "") {
    $('old-post-status').innerHTML = "no "+$('old-post-status').innerHTML;
    $('delete-pending-old-post').classList.add("removed");
    if (bio) {$('author-header-edit').classList.add("removed");}
    else {$('pending-post-edit').classList.add("removed");}
    $('edit-post-button').innerHTML = "new edit";
  } else {
    var str = $('old-post-status').innerHTML;
    if (str.substr(0,3) === "no ") {$('old-post-status').innerHTML = str.substr(3);}
    $('delete-pending-old-post').classList.remove("removed");
    if (bio) {$('author-header-edit').classList.remove("removed");}
    else {$('pending-post-edit').classList.remove("removed");}
    $('edit-post-button').innerHTML = "edit edit";
  }
  var tags = getTagString(post.tags);
  $('old-tag-input').value = tags;
  if (post.title) {$('old-title-input').value = post.title;}
  $('old-post-editor').value = prepTextForEditor(post.body);
  if (bio) {
    setAuthorHeader('edit', {
      _id: glo.userID,
      author: glo.username,
      authorPic: glo.userPic,
      bio: convertText(post.body, 'old-pending'),
    });
  }
  else {
    post.author = glo.username;
    var newEditElem = renderOnePost(post, "preview-edit");
    if ($('pending-post-edit').childNodes[0]) {
      $('pending-post-edit').replaceChild(newEditElem, $('pending-post-edit').childNodes[0]);
    } else {
      $('pending-post-edit').appendChild(newEditElem);
    }
  }
  hideWriter('old-post');
  loading(true);
}

var editBio = function () {
  $('pending-post-edit').classList.add("removed");
  $('author-header-edit').classList.remove("removed");
  //
  $("old-post-editor-title").innerHTML = "<l>editing bio</l>";
  $('edit-post-button').onclick = function () {
    showWriter('old-post');
  }
  $("old-tag-box").classList.add("removed");
  //
  if (glo.pendingUpdates['bio']) {
    $('old-post-editor').value = prepTextForEditor(glo.pendingUpdates['bio']);
    $("old-post-status").innerHTML = "pending bio edit:";
    updatePendingEdit({body: glo.pendingUpdates['bio']}, true);
    hideWriter('old-post');
    $('edit-post-button').innerHTML = "edit edit";
    switchPanel("edit-panel");
  } else {
    $("old-post-status").innerHTML = "no pending bio edit";
    $('old-post-editor').value = prepTextForEditor(glo.bio);
    $('delete-pending-old-post').classList.add("removed");
    $('author-header-edit').classList.add("removed");
    $('edit-post-button').innerHTML = "new edit";
    hideWriter('old-post');
    switchPanel("edit-panel");
  }
  // set submit button
  var data = {date: "bio", post_id:"bio"}
  $('submit-editing-old-post').onclick = function () {
    data.text = $('old-post-editor').value;
    // have changes been made?
    if (prepTextForEditor(glo.bio) === data.text) {
      return hideWriter('old-post');
    }
    loading();
    data.text = preCleanText(data.text);
    ajaxCall("/editOldPost", 'POST', data, function(json) {
      updatePendingEdit(json, true);
      glo.pendingUpdates['bio'] = json.body;
    });
  }
  //set cancel button
  $('cancel-edit-button').onclick = function () {
    if (glo.pendingUpdates['bio']) {var oldText = prepTextForEditor(glo.pendingUpdates['bio']);}
    else {var oldText = prepTextForEditor(glo.bio);}
    // have changes been made?
    if (oldText === $('old-post-editor').value) {return hideWriter('old-post');}
    verify("revert any unsaved changes?", null, null, function (result) {
      if (!result) {return;}
      $('old-post-editor').value = oldText;
      return hideWriter('old-post');
    });
  }
  // set delete button
  $('delete-pending-old-post').onclick = function () {
    verify("you sure you want me should delete it?", null, null, function (result) {
      if (!result) {return;}
      loading();
      data.text = "";
      ajaxCall("/editOldPost", 'POST', data, function(json) {
        glo.pendingUpdates['bio'] = null;
        updatePendingEdit(json, true);
        $('edit-post-button').onclick = function () {
          editBio();
          showWriter('old-post');
        }
      });
    });
  }
}

var getTagString = function (tagObj) {
  var tags = "";
  for (var tag in tagObj) {
    if (tagObj.hasOwnProperty(tag)) {
      tags += tag + ", ";
    }
  }
  return tags;
}

var removeElement = function (elem) {
  elem.parentNode.removeChild(elem);
}

var destroyAllChildrenOfElement = function (elem) {
  var children = elem.childNodes;
  while (children.length !== 0) {
    removeElement(children[0]);
  }
}

var submitPost = function (remove) { //also handles editing and deleting
  var text = $('post-editor').value;
  var tags = $('tag-input').value;
  var title = $('title-input').value;
  if (text === "" && tags === "" && title === "" && !glo.pending) {
    ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
    return hideWriter('post');
  }
  // have changes been made?
  if (!remove && glo.pending && prepTextForEditor(glo.pending.body) === text) {
    if (glo.pending.title === title) {
      if (getTagString(glo.pending.tags) === tags) {
        ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
        return hideWriter('post');
      }
    }
  }
  if (remove || (text === "" && tags === "" && title === "")) {
    verify("you sure you want me should delete it?", null, null, function (result) {
      if (!result) {return;}
      loading();
      ajaxCall("/", 'POST', {remove:true, key:glo.sessionKey}, function(json) {
        updatePendingPost(null);
      });
    });
  } else {
    loading();
    text = preCleanText(text);
    ajaxCall("/", 'POST', {body:text, tags:tags, title:title, key:glo.sessionKey}, function(json) {
      updatePendingPost(json);
    });
  }
}

var cancelPost = function () {
  if (glo.pending) {    // there is a current saved/pending post
    // have changes been made?
    if (prepTextForEditor(glo.pending.body) === $('post-editor').value) {
      if (glo.pending.title === $('title-input').value) {
        if (getTagString(glo.pending.tags) === $('tag-input').value) {
          ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
          return hideWriter('post');
        }
      }
    }
    verify("you want to lose any current edits and revert to the last saved version?", null, null, function (result) {
      if (!result) {return;}
      else {
        updatePendingPost(glo.pending);
      }
    });
  } else {        // there is NOT a current saved/pending post
    if ($('post-editor').value === "" && $('tag-input').value === "" && $('title-input').value === "") {
      ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
      return hideWriter('post');
    }
    verify("you want to lose all current text in the editor?", null, null, function (result) {
      if (!result) {return;}
      else {
        updatePendingPost(null);
      }
    });
  }
}

var updatePendingPost = function (post) {
  if (!post) {
    glo.pending = false;
    $('pending-status').innerHTML = "no pending post for tomorrow";
    $('delete-pending-post').classList.add("removed");
    $('pending-post').classList.add("removed");
    $('write-post-button').innerHTML = "new post";
    post = {};
    post.body = "";
    post.tags = {};
    post.title = "";
  } else {
    glo.pending = {};
    glo.pending.body = post.body;
    glo.pending.tags = post.tags;
    glo.pending.title = post.title;
    $('pending-status').innerHTML = "your pending post for tomorrow:";
    $('delete-pending-post').classList.remove("removed");
    $('pending-post').classList.remove("removed");
    $('write-post-button').innerHTML = "edit post";
  }
  var tags = getTagString(post.tags);
  $('tag-input').value = tags;
  if (post.title === undefined) {post.title = ""}
  $('title-input').value = post.title;
  var postData = {
    body: post.body,
    tags: post.tags,
    title: post.title,
    author: glo.username,
    authorPic: glo.userPic,
    _id: glo.userID,
  }
  var newPostElem = renderOnePost(postData, "preview");
  if ($('pending-post').childNodes[0]) {
    $('pending-post').replaceChild(newPostElem, $('pending-post').childNodes[0]);
  } else {
    $('pending-post').appendChild(newPostElem);
  }
  $('post-editor').value = prepTextForEditor(post.body);
  hideWriter('post');
  loading(true);
}

var cancelMessage = function () {
  var index = glo.activeThreadIndex;
  var last = glo.threads[index].thread[glo.threads[index].thread.length-1];
  // does the thread have a pending message?
  if (last && last.date === pool.getCurDate(-1)) {
    // have changes been made?
    if (prepTextForEditor(last.body) === $('message-editor').value) {
      return hideWriter('message');
    }
    var verText = "you want to lose any current edits and revert to the last saved version?";
  } else {
    if ($('message-editor').value === "") {return hideWriter('message');}
    var verText = "you want to lose all current text in the editor?";
  }
  verify(verText, null, null, function (result) {
    if (!result) {return;}
    else {
      updatePendingMessage(index);
    }
  });
}

var formatTags = function (tagRef, author, dated) {
  var tags = "";
  for (var tag in tagRef) {
    if (tagRef.hasOwnProperty(tag)) {
      if (author) {
        tags += '<a onclick="tagClickHandler(event,`'+tag+'`,`'+author._id+'`,null);" href="/'+author.name+'/~tagged/'+tag+'">'+tag+'</a>, ';
      } else if (dated) {
        tags += '<a onclick="tagClickHandler(event,`'+tag+'`,null,`'+dated+'`);" href="/~tagged/'+tag+"/"+dated+'">'+tag+'</a>, ';
      } else {
        tags += '<a onclick="tagClickHandler(event,`'+tag+'`,null,null);" href="/~tagged/'+tag+'">'+tag+'</a>, ';
      }
    }
  }
  if (tags.substr(tags.length-2, tags.length) === ", ") {
    tags = tags.substr(0,tags.length-2);
  }
  //if (tags !== "") {return "</quote></r></c><br><hr><i><l>"+ tags+"</l></i>";}
  if (tags !== "") {return "<hr>" + tags;}
  else {return "";}
}

var tagClickHandler = function (event, tag, author, date) {
  modKeyCheck(event, function () {
    if (author) {
      var postCode = "TTFF";
    } else if (date) {
      var postCode = "FTTF";
    } else {
      var postCode = "FTFF";
    }
    fetchPosts(true, {postCode:postCode, tag:tag, date:date, author:author});
  });
}

var openTagMenu = function (close) {
  if (close) {
    $('bryce-buttons').classList.remove('removed');
    $('tag-menu').classList.add('removed');
  } else {
    $('tag-menu').classList.remove('removed');
    $('bryce-buttons').classList.add('removed');
  }
}

var tagSearch = function () {
  var tag = $("tag-picker").value;
  if (tag === "") {return uiAlert("ya can't search for nothin!");}
  openTagMenu(true);
  fetchPosts(true, {postCode: "FTTF", tag: tag, date: glo.postPanelStatus.date});
}

var saveTag = function (remove, tag) {
  if (tag === undefined) {tag = $("tag-picker").value;}
  if (!tag) {tag = glo.postPanelStatus.tag}
  if (tag === "") {return uiAlert("ya can't save nothin!");}
  ajaxCall("/saveTag", 'POST', {tag, remove:remove}, function(json) {
    if (remove) {glo.savedTags[tag] = false;}
    else {glo.savedTags[tag] = true;}

    flushPostListAndReloadCurrentDate();
  });
}

var flushPostListAndReloadCurrentDate = function () {
  var parms = glo.postPanelStatus;
  //    if (parms.postCode === "FFTT") {var arr = ['glo','pRef','date',parms.date,'page',parms.page];}
  //    alter this for pagination if we do that later
  _npa(['glo','pRef','date',parms.date], false);
  var x = _npa(['glo','pRef','date']);
  for (var dateObj in x) {
    if (x.hasOwnProperty(dateObj)) {
      delete x[dateObj];
    }
  }
  fetchPosts(true);
}

var toggleTaggedPostsInclusion = function () {
  ajaxCall('/toggleSetting', 'POST', {setting: "includeTaggedPosts"}, function(json) {
    if (glo.settings.includeTaggedPosts) {
      $('include-tagged-posts-toggle').innerHTML = '<icon class="far fa-square"></icon>';
      glo.settings.includeTaggedPosts = false;
    } else {
      $('include-tagged-posts-toggle').innerHTML = '<icon class="far fa-check-square"></icon>';
      glo.settings.includeTaggedPosts = true;
    }
    fetchPosts(true);
  });
}

var prepTextForEditor = function (text) {
  if (text === null || text === undefined) {
    return "";
  }
  // a bunch garbage hacking of html whitespace handling

  //
  text = text.replace(/<\/cut>/g, '</cut><br>');
  text = text.replace(/<\/ascii>/g, '</ascii><br>');
  text = text.replace(/<\/li>/g, '</li><br>');
  text = text.replace(/<\/quote>/g, '</quote><br>');
  text = text.replace(/<\/r>/g, '</r><br>');
  text = text.replace(/<\/c>/g, '</c><br>');
  text = text.replace(/<\/l>/g, '</l><br>');
  text = text.replace(/<\/ol>/g, '</ol><br>');
  text = text.replace(/<\/ul>/g, '</ul><br>');
  //
  text = text.replace(/<quote>/g, '<quote><br>');
  text = text.replace(/<ascii>/g, '<ascii><br>');
  text = text.replace(/<r>/g, '<r><br>');
  text = text.replace(/<c>/g, '<c><br>');
  text = text.replace(/<l>/g, '<l><br>');
  text = text.replace(/<ol>/g, '<ol><br>');
  text = text.replace(/<ul>/g, '<ul><br>');
  text = text.replace(/<hr>/g, '<hr><br>');


  var preTagLineBreakRecurse = function (pos, tag) {
    var next = text.substr(pos).search(tag);
    if (next !== -1) {
      pos = pos+next;
      if (text.substr(pos-4, 4) !== '<br>' && text.substr(pos-5, 5) !== '<cut>') {
        text = text.substr(0,pos)+'<br>'+text.substr(pos);
      }
      preTagLineBreakRecurse(pos+1, tag);
    }
  }
  var tagArr = [/<ul>/, /<ol>/, /<li>/, /<quote>/, /<ascii>/, /<r>/, /<c>/, /<l>/, /<hr>/];
  for (var i = 0; i < tagArr.length; i++) {
    preTagLineBreakRecurse(1, tagArr[i]);
  }

  var imgRecurse = function (pos) {
    var next = text.substr(pos).search(/<img src="/);
    if (next !== -1) {
      pos = pos+next;
      if (pos !== 0) {
        if (text.substr(pos-4, 4) !== '<br>' && text.substr(pos-5, 5) !== '<cut>') {
          text = text.substr(0,pos)+'<br>'+text.substr(pos);
        }
      }
      pos = pos+9;
      var closePos = text.substr(pos+1).search(/>/)+2;
      if (closePos === -1) {
        text += '">';
        return;
      }
      else {
        pos += closePos;
        text = text.substr(0,pos) + '<br>' + text.substr(pos);
      }
      imgRecurse(pos+1);
    }
  }
  imgRecurse(0);

  text = text.replace(/<br>/g, '\n');

  var codeRecurse = function (pos) {
    var next = text.substr(pos).search(/<code>/);
    if (next !== -1) {
      pos += next+6;
      var endPos = text.substr(pos).search("</code>");
      if (endPos === -1) { // 'should' never be the case since "cleanse" has already ran
        return uiAlert(`error, sorry! unpaired code tag on "prepText", please show this to staff`);
      } else {
        var newString = text.substr(pos, endPos).replace(/&lt;/g, '<');
        newString = newString.replace(/&amp;/g, '&');
        text = text.substr(0,pos)+newString+text.substr(pos+endPos);
        pos += endPos+1;
      }
      codeRecurse(pos+1);
    }
  }
  codeRecurse (0);

  var noteRecurse = function (pos) {
    var next = text.substr(pos).search(/<note linkText="/);
    if (next !== -1) {
      pos = pos+next+15;
      var qPos = text.substr(pos+1).search(/"/)+2;
      if (qPos === -1) {
        text += '">';
        return;
      }
      else {
        pos += qPos;
        text = text.substr(0,pos+1) + '\n' + text.substr(pos+1);
      }
      noteRecurse(pos+1);
    }
  }
  noteRecurse(0);

  return text;
}

var pingPong = function (key) {
  ajaxCall('/~pingPong', 'POST', {key:key, editorOpenElsewhere:glo.editorOpenElsewhere}, function (json) {
    if (json === false) {   // fail to connect to server, give in a minute and try again
      setTimeout(function () {
        pingPong(key)
      }, 60000);
    } else {
      if (json.post !== undefined || json.editorOpenElsewhere) {
        if (glo.openEditors && glo.openEditors.post && !json.submittedHere) {  // post editor is open, notify
          if (json.post) {
            uiAlert("schlaugh has detected a submission from another editor somewhere else. You are not currently seeing here any changes that were made there. And if you submit a post here, you'll overwrite what was inputted there. Maybe copy out all the text here and stash it somewhere to be safe?");
          } else if (json.editorOpenElsewhere && !glo.editorOpenElsewhere) {
            uiAlert("schlaugh detects that another editor has been opened elsewhere. Was that you? Careful you don't overwrite yourself! Maybe copy out all the text here and stash it somewhere to be safe?");
          }
        } else {
          if (json.post) {
            glo.pending = json.post;
            updatePendingPost(glo.pending);
          }
        }
      }
      if (json.editorOpenElsewhere !== undefined) {
        glo.editorOpenElsewhere = json.editorOpenElsewhere;
      }
      pingPong(json.key);
    }
  }, true);
}

// editor stuff
var showWriter = function (kind) {
  if (!glo.openEditors) {glo.openEditors = {}}
  glo.openEditors[kind] = true;
  $(kind+'-writer').classList.remove('removed');
  $(kind+'-preview').classList.add('removed');
  var editor = $(kind+'-editor');
  setCursorPosition(editor, editor.value.length, editor.value.length);
}
var showPostWriter = function (callback) {
  if (glo.openEditors && glo.openEditors.post) {
    if (callback) {callback();}
  } else {
    if (glo.editorOpenElsewhere) {
      verify(`schlaugh detects that you currently already have an editor open, perhaps in another tab, browser, or device? If there are unsaved changes in that editor, you won't see them here. And if you start making changes here and then save the changes there, you still won't see the changes here... In general, having multiple editors open makes overwriting yourself easy and is not recommended<br><br>are you sure you want to open this editor?`,
      'yeah, do it anyway', 'nah, hold up', function (resp) {
        if (resp) {
          showWriter('post');
          ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:true});
          if (callback) {callback();}
        }
      });
    } else {
      showWriter('post');
      ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:true});
      if (callback) {callback();}
    }
  }
}
var hideWriter = function (kind) {
  $(kind+'-writer').classList.add('removed');
  $(kind+'-preview').classList.remove('removed');
  if (!glo.openEditors) {glo.openEditors = {}}
  glo.openEditors[kind] = false;
}

var resizeEditor = function (kind) {
  var field = $(kind+"-editor");

  var initWindowScroll = window.scrollY;
  var initHeight = field.offsetHeight;
  // Reset field height
  field.style.height = 'inherit';

  // Calculate the newHeight
  var computed = window.getComputedStyle(field);
  var newHeight = parseInt(computed.getPropertyValue('border-top-width'), 10)
  + parseInt(computed.getPropertyValue('padding-top'), 10)
  + field.scrollHeight
  + parseInt(computed.getPropertyValue('padding-bottom'), 10)
  + parseInt(computed.getPropertyValue('border-bottom-width'), 10)
  + 20; //padding

  var maxHeight = window.innerHeight - $("editor-options-"+kind).offsetHeight -10;

  //
  if (maxHeight > newHeight && newHeight > initHeight) {
    field.style.height = newHeight + 'px';
    window.scrollTo(0, initWindowScroll);
  } else if (newHeight > maxHeight && maxHeight > initHeight) {
    field.style.height = maxHeight + 'px';
    window.scrollTo(0, $("editor-options-"+kind).getBoundingClientRect().top -5);
  } else {
    field.style.height = initHeight + 'px';
    window.scrollTo(0, initWindowScroll);
  }
}

var styleText = function (tag, src, lineBreak) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (a !== b && y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  if (!lineBreak) {
    area.value = y.slice(0, a)+'<'+tag+'>'+y.slice(a, b)+'</'+tag+'>'+y.slice(b);
    setCursorPosition(area, a+2+tag.length, b+2+tag.length);
  } else {
    var openTag = '\n<'+tag+'>\n';
    if (a === 0 || y.substr(a-1,1) === "\n") {openTag = '<'+tag+'>\n';}
    var closeTag = '\n</'+tag+'>\n';
    if (y.substr(b,1) === "\n") {closeTag = '\n</'+tag+'>';}
    area.value = y.slice(0, a)+ openTag + y.slice(a, b)+ closeTag +y.slice(b);
    setCursorPosition(area, a+openTag.length, b+openTag.length);
  }
}
var hyperlink = function (src) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  var linkText;
  if (a !== b) {linkText = convertLineBreaks(y.substr(a,b-a), true);}
  uiPrompt({
    label: "target url:",
    placeholder: "http://www.butts.cash/",
    callback: function(target) {
      if (target !== null) {
        uiPrompt({
          placeholder: "butts.cash",
          value: linkText,
          label: "link text:",
          callback: function(linkText) {
            if (linkText !== null) {
              linkText = convertLineBreaks(linkText);
              ajaxCall('/link', 'POST', {url:target}, function(json) {
                if (json.issue) {
                  verify(json.issue, null, null, function (res) {
                    if (!res) {
                      area.value = y;
                      setCursorPosition(area, a, b);
                    }
                  });
                }
              });
              area.value = y.slice(0, a)+'<a href="'+target+'">'+linkText+'</a>'+y.slice(b);
              var bump = a+target.length+linkText.length+15;
              setCursorPosition(area, bump, bump);
            }
          }
        });
      }
    }
  });
}
var insertImage = function (src) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  $('img-input-prompt').classList.remove('hidden');
  blackBacking();
  setCursorPosition($("img-input-prompt-input"), 0, $("img-input-prompt-input").value.length);
  var exit = function () {
    blackBacking(true);
    $('img-input-prompt').classList.add('hidden');
  }
  $("pop-up-backing").onclick = exit;
  $("img-input-prompt-close").onclick = exit;

  $("img-input-prompt-submit").onclick = function() {
    var url = $('img-input-prompt-input').value;
    var title = $('img-input-prompt-input2').value;
    var alt = $('img-input-prompt-input3').value;
    if (url) {
      var openTag = '\n<img src="';
      if (a === 0 || y.substr(a-1,1) === "\n") {openTag = '<img src="'}
      url += '"';
      if (title) {
        title = ' title="' +title+ '"';
      } else {title = "";}
      if (alt) {
        alt = ' alt="' +alt+ '"';
      } else {alt = "";}
      var closeTag = '>\n';
      if (y.substr(b,1) === "\n") {closeTag = '>'}
      area.value = y.slice(0, a)+ openTag + url + title + alt + closeTag +y.slice(b);
      var bump = a +url.length+ title.length+ alt.length+ openTag.length + closeTag.length;
      setCursorPosition(area, bump, bump);
    }
    exit();
  }
}
var insertHR = function (src) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var pre = "";
  if (a !== 0 && y.substr(a-1,1) !== "\n") {pre = "\n"}
  var post = "";
  if (y.substr(b,1) !== "\n") {post = "\n"}
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  area.value = y.slice(0, a)+ pre +"<hr>"+ post +y.slice(b);
  var bump = a+4 +pre.length + post.length;
  setCursorPosition(area, bump, bump);
}
var insertCut = function (src) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  var cutText = "more";
  if (a !== b) {cutText = convertLineBreaks(y.substr(a,b-a), true);}
  uiPrompt({
    label:"text:",
    value:cutText,
    placeholder: "",
    callback: function(cutText) {
      if (cutText != null) {
        cutText = convertLineBreaks(cutText);
        var openTag = '<cut>';
        var closeTag = '</cut>\n';
        if (y.substr(b,1) === "\n") {closeTag = '</cut>'}
        area.value = y.slice(0, a)+openTag+cutText+closeTag+y.slice(b);
        var bump = a + cutText.length+ openTag.length + closeTag.length;
        setCursorPosition(area, bump, bump);
      }
    }
  });
}
var insertQuote = function (src) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  var quoteText;
  if (a !== b) {quoteText = convertLineBreaks(y.substr(a,b-a), true);}
  var openTag = '\n<quote>\n'
  if (a === 0 || y.substr(a-1,1) === "\n") {openTag = '<quote>\n'}
  var closeTag = '\n</quote>\n';
  if (y.substr(b,1) === "\n") {closeTag = '\n</quote>';}
  uiPrompt({
    label:"quote text:",
    value:quoteText,
    placeholder: "nitwit blubber oddment tweak",
    callback: function(quoteText) {
      if (quoteText !== null) {
        quoteText = convertLineBreaks(quoteText);
        uiPrompt({
          label: "source text(optional):",
          placeholder: "dumbledore",
          callback: function(sourceText) {
            if (sourceText !== null && sourceText !== "") {
              uiPrompt({
                label: "source link(optional):",
                placeholder: "http://www.dumbledore.com",
                callback: function(sourceLink) {
                  if (sourceLink !== null && sourceLink !== "") {
                    ajaxCall('/link', 'POST', {url:sourceLink}, function(json) {
                      if (json.issue) {
                        verify(json.issue,  null, null, function (res) {
                          if (!res) {
                            area.value = y;
                            setCursorPosition(area, a, b);
                          }
                        });
                      }
                    });
                    area.value = y.slice(0, a)+openTag+quoteText+'\n<r>\n<a href="'+sourceLink+'">-'+sourceText+'</a>\n</r>'+ closeTag +y.slice(b);
                    var bump = a+quoteText.length+sourceLink.length+sourceText.length +25 + openTag.length + closeTag.length;
                    setCursorPosition(area, bump, bump);
                  } else {
                    area.value = y.slice(0, a)+openTag+quoteText+'\n<r>\n-'+sourceText+'\n</r>'+ closeTag +y.slice(b);
                    var bump = a+quoteText.length+sourceText.length +11 + openTag.length + closeTag.length;
                    setCursorPosition(area, bump, bump);
                  }
                }
              });
            } else {
              area.value = y.slice(0, a)+openTag+quoteText + closeTag +y.slice(b);
              var bump = a + quoteText.length + openTag.length + closeTag.length;
              setCursorPosition(area, bump, bump);
            }
          }
        });
      }
    }
  });
}
var insertNote = function (src) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var linkText;
  if (a !== b) {linkText = convertLineBreaks(y.substr(a,b-a), true);}
  uiPrompt({
    label: "link text:",
    placeholder: "(aside)",
    value: linkText,
    callback: function(linkText) {
      if (linkText !== null) {
        uiPrompt({
          placeholder: "Laura Epsom",
          label: "note contents:",
          callback: function(noteContents) {
            if (noteContents !== null) {
              noteContents = convertLineBreaks(noteContents);
              area.value = y.slice(0, a)+'<note linkText="'+linkText+'">\n'+noteContents+'\n</note>'+y.slice(b);
              var bump = a+linkText.length+noteContents.length+27;
              setCursorPosition(area, bump, bump);
            }
          }
        });
      }
    }
  });
}

var convertLineBreaks = function (string, dir) {
  if (dir) {
    return string.replace(/\r?\n|\r/g, '<br>');
  } else {
    return string.replace(/<br>/g, '\n');
  }
}

// thread stuff
var closeThread = function () { // returns true for threadClosed, false for NO
  if (glo.activeThreadIndex === undefined) {return true;}
  var i = glo.activeThreadIndex;
  //does the open thread have unsaved text?
  var text = $('message-editor').value;
  if (text !== "") {
    var last = glo.threads[i].thread[glo.threads[i].thread.length-1];
    if (!last || last.date !== pool.getCurDate(-1) || text !== prepTextForEditor(last.body)) {
      //is it okay to lose that unsaved text?
      verify("lose current unsaved message text?", null, null, function (result) {
        if (!result) {return;}
        //and then take to the thread?
        else {return hideCurrentThread(i);}
      })
    } else {return hideCurrentThread(i);}
  } else {return hideCurrentThread(i);}
}

var hideCurrentThread = function (i) {
  glo.activeThreadIndex = undefined;
  $("back-arrow").classList.add('removed');
  $(i+"-thread").classList.add('removed');
  if ($(i+"-thread-pic")) {$(i+"-thread-pic").classList.add('removed');}
  $("message-writer").classList.add('removed');
  $("message-preview").classList.add('removed');
  $("thread-title").classList.add('removed');
  $("thread-title").removeAttribute('href');
  $("mark-unread").classList.add('removed');
  $('block-button').classList.add('removed');
  $("thread-title-area").classList.add('removed');
  $('thread-status').classList.add('removed');
  $("thread-list").classList.remove('removed');
  return true;
}

var openThread = function (i) {
  // close/check for an already open thread
  if (closeThread()) {
    var actuallyOpenTheThread = function (i) {
      updatePendingMessage(i);
      if (glo.threads[i].unread) {
        ajaxCall('/unread', 'POST', {_id:glo.threads[i]._id, bool:false}, function(json) {})
        glo.threads[i].unread = false;
        $(i+'-thread-name').classList.remove("special");
        glo.unread--;
        if (glo.unread === 0) {
          $("inbox-panel-button").classList.add("not-special");
        }
      }
      glo.activeThreadIndex = i;
      (function (index) {
        $('block-button').onclick = function(){block(index);}
      })(i);
      if (glo.threads[i].blocking) {          // are you blocking them?
        $('block-button').innerHTML = 'unblock';
        $("message-preview").classList.add('removed');
        $('thread-status').innerHTML = "(blocking)";
        $('thread-status').classList.remove('removed');
      } else if (glo.threads[i].blocked) {    // are they blocking you?
        $('thread-status').innerHTML = "(blocked)";
        $('thread-status').classList.remove('removed');
        $('block-button').innerHTML = 'block';
        $("message-preview").classList.add('removed');
      } else {
        $('block-button').innerHTML = 'block';
        $("mark-unread").classList.remove('removed');
        $("message-preview").classList.remove('removed');
      }
      $('block-button').classList.remove('removed');
      $("thread-list").classList.add('removed');
      $(i+"-thread").classList.remove('removed');
      if ($(i+"-thread-pic")) {$(i+"-thread-pic").classList.remove('removed');}
      $("back-arrow").classList.remove('removed');
      $("thread-title").innerHTML = glo.threads[i].name;
      $("thread-title").setAttribute('href', "/"+glo.threads[i].name);
      (function (id) {
        $("thread-title").onclick = function(event){
          modKeyCheck(event, function(){
            fetchPosts(true, {postCode:'TFFF', author:id});
          });
        }
      })(glo.threads[i]._id);
      $("thread-title").classList.remove('removed');
      $("thread-title-area").classList.remove('removed');
    }
    //
    if (glo.threads[i].locked) {
      verifyPass( function () {
        actuallyOpenTheThread(i);
      });
    } else {actuallyOpenTheThread(i);}
  }
}

var markUnread = function () {
  var i = glo.activeThreadIndex;
  glo.threads[i].unread = true;
  $(i+'-thread-name').classList.add("special");
  closeThread();
  glo.unread++;
  ajaxCall('/unread', 'POST', {_id:glo.threads[i]._id, bool:true}, function(json) {})
  $("inbox-panel-button").classList.remove("not-special");
}

var updatePendingMessage = function (index) {
  var pending = "";
  var last = glo.threads[index].thread[glo.threads[index].thread.length-1];
  // does the thread have a pending message?
  if (last && last.date === pool.getCurDate(-1)) {
    pending = last.body;
    $('delete-message').classList.remove('removed');
    $('pending-message').classList.remove('removed');
    $('write-message-button').innerHTML = "edit message";
    $('pending-message-status').innerHTML = "pending message:";
    $('pending-message').innerHTML = convertText(pending, 'pending-message');
  } else {
    $('delete-message').classList.add('removed');
    $('pending-message').classList.add('removed');
    $('write-message-button').innerHTML = "new message";
    $('pending-message-status').innerHTML = "no pending message";
    $('pending-message').innerHTML = "";
  }
  $('message-editor').value = prepTextForEditor(pending);
  hideWriter('message');
  loading(true);
}

var submitMessage = function (remove) {  //also handles editing and deleting
  var i = glo.activeThreadIndex;
  if (remove) {
    verify("you sure you want me should delete it?", null, null, function (result) {
      if (!result) {return;}
      else {
        loading();
        var data = {
          recipient: glo.threads[i]._id,
          encSenderText: '',
          encRecText: '',
          remove: remove,
        };
        ajaxCall('/inbox', 'POST', data, function(json) {
          if (json.reKey) {
            glo.threads[i].key = json.reKey;
            return submitMessage(true);
          } else {
            var len = glo.threads[i].thread.length-1;
            var last = glo.threads[i].thread[len];
            glo.threads[i].thread.splice(len,1);
            updatePendingMessage(i);
          }
        });
      }
    });
  } else {
    var text = $('message-editor').value;
    if (text === "") {return hideWriter('message');}
    // have changes been made?
    if (glo.threads[i].thread[glo.threads[i].thread.length-1]) {
      if (prepTextForEditor(glo.threads[i].thread[glo.threads[i].thread.length-1].body) === $('message-editor').value) {
        return hideWriter('message');
      }
    }
    if (!glo.threads[i].key) {return uiAlert("you cannot message the person you are trying to message, you shouldn't have this option at all, sorry this is a (strange)bug please note all details and tell staff, sorry");}
    //
    loading();
    var encryptAndSend = function () {
      encrypt(text, glo.keys.pubKey, glo.threads[i].key, function (encSenderText, encRecText) {
        var data = {
          recipient: glo.threads[i]._id,
          encSenderText: encSenderText,
          encRecText: encRecText,
          remove: remove,
        };
        ajaxCall('/inbox', 'POST', data, function(json) {
          if (json.reKey) {
            glo.threads[i].key = json.reKey;
            return submitMessage();
          } else {
            var len = glo.threads[i].thread.length-1;
            var last = glo.threads[i].thread[len];
            // is the thread's last message already a pending message?
            if (last && last.date === pool.getCurDate(-1)) {
              last.body = text;         //overwrite
            } else {
              glo.threads[i].thread.push({
                inbound: false,
                date: pool.getCurDate(-1),
                body: text,
              });
            }
            updatePendingMessage(i);
          }
        });
      });
    }

    // cleanse and image validate
    var x = pool.cleanseInputText(preCleanText(text));
    text = x[1];
    if (x[0].length !== 0) {
      ajaxCall('/image', 'POST', x[0], function(json) {
        encryptAndSend();
      });
    } else {encryptAndSend();}
  }
}

var checkForThread = function (user) {
  // if the thread already exists, open it
  if (glo.threadRef[user._id] !== undefined) {openThread(glo.threadRef[user._id]);}
  else {  //create a new thread
    user.thread = [];
    var index = glo.threads.length;
    glo.threadRef[user._id] = index;
    glo.threads.push(user);
    if ($("no-threads")) {$("no-threads").classList.add('removed');}
    createThread(index, true);
    openThread(index);
  }
  switchPanel('inbox-panel');
  simulatePageLoad("~inbox", false);
}

var createMessage = function (i, j) {
  var x = glo.threads[i].thread[j];
  if (!x || (x.date === pool.getCurDate(-1) && j === 0)) {
    // show "no messages"
    var message = document.createElement("div");
    message.innerHTML = "no messages";
    $(i+"-thread").appendChild(message);
  } else if (x.date === pool.getCurDate(-1)) {
    // do nothing
    return;
  } else {  // show the message
    var orri = "inbound";
    if (x.inbound === false) {orri = "outbound";}
    var uniqueID = glo.threads[i]._id+'-'+x.date+orri;
    var message = document.createElement("div");
    message.setAttribute('id', uniqueID);
    message.setAttribute('class', 'message '+orri);
    $(i+"-thread").appendChild(message);
    var dateStamp = document.createElement("div");
    dateStamp.setAttribute('class', 'date-stamp-box');
    dateStamp.innerHTML = x.date;
    message.appendChild(dateStamp);
    var body = document.createElement("div");
    body.setAttribute('class', 'reader-font');
    body.innerHTML = convertText(x.body, uniqueID);
    message.appendChild(body);
  }
}

var createThread = function (i, top) {
  //creates the name and the box where messages will go
  glo.threadRef[glo.threads[i]._id] = i;
  var nameBox = document.createElement("div");
  var name = document.createElement("clicky");
  name.innerHTML = glo.threads[i].name;
  name.setAttribute('class', 'thread-name');
  name.setAttribute('id', i+'-thread-name');
  (function (index) {
    name.onclick = function(){openThread(index);}
  })(i);
  nameBox.appendChild(name);
  // append the new thread name to either top or bottom
  var parent = $("thread-list");
  if (top) {parent.insertBefore(nameBox, parent.childNodes[0]);}
  else {parent.appendChild(nameBox);}
  //
  if (glo.threads[i].unread) {
    $(i+'-thread-name').classList.add("special");
    glo.unread++;
  }
  //the object that holds messages
  var thread = document.createElement("div");
  thread.setAttribute('class', 'thread removed');
  thread.setAttribute('id', i+'-thread');
  $('thread-box').appendChild(thread);
  // pic
  if (glo.threads[i].image && glo.threads[i].image !== "") {
    var authorPic = document.createElement("img");
    authorPic.setAttribute('src', glo.threads[i].image);
    authorPic.setAttribute('class', 'user-pic removed clicky');
    authorPic.setAttribute('id', i+'-thread-pic');
    var authorPicBox = document.createElement("a");
    (function (id) {
      authorPicBox.onclick = function(event){
        modKeyCheck(event, function(){
          fetchPosts(true, {postCode:'TFFF', author:id});
        });
      }
    })(glo.threads[i]._id);
    authorPicBox.setAttribute('href', "/"+glo.threads[i].name);
    authorPicBox.appendChild(authorPic);
    //authorPicBox.appendChild(document.createElement("br"));
    $("thread-title-area").insertBefore(authorPicBox, $("thread-title"));
  }
  //
  populateThread(i);
}

var populateThread = function (i) {
  if (!glo.threads[i].locked) {
    for (var j = glo.threads[i].thread.length-1; j > 0; j--) {
      createMessage(i, j);
    }
    createMessage(i, 0);
  }
}

var populateThreadlist = function () {
  var noThreads = true;
  for (var i = 0; i < glo.threads.length; i++) {
    if (glo.threads[i].thread.length !== 0) {
      noThreads = false;
      createThread(i);
    }
  }
  if (noThreads) {
    var name = document.createElement("div");
    name.setAttribute('id', 'no-threads');
    name.innerHTML = "no threads!";
    $("thread-list").appendChild(name);
  }
  if (glo.unread > 0) {
    $("inbox-panel-button").classList.remove("not-special");
  }
}

var block = function (threadIndex) {
  var blockCall = function () {
    ajaxCall('/block', 'POST', {blockeeID:glo.threads[threadIndex]._id, blocking:blocking}, function(json) {
      if (blocking) {
        $("block-button").innerHTML = "unblock";
        $("mark-unread").classList.add('removed');
        $("message-preview").classList.add('removed');
        $("message-writer").classList.add('removed');
        $('thread-status').classList.remove('removed');
        $('thread-status').innerHTML = '(blocking)';
        glo.threads[threadIndex].blocking = true;
      } else {                          // you are unblocking them,
        $("block-button").innerHTML = "block";
        glo.threads[threadIndex].blocking = false;
        if (glo.threads[threadIndex].blocked) {   // but are you still blocked by them?
          $("mark-unread").classList.add('removed');
          $("message-preview").classList.add('removed');
          $('thread-status').classList.remove('removed');
          $('thread-status').innerHTML = '(blocked)';
        } else {
          $('thread-status').classList.add('removed');
          $("mark-unread").classList.remove('removed');
          $("message-preview").classList.remove('removed');
        }
      }
    });
  }
  var blocking = false;
  var confMessage = "you want "+glo.threads[threadIndex].name+" to be able to message you?";
  if ($("block-button").innerHTML === "block") {
    blocking = true;
    confMessage = "you want to prevent "+glo.threads[threadIndex].name+" from being able to message you?<br><br>(in the event that "+glo.threads[threadIndex].name+" currently has a pending message to you, that message will still be delivered, all further messages will be prevented, starting now)";
  }
  verify(confMessage, null, null, function (result) {
    if (result) {
      var thread = glo.threads[threadIndex].thread;
      if (blocking && thread && thread[thread.length-1] && thread[thread.length-1].date === pool.getCurDate(-1)) {
        verify("you have a pending message to "+glo.threads[threadIndex].name+". If you block them now, that message will be deleted and will not be sent to them. That cool?", null, null, function (result) {
          if (result) {blockCall();}
        });
      } else {
        var len = glo.threads[threadIndex].thread.length-1;
        var last = glo.threads[threadIndex].thread[len];
        glo.threads[threadIndex].thread.splice(len,1);
        updatePendingMessage(threadIndex);
        blockCall();
      }
    }
  });
}

// encryption stuff
openpgp.initWorker({ path:'/assets/openpgp.worker.min.js' });

var encrypt = function (text, senderPubKey, recipientPubKey, callback) {
  openpgp.encrypt({
    data: text,
    publicKeys: openpgp.key.readArmored(senderPubKey).keys,
  }).then(function(encryptedDataSender) {
    openpgp.encrypt({
      data: text,
      publicKeys: openpgp.key.readArmored(recipientPubKey).keys,
    }).then(function(encryptedDataRecipient) {
      callback(encryptedDataSender.data, encryptedDataRecipient.data);
    },function (err) {            // callback for failed decryption
      return uiAlert("error, sorry! something went wrong with the encryption, please show this to staff");
    });
  });
}

var decryptPrivKey = function (pass, privKey) {
  var key = openpgp.key.readArmored(privKey).keys[0];
  key.decrypt(pass).catch(function (err) {
    // do nothing, this means the pass/key combo is wrong,
    // but we deal with that later
  });
  return key;
}

var decrypt = function (text, key, callback) {
  var options = {
    message: openpgp.message.readArmored(text),
    privateKeys: [key]
  };
  openpgp.decrypt(options).then(
    function (decryptedMessage) {
      callback(decryptedMessage.data, false);
    },
    function (err) {            // callback for failed decryption
    callback(null, true);
  });
}

var verifyPass = function (callback) {      // for decryption
  passPrompt({
    label:"<i>please</i> re-enter your password to decrypt your messages",
    callback: function(data) {
      if (data === null) {return;}
      loading();
      ajaxCall('/login', 'POST', data, function(json) {
        if (json.switcheroo) {
          return uiAlert("huh!? that's a different account...", "switcheroo!", function () {location.reload();});
        } else {
          unlockInbox(data.password, callback);
        }
      });
    }
  });
}

var unlockInbox = function (pass, callback) {     // decrypts all messages
        // assumes password has already been validated
  var key = decryptPrivKey(pass, glo.keys.privKey);
  // each thread
  var threadCount = glo.threads.length;
  var msgCount = {};
  for (var i = 0; i < glo.threads.length; i++) {
    if (!glo.threads[i].locked) {threadCount--;}
    else {
      // each message
      msgCount[i] = glo.threads[i].thread.length;
      for (var j = 0; j < glo.threads[i].thread.length; j++) {
        (function (i,j) {
          decrypt(glo.threads[i].thread[j].body, key, function (text, err) {
            if (err) {
              glo.threads[i].thread[j].body = "<c>***unable to decrypt message***</c>";
            } else {
              glo.threads[i].thread[j].body = pool.cleanseInputText(preCleanText(text))[1];
            }
            // image validation
            //(goes here)

            msgCount[i]--;
            if (msgCount[i] === 0) {
              glo.threads[i].locked = false;
              populateThread(i);
              threadCount--;
              if (threadCount === 0) {
                if (callback) {
                  callback();
                  loading(true);
                }
              }
            }
          });
        })(i,j);
      }
    }
  }
}

// login page stuff
var chooseInOrUp = function (up) {
  if (up === true) {
    $('up').classList.remove('removed');
    setCursorPosition($("name-input"), 0, $("name-input").value.length);
  }
  else {
    $('in').classList.remove('removed');
    setCursorPosition($("in-name-input"), 0, $("in-name-input").value.length);
  }
  $('inOrUp').classList.add('removed');
}

var backToLogInMenu = function () {
  $('up').classList.add('removed');
  $('in').classList.add('removed');
  $('inOrUp').classList.remove('removed');
}

var makeKeys = function (pass, callback) {
  openpgp.initWorker({ path:'/assets/openpgp.worker.min.js' });
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

var logInPageSubmit = function(inOrUp) {
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
  var y = pool.passwordValidate(data.password);
  if (x) {uiAlert(x);}
  else if (y) {uiAlert(y);}
  else {
    if (inOrUp === 'in') {
      var url = '/login';
    } else {
      var url = '/register';
      data.email = $('email-input').value.toLowerCase();
      //data.secretCode = $('secret-code').value;
      if (data.password !== $('pass-input-two').value) {
        uiAlert('passwords are not the same');
        return;
      }
    }
    signIn(url, data, function () {
      switchPanel('posts-panel');
      fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
    })
  }
}

var cookieNotification = function () {
  if (glo && glo.settings && !glo.settings.notifiedAboutCookie) {
    verify("the cops told me i gotta tell you bout how schlaugh stores exactly two tiny cookies on your browser for persistent sign in, and literally nothing else. If you see the cops tell the cops that I told you about the cookies.", "do not ever tell me this again", "tell me this again later", function (resp) {
      if (!resp) {return;}
      else {
        ajaxCall("/toggleSetting", 'POST' ,{setting: 'notifiedAboutCookie'}, function (json) {
          // do nothing
        });
      }
    });
  }
}

var signIn = function (url, data, callback) {
  loading();
  ajaxCall(url, 'POST', data, function(json) {
    // clear out any fetched author data so that we can reFetch it for messaging permissions
    var fetchedAuthors = _npa(['glo','pRef','author']);
    if (fetchedAuthors) {
      for (var author in fetchedAuthors) {
        if (fetchedAuthors.hasOwnProperty(author)) {
          fetchedAuthors[author].info = undefined;
        }
      }
    }
    if (json.needKeys) {
      makeKeys(data.password, function (keys) {
        if (json.newUser) {
          // key stuff, and opening staff message
          openpgp.encrypt({
            data: json.message,
            publicKeys: openpgp.key.readArmored(keys.pubKey).keys,
          }).then(function(encryptedMessage) {
            keys.newUserMessage = encryptedMessage.data;
            ajaxCall('/keys', 'POST', keys, function(json) {
              parseUserData(json.payload);
              setAppearance();
              unlockInbox(data.password);
              if (callback) {callback(json.payload);}
            });
          });
        } else {
          ajaxCall('/keys', 'POST', keys, function(json) {
            parseUserData(json.payload);
            setAppearance();
            unlockInbox(data.password);
            if (callback) {callback(json.payload);}
          });
        }
      });
    } else {
      parseUserData(json.payload);
      setAppearance();
      unlockInbox(data.password);
      if (callback) {callback(json.payload);}
    }
  });
}

var parseUserData = function (data) { // also sets glos and does some init "stuff"
  glo.username = data.username;
  glo.userID = data.userID;
  glo.bio = data.bio;
  glo.unread = 0;
  glo.threads = data.threads;
  glo.keys = data.keys;
  glo.threadRef = {};
  glo.settings = data.settings;
  glo.pending = data.pending;
  glo.pendingUpdates = Object.create(data.pendingUpdates);
  glo.fetchedPosts = Object.create(data.pendingUpdates);
  glo.userPic = data.userPic;
  glo.muteingRef = data.muted;
  glo.followingRef = {};
  glo.savedTags = {};
  for (var i = 0; i < data.savedTags.length; i++) {
    glo.savedTags[data.savedTags[i]] = true;
  }
  for (var i = 0; i < data.following.length; i++) {
    glo.followingRef[data.following[i]] = true;
  }
  glo.bookmarks = {};
  for (var i = 0; i < data.bookmarks.length; i++) {
    if (!glo.bookmarks[data.bookmarks[i].author_id]) {
      glo.bookmarks[data.bookmarks[i].author_id] = {};
    }
    glo.bookmarks[data.bookmarks[i].author_id][data.bookmarks[i].date] = true;
  }
  glo.collapsed = {};
  for (var i = 0; i < data.collapsed.length; i++) {
    glo.collapsed[data.collapsed[i]] = true;
  }

  updatePendingPost(glo.pending);
  populateThreadlist();
  pingPong(data.sessionKey)
  glo.sessionKey = data.sessionKey;

  //
  if (glo.username) {
    setAppearance();
    $("username").innerHTML = glo.username;
    $("username").classList.remove("removed");
    $('username').setAttribute('href', "/"+glo.username);
    $("username").onclick = function () {
      modKeyCheck(event, function(){
        fetchPosts(true, {postCode:'TFFF', author:glo.userID});
      });
    }
    $('edit-panel-title').innerHTML = "back to "+glo.username;
    $('edit-panel-title').setAttribute('href', "/"+glo.username);
    $('edit-panel-title').onclick = function (event) {
      modKeyCheck(event, function(){
        switchPanel('posts-panel')
      });
    }
    if (glo.pendingUpdates['bio']) {
      var bio = glo.pendingUpdates['bio'];
    } else {
      var bio = glo.bio;
    }
    setAuthorHeader('edit', {
      _id: glo.userID,
      author: glo.username,
      authorPic: glo.userPic,
      bio: bio,
    });
    $("sign-out").classList.remove("removed");
    $("sign-in").classList.add("removed");
    //
    $("panel-buttons").classList.remove("removed");
    $("footer-footer").classList.remove("removed");
    //
    if (glo.settings.includeTaggedPosts) {
      $('include-tagged-posts-toggle').innerHTML = '<icon class="far fa-check-square"></icon>';
    } else {
      $('include-tagged-posts-toggle').innerHTML = '<icon class="far fa-square"></icon>';
    }
    $('sign-to-save2').classList.add('removed');
    $('sign-to-save3').classList.add('removed');
    $('revert-appearance2').classList.add('removed');
    $('revert-appearance3').classList.add('removed');

    $("save-tag-form").classList.remove("removed");
    $("saved-tags-list").classList.remove("removed");
  }
  //
  if (glo.userPic) {updateUserPic(false, glo.userPic);}

  cookieNotification();
}

var setAppearance = function () {
  if (!$('postBackground-color-button2').jscolor) { // this is a hack to make sure jsColor has loaded
    setTimeout(function () {
      setAppearance();
    }, 10);
  } else {
    loadThemesFromBank();
    loadFontsFromBank();
    var defaultTheme = 'lorelei';
    glo.newSettings = {colors:{}}
    if (!glo.settings) {glo.settings = {};}
    if (!glo.settings.colors) {glo.settings.colors = {};}

    var colorProps = ['postBackground', 'text', 'linkText', 'background'];
    for (var i = 0; i < colorProps.length; i++) {
      if (!glo.settings.colors[colorProps[i]]) {
        glo.settings.colors[colorProps[i]] = themeBank[defaultTheme][colorProps[i]];
      }
    }
    changeAllColors(glo.settings.colors);
    //
    var props = [['font-family', "Roboto"], ['font-size', '16px'], ['line-height', 1.25], ['letter-spacing', '0px']];
    for (var i = 0; i < props.length; i++) {
      if (!glo.settings[props[i][0]]) {
        glo.settings[props[i][0]] = props[i][1];
      }
      changeFont(glo.settings[props[i][0]], props[i][0]);
      //$(props[i][0]+'-select').value = glo.settings[props[i][0]];
      $(props[i][0]+'-select2').value = glo.settings[props[i][0]];
    }
    //
    if (!glo.settings.preset) {
      glo.settings.preset = defaultTheme;
    }
    //$('preset-select').value = glo.settings.preset;
    $('preset-select2').value = glo.settings.preset;
  }
}

var changeAllColors = function (colorObject, init) {
  for (var prop in colorObject) {
    if (colorObject.hasOwnProperty(prop)) {
      changeColor(colorObject[prop], prop);
      if (!init) {
        // set button
        if (colorObject[prop][0] === '#') {
          //$(prop+'-color-button').jscolor.fromString(String(colorObject[prop]).slice(1));
          $(prop+'-color-button2').jscolor.fromString(String(colorObject[prop]).slice(1));
        } else {
          var arr = colorObject[prop].slice(4,-1).replace(/ /g, '').split(",");
          //$(prop+'-color-button').jscolor.fromRGB(Number(arr[0]),Number(arr[1]),Number(arr[2]));
          $(prop+'-color-button2').jscolor.fromRGB(Number(arr[0]),Number(arr[1]),Number(arr[2]));
        }
      }
    }
  }
}

var initSchlaugh = function (user, callback) {
  if (user) {
    ajaxCall('/~payload', 'GET', "", function(json) {
      //keys are created at sign in, this forces out people who are already in
      //  with a persistent login cookie, such that they will have to sign in and make keys
      if (json.needKeys) {return signOut();}
      else {
        parseUserData(json.payload);
        if (callback) {callback();}
      }
    });
  } else {
    if (callback) {callback();}
  }
}

var showPassword = function (bool, elemName, elemArr) {       //or hide pass, if !bool
  if (bool) {                                               // show it
    $(elemName).classList.add('removed');
    $(elemName+"c").classList.remove('removed');
    for (var i = 0; i < elemArr.length; i++) {$(elemArr[i]).type = 'text';}
  } else {                                                    // hide it
    $(elemName+"c").classList.add('removed');
    $(elemName).classList.remove('removed');
    for (var i = 0; i < elemArr.length; i++) {$(elemArr[i]).type = 'password';}
  }
}

var verifyEmailExplain = function () {
  uiAlert(`schlaugh stores your email in <a href="https://en.wikipedia.org/wiki/Cryptographic_hash_function#Password_verification" target="_blank">"hashed"</a> form, meaning we can't just tell you what email address you have on file with us. But you can input what you think it is and we can tell you if that's right. And it's good to have a good email address stored with us in case you need to reset your password. But please don't need to reset your password.`)
}

var imageUploadingExplain = function () {
  uiAlert(`schlaugh does not support directly uploading images. You'll need to upload your image elsewhere(such as <a href="https://imgur.com/upload" target="_blank">imgur</a>), and then provide a link to the image file<br><br>please note that the link you provide must be directly to an image <i>file</i>, not a webpage. As in, right click on your image and click "copy image address", to get a link that ends with a file extension, like "png", "gif", "jpg", etc`);
}

var optionalEmailExplain = function () {
  uiAlert(`the ONLY time schlaugh will <i>ever</i> email you is if you lose your password and need to recover it via email. In fact, we only store a hashed form of your email, so we couldn't email you if we tried, and if our database gets hacked your email address won't be compromised. If you still don't want to provide an email, that's fine, it just means we can't help you gain access to your account in the event of a lost or stolen password.`);
}

var changeUsername = function () {
  verify("you sure? This will change the url for your profile, breaking any links to your current username. And your current username will be up for grabs for anyone else to claim<br><br>also this will require a refresh(so just like don't have any unsaved text sitting in an editor)<br><br>go ahead?", "let's do it", "nevermind", function (resp) {
    if (!resp) {return;}
    else {
      loading();
      ajaxCall('/changeUsername', 'POST', {newName:$('change-username-input').value}, function(json) {
        loading(true);
        if (!json.error) {
          uiAlert('your username has been changed<br><br>schlaugh will now reload' ,"huzzah", function () {
            location.reload();
          });
        }
      });
    }
  });
}

var verifyEmail = function () {
  loading();
  ajaxCall('/verifyEmail', 'POST', {email:$("email-verify-input").value.toLowerCase()}, function(json) {
    if (json.match) {
      uiAlert('a perfect match!<br><br>in the event of a lost password, "'+$("email-verify-input").value+'" is your recovery email', "aye, aye, captain!");
    } else {
      verify("hmm...<br><br>that does not match our records. you can try again, or change our records to this?", "change", "again", function (result) {
        if (!result) {return;}
        else {
          verify('you want the email associated with this account to be "'+$("email-verify-input").value+'"?', "please!", "nahhhh", function (result) {
            if (!result) {return;}
            else {
              // validate email format,
              loading();
              ajaxCall('/changeEmail', 'POST', {email:$("email-verify-input").value}, function(json) {
                if (json) {
                  uiAlert('congratulations!<br><br>in the event of a lost password, "'+json.email+'" is your recovery email')
                }
              });
            }
          });
        }
      });
    }
  });
}

var changePassword = function () {
  if ($("password-change0").value === "" || $("password-change1").value === "" || $("password-change2").value === "") {
    uiAlert("empty field");
  } else if ($("password-change1").value !== $("password-change2").value) {
    uiAlert("must be same same");
  }
  else {
    verify("this may take a moment. And will require a refresh(so just like don't have any unsaved text sitting in an editor)<br><br>is that alright?", "go ahead", "maybe later", function (resp) {
      if (!resp) {return;}
      else {
        loading();
        var data = {
          oldPass: $("password-change0").value,
          newPass: $("password-change1").value,
        }
        ajaxCall('/changePasswordStart', 'POST', data, function(json) {
          if (json.noMatch) {
            return uiAlert("incorrect current password");
          }
          else {
            makeKeys(data.newPass, function (newKeys) {
              var newData = {
                newPass: data.newPass,
                newKeys: newKeys,
              }
              var oldKey = decryptPrivKey(data.oldPass, json.key);
              // each thread
              var threadCount = 0;
              for (var i in json.threads) {
                if (json.threads.hasOwnProperty(i) && json.threads[i].thread.length > 0) {
                  threadCount++;
                }
              }
              if (threadCount === 0) {
                newData.newThreads = {}
                return makePassFinCall(newData);
              } else {
                var msgCount = {};
                for (var i in json.threads) {
                  if (json.threads.hasOwnProperty(i) && json.threads[i].thread.length > 0) {
                    // each message
                    msgCount[i] = json.threads[i].thread.length;
                    for (var j = 0; j < json.threads[i].thread.length; j++) {
                      (function (i,j) {
                        decrypt(json.threads[i].thread[j].body, oldKey, function (text, err) {
                          if (err) {
                            // do nothing, just leave the bad text there
                            msgCount[i]--;
                            if (msgCount[i] === 0) {
                              threadCount--;
                              if (threadCount === 0) {
                                newData.newThreads = json.threads;
                                return makePassFinCall(newData);
                              }
                            }
                          } else {
                            //re-encrypt
                            openpgp.encrypt({
                              data: text,
                              publicKeys: openpgp.key.readArmored(newKeys.pubKey).keys,
                            }).then(function(encryptedMessage) {
                              json.threads[i].thread[j].body = encryptedMessage.data;
                              msgCount[i]--;
                              if (msgCount[i] === 0) {
                                threadCount--;
                                if (threadCount === 0) {
                                  newData.newThreads = json.threads;
                                  return makePassFinCall(newData);
                                }
                              }
                            });
                          }
                        });
                      })(i,j);
                    }
                  }
                }
              }
            });
          }
        });
      }
    });
  }
}

var makePassFinCall = function (newData) {
  ajaxCall('/changePasswordFin', 'POST', newData, function(json) {
    uiAlert('your password has been changed<br><br>schlaugh will now reload' ,"huzzah", function () {
      location.reload();
    });
  });
}

var submitRecoveryRequest = function () {
  if ($("username-lost").value !== "" && $("email-lost").value !== "") {
    var data = {username: $("username-lost").value, email: $("email-lost").value.toLowerCase(),}
    loading();
    ajaxCall('/passResetRequest', 'POST', data, function(json) {
      loading(true);
      $("lost-password-submission").classList.remove("hidden");
      $("recovery-submit-button").classList.add("removed");
      $("recovery-reset-button").classList.remove("removed");
    });
  } else {
    uiAlert("invalid input");
  }
}

var resetRecoveryRequest = function () {
  $("username-lost").value = "";
  $("email-lost").value = "";
  $("recovery-submit-button").classList.remove("removed");
  $("recovery-reset-button").classList.add("removed");
  $("lost-password-submission").classList.add("hidden");
}

var submitRecoveryName = function () {
  if ($("username-recovery").value === "") {return uiAlert("empty input!")}
  var data = {username: $("username-recovery").value, code: glo.resetCode,}
  if ($("password-recovery1").value !== "" && $("password-recovery2").value !== "") {
    if ($("password-recovery1").value === $("password-recovery2").value) {
      verify("final warning:<br><br>by resetting your password you are losing access to your messaging history. Only do this if you are sure there is no way you will ever figure out what your password was. Or if you just don't care about your old messages.<br><br>Go ahead and reset password?", 'yes', 'no', function (resp) {
        if (!resp) {return;}
        else {
          data.password = $("password-recovery1").value;
          makeResetCall(data);
        }
      });
    } else {return uiAlert("password fields are not identical!");}
  } else if ($("password-recovery1").value !== "" || $("password-recovery2").value !== "") {
    return uiAlert("password fields are not identical!");
  } else {
    makeResetCall(data);
  }
}

var makeResetCall = function (data) {
  loading();
  ajaxCall('/resetNameCheck', 'POST', data, function(json) {
    if (json.verify) {
      loading(true);
      $("recovery-username-box").classList.add("removed");
      $("recovery-pass-box").classList.remove("removed");
      $("submit-password-reset").classList.add("change-pass-button-bump");
    } else if (json.victory) {
      loading(true);
      $("pass-reset-form").classList.add("removed");
      $("pass-reset-success").classList.remove("removed");
    } else {
      if (json.attempt === 5) {
        uiAlert(`the inputted username does not match the code for which it was generated<br><br>attempt 5 of 5<br><br>try a new code?`, "ok", function () {
          switchPanel('lost-panel');
          simulatePageLoad();
        });
      } else {
        uiAlert("the inputted username does not match the code for which it was generated<br>please try again<br><br>attempt "+json.attempt+" of 5");
      }
    }
  });
}
