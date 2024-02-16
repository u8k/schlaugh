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

var submitPic = function (remove, pending) {
  loading();
  if (remove) {
    picURL = "";
  } else if (pending) {
    var picURL = $('pending-image-url').value;
  } else {
    var picURL = $('current-image-url').value;
  }
  ajaxCall('/changePic', 'POST', {url:picURL, pending:pending}, function(json) {
    if (pending || !remove) {
      _npa(['glo', 'pendingUpdates', 'iconURI'], picURL);
    } else {
      glo.userPic = picURL;
    }
    updateUserPic();
    loading(true);
  });
}
var removeCurrentUserPic = function () {
  verify(`this will remove your user image IMMEDIATELY, meaning that your posts/profile will have no image alongside them until the next schlaupdate at the earliest<br><br>if you want to seamlessly switch your image at the next schlaupdate, you can schedule that now by putting in new image url and clicking "update image"<br><br>do you want to remove your current user image NOW?`, 'YES!', '...no', function (resp) {
    if (!resp) {return}
    submitPic(true);
  });
}

var updateUserPic = function () {
  $("pending-image-url").value = glo.pendingUpdates.iconURI;
  $("current-image-url").value = glo.userPic;
  if (glo.pendingUpdates.iconURI) {
    $("pending-user-image").setAttribute('src', glo.pendingUpdates.iconURI);
    $("pending-user-image").classList.remove('removed');
    $("submit-current-image").classList.add('removed');
    $('current-user-image-label').innerHTML = "current user image:";
    //
    $('pending-user-image-box').classList.remove('removed');
  } else {
    $('current-user-image-label').innerHTML = "user image:"
    $("submit-current-image").classList.remove('removed');
    $('pending-user-image-box').classList.add('removed');
  }
  if (glo.userPic) {
    $("current-user-image").setAttribute('src', glo.userPic);
    $("current-user-image").classList.remove('removed');
    $("remove-current-image").classList.remove('removed');
    $("no-user-image").classList.add('removed');
    //
    $('current-user-image-box').classList.remove('removed');
  } else if (!glo.pendingUpdates.iconURI) {
    $("no-user-image").classList.remove('removed');
    $("current-user-image").classList.add('removed');
    //
    $('current-user-image-box').classList.remove('removed');
  } else {
    $('current-user-image-box').classList.add('removed');
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
      var props = ['preset', 'font-family', 'font-size', 'line-height', 'letter-spacing, max-width'];
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
  var props = ['preset', 'font-family', 'font-size', 'line-height', 'letter-spacing', 'max-width'];
  for (var i = 0; i < props.length; i++) {
    if (glo.newSettings[props[i]]) {
      changeFont(glo.settings[props[i]], props[i]);
      $(props[i]+'-select').value = glo.settings[props[i]];
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

var getStyleSheet = function () {
  var sheet;
  for (var i = 0; i < document.styleSheets.length; i++) {
    if (document.styleSheets[i].href === window.location.origin+"/game.css") {
      // it's sort of weird to have it write to the "game" css, it's NOT game specific css being written, but it works fine, and avoids overwriting css in the main
      sheet = document.styleSheets[i];
      break;
    }
  }
  return sheet;
}

var changeColor = function (colorCode, type) {          // makes the new CSS rule
  var sheet = getStyleSheet();
  if (!sheet) {return;}

  if (type === "postBackground") {
    var selector = ".post, .message, .editor, .content-box, button, .footer-button, .pop-up, .post-background, panelButtons";
    var attribute = "background-color";
    // selected(highlighted) text color
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === '::selection, .fake-text-color-class, .panel-button-selected') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("::selection, .fake-text-color-class, .panel-button-selected {color: "+colorCode+";}", sheet.cssRules.length);

  } else if (type === "linkText") {
    var selector = ".special";
    var attribute = "color";
    // box shadow color when focused
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === '*:focus') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("*:focus {box-shadow: 0 0 4px 2px "+colorCode+";}", sheet.cssRules.length);

    // alt focus, drop shadow
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === '.filter-focus:focus') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule(".filter-focus:focus {filter: drop-shadow(0px 0px 3px "+colorCode+") drop-shadow(0px 0px 2px "+colorCode+") drop-shadow(0px 0px 3px "+colorCode+");}", sheet.cssRules.length);

    // alt focus2, INSET box shadow
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === '.inset-focus:focus') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule(".inset-focus:focus {box-shadow: inset 0 0 5px 4px "+colorCode+";}", sheet.cssRules.length);

    // alt focus3, shifted box shadow just for collapse buttons
    // for (var i = sheet.cssRules.length-1; i > -1; i--) {
    //   if (sheet.cssRules[i].selectorText === '.collapse-focus:focus') {
    //     sheet.deleteRule(i);
    //     i = -1;
    //   }
    // }
    // sheet.insertRule(".collapse-focus:focus {box-shadow: 0 0 4px 2px "+colorCode+";}", sheet.cssRules.length);

  } else if (type === "text") {
    var selector = "body, input, select, .post, .message, .editor, .content-box, button, .pop-up, .post-background, a, a.visited, a.hover";
    var attribute = "color";
    // border color
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === 'button') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("button, a {border-color: "+colorCode+" !important;}", sheet.cssRules.length);
    // selected(highlighted) background
    for (var i = sheet.cssRules.length-1; i > -1; i--) {
      if (sheet.cssRules[i].selectorText === '::selection, .fake-background-class, .panel-button-selected, .spoil') {
        sheet.deleteRule(i);
        i = -1;
      }
    }
    sheet.insertRule("::selection, .fake-background-class, .panel-button-selected, .spoil {background-color: "+colorCode+";}", sheet.cssRules.length);

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
  } else if (type === "background") {
    var selector = "body, input, select, .main-background";
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
  var sheet = getStyleSheet();
  if (!sheet) {return;}
  //
  if (attribute === "font-family" && fontBank[value]) {
    value = value +", "+ fontBank[value];
  }
  if (attribute === "max-width") {
    sheet.insertRule(".post"+" {max-width: "+value+"px;}", sheet.cssRules.length);
  } else {
    sheet.insertRule(".reader-font"+" {"+attribute+": "+value+";}", sheet.cssRules.length);
  }
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
  $('preset-select').value = "custom";
  glo.newSettings.preset = "custom";
}

var selectFont = function (elem, prop) {
  var value = $(elem).value;
  if (!(!glo.newSettings[prop] && glo.settings[prop] === value) && glo.newSettings[prop] !== value && value !== "*more*") {
    changeFont(value, prop);
    glo.newSettings[prop] = value;
    if (glo.username) {
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

var openAppearanceSettings = function () {
  $('appearance-options-wrapper').classList.remove('hidden');
  //
  if ($('text-options-pop-up').classList.contains("hidden")) {
    $('preset-select').focus();
  } else {
    $('font-family-select').focus();
  }
}
var toggleColorsAndTextSettings = function () {
  if ($('text-options-pop-up').classList.contains("hidden")) {
    $('text-options-pop-up').classList.remove('hidden');
    $('color-options-pop-up').classList.add('hidden');
    $('font-family-select').focus();
  } else {
    $('color-options-pop-up').classList.remove('hidden');
    $('text-options-pop-up').classList.add('hidden');
    $('preset-select').focus();
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
    linkText: '#005DFF',
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
  "rain":{
    postBackground: '#B4E7DC',
    text: '#464E74',
    linkText: '#407FD6',
    background: '#7B98A9',
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
    linkText: '#8227FF',
    background: '#AFDCFA',
  },
  "pearl":{
    postBackground: '#FFFFF1',
    text: '#3E6897',
    linkText: '#FDB6BC',
    background: '#D6FFF5',
  },
  "garnet":{
    postBackground: '#0B0000',
    text: '#F7BB22',
    linkText: '#FF75A9',
    background: '#72002A',
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
  if ($('preset-select').options.length < 2) { //check if already loaded
    for (var theme in themeBank) {
      if (themeBank.hasOwnProperty(theme)) {
        var option = document.createElement("option");
        option.text = theme;
        $('preset-select').add(option);
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
  'League Spartan': 'serif',
  'serif': 'serif',
  'sans-serif': 'sans-serif',
  'monospace': 'monospace',
}
var loadFontsFromBank = function () {
  if ($('font-family-select').options.length < 2) { //check if already loaded
    for (var font in fontBank) {
      if (fontBank.hasOwnProperty(font)) {
        var option = document.createElement("option");
        option.text = font;
        $('font-family-select').add(option);
      }
    }
  }
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
    $("panel-buttons-wrapper").classList.add("removed");
    switchPanel("clicker-panel");
    simulatePageLoad('~click', '*click*');
    if (json.signedIn && json.eligible) {
      $("click-button").focus();
    }
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
    if (typeof glo !== 'undefined' && glo.username) {
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
  switchPanel("meta-panel");
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
          } else if (glo.openPanel === "clicker-panel") {
            openClickerGame();
          } else if (glo.openPanel === "schlaunquer-panel") {
            openSchlaunquerPanel(gameRef.game_id, gameRef.currentBoardDate);
          }
        });
      }
    }
  });
}

var uiAlert = function (message, btnTxt, callback, annoying) {
  if (!$("alert")) {return console.error(message);}
  loading(true, true);
  if (!message) {  //close the alert
    $("alert").classList.add("hidden");
    blackBacking(true);
    $("pop-up-backing").onclick = function () {
      blackBackingClickHandler();
    }
  } else {
    var oldFocus = document.activeElement;
    $("alert").classList.remove("hidden");
    blackBacking();
    $("alert-text").innerHTML = message;
    if (btnTxt) {$('alert-submit').innerHTML = btnTxt;}
    else {$('alert-submit').innerHTML = "'kay";}
    var exit = function(){
      if (callback) {callback();}
      oldFocus.focus();
      uiAlert(false);
    }
    if (!annoying) {
      $('alert-submit').focus();
      $("pop-up-backing").onclick = exit;
    } else {
      $("pop-up-backing").onclick = null;
    }
    $("alert-submit").onclick = exit;
  }
}

var verify = function (message, yesText, noText, callback, noFocus) {
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
      if (!noFocus) {   // for some reason setting focus glitches the post if you selective quote when another editor is open and then cancel the quoting
        oldFocus.focus();
      }
      if (callback) {callback(false);}
    }
    $("confirm-no").onclick = exit;
    $("pop-up-backing").onclick = exit;
  }
}

var blackBacking = function (away) {
  if (away) {
    if (glo.backingCount) {glo.backingCount--;}
    if (!glo.backingCount) {
      $("pop-up-backing").style.opacity="0";
      glo.backingTimer = setTimeout(function () {
        $("pop-up-backing").classList.add('hidden');
      }, 300);
      //
      var elemList = document.getElementsByClassName('pop-up');
      for (var i = 0; i < elemList.length; i++) {
        elemList[i].classList.add('hidden');
      }
      $('following-list').classList.add('removed');
    }
  } else {
    if (!glo.backingCount) {glo.backingCount = 1;}
    else {glo.backingCount++;}
    clearTimeout(glo.backingTimer);
    $("pop-up-backing").classList.remove('hidden');
    $("pop-up-backing").style.opacity="1";
  }
}
var blackBackingClickHandler = function () {
  if (!glo.loading) {
    glo.backingCount = 0;
    blackBacking(true);
  }
}

var loading = function (stop, keepBacking) {
  if (stop) {
    glo.loading = false;
    if (!keepBacking) {
      blackBacking(true);
    } else {
      if (glo.backingCount) {glo.backingCount--;}
    }
    $("loading-box").style.opacity="0";
    glo.loadingTimer = setTimeout(function () {
      $("loading-box").classList.add('hidden');
    }, 300);
  } else {
    glo.loading = true;
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

var simulatePageLoad = function (newPath, newTitle, faviconSrc, noScroll) {
  // scrolls to top, updates the url, and the browser/tab title
  // defaults to home if no args given, second arg defaults to first if not given
  // if path parmeter === true, then it doesn't change
  if (!noScroll) {
    setTimeout(function () {
      window.scroll(0, 0);
    }, 100);
  }
  if (!newPath) {
    newPath = "";
  }
  if (!newPath || newTitle === false) {
    newTitle = "s c h l a u g h";
  }
  if (newTitle) {
    document.title = newTitle;
  }
  if (newPath !== true && "/"+newPath !== window.location.pathname) {
    history.pushState(null, null, "/"+newPath);
    if (!newTitle) {newTitle = newPath;}
  }
  //
  document.body.onkeydown = null;
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
  else {link.href = "/favicon.png";}
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

var insertStringIntoStringAtPos = function (stringOuter, stringInner, pos) {
  return stringOuter.substr(0,pos)+ stringInner +stringOuter.substr(pos);
}

var convertCut = function (string, id, expandable, pos) {
  // changes cut tags into functional cuts, needs unique id

  if (expandable) {
    var classAsign = "removed expandable";
  } else {
    var classAsign = "removed";
  }

  // convert the cut element into a button
  // first clip out the "cut"
  string = string.substr(0,pos-3) + string.substr(pos);
  pos = pos-3;

  // replace with a button and class/click stuff
  var b = `button class='text-button special' onclick='$("`+id+`").classList.remove("removed"); this.classList.add("removed");'`;
  string = insertStringIntoStringAtPos(string, b, pos);
  pos += b.length;
  var buttonAndexpandIcon = `<icon class="expand-button">`+iconBank.expand+`</icon></button>`;

  // find the closing cut tag
  var gap = string.substr(pos).search('</cut>');
  if (gap === -1) { // if there is no closing cut tag...(there always should be)
    string = string + buttonAndexpandIcon +"<innerCut class='"+classAsign+"'>";
  } else {                   // the case that is actually important
    pos += gap;

    //snip out the closing cut tag
    string = string.substr(0,pos) + string.substr(pos+6);
    //pos = pos-6;
    string = insertStringIntoStringAtPos(string, buttonAndexpandIcon, pos);
    pos = pos+buttonAndexpandIcon.length;
    //insert an innerCut, leave the innerCut open, to be closed later by prepTextForRender
    var insrt = "<innerCut id="+id+" class='"+classAsign+"'>";
    string = insertStringIntoStringAtPos(string, insrt, pos);
  }
  return string;
}

var convertNote = function (string, id, elemCount, expandable, tagStartPos) {
  // changes note tags into functional notes, needs id so that every note has a unique id tag on the front end,
  if (expandable) {
    var classAsign = "removed expandable";
  } else {
    var classAsign = "removed";
  }

  // is it the buttonless note syntax?
  if (string.substr(tagStartPos).search(/<note linkText="/) !== 0) {
    if (string.substr(tagStartPos).search(/<note>/) !== 0) {return string;}
    string = insertStringIntoStringAtPos(string, ` linkText=""`, tagStartPos+5);
  }
  var startLinkPos = tagStartPos+16;
  var closePos = string.substr(startLinkPos).search(/">/);
  if (closePos === -1) {return string += '">';}
  string = removeExtraLineBreak(string, startLinkPos+closePos+1);
  //
  var linkText = string.substr(startLinkPos, closePos);
  var innerStartPos = startLinkPos+closePos+2;

  var preTag = string.substr(0,tagStartPos);
  var postTag = string.substr(innerStartPos);
  var insert = `<button class="special text-button" id="`+id+"-"+elemCount+`" onclick="collapseNote('`+id+"-"+elemCount+`','`+id+"-"+(elemCount+1)+`', true, '`+id+`')">`+linkText
    +`<icon id="`+id+"-"+(elemCount+1)+`-note-top-plus" class="expand-button">`+iconBank.expand+`</icon>`
    +`<icon id="`+id+"-"+(elemCount+1)+`-note-top-minus" class="removed expand-button">`+iconBank.collapse+`</icon></button>`
    +`<innerNote class="`+classAsign+`" id="`+id+"-"+(elemCount+1)+`">`;

  string = preTag+insert+postTag;

  // find the trailing </note>, convert to innerNote and add the collapseButton
  var noteEndPos = findClosingNoteTag(string, tagStartPos+insert.length);
  //snip out the closing note tag
  string = string.substr(0,noteEndPos) + string.substr(noteEndPos+7);
  //
  var innerNoteCollapseButtonAndClosingInnerNote = `<button onclick="collapseNote('`+id+"-"+elemCount+`', '`+id+"-"+(elemCount+1)+`', false, '`+id+`', true)" class="text-button collapse-button-bottom filter-focus" id="`+id+"-"+(elemCount+1)+`-note-close">`+iconBank.collapse+`</button></innerNote>`;
  string = insertStringIntoStringAtPos(string, innerNoteCollapseButtonAndClosingInnerNote, noteEndPos);
  //
  return string;
}

var convertMaths = function (string, pos, macros) {
  if (!pos) {pos = 0; macros = {};}

  // find next opening latex tag
  pos = string.indexOf("<latex>", pos);
  if (pos === -1) {
    return string;
  }
  // find the closing of the following "x" tag
  pos = string.indexOf("'>", pos+7);
  pos += 2;
  var pre = string.substr(0, pos);
  var close = string.indexOf("</x>", pos);
  //
  var theMath = string.substr(pos,close-pos);
  theMath = katex.renderToString(theMath, {throwOnError: false, maxSize:2, macros:macros});
  //
  var post = string.substr(close);
  //
  string = pre + theMath + post;
  //
  return convertMaths(string, close, macros);
}

var convertSpoils = function (string) {
  var modString = string.replace(/<\/spoil>/g, `</a>`);
  modString = modString.replace(/<spoil>/g, `<a href="javascript:void(0);" onclick="toggleSpoil(this)" class='spoil text-button'>`);
  return modString;
}

var toggleSpoil = function (elem) {
  elem.classList.toggle('spoil');
}

var convertCodes = function (string, pos) {
  // check the text between code tags,
  //    replacing "&" with "&amp;"
  //    and THEN replace "<" with "&lt;"

  // init
  if (!pos) {
    pos = 0;
  }

  var next = string.substr(pos).search(/<code>/);
  if (next === -1) {return string;}
  else {
    pos += next+6;
    var endPos = string.substr(pos).search("</code>");
    if (endPos === -1) {         //unpaired code tag
      var newString = string.substr(pos).replace(/&/g, '&amp;');
      newString = newString.replace(/</g, '&lt;');
      string = string.substr(0,pos)+newString+"</code>";
    } else {
      var newString = string.substr(pos, endPos).replace(/&/g, '&amp;');
      newString = newString.replace(/</g, '&lt;');
      string = string.substr(0,pos)+newString+string.substr(pos+endPos);
      pos += endPos+1;
    }
    return convertCodes(string, pos+1);
  }
}
var unConvertCodes = function (string, pos) {
  // for quoting, this does the opposite of convertCodes
  if (!pos) {
    pos = 0;
  }

  var next = string.substr(pos).search(/<code>/);
  if (next === -1) {return string;}
  else {
    pos += next+6;
    var endPos = string.substr(pos).search("</code>");
    if (endPos === -1) {         //unpaired code tag
      var newString = string.substr(pos).replace(/&lt;/g, '<');
      newString = newString.replace(/&amp;/g, '&');
      string = string.substr(0,pos)+newString;        // do NOT throw on the closing tag
    } else {
      var newString = string.substr(pos, endPos).replace(/&lt;/g, '<');
      newString = newString.replace(/&amp;/g, '&');
      string = string.substr(0,pos)+newString+string.substr(pos+endPos);
      pos += endPos+1;
    }
    return unConvertCodes(string, pos+1);
  }
}

var swapInBrTagsButNotTweenLatexTags = function (string, prevClos) {
  if (!prevClos) {prevClos = 0;}

  var next = string.indexOf("<latex>", prevClos);
  if (next === -1) {
    return string.substr(0,prevClos) + string.substr(prevClos).replace(/\r?\n|\r/g, '<br>');
  }

  var pre = string.substr(0, prevClos)
  var mid = string.substr(prevClos, next-prevClos).replace(/\r?\n|\r/g, '<br>');
  var post = string.substr(next);
  string = pre+mid+post;


  var nextClos = string.indexOf("</latex>", pre.length + mid.length);
  if (nextClos === -1) {
    return pre + mid + post.replace(/\r?\n|\r/g, '<br>');
  } else {
    return swapInBrTagsButNotTweenLatexTags(string, nextClos);
  }
}

var sanctionedTagRef = {
  'b':true,
  '/b':true,
  'i':true,
  '/i':true,
  'u':true,
  '/u':true,
  's':true,
  '/s':true,
  'l':true,
  '/l':true,
  'c':true,
  '/c':true,
  'r':true,
  '/r':true,
  'cut':true,
  '/cut':true,
  'note':true,
  '/note':true,
  'code':true,
  '/code':true,
  'ascii':true,
  '/ascii':true,
  'secret':true,
  '/secret':true,
  'latex':true,
  '/latex':true,
  'spoil':true,
  '/spoil':true,
  'quote':true,
  '/quote':true,
  'li':true,
  '/li':true,
  'ul':true,
  '/ul':true,
  'ol':true,
  '/ol':true,
  'a':true,
  '/a':true,
  "img":true,
  "br":true,
  "br/":true,
  "hr":true,
  "hr/":true,
  "hr /":true,
}
var extraSanctionedTagRef = {
  "x":true,
  "icon":true,
  "/icon":true,
  "button":true,
  "/button":true,
  "innerNote":true,
  "/innerNote":true,
  "innerCut":true,
  "/innerCut":true,
}
var selfClosingTagRef = {
  "img":true,
  "br":true,
  "br/":true,
  "hr":true,
  "hr/":true,
  "hr /":true,
}

var tagsThatForceNewLine = {
  'l':true,
  '/l':true,
  'c':true,
  '/c':true,
  'r':true,
  '/r':true,
  'ascii':true,
  '/ascii':true,
  'quote':true,
  '/quote':true,
  'li':true,
  '/li':true,
  'ul':true,
  '/ul':true,
  'ol':true,
  '/ol':true,
  "hr":true,
  "hr/":true,
  "hr /":true,
  "img":true,
}
var removeExtraLineBreak = function (string, pos) {
  pos++;
  if (string.substr(pos,4) === "<br>") {
    string = string.substr(0,pos) + string.substr(pos+4);
  } else if (string.substr(pos,1) === "\n") {
    string = string.substr(0,pos) + string.substr(pos+1);
  }
  return string;
}

var killBadTag = function (string, pos) {
  return string.substr(0,pos-1) + '&lt;' + string.substr(pos);
}
var deWeaveAndRemoveUnmatchedAndUnsanctinedTags = function (string, extracting, pos, tagStack) {
  // this also handles stripping out any non-sanctioned tags

    // init
    if (!pos) {
      pos = 0; tagStack = [];
    }
  // get next "<"
  var next = string.substr(pos).search(/</)+1;
  if (next === 0) {           // we have seen all there is, it is time to go home
    for (var i = tagStack.length-1; i > -1; i--) {
      string = string + "</"+tagStack[i].tag+">";
    }
    return string;
  } else {
    pos += next;
    // get text following <, up to a space or ">"
    var close = string.substr(pos).search(/[ >]/);
    var tag = string.substr(pos, close);

    if (string[pos+close] === " ") {  // is that allowed?
      if (tag === "img") {
        // might be good to eventually handle this here, for now it's being taken care of by "screenInputTextForImagesAndLinks"
      } else if (tag === "a") {
        // likewise ^
      } else if (tag === "note") {
        if (string.substr(pos, 14) !== 'note linkText=') {
          string = killBadTag(string, pos);
          return deWeaveAndRemoveUnmatchedAndUnsanctinedTags(string, extracting, pos, tagStack);
        }
      } else if (tag === "hr" && string.substr(pos, close+3) === "hr />") {
        tag = "hr /";
        close+=2;

      } else {
        string = killBadTag(string, pos);
        return deWeaveAndRemoveUnmatchedAndUnsanctinedTags(string, extracting, pos, tagStack);
      }
    }

    // is this an allowed tag at all?
    if (!sanctionedTagRef[tag.toLowerCase()] && !extracting) {
      string = killBadTag(string, pos);

    } else {  // tag is allowed
      // force it to lowercase
      if (sanctionedTagRef[tag.toLowerCase()]) {
        tag = tag.toLowerCase();
      }
      string = string.substr(0,pos) + tag + string.substr(pos+close);
      //
      if (tag === "img") { close = string.substr(pos).search(/[>]/);}
      //
      pos += close;
      //
      if (tagsThatForceNewLine[tag] && !extracting) {
        string = removeExtraLineBreak(string, pos);
      }

      if (selfClosingTagRef[tag]) {
        // do nothing
      } else {
        if (tag === "latex") {
          // find the closing latex tag, and move pos to skip checking everything in between
          var closingTag = string.indexOf("</latex>", pos);
          if (closingTag === -1) {
            pos++;
            string = insertStringIntoStringAtPos(string, "</latex>", pos);
            pos += 8;
          } else {
            pos = closingTag + 8;
          }
        } else if (tag.substr(0,1) === "/") {  //if closing, then first make sure it's in the tag stack at all, if not: remove it
          tag = tag.substr(1);
          var isOpen = false;
          for (var i = 0; i < tagStack.length; i++) {
            if (tagStack[i].tag === tag) {
              isOpen = true;
              break;
            }
          }
          if (!isOpen) {  // take out the trash
            string = string.substr(0,pos-(tag.length+2)) + string.substr(pos+1);
            pos -= tag.length+2;
          } else {    // the tag was in the stack, and thus open, so we close it
            // match to tag stack, closing all tags above it, and popping them and the match from the stack
            for (var i = tagStack.length-1; i > -1; i--) {
              if (tagStack[i].tag === tag) {
                tagStack.pop();
                break;
              } else {
                string = insertStringIntoStringAtPos(string, "</"+tagStack[i].tag+">", (pos-close)-1);
                pos+= tagStack[i].tag.length +3;
                tagStack.pop();
              }
            }
          }
        } else {  // it is an opening tag
          tagStack.push({tag:tag});
        }
      }
    }
    return deWeaveAndRemoveUnmatchedAndUnsanctinedTags(string, extracting, pos, tagStack);
  }
}

var prepTextForRender = function (string, id, expandableCutsAndNotes, extracting, pos, elemCount, tagStack, noteList) {
  // NOTE: this function is also called as a key part of selectiveQuote,
  // thus 'prepTextForRender' is not a great name for everything this boy does

  // init
  if (!pos) {
    string = convertCodes(string);
    //change /n for <br>
    string = swapInBrTagsButNotTweenLatexTags(string);
    //
    string = deWeaveAndRemoveUnmatchedAndUnsanctinedTags(string, extracting);
    //
    pos = 0; elemCount = 0; tagStack = []; noteList = [];
    if (string[0] && string[0] !== "<") {
      var x = checkOrInsertElem(string, pos, id, elemCount, extracting, tagStack);
      if (x.error) {return x;}
      if (x.extracting && x.extracting.done) {return x.extracting.returnString}
      extracting = x.extracting;
      string = x.string;
      elemCount++;
      pos++;
    }
  }

  // get next "<"
  var next = string.substr(pos).search(/</)+1;
  if (next === 0) {           // we have seen all there is, it is time to go home
    if (extracting) {
      if (elemCount === extracting.endElem) {
        var x = checkOrInsertElem(string, pos+1, id, elemCount, extracting, tagStack);
        if (x.error) {return x;}
        if (x.extracting.done) {return x.extracting.returnString}
      }
      return {error:"selection not found"}
    } else {
      if (string[string.length-1] && string[string.length-1] !== ">") {
        string += "</x>";
      }
      for (var i = tagStack.length-1; i > -1; i--) {
        string = string + "</"+tagStack[i].tag+">";
      }
      string = convertSpoils(string);
      string = convertMaths(string);
      return {string:string, noteList:noteList};
    }
  } else {
    pos += next
    // get text following <, up to a space or ">"
    var close = string.substr(pos).search(/[ >]/);
    var tag = string.substr(pos, close);
    //
    if (selfClosingTagRef[tag]) {                 // self closing tag
      if (!extracting && string[pos-2] !== '>') { // close the x, if the tag isn't preceded by another tag
        string = insertStringIntoStringAtPos(string, "</x>", pos-1);
        pos+=4;
      }
      var endPos = string.substr(pos).search(/>/);
      if (string[pos+endPos+1] !== "<") {       // open an x, if the tag isn't proceded by another tag
        var x = checkOrInsertElem(string, pos+endPos+1, id, elemCount, extracting, tagStack);
        if (x.error) {return x;}
        if (x.extracting && x.extracting.done) {return x.extracting.returnString}
        extracting = x.extracting;
        string = x.string;
        elemCount++;
      }
    } else if (sanctionedTagRef[tag] || extraSanctionedTagRef[tag]) {
        // if sanctioned, then lowercasing it was already taken care of in earlier validation
        // also, if NOT sanctioned, that means we're extracting
        //  because when not extracting we already killed non sanctiond tags
      pos += close;
      if (tag.substr(0,1) === "/") {                           // it is a closingTag,
        tag = tag.substr(1);

          if (!extracting && string[pos-(tag.length+3)] !== '>') {  // close the X, if the tag isn't preceded by another tag
            string = insertStringIntoStringAtPos(string, "</x>", pos-(tag.length+2));
            pos+=4;
          }

          // match to tag stack, closing all tags above it, and popping them and the match from the stack
          for (var i = tagStack.length-1; i > -1; i--) {    // since the deweave-and-remove has already ran, it should always be the last tag on the stack
            if (tagStack[i].tag === tag) {                      // unless it's a cut, then we let the innercut get ended here

              if (!extracting && tag === "innerNote" && tagStack[i].id) {   // closing a note, check for <br>
                if (string.substr(pos+1,4) === "<br>") {
                  string = string.substr(0, pos+1)+`<br id="`+tagStack[i].id+`-br">`+string.substr(pos+5);
                } else if (string.substr(pos+1,1) === "\n") {
                  string = string.substr(0, pos+1)+`<br id="`+tagStack[i].id+`-br">`+string.substr(pos+2);
                }
              }
              tagStack.pop();
              break;
            } else {
              if (!extracting) {
                string = insertStringIntoStringAtPos(string, "</"+tagStack[i].tag+">", (pos-close)-1);
                pos+= tagStack[i].tag.length +3;
              }
              tagStack.pop();
            }
          }

          // open an x, if the tag isn't proceded by another tag
          if ((string[pos+1] && string[pos+1] !== "<" && string.substr(pos+1,2) !== `">`) || (extracting && string.substr(pos+1,2) === `">` && string[pos+3] !== "<")) {
            if (string.substr(pos+1,2) === `">`) {
              pos +=2;
            }
            var x = checkOrInsertElem(string, pos+1, id, elemCount, extracting, tagStack);
            if (x.error) {return x;}
            if (x.extracting && x.extracting.done) {return x.extracting.returnString}
            extracting = x.extracting;
            string = x.string;
            elemCount++;
          }

      } else {                        // it is an opening tag
        if (tag === "note") {                               // do note conversion stuff
          if (extracting) {
            elemCount+=2;
            if (string.substr(pos,1) === ">") { // the short form textless note button
              var fullButtonString = "";
            } else {
              if (string.substr(pos).search(/ linkText="/) !== 0) {return {error:"malformed note a"}}
              //
              var startLinkPos = pos+11;
              var qPos = string.substr(startLinkPos).search(/">/);
              if (qPos === -1) {return {error:"malformed note b"}}
              var fullButtonString = string.substr(pos-5, 18+qPos);

              var buttStart = pos-5;
              var buttEnd = pos+qPos+12;
              var innerStart = buttEnd+1;

              // find the end of the noteInner for the current noteButt
              var noteEndPos = findClosingNoteTag(string, pos);
              if (noteEndPos === -1) {return {error:"malformed note c"}}
              var fullInnerString = string.substr(innerStart, noteEndPos+7-innerStart); // 7 is ("</note>").length

              if (!extracting.noteTrack) {extracting.noteTrack = []}
              extracting.noteTrack.push({
                buttStart:buttStart,
                buttEnd:buttEnd,
                fullInnerString:fullInnerString,
              });
            }
            //
            tagStack.push({tag:tag, fullButtonString: fullButtonString,});

            // is there a "<" leading off the link text?
            if (fullButtonString !== "" && string[startLinkPos] !== "<" && qPos !== 0) {
              var x = checkOrInsertElem(string, startLinkPos, id, elemCount, extracting, tagStack);
              if (x.error) {return x;}
              if (x.extracting && x.extracting.done) {return x.extracting.returnString}
              extracting = x.extracting;
              string = x.string;
              elemCount++;
            }

          } else {
            string = convertNote(string, id, elemCount, expandableCutsAndNotes, pos-5);
            noteList.push({postID:id, elemNum:elemCount,});

            tagStack.push({tag:"innerNote", id:id+"-"+(elemCount+1)});
            tag = "button";
            pos+=2;
            elemCount+=2;
          }
        } else if (tag === "a" && !extracting) {          // if it's an "a", do link conversion stuff
          var linkStart = pos+7;
          //
          if (string.substr(linkStart,1) !== "/" && string.substr(linkStart,4) !== "http") {
            string = insertStringIntoStringAtPos(string, "/", linkStart);
          }
          //
          var b = `class='clicky special ex-link' target="_blank" `;
          if (string.substr(linkStart,1) === "/" || string.substr(linkStart,24) === "https://www.schlaugh.com" || string.substr(linkStart,19) === "http://schlaugh.com") {
            b = `class='clicky special' target="_blank" `;
          }
          string = insertStringIntoStringAtPos(string, b, pos+1);
          //
        } else if (tag === "a" && extracting && string.substr(pos,7) === ` href="`) {
                    // that last check there for ` href="` isn't strictly necesary, just another format enforcement
          var aClose = string.substr(pos+7).search(/"/)+8;
          tag += string.substr(pos, aClose);
        } else if (tag === "cut") {                            // do cut conversion stuff
          if (!extracting) {
            string = convertCut(string, id+"-"+(elemCount), expandableCutsAndNotes, pos);
          }
          elemCount++;

        }
        //
        if (tag !== "x" && tag !== 'innerNote' && tag !== 'note') { //innerNote must get special assignment to match BRs
          if (extracting && tag === 'quote') {
            tagStack.push({tag:tag, cite:findQuoteCite(string, pos)});
          } else if (!extracting && tag === 'cut') {
            tagStack.push({tag:"button"});
          } else {
            tagStack.push({tag:tag});
          }
        }
        //
      if (tag !== "x") {    //put in the x
          if (!extracting && string[pos-(tag.length+2)] !== '>' && string[pos-(tag.length+2)]) {
            string = insertStringIntoStringAtPos(string, "</x>", pos-(tag.length+1));
            pos+=4;
          }
          //
          var endPos = string.substr(pos).search(/>/);
          var nextOpenPos = string.substr(pos+1).search(/</);
          if (nextOpenPos === -1) {nextOpenPos = Infinity}
          //
          if (tag === "latex" || (string[pos+endPos+1] !== "<" && !(extracting && endPos > nextOpenPos))) {
            var x = checkOrInsertElem(string, pos+endPos+1, id, elemCount, extracting, tagStack);
            if (x.error) {return x;}
            if (x.extracting && x.extracting.done) {return x.extracting.returnString}
            extracting = x.extracting;
            string = x.string;
            elemCount++;
            if (tag === "latex") {
              var closingTag = string.indexOf("</latex>", pos);
              // assume that it will always find a match because deweave has always already run
              if (extracting) {
                pos = closingTag;
              } else {
                string = insertStringIntoStringAtPos(string, "</x>", closingTag);
                pos = closingTag + 4;
              }
            }
          }
        }
      }
    }
    return prepTextForRender(string, id, expandableCutsAndNotes, extracting, pos, elemCount, tagStack, noteList);
  }
}

var checkOrInsertElem = function (string, pos, id, elemCount, extracting, tagStack) {
  if (extracting) {
    if (extracting.startElem === elemCount) {
      extracting.elemStartPos = pos;
      extracting.startTags = [];
      for (var i = 0; i < tagStack.length; i++) {
        extracting.startTags.push(tagStack[i]);
      }
    }
    if (extracting.endElem === elemCount) {
      extracting.done = true;
      if (extracting.elemStartPos === undefined) {
        return {error:"selection not found"}
      }
      var startElem = unConvertCodeInOneElem(string, extracting.elemStartPos);
      string = startElem.string;
      var endElem = unConvertCodeInOneElem(string, pos);
      string = endElem.string;
      if (extracting.startElem !== extracting.endElem) {
        pos = pos - startElem.offset;
      }

      var startPos = extracting.elemStartPos + extracting.startOffset;
      var endPos = pos + extracting.endOffset;

      // if LaTeX, then just grab the whole element
      if (extracting.startTags.length && extracting.startTags[extracting.startTags.length-1] && extracting.startTags[extracting.startTags.length-1].tag === "latex") {
        startPos = extracting.elemStartPos
      }
      if (tagStack.length && tagStack[tagStack.length-1] && tagStack[tagStack.length-1].tag === "latex") {
        endPos = string.indexOf("</latex>", pos);
      }

      var prepend = "";
      var append = "";
      var append2 = "";
      if (extracting.noteTrack) {
        for (var i = 0; i < extracting.noteTrack.length; i++) {
          if (endPos < extracting.noteTrack[i].buttEnd) {  // ends in a butt!
            append = `">`+ extracting.noteTrack[i].fullInnerString;
            for (var j = tagStack.length-1; j > -1; j--) {
              if (tagStack[j].tag === "note") {
                tagStack.splice(j, 1);
                break;
              } else {
                if (extracting.startElem !== extracting.endElem) {
                  append2 = append2 +"</"+ tagStack[j].tag +">";
                  tagStack.splice(j, 1);
                }
              }
            }
            var endInButt = true;
          }
          if (startPos > extracting.noteTrack[i].buttStart && startPos < extracting.noteTrack[i].buttEnd) {  // starts in a butt
            for (var j = extracting.startTags.length-1; j > -1; j--) {
              if (extracting.startTags[j].tag === "note") {
                prepend = `<note linkText="`+prepend;
                extracting.startTags.splice(j, 1);
                break;
              } else {
                if (endInButt) {
                  for (var k = 0; k < tagStack.length; k++) {
                    if (tagStack[k].tag === extracting.startTags[j].tag) {
                      append2 = append2 +"</"+ extracting.startTags[j].tag +">";
                      tagStack.splice(k, 1);
                      break;
                    }
                  }
                }
                prepend = "<"+ extracting.startTags[j].tag +">"+ prepend;
                extracting.startTags.splice(j, 1);
              }
            }
          }
          append = append2 + append;
        }
      }

      // adjust endpoints for codeConversion
      startPos = startPos - (string.substr(0, startPos).length - unConvertCodes(string.substr(0, startPos)).length);
      endPos = endPos - (string.substr(0, endPos).length - unConvertCodes(string.substr(0, endPos)).length);
      //
      string = unConvertCodes(string);
      var snip = string.substr(startPos, endPos-startPos);
      string = prepend+snip+append;

      if (extracting.startTags && extracting.startTags.length) {
        // check if we're nested inside note tags, and if so remove the outer ones we don't want
        var openNoteCount = 0;
        var closeNoteCount = 0;
        for (var i = 0; i < extracting.startTags.length; i++) {
          if (extracting.startTags[i].tag === "note") {
            openNoteCount++;
          }
        }
        if (tagStack && tagStack.length) {
          for (var i = 0; i < tagStack.length; i++) {
            if (tagStack[i].tag === "note") {
              closeNoteCount++;
            }
          }
          for (var i = 0; i < openNoteCount && i < closeNoteCount; i++) {
            for (var j = 0; j < extracting.startTags.length; j++) {
              if (extracting.startTags[j].tag === "note") {
                extracting.startTags.splice(j, 1);
                break;
              }
            }
            for (var j = 0; j < tagStack.length; j++) {
              if (tagStack[j].tag === "note") {
                tagStack.splice(j, 1);
                break;
              }
            }
          }
        }

        //
        for (var i = extracting.startTags.length-1; i > -1; i--) {
          if (extracting.startTags[i].tag === "note") {
            var noMatch = true;
            for (var j = tagStack.length-1; j > -1; j--) {
              if (tagStack[j].tag === "note") {
                tagStack[j].tag
                tagStack.splice(j, 1);
                extracting.startTags.splice(i, 1);
                noMatch = false;
                break;
              }
            }
            if (noMatch) {
              var buttonString = extracting.startTags[i].fullButtonString || "<note>";
              string = buttonString + string;
            }
          } else {
            string = "<"+ extracting.startTags[i].tag +">"+ string;
          }
        }
      }

      if (tagStack && tagStack.length) {
        for (var i = tagStack.length-1; i > -1; i--) {
          if (tagStack[i].tag === "quote" && tagStack[i].cite) {
            string += tagStack[i].cite;
          }
          if (tagStack[i].tag.substr(0,8) === `a href="`) {
            tagStack[i].tag = "a";
          }
          string = string +"</"+ tagStack[i].tag +">";
        }
      }

      extracting.returnString = string;
    }
  } else {
    string = insertX(string, pos, id, elemCount);
  }
  return {extracting: extracting, string: string};
}

var unConvertCodeInOneElem = function (string, pos) {
  // convert '&lt;' to '<' just on the elem
  var elemEndPos = string.substring(pos).search(/</)+1;
  if (elemEndPos === 0) {
    elemEndPos = string.length;
  }
  var preElem = string.substring(0, pos);
  var elem = string.substring(pos, pos+elemEndPos).replace(/&lt;/g, '<');
  var postElem = string.substring(pos+elemEndPos);
  //
  var newString = preElem+elem+postElem;
  var offset = string.length - newString.length;
  return {string:newString, offset:offset};
}

var findClosingNoteTag = function (string, pos, noteCount) {
  if (!noteCount) {noteCount = 0;}
  var nextClose = string.substr(pos).search(/<\/note>/);
  var nextOpen = string.substr(pos).search(/<note/);

  if (nextClose === -1) {return -1;}
  if (nextOpen === -1) {nextOpen = Infinity}
  // is there an openingTag before the next upcoming closingTag?
  if (nextClose > nextOpen) {
    noteCount++;
    pos = pos + nextOpen + 1;
  } else {
    if (noteCount === 0) {
      return pos+nextClose;
    } else {
      noteCount--;
      pos = pos + nextClose + 1;
    }
  }
  return findClosingNoteTag(string, pos, noteCount);
}

var findQuoteCite = function (string, pos, nestCount) {
  if (!nestCount) {nestCount = 0;}
  var nextClose = string.substr(pos).search("/quote>");
  var nextOpen = string.substr(pos).search(/<quote/);

  if (nextClose === -1) {return false;}
  if (nextOpen === -1) {nextOpen = Infinity}
  // is there an openingTag before the next upcoming closingTag?
  if (nextClose > nextOpen) {
    nestCount++;
    pos = pos + nextOpen + 1;
  } else {
    if (nestCount === 0) {
      if (string.substr(pos+nextClose-5,4) === `</r>`) {
        var snip = string.substr(pos,nextClose-1);
        return snip.substr(snip.lastIndexOf(`<r>`));
      } else {
        return false;
      }
    } else {
      nestCount--;
      pos = pos + nextClose + 1;
    }
  }
  return findQuoteCite(string, pos, nestCount);
}

var insertX = function (string, pos, id, elemCount) {
  var elemID = "<x id='"+id+"-"+elemCount+"'>";
  return insertStringIntoStringAtPos(string, elemID, pos);
}

var collapseNote = function (buttonId, innerId, expanding, postID, viaBottom) {
  //  arg 'buttonId' always refers to the "top" button, even if it's a bottom button that was clicked
  if (expanding) {
    $(innerId).classList.remove('removed');
    $(innerId+'-note-top-plus').classList.add('removed');
    $(innerId+'-note-top-minus').classList.remove('removed');
    $(buttonId).onclick = function () {collapseNote(buttonId, innerId, false, postID);}

    if ($(innerId+"-br")) {
      $(innerId+"-br").classList.add('removed');
    }

  } else {        // collapse
    if (viaBottom) {
      var initBottom = $(postID).getBoundingClientRect().bottom;
    }

    $(innerId).classList.add('removed');    // collapse the note
    $(innerId+'-note-top-plus').classList.remove('removed');
    $(innerId+'-note-top-minus').classList.add('removed');
    
    // move focus to the top button
    $(buttonId).focus();
    $(buttonId).onclick = function () {collapseNote(buttonId, innerId, true, postID);}
    
    if ($(innerId+"-br")) {
      $(innerId+"-br").classList.remove('removed');
    }
    
    if (viaBottom) {                // if via the bottom button, then adjust the scroll position
      var finalBottom = $(postID).getBoundingClientRect().bottom;
      window.scrollBy(0, (finalBottom - initBottom));
    }
  }
}

var backToMain = function (event) {
  modKeyCheck(event, function () {
    if (glo.username) {
      fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
      $("panel-buttons-wrapper").classList.remove("removed");
    } else {
      switchPanel('meta-panel');
      simulatePageLoad();
    }
  });
}

var renderFAQ = function () {
  var faqText = `<quote>how do I pronounce schlaugh?\n</quote>\nplease, do not pronounce schlaugh\n\n\n<quote>i'm new here, how do i find people?\n</quote>\nthe best way is word of mouth\n\nif you are here, it's because someone asked you to come. So start by following them. And maybe you see them interacting with people? And apparently they like this place enough to tell you about it, so try asking them who they recommend following\n\n\n<quote>but there's a tag system? does that help me find people? what is milkshake?!?!\n</quote>\ncorrect. You can tag a post, and then anyone on schlaugh can see it if they search for that tag. And you can search to see all previous posts with tag X\n\nthe <a href="https://www.schlaugh.com/~tagged/milkshake">milkshake</a> tag serves as a site-wide, schellingPoint tag\n\nnew users are, by default, tracking the tag for their <code>@[username]</code> and <code>milkshake</code>. But you can unfollow those tags if you'd prefer\n\n\n<quote>couldn't the site recommend me people? or just show me everyone? wouldn't that be easier?\n</quote>\nIt could! It would! But considering that the rest of the internet is already firehosing you in the face with infinite content, I thought it might be neat if there was one place that didn't.\n\nI'd rather err on the side of you seeing less content than you want, rather than more. It is intentionally a bit difficult to find people/content on here. It makes what you do find more valuable.\n\nmaximizing the time you spend on schlaugh is not the objective\n\n\n<quote>well then what is the objective?\n</quote>\nto incentivize you to write the writing that is most valuable for you to write and to read the writing that is most valuable for you to read\n\n\n<quote>how do i see who is following me?\n</quote>\nyou cant!\n\n\n<quote>...why not?\n</quote>\nSuppose you could. Someone could click follow, but then never actually read your posts. Or someone could be not following you, but still check your page every day. Whether someone is following you or not is a bad proxy for who is paying attention to you. You can get a better sense of that from who you regularly interact with.\n\nSchlaugh is not in the "inflate your self esteem with numbers" game, nor the "give you metrics to compare yourself to others" business. If you want to obsessively keep your own scorecard of all your interactions and generate statistics to make yourself feel bad, that's on you pal.\n\n\n<quote>how do you pronounce schlaugh?\n</quote>\nlike you are saying the name of fearsome dark wizard\n\n\n<quote>how do I reply to people?\n</quote>\nthere is no "reply" feature on schlaugh.\n\nThere is the "quote" format tag, but it's just a format tag. Quoting text you found on schlaugh is not privileged in any way above quoting text you found anywhere else. You can of course respond to anything you want to, but when you quote a schlaugh post, there is no notification sent to the author.\n\nWhen you click the quote button on schlaugh post, the tag for that author is added to your post. But you're under no obligation to leave that tag on your post. And no one is under any obligation to check their own tag to see if people are responding to them.\n\n<note linkText="also">\nif you only want to quote part of a post, you can select that part of the text prior to hitting the quote button. And if you want your quote to be wrapped up inside of a Note in your post, you can hold <code>Shift</code> while clicking the quote button. <note linkText="What's a note?">\nthis is\n\nexpanding sections that can be toggled open/closed in a post. Like a foot note, or end note, but found at neither the foot or end, so just a note.\n\n<note linkText="why would i want my quote in a note?">\nidk, it's an evolved convention amongst schlusers to wrap up the part of their post that is replying to one person. Don't feel like you have to format your posts this way!\n</note>\n</note>\n</note>\n\n<quote>so if someone is talking about me on schlaugh, i might not know about it?\n</quote>\nexactly! you don't even need an account for this feature! people can talk about you on schlaugh even if you've never heard of schlaugh! what people you don't know are saying about you on the internet is none of your business.\n\n\n<quote>with such limited feedback, why would i even want to post anything here?\n</quote>\nFor yourself. And your friends.\n\nPutting your thoughts in writing is worthwhile even if no one else ever reads it. And friendship via reading each other's thoughts is lovely.\n\nPerformative writing for large amorphous groups of strangers can also be valuable. There are other places on the internet for you to do that.\n\n\n<quote>i have a question that isn't answered here\n</quote>\n<i>please</i> contact the <a href="https://www.schlaugh.com/staff">official schlaugh staff account</a> either via private message or tagging a post with <code>schlaugh</code> or <code>staff</code>. Bug reports, feature requests, complaints, cool snake pictures, scathing personal criticisms, etc, are also all very much encouraged.\n\n\n<quote>k but the word schlaugh how do i say it\n</quote>\nremember when you were a small child and adults actively avoided using "big" words when speaking to you but you were reading well above your grade level so it was nearly always the case that your first encounter with new words was through reading and maybe you would stop to try to say it out loud or ask an adult but the thing about reading is that you do not at all need to know how the words sound, you can go straight from symbols on the page to meaning in your head, so there were many words that you knew well but had never heard until years later when you wanted to use it in conversation and only then realized you had no idea how to pronounce it?\n\nschlaugh is a quiet place for reading and writing\nthere is no need to talk\n\n`

  $('faq').innerHTML = prepTextForRender(faqText, "faq").string;
}

var modKeyCheck = function (event, callback) {
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault();
    callback();
  }
}

var panelButtonClick = function (event, type) {
  modKeyCheck(event, function() {
    if (type === "posts" && glo.openPanel && (glo.openPanel === "posts-panel" || glo.openPanel.substr(0,3) === "404")) {
      fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
    } else if (type === "posts") {
      fetchPosts(true);
    } else {
      simulatePageLoad("~"+type, false);
      switchPanel(type + "-panel");
    }
  });
}

var switchPanel = function (panelName, noPanelButtonHighlight) {
  if (panelName === "meta-panel") {
    $("panel-buttons-wrapper").classList.add("removed");
    $("sign-in").classList.add('removed');
    if (!glo.isFaqRendered) {
      renderFAQ();
      glo.isFaqRendered = true;
    }
    if (glo.username) {
      $('login-section').classList.add('removed')
    }
  }

  // de-highlight panel button
  if (glo.openPanel && $(glo.openPanel+"-button")) {
    $(glo.openPanel+"-button").classList.remove('panel-button-selected');
  }

  // highlight new panel button
  if ($(panelName+"-button") && !noPanelButtonHighlight) {
    $(panelName+"-button").classList.add('panel-button-selected');
  }

  // show/hide the feed options
  if (panelName === "posts-panel" && !noPanelButtonHighlight) {
    $('feed-options').classList.remove('removed')
  } else {
    $('feed-options').classList.add('removed')
  }

  //
  if (panelName === 'settings-panel') {
    $('settings-gear').classList.remove('rotate-me');
    setTimeout(() => {
      $('settings-gear').classList.add('rotate-me');
    }, 0);
  }

  //
  if (glo.openPanel && glo.openPanel === panelName) {
    if (panelName === "write-panel") {
      // open the editor if editPanelButton is clicked when editPanel is already open
      showPostWriter();
    }
    return; // requested panel is already open, do nothing
  }
  
  // hide the old stuff
  if (glo.openPanel) {
    $(glo.openPanel).classList.add('removed');
  }

  // remove header/user stuff in special cases
  if (panelName === "bad-recovery-panel" || panelName === "recovery-panel") {
    $("footer-footer").classList.add("removed");
    $("sign-in").classList.add('removed');
    $("username-recovery").value = "";
    $("password-recovery1").value = "";
    $("password-recovery2").value = "";
  } else {
    $("footer-footer").classList.remove("removed");
  }
  // init
  if (panelName === "posts-panel" && !glo.postPanelStatus) {
    fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
  }

  // the one actual line that displays the panel
  $(panelName).classList.remove('removed');

  // set the cursor to the bottom of the post editor if open
  //this needs to happen after the display of the panel above, you can't move cursor to removed element
  if (panelName === "write-panel" && glo.openEditors && glo.openEditors['post']) {
    var editor = $('post-editor');
    setCursorPosition(editor, editor.value.length, editor.value.length);
  }
  if (panelName === "inbox-panel" && glo.openEditors && glo.openEditors['message']) {
    var editor = $('message-editor');
    setCursorPosition(editor, editor.value.length, editor.value.length);
  }
  //
  glo.openPanel = panelName;
}

var followingListDisplay = function (open) {
  // have we already fetched the data?
  if (_npa(['glo','pRef','date'])) {
    if (open) {
      $('following-list').classList.remove('removed');

      // set focus
      var followingListings = $('following-bucket').childNodes;
      if (followingListings.length !== 0 && followingListings[0]) {
        var followingLink = followingListings[0].childNodes[0];
        followingLink.focus();
      } else {
        $('following-list-close').focus();
      }
      blackBacking();
      $("pop-up-backing").onclick = function () {
        followingListDisplay(false);
      }
    }
    else {
      $('following-list').classList.add('removed');
      $('following-list-open').focus();
      blackBacking(true);
    }
  } else {  // following list has not been fetched/rendered, so do that
    fetchPosts(false, {postCode:"FFTF", date:pool.getCurDate(),}, function () {
      loading(true)
      followingListDisplay(open);
    });
  }
}

var openDateJump = function (close) {
  if (close) {
    $('date-jump-open').onclick = function () {openDateJump()}
    $('date-jump').classList.add('removed');
    $('tag-feed-options').classList.remove('removed');
  } else {
    $('date-jump-open').onclick = function () {openDateJump(true)}
    $('date-jump').classList.remove('removed');
    $('date-picker').focus();
    $('tag-feed-options').classList.add('removed');
    openTagMenu(true)
  }
}

var dateJump = function (target) {
  if (!target) {target = $("date-picker").value;}
  if (!pool.isStringValidDate(target)) {
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
    } else if (newDateString < '2017-11-18') {
      return uiAlert("too far!<br><br>back on "+newDateString+" there was not even a schlaugh yet!");
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
  if (glo.settings && glo.settings.newPostsToTheLeft) {
    dir = -dir;
  }
  if (glo.postPanelStatus.date) {
    glo.postPanelStatus.date = calcDateByOffest(glo.postPanelStatus.date, dir);
    fetchPosts(true);
  }
}

var calcDateByOffest = function (date, offset) {
  if (typeof date === 'string' && date.length === 10) {
    var year = date.slice(0,4);
    var month = Number(date.slice(5,7))-1;
    var day = Number(date.slice(8,10))+ Number(offset);
    var computedDate = new Date(year,month,day);
    //
    var newYear = computedDate.getFullYear();
    var newMon = computedDate.getMonth()+1;
    if (newMon < 10) {newMon = "0"+newMon}
    var newDay = computedDate.getDate();
    if (newDay < 10) {newDay = "0"+newDay}
    return newYear+"-"+newMon+"-"+newDay;
  }
}

var pageTurn = function (dir) { // -1 = left, 1 = right
  if (glo.settings && glo.settings.newPostsToTheLeft) {
    dir = -dir;
  }
  pageJump(dir);
}

var pageJump = function (input, loc) {
  if (input) {
    var newPage = glo.postPanelStatus.page + input;
  } else {
    var newPage = parseInt($(loc+'-page-number-left-input').value);
    if (newPage === 69) {uiAlert("<br>...<br><br>...<br><br>nice", "nice");}
  }
  newPage = newPage % glo.postPanelStatus.totalPages;

  if (!Number.isInteger(newPage)) {
    uiAlert("oh do <i>please</i> at least would you <i>try</i> to only input integers?", "yes doctor i will try");
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
  if (!input) {
    if (glo.postPanelStatus) {
      input = glo.postPanelStatus;
      if (input.postCode === "SEARCH") {
        input.postCode = 'TFFF';
        delete input.search;
      }
    }
    else {input = {postCode:"FFTF", date:pool.getCurDate(),};}
  }
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
  else if (pc === "ALL") {var arr = ['glo','pRef','author',input.author,'all'];}
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
    if (glo.settings && glo.settings.postsPerPage) {
      input.postsPerPage = glo.settings.postsPerPage;
    }
    ajaxCall('/getPosts', 'POST', input, function(json) {
      if (json.authorInfo && json.four04) {             // author found, but NOT post
        json.posts = [];
      } else if (!json.posts || json.four04) {
        loading(true);
        if (json.existed) { input.existed = true; }
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
      //
      if (input.search) {
        input.postCode = pc = "SEARCH";
        var postList = findStringInPosts(json.posts, input.search);
        searchResultQuantityGate(postList.length, input.search, function () {
          displayPosts(postList, input, callback);
          loading(true);
        });
      } else {
        //
        if (display) {
          displayPosts(postList, input, callback);
          loading(true);
        } else if (callback) {
          callback();
        }
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
  } else if (pc === "SEARCH") {
    postType = 'search';
  } else if (pc === "TFTF") {
    postType = "perma"
  }

  // the actual display of the literal posts
  if (pc === 'MARK' || (glo.settings && glo.settings.sortOldestPostsAtTop && (postType === "author" || pc === "FTFT" || pc === "FTFF"))) {  // reverse the order, when appropriate
    for (var i = idArr.length-1; i > -1; i--) {
      $("post-bucket").appendChild(renderOnePost(null, postType, idArr[i]));
    }
  } else if (pc === "TFTF" && idArr.length === 0) {    // post not found, but author yes found
    var four04elem = document.createElement("text");
    four04elem.innerHTML = "<c><br>not even a single thing!<br><br></c>"
    four04elem.setAttribute('class', "post page-title-404 monospace");
    $("post-bucket").appendChild(four04elem);
  } else {
    for (var i = 0; i < idArr.length; i++) {
      $("post-bucket").appendChild(renderOnePost(null, postType, idArr[i]));
    }
  }


  //
  $('collapse-all-notes-button').classList.add("removed");
  if (pc === "SEARCH") {
    $('expand-all-notes-button').classList.remove("removed");
  } else {
    $('expand-all-notes-button').classList.add("removed");
    openSearchOptions('top', true);
    openSearchOptions('bot', true);
  }

  if (idArr.length === 0 && pc !== "TFTF") {
    $("post-bucket").appendChild(notSchlaugh(pc, input.date));
    $("bot-page-and-date-nav").classList.add("removed");
    $("expand-all-notes-button").classList.add("removed");
  } else {
    $("bot-page-and-date-nav").classList.remove("removed");
  }

  $("post-bucket").classList.remove("removed");
  //
  glo.postPanelStatus = input;
  if (postType === 'author' || pc === "TFTF" || pc === "SEARCH" || pc === "MARK") {
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
    // show/hide the date arrows
    var dir = "right";
    if (glo.settings && glo.settings.newPostsToTheLeft) {dir = "left";}
    if (input.date >= pool.getCurDate()) {
      $("top-"+dir+"-date-arrow").classList.add('hidden');
      $("bot-"+dir+"-date-arrow").classList.add('hidden');
    } else {
      $("top-"+dir+"-date-arrow").classList.remove('hidden');
      $("bot-"+dir+"-date-arrow").classList.remove('hidden');
    }
  } else {
    $("top-date-box").classList.add('removed');
    $("bot-date-box").classList.add('removed');
  }

///////////////////////////////////// tag option stuff
  if (input.author || pc === "MARK") {              // don't display any tag/date option stuff
    $("date-and-tag-options").classList.add("removed");
    $("tag-feed-options").classList.add("removed");
    if (pc === "MARK") {
      $("top-tag-display").innerHTML = 'bookmarked posts';
      $("bot-tag-display").innerHTML = 'bookmarked posts';
      $("top-tag-display").classList.remove("removed");
      $("bot-tag-display").classList.remove("removed");
    } else {
      if (input.tag) {                    // but if tag filtering, then show that/clear button
        $("top-tag-display").innerHTML = 'all '+idArr.length+' posts tagged <i>"'+input.tag+'"</i>';
        $("bot-tag-display").innerHTML = 'all '+idArr.length+' posts tagged <i>"'+input.tag+'"</i>';
        $("top-tag-display").classList.remove("removed");
        $("bot-tag-display").classList.remove("removed");
        $("author-clear-filter-top").innerHTML = "clear tag filter";
        $("author-clear-filter-bot").innerHTML = "clear tag filter";
        $("author-clear-filter-top").classList.remove("removed");
        $("author-clear-filter-bot").classList.remove("removed");
      } else if (input.search) {
        $("top-tag-display").innerHTML = 'all '+idArr.length+' posts containing <i>"'+input.search+'"</i>';
        $("bot-tag-display").innerHTML = 'all '+idArr.length+' posts containing <i>"'+input.search+'"</i>';
        $("top-tag-display").classList.remove("removed");
        $("bot-tag-display").classList.remove("removed");
        $("author-clear-filter-top").innerHTML = "clear search filter";
        $("author-clear-filter-bot").innerHTML = "clear search filter";
        $("author-clear-filter-top").classList.remove("removed");
        $("author-clear-filter-bot").classList.remove("removed");
      } else {
        $("top-tag-display").classList.add("removed");
        $("bot-tag-display").classList.add("removed");
        $("author-clear-filter-top").classList.add("removed");
        $("author-clear-filter-bot").classList.add("removed");
      }
    }
  } else {
    $("date-and-tag-options").classList.remove("removed");
    $("tag-feed-options").classList.remove("removed");
    $("author-clear-filter-top").classList.add("removed");
    $("author-clear-filter-bot").classList.add("removed");
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
  } else if (postType === "author" || pc === "SEARCH") {  // author, not perma
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
  else if (pc === "SEARCH") {simulatePageLoad(authorName+"/~search/"+input.search, authorName, authorPicUrl)}
  else if (pc === "TFTF") {
    var postTitle = _npa(['glo','postStash', idArr[0], 'title']);
    if (!postTitle) {postTitle = authorName}
    if (input.post_url) {
      simulatePageLoad(authorName+"/"+input.post_url, postTitle, authorPicUrl);
    } else if (input.post_id) {
      simulatePageLoad("~/"+input.post_id, postTitle, authorPicUrl);
    } else {
      simulatePageLoad(authorName+"/~/"+input.date, postTitle, authorPicUrl);
    }
  }
  else if (pc === "TFFT") {simulatePageLoad(authorName+"/~/"+input.page, authorName, authorPicUrl);}
  else if (pc === "TFFF") {simulatePageLoad(authorName, authorName, authorPicUrl);}
  else {return uiAlert('eerrrrrrrrrrrrrr3')}
  //
  if (callback) {callback();}
}

var expandAllNotes = function (tog) { // this is for all notes and cuts on an author poge, for the SEARCH view
  if (tog) {
    $('expand-all-notes-button').classList.add("removed");
    $('collapse-all-notes-button').classList.remove("removed");
    var elemList = document.getElementsByClassName('expandable');
    for (var i = 0; i < elemList.length; i++) {
      elemList[i].classList.remove("removed");
    }
  } else {
    $('collapse-all-notes-button').classList.add("removed");
    $('expand-all-notes-button').classList.remove("removed");
    var elemList = document.getElementsByClassName('expandable');
    for (var i = 0; i < elemList.length; i++) {
      elemList[i].classList.add("removed");
    }
  }
}

var notSchlaugh = function (postCode, date) {
  var div = document.createElement("div");
  div.classList.add('not-schlaugh');
  div.appendChild(document.createElement("br"));
  div.appendChild(document.createElement("br"));
  var post = document.createElement("div");
  if ((postCode === "FFTF" || postCode === "FFTT") && date) {
    if (date < '2017-11-18') {
      post.innerHTML = '~pre schlaugh~<br><a href="javascript:void(0);" onclick="uiAlert(`on '+date+' schlaugh did not yet exist!`)" class="special clicky">(?)</a>';
    } else {
      post.innerHTML = '~not schlaugh~<br><a href="javascript:void(0);" onclick="uiAlert(`for the day you are viewing, '+date+', none of the people or tags you are following have made posts`)" class="special clicky">(?)</a>';
    }
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
  if (aInfo.author.length < 6) {title.setAttribute('class','author-page-title-0')}
  else if (aInfo.author.length < 12) {title.setAttribute('class','author-page-title-1')}
  else if (aInfo.author.length < 20) {title.setAttribute('class','author-page-title-2')}
  else if (aInfo.author.length < 30) {title.setAttribute('class','author-page-title-3')}
  else if (aInfo.author.length < 40) {title.setAttribute('class','author-page-title-4')}
  else if (aInfo.author.length < 50) {title.setAttribute('class','author-page-title-5')}
  else {title.setAttribute('class','author-page-title-6')}
  //
  if (loc === "bot") {
    title.onclick = function (event) {
      modKeyCheck(event, function(){
        fetchPosts(true, {postCode:'TFFF', author:aInfo._id});
      });
    }
    title.classList.add("clicky");
    title.classList.add('special');
    title.classList.add('inset-focus');
    title.setAttribute('href', "/"+aInfo.author);
  }
  title.innerHTML = aInfo.author;

  // follow and message and bio buttons
  setFollowButton(loc, aInfo);
  setMuteButton(loc, aInfo);
  setMessageButton(loc, aInfo);
  setEditBioButton(loc, aInfo);

  // header-right
  if (aInfo.bio && aInfo.bio !== "") {
    $("author-header-right-"+loc).innerHTML = prepTextForRender(aInfo.bio, aInfo.author+"-bio-"+loc).string;
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
      follow.innerHTML = "shun";
      follow.title = "unfollow";
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

var setEditBioButton = function (loc, authInf) {
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
  var dir1 = "left";
  var dir2 = "right";
  if (glo.settings && glo.settings.newPostsToTheLeft) {dir1 = "right"; dir2 = "left";}
  if (page == 1) {
    $(macguffin+"-"+dir1+"-page-arrow").classList.add('hidden');
  } else {
    $(macguffin+"-"+dir1+"-page-arrow").classList.remove('hidden');
  }
  if (page == totalPages) {
    $(macguffin+"-"+dir2+"-page-arrow").classList.add('hidden');
  } else {
    $(macguffin+"-"+dir2+"-page-arrow").classList.remove('hidden');
  }
}

var openSearchOptions = function (loc, close) {
  if ($('author-search-button-'+loc).innerHTML === "close search" || close) {
    $('author-search-button-'+loc).innerHTML = "search";

    $('post-search-'+loc).classList.add('removed')
  } else {
    $('author-search-button-'+loc).innerHTML = "close search";

    $('post-search-'+loc).classList.remove('removed')
    $('post-search-input-'+loc).focus();
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
  var tagElem = document.createElement("a");
  tagElem.setAttribute('class', 'clicky top-tag special');
  if (glo.postPanelStatus.date) {
    tagElem.setAttribute('href', '/~tagged/'+tagName+'/'+glo.postPanelStatus.date);
  } else {
    tagElem.setAttribute('href', '/~tagged/'+tagName);
  }
  if (count !== undefined) {
    tagElem.innerHTML = tagName + "("+count+")";
  } else {
    tagElem.innerHTML = tagName;
  }
  (function (tagString) {
    tagElem.onclick = function(event){
      modKeyCheck(event, function(){
        openTagMenu(true);
        if (glo.postPanelStatus.date) {
          fetchPosts(true, {postCode: "FTTF", tag:tagString, date:glo.postPanelStatus.date});
        } else {
          fetchPosts(true, {postCode: "FTFF", tag:tagString,});
        }
      });
    }
  })(tagName);
  //
  var detag = document.createElement("button");
  detag.setAttribute('class', 'clicky de-tag-button special');
  detag.innerHTML = iconBank.trash;
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
    link.setAttribute('class', 'following-link-wrapper');
    link.setAttribute('href', "/"+followingList[i].name);
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
      url:postData.url,
      private:postData.private,
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

var iconBank = {
  expand: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.08em;"><g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor"><path d="M35 394 c-13 -14 -15 -42 -13 -192 l3 -177 177 -3 c150 -2 178 0 192 13 13 14 16 44 16 184 0 116 -4 171 -12 179 -8 8 -63 12 -179 12 -140 0 -170 -3 -184 -16z m333 -26 c8 -8 12 -59 12 -165 l0 -153 -153 0 c-106 0 -157 4 -165 12 -8 8 -12 59 -12 165 l0 153 153 0 c106 0 157 -4 165 -12z"/><path d="M190 300 l0 -60 -49 0 c-28 0 -53 -6 -60 -13 -17 -22 8 -37 61 -37 l48 0 0 -48 c0 -48 12 -72 37 -72 9 0 13 17 13 60 l0 60 49 0 c28 0 53 6 60 13 17 22 -8 37 -61 37 l-48 0 0 48 c0 48 -12 72 -37 72 -9 0 -13 -17 -13 -60z"/></g></svg>`,
  collapse: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.08em;"><g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor"><path d="M32 398 c-8 -8 -12 -63 -12 -179 0 -140 3 -170 16 -184 14 -13 42 -15 192 -13 l177 3 3 177 c2 150 0 178 -13 192 -14 13 -44 16 -184 16 -116 0 -171 -4 -179 -12z m348 -171 c0 -106 -4 -157 -12 -165 -8 -8 -59 -12 -165 -12 l-153 0 0 153 c0 106 4 157 12 165 8 8 59 12 165 12 l153 0 0 -153z"/><path d="M82 228 c-32 -32 -14 -38 121 -38 133 0 157 6 157 37 0 18 -260 19 -278 1z"/></g></svg>`,
  plus: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.15em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M190 310 l0 -70 -59 0 c-66 0 -93 -18 -74 -48 7 -12 27 -18 72 -20
        l61 -3 0 -58 c0 -57 1 -59 31 -70 18 -6 34 -11 35 -11 2 0 4 31 4 70 l0 69 56
        3 c40 2 60 8 67 20 19 29 -9 48 -69 48 l-54 0 0 59 c0 57 -1 59 -31 70 -18 6
        -34 11 -35 11 -2 0 -4 -31 -4 -70z"/>
      </g>
    </svg>`,
  minus: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.15em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M59 224 c-9 -11 -10 -20 -2 -32 9 -15 31 -17 163 -17 132 0 154 2
        163 17 8 12 7 21 -2 32 -20 24 -302 24 -322 0z"/>
      </g>
    </svg>`,
  quote: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.08em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M237 373 c-12 -12 -8 -198 5 -211 7 -7 34 -12 60 -12 l48 0 0 -38 c0
        -21 -5 -43 -11 -49 -17 -17 -2 -33 30 -33 24 0 29 6 44 53 21 65 24 266 5 285
        -13 13 -169 17 -181 5z"/>
        <path d="M7 353 c-12 -12 -8 -198 5 -211 7 -7 34 -12 60 -12 l48 0 0 -38 c0
        -21 -5 -43 -11 -49 -17 -17 -2 -33 30 -33 24 0 29 6 44 53 21 65 24 266 5 285
        -13 13 -169 17 -181 5z"/>
      </g>
    </svg>`,
  bookmark: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.16em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M30 215 l0 -206 58 42 c31 23 73 55 93 70 30 24 38 26 50 15 8 -8 49
        -39 92 -70 l77 -57 0 206 0 205 -185 0 -185 0 0 -205z m303 120 c2 -11 -206
        -20 -230 -10 -8 2 -11 10 -8 15 9 14 234 9 238 -5z m0 -70 c2 -11 -206 -20
        -230 -10 -8 2 -11 10 -8 15 9 14 234 9 238 -5z"/>
      </g>
    </svg>`,
  unbookmark: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.16em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M30 215 l0 -206 58 42 c31 23 73 55 93 70 30 24 38 26 50 15 8 -8 49
        -39 92 -70 l77 -57 0 206 0 205 -185 0 -185 0 0 -205z m350 14 l0 -170 -82 63
        -83 64 -82 -64 -83 -63 0 170 0 171 165 0 165 0 0 -171z"/>
        <path d="M95 340 c-3 -5 0 -13 8 -15 24 -10 232 -1 230 10 -4 14 -229 19 -238
        5z"/>
        <path d="M95 270 c-3 -5 0 -13 8 -15 24 -10 232 -1 230 10 -4 14 -229 19 -238
        5z"/>
      </g>
    </svg>`,
  link: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.17em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M132 418 c-7 -7 -12 -29 -12 -50 0 -37 1 -38 34 -38 25 0 35 5 39 20
          5 18 14 20 79 20 44 0 79 -5 86 -12 16 -16 16 -152 0 -165 -7 -6 -50 -13 -96
          -16 l-83 -6 6 29 c6 29 5 30 -28 30 -31 0 -35 -3 -41 -31 -3 -17 -6 -44 -6
          -60 l0 -28 148 6 c81 3 153 10 160 16 17 13 17 268 0 285 -17 17 -269 17 -286
          0z"/>
          <path d="M136 313 c-61 -2 -116 -9 -123 -15 -18 -14 -19 -268 -1 -286 17 -17
          269 -17 286 0 7 7 12 29 12 50 0 37 -1 38 -34 38 -25 0 -35 -5 -39 -20 -5 -18
          -14 -20 -79 -20 -44 0 -79 5 -86 12 -16 16 -16 152 1 165 6 6 49 13 95 16 l83
          6 -6 -29 c-6 -29 -5 -30 28 -30 31 0 35 3 41 31 3 17 6 44 6 60 0 27 -2 29
          -37 27 -21 -1 -87 -4 -147 -5z"/>
        </g>
    </svg>`,
  lock: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.125em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M133 395 c-48 -21 -75 -70 -68 -122 6 -41 5 -43 -19 -43 -30 0 -30
        -6 -19 -147 l6 -83 182 0 182 0 6 83 c11 141 11 147 -19 147 -24 0 -25 2 -19
        43 11 81 -51 137 -152 137 -26 -1 -63 -7 -80 -15z m157 -65 c22 -22 23 -24 14
        -69 l-6 -31 -84 0 c-46 0 -84 4 -84 9 0 5 -3 22 -6 39 -10 47 22 72 91 72 42
        0 60 -5 75 -20z m-42 -162 c14 -14 15 -42 3 -66 -5 -9 -12 -25 -15 -34 -7 -23
        -35 -23 -42 0 -3 9 -10 25 -15 34 -21 40 -3 78 36 78 12 0 26 -5 33 -12z"/>
      </g>
    </svg>`,
  unlock: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.125em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M133 395 c-48 -21 -75 -70 -68 -122 6 -41 5 -43 -19 -43 -30 0 -30
        -6 -19 -147 l6 -83 182 0 182 0 6 83 c4 45 7 97 7 115 l0 32 -139 0 -138 0 -7
        31 c-9 45 -8 47 14 69 15 15 33 20 75 20 42 0 60 -5 75 -20 22 -22 70 -27 70
        -7 0 23 -32 59 -66 73 -42 18 -120 17 -161 -1z m243 -247 c-3 -29 -6 -68 -6
        -85 l0 -33 -155 0 -155 0 0 33 c0 17 -3 56 -6 85 l-7 52 168 0 168 0 -7 -52z"/>
        <path d="M182 168 c-14 -14 -15 -42 -3 -66 5 -9 12 -25 15 -34 7 -23 35 -23
        42 0 3 9 10 25 15 34 21 40 3 78 -36 78 -12 0 -26 -5 -33 -12z"/>
      </g>
    </svg>`,
  edit: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.125em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
        <path d="M312 407 c-29 -31 -28 -37 16 -80 44 -43 51 -45 80 -14 29 31 28 55
        -5 89 -33 34 -62 36 -91 5z"/>
        <path d="M127 222 c-127 -127 -127 -127 -127 -175 l0 -47 48 0 47 0 128 128
        c70 70 127 134 127 143 0 19 -61 79 -81 79 -8 0 -72 -57 -142 -128z"/>
      </g>
    </svg>`,
  trash: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43" style="height: 1em; vertical-align: -.125em;">
      <g transform="translate(0,43) scale(0.1,-0.1)" fill="currentColor">
      <path d="M200 415 c-9 -11 -33 -15 -89 -15 -81 0 -110 -12 -90 -37 15 -18 369
-19 387 -1 24 24 -7 38 -86 38 -54 0 -80 4 -92 15 -15 14 -18 14 -30 0z"/>
<path d="M46 223 c12 -60 27 -134 34 -165 l11 -58 124 0 124 0 11 58 c7 31 22
105 34 165 l22 107 -191 0 -191 0 22 -107z m92 -30 c15 -97 15 -103 -1 -103
-9 0 -17 26 -25 78 -15 96 -15 102 1 102 9 0 17 -26 25 -77z m92 -13 c0 -73
-3 -90 -15 -90 -12 0 -15 17 -15 90 0 73 3 90 15 90 12 0 15 -17 15 -90z m100
78 c0 -7 -5 -48 -12 -90 -8 -52 -16 -78 -25 -78 -16 0 -16 6 -1 103 8 51 16
77 25 77 7 0 13 -6 13 -12z"/>
      </g>
    </svg>`,
}

var renderOnePost = function (postData, type, postID) {
  // type = 'author', 'preview', 'preview-edit', "dated", "perma", "search" or NULL
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

  var expandableCutsAndNotes = false;
  if (type === "search") {
    var expandableCutsAndNotes = true;
    type = "author"
  }

  // we need "uniqueID" because there can be a preview edit version of the post w/ the same id
  if (type === "preview") {
    var uniqueID = "previewTomorrow";
  } else if (postData.post_id && type !== 'preview-edit') {
    var uniqueID = 'post-'+postData.post_id;
  } else {
    var uniqueID = 'post-'+type;
  }

  var post = document.createElement("div");
  post.setAttribute('id', uniqueID);
  post.setAttribute('class', 'post');

  // selective quote button
  if (type !== 'preview' && type !== 'preview-edit') {
    var quoteBtn = document.createElement("button");
    quoteBtn.setAttribute('class', 'panel-button-selected selective-quote-button removed');
    quoteBtn.setAttribute('id', uniqueID+'-selective-quote-button');
    quoteBtn.innerHTML = iconBank.quote;
    quoteBtn.onclick = function (event) {
      var selectionSpecs = isQuotableSelection(postData.post_id);
      if (selectionSpecs) {
        quotePost(postData, selectiveQuote(postData.post_id, selectionSpecs), event.shiftKey, event.altKey);
      } else {
        uiAlert("errRRRrooor!<br><br>it seems there is no quote selection but this is the button that only displays if that's already true so wtf??<br><br>(please show this to staff)")
      }
    }
    post.appendChild(quoteBtn);
  }

  // top post collapse button
  var collapseBtn = document.createElement("button");
  collapseBtn.setAttribute('class', 'collapse-button-top filter-focus');
  collapseBtn.setAttribute('id', uniqueID+'-collapse-button-top');
  if (glo.collapsed && glo.collapsed[postData.post_id] && type !== 'preview-edit') {
    collapseBtn.innerHTML = iconBank.expand;
    collapseBtn.title = 'expand post';
  } else {
    collapseBtn.innerHTML = iconBank.collapse;
    collapseBtn.title = 'collapse post';
  }
  post.appendChild(collapseBtn);

  var preppedText = prepTextForRender(postData.body, uniqueID, expandableCutsAndNotes);

  // hexephre button
  if (preppedText.noteList && preppedText.noteList.length && preppedText.noteList.length > 0) {
    var collapseAllBtn = document.createElement("button");
    collapseAllBtn.setAttribute('class', 'expand-all-top-button filter-focus');
    collapseAllBtn.setAttribute('id', uniqueID+'-collapse-all-button-top');
    collapseAllBtn.innerHTML = iconBank.expand;
    collapseAllBtn.title = 'expand all notes in post';
    collapseAllBtn.onclick = function () {
      collapseAllNotesButton(uniqueID, preppedText.noteList);
    }
    if (glo.collapsed && glo.collapsed[postData.post_id]) {
      collapseAllBtn.classList.add('removed');
    }
    post.appendChild(collapseAllBtn);
  }

  // private
  if ((type === 'author' || type === 'perma') && glo.username && glo.username === postData.author) {
    var privateIndicator = document.createElement('div');
    privateIndicator.innerHTML = "private post";
    privateIndicator.setAttribute('class', 'private-indicator main-background removed');
    if (postData.private) {
      privateIndicator.classList.remove('removed');
    }
    privateIndicator.setAttribute('id', uniqueID+'-private-indicator');
    post.appendChild(privateIndicator);
  }


  // post header
  var postHeader = document.createElement("div");
  post.appendChild(postHeader);

  // author stuff in header
  if (type !== 'author' && type !== 'preview-edit') {
    postHeader.setAttribute('class', 'post-header-feed');

    //
    var postHeaderRightWrapper = document.createElement("div")
    postHeader.appendChild(postHeaderRightWrapper);

    var postHeaderRight = document.createElement("a");
    postHeaderRight.setAttribute('href', "/"+postData.author);
    (function (id) {
      postHeaderRight.onclick = function(event){
        modKeyCheck(event, function(){fetchPosts(true, {postCode:'TFFF', author:id});});
      }
    })(postData._id);
    postHeaderRight.setAttribute('class', 'clicky post-header-right');
    postHeaderRightWrapper.appendChild(postHeaderRight);

    // authorPic
    if (postData.authorPic && postData.authorPic !== "") {
      var authorPic = document.createElement("img");
      authorPic.setAttribute('src', postData.authorPic);
      authorPic.setAttribute('class', 'author-pic');
      postHeaderRight.appendChild(authorPic);
    }
    // authorName
    var authorName = document.createElement("a");
    authorName.setAttribute('class', 'author-on-post special');
    // text sizing based on name length
    if (postData.author.length < 6) {authorName.classList.add('author-size-0')}
    else if (postData.author.length < 12) {authorName.classList.add('author-size-1')}
    else if (postData.author.length < 20) {authorName.classList.add('author-size-2')}
    else if (postData.author.length < 30) {authorName.classList.add('author-size-3')}
    else if (postData.author.length < 40) {authorName.classList.add('author-size-4')}
    else if (postData.author.length < 50) {authorName.classList.add('author-size-5')}
    else {authorName.classList.add('author-size-6')}
    //
    authorName.innerHTML = postData.author;
    postHeaderRight.appendChild(authorName);
  } else {
    postHeader.setAttribute('class', 'post-header');
  }

  // post title
  // (must be appended after postHeaderRight ond then be displayed row-reversed to get the placement right)
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
  //
  collapseBtn.onclick = function (event) {collapsePost(uniqueID, postData.post_id, false);}
  //
  body.innerHTML = preppedText.string;
  //
  if (glo.collapsed && glo.collapsed[postData.post_id]) {
    post.classList.add('faded');
    body.classList.add('removed');
  }
  if (type !== 'preview' && type !== 'preview-edit') {
    body.onmouseup = function() {
      var x = isQuotableSelection(postData.post_id);
      if (x) {
        var postVertOffest = $(uniqueID).getBoundingClientRect().y;
        var selectProps = $("post-"+postData.post_id+"-"+x.endElem).getBoundingClientRect()
        var selectionVertOffest = (selectProps.y + selectProps.bottom)/2;
        $(uniqueID+'-selective-quote-button').classList.remove("removed");
        $(uniqueID+'-selective-quote-button').style.top = (selectionVertOffest-postVertOffest) + "px";
        setTimeout(function () {
          $(uniqueID+'-selective-quote-button').classList.add("show-selective-quote-button");
        }, 0);
        isStillQuotable(postData.post_id, uniqueID);
      }
    }
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

  // bot post collapse button
  var collapseBtn2 = collapseBtn.cloneNode(true);
  collapseBtn2.setAttribute('class', 'collapse-button-bottom filter-focus');
  collapseBtn2.setAttribute('id', uniqueID+'-collapse-button-bottom');
  collapseBtn2.onclick = function (event) {collapsePost(uniqueID, postData.post_id, true);}
  if (collapseBtn.title === 'expand') {
    collapseBtn2.classList.add("hidden")
  }
  post.appendChild(collapseBtn2);

  // bot hexephre button
  if (preppedText.noteList && preppedText.noteList.length && preppedText.noteList.length > 0) {
    var collapseAllBtn2 = collapseAllBtn.cloneNode(true);
    collapseAllBtn2.setAttribute('class', 'expand-all-bot-button filter-focus');
    collapseAllBtn2.setAttribute('id', uniqueID+'-collapse-all-button-bot');
    collapseAllBtn2.onclick = function () {
      collapseAllNotesButton(uniqueID, preppedText.noteList, true);
    }
    if (glo.collapsed && glo.collapsed[postData.post_id]) {
      collapseAllBtn2.classList.add('removed');
    }
    post.appendChild(collapseAllBtn2);
  }
  //
  return post;
}

var collapseAllNotesButton = function (uniqueID, noteList, btmBtn) {
  var topBttn = $(uniqueID+'-collapse-all-button-top');
  var botBttn = $(uniqueID+'-collapse-all-button-bot');
  if (topBttn.title === 'expand all notes in post') {
    collapseAllNotesInList(noteList, true, btmBtn);
    topBttn.innerHTML = iconBank.collapse;
    topBttn.title = 'collapse all notes in post';
    botBttn.innerHTML = iconBank.collapse;
    botBttn.title = 'collapse all notes in post';
  } else {
    collapseAllNotesInList(noteList, false, btmBtn);
    topBttn.innerHTML = iconBank.expand;
    topBttn.title = 'expand all notes in post';
    botBttn.innerHTML = iconBank.expand;
    botBttn.title = 'expand all notes in post';
  }
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

var collapseAllNotesInList = function (noteList, expand, btmBtn) {
  // assumes that all notes in list are in one post
  if (btmBtn) {
    var initBottom = $(noteList[0].postID).getBoundingClientRect().bottom;
  } else {
    var initTop = $(noteList[0].postID).getBoundingClientRect().top;
  }
  //
  for (var i = 0; i < noteList.length; i++) {
    var ellen = noteList[i];
    if (expand) {
      collapseNote(ellen.postID+"-"+ellen.elemNum, ellen.postID+"-"+(ellen.elemNum+1), true, ellen.postID);
    } else {
      collapseNote(ellen.postID+"-"+ellen.elemNum, ellen.postID+"-"+(ellen.elemNum+1), false, ellen.postID);
    }
  }
  if (btmBtn) {
    var finalBottom = $(noteList[0].postID).getBoundingClientRect().bottom;
    window.scrollBy(0, (finalBottom - initBottom));
  } else {
    var finalTop = $(noteList[0].postID).getBoundingClientRect().top;
    window.scrollBy(0, (finalTop - initTop));
  }
}

var collapsePost = function (uniqueID, postID, isBtmBtn) {
  var btnElem = $(uniqueID+'-collapse-button-top');
  var btnElem2 = $(uniqueID+'-collapse-button-bottom');
  //
  if (btnElem.title === 'expand post') {                   // expand the post
    $(uniqueID).classList.remove('faded');
    $(uniqueID+'body').classList.remove('removed');
    if ($(postID+"_post-footer-right")) {
      $(postID+"_post-footer-right").classList.remove('removed');
    }
    //
    if ($(uniqueID+'-collapse-all-button-top')) {
      $(uniqueID+'-collapse-all-button-top').classList.remove('removed');
      $(uniqueID+'-collapse-all-button-bot').classList.remove('removed');
    }
    //
    btnElem.title = 'collapse post';
    btnElem.innerHTML = iconBank.collapse;
    btnElem2.title = 'collapse post';
    btnElem2.innerHTML = iconBank.collapse;
    btnElem2.classList.remove("hidden");
    var collapse = false;
    if (glo.collapsed) {glo.collapsed[postID] = false;}
    //
  } else {
    // collapse the post

    if (isBtmBtn) { // but first log the position of the bottom edge
      var initBottom = $(uniqueID).getBoundingClientRect().bottom;
    }

    $(uniqueID).classList.add('faded');
    if ($(postID+"_post-footer-right")) {
      $(postID+"_post-footer-right").classList.add('removed');
    }
    //
    if ($(uniqueID+'-collapse-all-button-top')) {
      $(uniqueID+'-collapse-all-button-top').classList.add('removed');
      $(uniqueID+'-collapse-all-button-bot').classList.add('removed');
    }
    //
    btnElem.title = 'expand post';
    btnElem.innerHTML = iconBank.expand;
    btnElem2.classList.add('hidden');

    // this order is important, collapse the post here
    $(uniqueID+'body').classList.add('removed');
    
    // then find the offset from collapsing
    if (isBtmBtn) {
      var finalBottom = $(uniqueID).getBoundingClientRect().bottom;

      window.scrollBy(0, (finalBottom - initBottom));
    }

    var collapse = true;
    if (glo.collapsed) {glo.collapsed[postID] = true;}
  }
  // save the collapsed status
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
    //
    var dateStamp = document.createElement("text");
    var dateStampWrapper = document.createElement("a");
    dateStamp.innerHTML = postData.date;
    dateStamp.setAttribute('class', 'date-stamp');
    if (glo.username) { // if signed in, else the datestamp is not a link/button
      dateStampWrapper.setAttribute('href', "/~posts/"+postData.date);
      dateStamp.setAttribute('class', 'clicky special date-stamp');
      dateStamp.onclick = function(){
        modKeyCheck(event, function(){
          fetchPosts(true, {postCode:"FFTF", date:postData.date,});
        });
      }
    }
    dateStampWrapper.appendChild(dateStamp);
    footerLeft.appendChild(dateStampWrapper);
  }
  // footer buttons(right side of post footer)
  if (type !== "preview") {
    var footerButtons = document.createElement("div");
    footerButtons.setAttribute('class', 'post-footer-right');
    footerButtons.setAttribute('id', postData.post_id+'_post-footer-right');
    // hide the footer if post is collapsed
    if (glo.collapsed && glo.collapsed[postData.post_id]) {
      footerButtons.classList.add('removed');
    }
    footer.appendChild(footerButtons);
    if (glo.username) {
      if (postData.post_id && postData.post_id.length !== 8) {  // IDs are length 7, 8 indicates it's a dumby that isn't actualy linkable
        // quote button
        var quoteBtn = document.createElement("button");
        quoteBtn.setAttribute('class', 'footer-button filter-focus');
        quoteBtn.innerHTML = iconBank.quote;
        quoteBtn.title = "quote";
        quoteBtn.onclick = function(event) {
          if (glo.postStash && glo.postStash[postData.post_id]) {     // is it already stashed?

            var selectionSpecs = isQuotableSelection(postData.post_id);
            if (selectionSpecs) {
              verify(`would you like to quote the entire post, or only your currently selected text?`, "selection only", "whole post", function (result) {
                if (result) {
                  var selection = selectiveQuote(postData.post_id, selectionSpecs);
                  quotePost(postData, selection, event.shiftKey, event.altKey);
                } else {
                  quotePost(postData, false, event.shiftKey, event.altKey);
                }
              })
            } else {
              if (glo && glo.settings && (!glo.settings.knowsAboutSelectiveQuoting || pool.getCurDate() >= glo.settings.knowsAboutSelectiveQuoting)) {
                notifyWithReminderOption("¿DID U KNO?<br><br>if you only want to quote part of the post, you can do so by selecting that part before clicking the quote button<br><br>also if you press Shift while you click the quote button, you'll get the quote auto wrapped up in a Note, in case you're into that kind of thing", 'knowsAboutSelectiveQuoting');
              } else {
                quotePost(postData, false, event.shiftKey, event.altKey);
              }
            }
          } else {
            return uiAlert("eRoRr! post data not found???<br>how did you even get here?");
          }
        }
        footerButtons.appendChild(quoteBtn);
      }
      //
      createBookmarkButton(footerButtons, postData);
    }
    // perma-link
    if (postData.post_id && postData.post_id.length !== 8) { // IDs are length 7, 8 indicates it's a dumby that isn't actualy linkable
      var permalinkButton = document.createElement("a");
      permalinkButton.setAttribute('class', 'footer-button filter-focus permalink-footer-button');
      var link = postData.url;
      if (postData.url && type !== 'perma') {
        permalinkButton.setAttribute('href', "/"+postData.author+"/"+postData.url);
      } else {
        permalinkButton.setAttribute('href', "/~/"+postData.post_id);
        link = null;
      }
      permalinkButton.innerHTML = iconBank.link;
      permalinkButton.title = "permalink";
      permalinkButton.onclick = function(event) {
        modKeyCheck(event, function(){
          fetchPosts(true, {postCode:"TFTF", author:postData._id , date:postData.date , post_url:link , post_id:postData.post_id})
        });
      }
      footerButtons.appendChild(permalinkButton);
    }
    //
    if ((type === 'author' || type === 'perma') && glo.username && glo.username === postData.author) {
      //private button
      createPrivateButton(footerButtons, postData);
      //edit button
      var editBtn = document.createElement("button");
      editBtn.setAttribute('class', 'footer-button filter-focus');
      editBtn.innerHTML = iconBank.edit;
      editBtn.title = "edit";
      editBtn.onclick = function() {
        editPost(postData);
      }
      footerButtons.appendChild(editBtn);
      // delete button
      var deleteBtn = document.createElement("button");
      deleteBtn.setAttribute('class', 'footer-button filter-focus');
      deleteBtn.innerHTML = iconBank.trash;
      deleteBtn.title = "delete";
      deleteBtn.onclick = function() {
        deletePost(postData);
      }
      footerButtons.appendChild(deleteBtn);
    }
    // lil notification thingy
    var footerNotification = document.createElement("div");
    footerNotification.setAttribute('id', postData.post_id+'_post-footer-notification');
    footerNotification.setAttribute('class', 'post-footer-notification main-background hidden');
    footerButtons.appendChild(footerNotification);
  }
}

var createPrivateButton = function (parentElem, postData, prevButtonElem) {

  var privateBtn = document.createElement("button");
  privateBtn.setAttribute('class', 'footer-button filter-focus');
  var alreadyPrivate = false;
  if (postData.private) {
    alreadyPrivate = true;
    privateBtn.innerHTML = iconBank.unlock;
    privateBtn.title = "un-private this post";
  } else {
    privateBtn.innerHTML = iconBank.lock;
    privateBtn.title = "make this post private";
  }
  //
  privateBtn.onclick = function() {
    if (alreadyPrivate) {
      postData.private = false;
      $("post-"+postData.post_id+"-private-indicator").classList.add('removed')
    } else {
      postData.private = true;
      $("post-"+postData.post_id+"-private-indicator").classList.remove('removed')
    }

    var newButt = createPrivateButton(parentElem, postData, privateBtn);
    newButt.disabled = true;
    setTimeout(function () {
      newButt.disabled = false;
    }, 4000);

    // tell the db
    ajaxCall('/makePostPrivate', 'POST', {postData:postData,}, function(json) {
      var text = `post is now private<button onclick="privatePostExplain()" class="special text-button">(?)</button>`
      if (alreadyPrivate) {
        text = `post is now public`
      }
      showPostFooterNotification(text, postData.post_id);
    });
  }

  // append the elem
  if (prevButtonElem) {
    parentElem.insertBefore(privateBtn, prevButtonElem);
    privateBtn.focus();
    removeElement(prevButtonElem);
  } else {
    parentElem.appendChild(privateBtn);
  }
  return privateBtn;
}

var isStillQuotable = function (postID, postElemID) {
  if (isQuotableSelection(postID)) {
    setTimeout(function () {
      isStillQuotable(postID, postElemID);
    }, 100);
  } else {
    if ($(postElemID+'-selective-quote-button')) {
      $(postElemID+'-selective-quote-button').classList.remove("show-selective-quote-button");
      setTimeout(function () {
        $(postElemID+'-selective-quote-button').classList.add("removed");
      }, 200);  // .2 seconds, to match the animaion time set on the .selective-quote-button in css
    }
  }
}

var isQuotableSelection = function (postID, retry) {
  if (window.getSelection && glo.username) { // all browsers, except IE before version 7 && user must be signed in
    var selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount === 1) {

      // is the selection being made within the specific post calling for this check?
      if (postID) {
        var par1 = findParentPostID(selection.getRangeAt(0).startContainer);
        var par2 = findParentPostID(selection.getRangeAt(0).endContainer);
        if (!par1 || par1.substr(par1.search(/-/)+1) !== postID || !par2 || par2.substr(par2.search(/-/)+1) !== postID) {
          return false;
        }
      }

      var startID = findNearestParentWithID(selection.getRangeAt(0).startContainer);
      var endID = findNearestParentWithID(selection.getRangeAt(0).endContainer);

      var startIdNumber = Number(startID.substr(startID.substr(5).search(/-/)+6));
      var endIdNumber = Number(endID.substr(endID.substr(5).search(/-/)+6));
      if (!pool.isNumeric(endIdNumber) && pool.isNumeric(startIdNumber)) {
        if (!retry) {
          selection.modify("extend", "backward", "character");
          return isQuotableSelection(postID, true);
        }
      }

      var startOffset = selection.getRangeAt(0).startOffset;
      var endOffset = selection.getRangeAt(0).endOffset;

      if (!pool.isNumeric(startIdNumber) || !pool.isNumeric(endIdNumber)) {return false;}
      else {
        return {
          startElem:startIdNumber,
          endElem:endIdNumber,
          startOffset:startOffset,
          endOffset:endOffset
        };
      }
    } else {return false;}
  } else {return false;}
}

var quotePost = function (postData, selection, shiftDown, altDown) {
  showPostWriter(function () {
    if (!selection) {
      selection = glo.postStash[postData.post_id].body;
    }

    if (altDown) {    // convert images to links
      selection = convertImgTagsToLinks(selection);
    }

    if (shiftDown) {  // put the quote in a note
      var text = `<note linkText="@`+postData.author+`">\n<quote>\n`+selection+
      '\n<r><a href="/~/'+postData.post_id+'">-'+postData.author+"</a></r>\n</quote>\n</note>";
    } else {
      var text = "<quote>\n"+selection+
      '\n<r><a href="/~/'+postData.post_id+'">-'+postData.author+"</a></r>\n</quote>";
    }

    if ($('post-editor').value !== "") {text = '<br>'+text;}

    $('post-editor').value += prepTextForEditor(text);
    addTag(postData.author);
    switchPanel('write-panel');
    simulatePageLoad("~write", false);
  });
}

var convertImgTagsToLinks = function (string) {
  var next = string.search(/<img src="/);
  if (next === -1) {           // we have seen all there is, it is time to go home
    return string;
  }
  else {
    var linkString = string.substr(next+10, string.substr(next+10).search(/"/));
    var textString = linkString;
    var closingTagPos = string.substr(next+10).search(/>/) + next+11;
    if (string.substr(next+10+linkString.length, 7) === '" alt="') {
      textString = string.substr(next+17+linkString.length, string.substr(next+17+linkString.length).search(/"/));
    }
    string = string.substr(0,next) + `<a href="`+linkString+`">`+textString+`</a>` + string.substr(closingTagPos);
  }
  return convertImgTagsToLinks(string);
}

var selectiveQuote = function (postID, selectionSpecs) {
  /*
  // for testing only, allows quoting the preview
  if (!postID) {
    var postString = glo.pending.body;
    selectionSpecs = isQuotableSelection();
    console.log(postString);
    console.log(selectionSpecs);
  } else {
  }
  */
  var postString = glo.postStash[postID].body;

  var x = prepTextForRender(postString, postID, null, selectionSpecs);
  if (x.error) {
    return uiAlert(x.error);
  }

  return x;
}

var findNearestParentWithID = function (elem) {
  if (elem.id) {
    return elem.id;
  } else {
    if (elem.parentNode) {
      return findNearestParentWithID(elem.parentNode);
    } else {
      return false;
    }
  }
}

var findParentPostID = function (elem) {
  if (elem.classList && elem.classList.contains("post")) {
    return elem.id;
  } else {
    if (elem.parentNode) {
      return findParentPostID(elem.parentNode);
    } else {
      return false;
    }
  }
}

var addTag = function (authorName) {
  // check if addition is already a tag
  var noDup = true;
  var tagString = $('tag-input').value.replace(/[^ a-zA-Z0-9-_!?@&*%:=+`"'~,]/g, '');
  var arr = tagString.match(/[ a-zA-Z0-9-_!?@&*%:=+`"'~]+/g);
  if (arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i] = arr[i].trim();
      if (arr[i] === "@"+authorName) {
        arr.splice(i,1);
        noDup = false;
      }
    }
  }
  if (noDup) {
    $('tag-input').value = $('tag-input').value + "@"+authorName+", ";
  }
}

var createBookmarkButton = function (parent, post) {
  if (!parent || !post._id || !post.date || !post.post_id) {return;}
  var author_id = post._id;
  // is there an extant bookmark button?
  var childList = parent.childNodes;
  if (childList[childList.length-2] && childList[1].classList[0] === "bookmark-button") {
    var insert = childList[1];
  }
  var elem = document.createElement("button");
  elem.setAttribute('class', 'bookmark-button footer-button filter-focus ');
  var alreadyMarked = false;
  if (!glo.bookmarks) {glo.bookmarks = {}}
  if (glo.bookmarks[author_id] && glo.bookmarks[author_id][post.date]) {
    alreadyMarked = true;
    elem.innerHTML = iconBank.unbookmark;
    elem.title = "un-bookmark";
  } else {
    elem.innerHTML = iconBank.bookmark;
    elem.title = "bookmark";
  }
  elem.onclick = function() {
    if (alreadyMarked) {                            // so we're un-marking a post
      if (glo.bookmarks[author_id] && glo.bookmarks[author_id][post.date]) {
        glo.bookmarks[author_id][post.date] = false;
      }
      //
      _npa(['glo','pRef','bookmarks'], false);
    } else {                                    // we are marking
      if (!glo.bookmarks[author_id]) {glo.bookmarks[author_id] = {}}
      glo.bookmarks[author_id][post.date] = true;
      //
      var markArray = _npa(['glo','pRef','bookmarks']);
      if (markArray && markArray.length !== undefined) {
        markArray.push(post.post_id);
      } else {
        markArray = [post.post_id];
      }
    }
    // update bookmark button
    var newButt = createBookmarkButton(parent, post);
    newButt.disabled = true;
    setTimeout(function () {
      newButt.disabled = false;
    }, 4000);

    // tell the db
    ajaxCall('/bookmarks', 'POST', {author_id:author_id, date:post.date, remove:alreadyMarked}, function(json) {
      // are we looking at the page of bookmarked posts right NOW??
      if (glo.postPanelStatus.postCode === "MARK") {
        if (alreadyMarked) {
          var postElem = parent.parentNode.parentNode;
          showPostFooterNotification(`unbookmarked!<br><button onclick="$('`+postElem.id+`').classList.add('removed')" class="special text-button">remove from view NOW</button>`, post.post_id);
        } else {
          showPostFooterNotification('re-bookmarked!', post.post_id);
        }
      } else {
        var butt = `<button onclick="displayBookmarks()" class="special text-button">bookmarks</button>`
        if (alreadyMarked) {
          showPostFooterNotification('removed from '+butt, post.post_id);
        } else {
          showPostFooterNotification('added to '+butt, post.post_id);
        }
      }
    });
  }
  if (insert) {
    parent.insertBefore(elem, insert);
    elem.focus();
    removeElement(insert);
  } else {
    parent.appendChild(elem);
  }
  return elem;
}

var showPostFooterNotification = function (text, postID) {
  $(postID+'_post-footer-notification').innerHTML = text;
  $(postID+'_post-footer-notification').classList.add('post-footer-notification-fade');
  $(postID+'_post-footer-notification').style.opacity="0";
  $(postID+'_post-footer-notification').classList.remove('hidden');
  setTimeout(function () {
    if ($(postID+'_post-footer-notification')) {
      $(postID+'_post-footer-notification').classList.remove('post-footer-notification-fade');
      $(postID+'_post-footer-notification').classList.add('hidden');
      $(postID+'_post-footer-notification').style.opacity="1";
    }
  }, 4000);
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
  $('write-old-post-button').onclick = function () {
    showWriter('old-post');
  }
  //
  $("old-post-editor-meta").classList.remove("removed");
  if (glo.pendingUpdates[post.date]) {                 // there is already a pending edit
    var savedPost = glo.pendingUpdates[post.date][0];
    $('old-post-editor').value = prepTextForEditor(savedPost.body);
    $("old-post-status").innerHTML = "pending edit for your post on "+post.date;
    updatePendingEdit(savedPost);
    hideWriter('old-post');
    $('write-old-post-button').innerHTML = "edit edit";
    switchPanel("edit-panel");
  } else {                                            // there is not a pending edit
    if (glo.postStash && glo.postStash[post.post_id]) {     // is it already stashed?
      var tags = getTagString(glo.postStash[post.post_id].tags);
      $('old-tag-input').value = tags;
      if (post.title) {$('old-title-input').value = post.title;}
      else {$('old-title-input').value = "";}
      if (post.url) {$('old-url-input').value = post.url;}
      else {$('old-url-input').value = "";}
      $("old-post-status").innerHTML = "no pending edit for your post on "+post.date;
      $('old-post-editor').value = prepTextForEditor(glo.postStash[post.post_id].body);
      $('delete-pending-old-post').classList.add("removed");
      $('pending-post-edit').classList.add("removed");
      $('write-old-post-button').innerHTML = "new edit";
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
    //
    if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
      data.text = convertMarkdownToHtml(data.text);
    }
    //
    data.tags = $('old-tag-input').value;
    data.title = $('old-title-input').value;
    data.url = $('old-url-input').value;
    var onlyTheUrlHasBeenChanged = false;
    // have changes been made?

    if (glo.postStash[post.post_id]) {   // make sure thing even exists first...
      if (glo.postStash[post.post_id].body === data.text) {
        var oldTitle = glo.postStash[post.post_id].title || "";
        if (oldTitle === data.title) {
          if (getTagString(glo.postStash[post.post_id].tags) === data.tags) {
            var oldURL = glo.postStash[post.post_id].url || "";
            if (oldURL === data.url) {
              return hideWriter('old-post');  // no changes, return
            } else {
              onlyTheUrlHasBeenChanged = true;
            }
          }
        }
      }
    }                                   // yes changes, send them
    loading();
    if (onlyTheUrlHasBeenChanged) {
      data.onlyTheUrlHasBeenChanged = true;
    }
    ajaxCall("/editOldPost", 'POST', data, function(json) {
      if (json.deny) {loading(true); return uiAlert(json.deny);}
      if (json.linkProblems) {uiAlert(json.linkProblems);}
      updatePendingEdit(json);
      if (!onlyTheUrlHasBeenChanged) {
        if (!glo.pendingUpdates[post.date]) {glo.pendingUpdates[post.date] = [{}];}
        glo.pendingUpdates[post.date][0].body = json.body;
        glo.pendingUpdates[post.date][0].tags = json.tags;
        glo.pendingUpdates[post.date][0].title = json.title;
        glo.pendingUpdates[post.date][0].url = json.url;
      }
      glo.postStash[post.post_id].url = json.url;
    });
  }
  //set cancel button
  $('cancel-edit-button').onclick = function () {
    // is there a currently pending edit of this post to revert to? or are we comparing to the live version?
    if (glo.pendingUpdates[post.date]) {
      var oldText = prepTextForEditor(glo.pendingUpdates[post.date][0].body);
      var oldTags = getTagString(glo.pendingUpdates[post.date][0].tags);
      var oldTitle = glo.pendingUpdates[post.date][0].title;
      var oldURL = glo.pendingUpdates[post.date][0].url;
    } else {
      var oldText = prepTextForEditor(glo.postStash[post.post_id].body);
      var oldTags = getTagString(glo.postStash[post.post_id].tags);
      var oldTitle = glo.postStash[post.post_id].title;
      var oldURL = glo.postStash[post.post_id].url;
    }
    if (!oldTitle) {oldTitle = "";}
    if (!oldURL) {oldURL = "";}
    // have changes been made?
    if (oldText === $('old-post-editor').value && oldTags === $('old-tag-input').value && oldTitle === $('old-title-input').value && oldURL === $('old-url-input').value) {
      return hideWriter('old-post');
    }
    verify("revert any unsaved changes?", null, null, function (result) {
      if (!result) {return;}
      $('old-post-editor').value = oldText;
      $('old-tag-input').value = oldTags;
      $('old-title-input').value = oldTitle;
      if (oldURL) { $('old-url-input').value = oldURL; }
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
        if (json.deny) {loading(true); return uiAlert(json.deny);}
        if (json.linkProblems) {uiAlert(json.linkProblems);}
        glo.pendingUpdates[post.date] = null;
        updatePendingEdit(json);
        $('write-old-post-button').onclick = function () {
          editPost(post);
          showWriter('old-post');
        }
      });
    });
  }
}

var updatePendingEdit = function (post, bio) {
  if (post.body === "") {
    $('old-post-status').innerHTML = "no pending edit for your post on "+post.date;
    $('delete-pending-old-post').classList.add("removed");
    if (bio) {$('author-header-edit').classList.add("removed");}
    else {$('pending-post-edit').classList.add("removed");}
    $('write-old-post-button').innerHTML = "new edit";
  } else {
    var str = $('old-post-status').innerHTML;
    if (str.substr(0,3) === "no ") {$('old-post-status').innerHTML = str.substr(3);}
    $('delete-pending-old-post').classList.remove("removed");
    if (bio) {$('author-header-edit').classList.remove("removed");}
    else {$('pending-post-edit').classList.remove("removed");}
    $('write-old-post-button').innerHTML = "edit edit";
  }
  if (post.onlyTheUrlHasBeenChanged) {
    uiAlert(`successfull url edit<br><br>post is accessible now at:<br><a class='special' target='_blank' href='/`+glo.username+"/"+post.url+"'>schlaugh.com/"+glo.username+"/"+post.url+"</a>");
    hideWriter('old-post');
    return;
  } else {
    var tags = getTagString(post.tags);
    $('old-tag-input').value = tags;
    if (post.title) {$('old-title-input').value = post.title;}
    else {$('old-title-input').value = "";}
    if (post.url) {$('old-url-input').value = post.url;}
    else {$('old-url-input').value = "";}
    $('old-post-editor').value = prepTextForEditor(post.body);

    if (bio) {
      setAuthorHeader('edit', {
        _id: glo.userID,
        author: glo.username,
        authorPic: glo.userPic,
        bio: post.body,
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
  }
  hideWriter('old-post');
  loading(true);
}

var editBio = function () {
  $('pending-post-edit').classList.add("removed");
  $('author-header-edit').classList.remove("removed");
  //
  $("old-post-editor-title").innerHTML = "<l>editing bio</l>";
  $('write-old-post-button').onclick = function () {
    showWriter('old-post');
  }
  $("old-post-editor-meta").classList.add("removed");
  //
  if (glo.pendingUpdates['bio']) {
    $('old-post-editor').value = prepTextForEditor(glo.pendingUpdates['bio']);
    $("old-post-status").innerHTML = "pending bio edit:";
    updatePendingEdit({body: glo.pendingUpdates['bio']}, true);
    hideWriter('old-post');
    $('write-old-post-button').innerHTML = "edit edit";
    switchPanel("edit-panel");
  } else {
    $("old-post-status").innerHTML = "no pending bio edit";
    $('old-post-editor').value = prepTextForEditor(glo.bio);
    $('delete-pending-old-post').classList.add("removed");
    $('author-header-edit').classList.add("removed");
    $('write-old-post-button').innerHTML = "new edit";
    hideWriter('old-post');
    switchPanel("edit-panel");
  }
  // set submit button
  var data = {date: "bio", post_id:"bio"}
  $('submit-editing-old-post').onclick = function () {
    data.text = $('old-post-editor').value;
    //
    if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
      data.text = convertMarkdownToHtml(data.text);
    }
    // have changes been made?
    if (glo.bio === data.text) {
      return hideWriter('old-post');
    }
    loading();
    ajaxCall("/editOldPost", 'POST', data, function(json) {
      if (json.deny) {loading(true); return uiAlert(json.deny);}
      if (json.linkProblems) {uiAlert(json.linkProblems);}
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
        $('write-old-post-button').onclick = function () {
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
  if (elem && elem.parentNode) {
    elem.parentNode.removeChild(elem);
  }
}

var destroyAllChildrenOfElement = function (elem) {
  var children = elem.childNodes;
  while (children.length !== 0) {
    removeElement(children[0]);
  }
}

var submitPost = function (remove) { //also handles editing and deleting
  var text = $('post-editor').value;
  //
  if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    text = convertMarkdownToHtml(text);
  }
  //
  var tags = $('tag-input').value;
  var title = $('title-input').value;
  var url = $('url-input').value;
  //
  if (text === "" && tags === "" && title === "" && !glo.pending) {
    if (!glo.debugMode) {
      ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
    }
    return hideWriter('post');
  }
  // have changes been made?
  if (!remove && glo.pending && glo.pending.body === text) {
    if (glo.pending.title === title) {
      if (glo.pending.url === url) {
        if (getTagString(glo.pending.tags) === tags) {
          if (!glo.debugMode) {
            ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
          }
          return hideWriter('post');
        }
      }
    }
  }
  if (remove || (text === "" && tags === "" && title === "")) {
    verify("you sure you want me should delete it?", null, null, function (result) {
      if (!result) {return;}
      loading();
      ajaxCall("/postPost", 'POST', {remove:true, key:glo.sessionKey}, function(json) {
        if (json.deny) {loading(true); return uiAlert(json.deny);}
        updatePendingPost(null);
      });
    });
  } else {
    loading();
    ajaxCall("/postPost", 'POST', {body:text, tags:tags, title:title, url:url, key:glo.sessionKey}, function(json) {
      if (json.deny) {loading(true); return uiAlert(json.deny);}
      var popup = false;
      if (json.linkProblems) {uiAlert(json.linkProblems); popup = true;}
      updatePendingPost(json, popup);
      // save tags on the post, if they have that setting on
      if (_npa(['glo','settings','autoSaveTagsOnUse'])) {
        for (var tagString in json.tags) {
          if (json.tags.hasOwnProperty(tagString)) {
            saveTag(false, tagString)
          }
        }
      }
    });
  }
}

var cancelPost = function () {
  if (glo.pending) {    // there is a current saved/pending post
    // have changes been made?
    if (prepTextForEditor(glo.pending.body) === $('post-editor').value) {
      if (glo.pending.title === $('title-input').value) {
        if (glo.pending.url === $('url-input').value) {
          if (getTagString(glo.pending.tags) === $('tag-input').value) {
            if (!glo.debugMode) {
              ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
            }
            return hideWriter('post');
          }
        }
      }
    }
    verify("you want to lose any current edits and revert to the last saved version?", null, null, function (result) {
      if (!result) {return;}
      else {
        if (!glo.debugMode) {
          ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
        }
        updatePendingPost(glo.pending);
      }
    });
  } else {        // there is NOT a current saved/pending post
    if ($('post-editor').value === "" && $('tag-input').value === "" && $('title-input').value === "" && $('url-input').value === "") {
      if (!glo.debugMode) {
        ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
      }
      return hideWriter('post');
    }
    verify("you want to lose all current text in the editor?", null, null, function (result) {
      if (!result) {return;}
      else {
        if (!glo.debugMode) {
          ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:false});
        }
        updatePendingPost(null);
      }
    });
  }
}

var updatePendingPost = function (post, popup) {
  if (!post) {
    glo.pending = false;
    $('pending-status').innerHTML = "no pending post for tomorrow";
    $('pending-post-link').classList.add("removed");
    $('delete-pending-post').classList.add("removed");
    $('pending-post').classList.add("removed");
    $('write-post-button').innerHTML = "new post";
    post = {};
    post.body = "";
    post.tags = {};
    post.title = "";
    post.url = "";
  } else {
    glo.pending = {};
    glo.pending.body = post.body;
    glo.pending.tags = post.tags;
    glo.pending.title = post.title;
    glo.pending.url = post.url;
    $('pending-post-link').classList.remove("removed");
    if (post.url) {
      var pendingLinkText = `(after the schlaupdate) your post will be available at:<br><code>schlaugh.com/`+glo.username+"/"+post.url+`</code><br>and<br><code>schlaugh.com/`+glo.username+"/~/"+pool.getCurDate(-1)+`</code>`
    } else {
      var pendingLinkText = `(after the schlaupdate) your post will be available at:<br><code>schlaugh.com/`+glo.username+"/~/"+pool.getCurDate(-1)+`</code>`
    }
    $('pending-post-link').innerHTML = pendingLinkText;
    $('pending-status').innerHTML = "your pending post for tomorrow:";
    $('delete-pending-post').classList.remove("removed");
    $('pending-post').classList.remove("removed");
    $('write-post-button').innerHTML = "edit post";
  }
  var tags = getTagString(post.tags);
  $('tag-input').value = tags;
  if (post.title === undefined) {post.title = "";}
  $('title-input').value = post.title;
  if (typeof post.url === 'undefined') {post.url = "";}
  $('url-input').value = post.url;
  var postData = {
    body: post.body,
    tags: post.tags,
    title: post.title,
    url: post.url,
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
  loading(true, popup);
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
        tags += '<a class="special" onclick="tagClickHandler(event,`'+tag+'`,`'+author._id+'`,null);" href="/'+author.name+'/~tagged/'+tag+'">'+tag+'</a>, ';
      } else if (dated) {
        tags += '<a class="special" onclick="tagClickHandler(event,`'+tag+'`,null,`'+dated+'`);" href="/~tagged/'+tag+"/"+dated+'">'+tag+'</a>, ';
      } else {
        tags += '<a class="special" onclick="tagClickHandler(event,`'+tag+'`,null,null);" href="/~tagged/'+tag+'">'+tag+'</a>, ';
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
    $('tag-menu-open').onclick = function () {openTagMenu()}
    $('tag-feed-options').classList.remove('removed');
    $('tag-menu').classList.add('removed');
  } else {
    $('tag-menu-open').onclick = function () {openTagMenu(true)}
    $('tag-menu').classList.remove('removed');
    $('tag-picker').focus();
    $('tag-feed-options').classList.add('removed');
    openDateJump(true);
  }
}

var tagSearch = function () {
  var tag = $("tag-picker").value;
  if (tag === "") {return uiAlert("ya can't search for nothin!");}
  openTagMenu(true);
  if (glo.postPanelStatus.date) {
    fetchPosts(true, {postCode: "FTTF", tag: tag, date: glo.postPanelStatus.date});
  } else {
    fetchPosts(true, {postCode: "FTFF", tag:tag,});
  }
}

var saveTag = function (remove, tag, callback) {
  if (tag === undefined) {tag = $("tag-picker").value;}
  if (!tag) {tag = glo.postPanelStatus.tag}
  if (!tag) {return uiAlert("ya can't save nothin!");}
  if (_npa(['glo','savedTags', tag]) && !remove) {return;}     // tag is already saved
  ajaxCall("/saveTag", 'POST', {tag, remove:remove}, function(json) {
    if (remove) {glo.savedTags[tag] = false;}
    else {glo.savedTags[tag] = true;}
    flushPostListAndReloadCurrentDate();
    $("tag-picker").value = "";
    if (callback) { callback() }
  });
}

var tagPickerCheck = function (elem) {
  if (elem.value !== "") {
    $('search-tag-form').classList.remove('faded');
    $('search-tag-form').onclick = function () {tagSearch();}
    if (_npa(['glo','savedTags', elem.value])) {      // tag is already saved
      $('save-tag-form').classList.add('faded');
      $('save-tag-form').onclick = null;
    } else {
      $('save-tag-form').classList.remove('faded');
      $('save-tag-form').onclick = function () {saveTag();}
    }
  } else {
    $('save-tag-form').classList.add('faded');
    $('search-tag-form').classList.add('faded');
    $('search-tag-form').onclick = null;
    $('save-tag-form').onclick = null;
  }
}

var flushPostListAndReloadCurrentDate = function () {
  var x = _npa(['glo','pRef','date']);
  for (var dateObj in x) {
    if (x.hasOwnProperty(dateObj)) {
      delete x[dateObj];
    }
  }
  if (glo.postPanelStatus && glo.openPanel === "posts-panel") {
    fetchPosts(true);
  }
}

var toggleTaggedPostsInclusion = function () {
  ajaxCall('/toggleSetting', 'POST', {setting: "includeTaggedPosts"}, function(json) {
    if (glo.settings.includeTaggedPosts) {
      $('include-tagged-posts-toggle').value = 'false';
      glo.settings.includeTaggedPosts = false;
    } else {
      $('include-tagged-posts-toggle').value = 'true';
      glo.settings.includeTaggedPosts = true;
    }
    fetchPosts(true);
  });
}

var setPostStreamDirection = function () {
  ajaxCall('/toggleSetting', 'POST', {setting: "sortOldestPostsAtTop"}, function(json) {});
  if (glo.settings.sortOldestPostsAtTop) {
    glo.settings.sortOldestPostsAtTop = false;
  } else {
    glo.settings.sortOldestPostsAtTop = true;
  }
}

var toggleAutoSaveTagsOnUse = function () {
  ajaxCall('/toggleSetting', 'POST', {setting: "autoSaveTagsOnUse"}, function(json) {});
  if (glo.settings.autoSaveTagsOnUse) {
    $('auto-save-tags-on-use-toggle').value = 'false';
    glo.settings.autoSaveTagsOnUse = false;
  } else {
    $('auto-save-tags-on-use-toggle').value = 'true';
    glo.settings.autoSaveTagsOnUse = true;
  }
}

var toggleAutoEditorResize = function () {
  ajaxCall('/toggleSetting', 'POST', {setting: "doNotResizeEditor"}, function(json) {});
  if (glo.settings.doNotResizeEditor) {
    $('resize-editor-setting').value = 'false';
    glo.settings.doNotResizeEditor = false;
  } else {
    $('resize-editor-setting').value = 'true';
    glo.settings.doNotResizeEditor = true;
  }
}

var setPaginationDirection = function () {
  ajaxCall('/toggleSetting', 'POST', {setting: "newPostsToTheLeft"}, function(json) {});
  if (glo.settings.newPostsToTheLeft) {
    glo.settings.newPostsToTheLeft = false;
    $('pagination-direction-toggle1').value = "left";
    $('pagination-direction-toggle2').value = "right";
  } else {
    glo.settings.newPostsToTheLeft = true;
    $('pagination-direction-toggle1').value = "right";
    $('pagination-direction-toggle2').value = "left";
  }
}

var setPostsPerPage = function () {
  ajaxCall('/setPostsPerPage', 'POST', {number: Number($("posts-per-page").value)}, function(json) {});
  glo.settings.postsPerPage = Number($("posts-per-page").value);
  //
  if (glo.postPanelStatus && glo.postPanelStatus.page) {
    delete glo.postPanelStatus.page;
  }
  // throw out any loaded paginiated postLists
  if (glo.pRef && glo.pRef.author) {
    for (var author in glo.pRef.author) {if (glo.pRef.author.hasOwnProperty(author)) {
      delete glo.pRef.author[author].page;
      delete glo.pRef.author[author].totalPages;
    }}
  }
  if (glo.pRef && glo.pRef.tag) {
    for (var tag in glo.pRef.tag) {if (glo.pRef.tag.hasOwnProperty(tag)) {
      delete glo.pRef.tag[tag].page;
      delete glo.pRef.tag[tag].totalPages;
    }}
  }
}

var prepTextForEditor = function (text) {
  if (text === null || text === undefined) {
    return "";
  }
  if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    text = convertHtmlToMarkdown(text);
  }

  // posts are now stored with "\n"s anyway, but this covers if it's quoting/editing an old post w/ "<br>s"
  return text.replace(/<br>/g, '\n');
}

var pingPong = function (key, delay) {
  if (glo.debugMode) { return; }
  ajaxCall('/~pingPong', 'POST', {key:key, editorOpenElsewhere:glo.editorOpenElsewhere}, function (json) {
    if (json === false) {
      if (delay) {    // fail to connect to server, give it a minute and try again
        setTimeout(function () {
          pingPong(key, true)
        }, 60000);
      } else {
        pingPong(key, true);
      }
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
  if (!isAnEditorOpen()) {
    document.body.onclick = function () {editorButtonManagement();}
  }
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
      verify(`schlaugh detects that you currently already have an editor open, perhaps in another tab, browser, or device? If there are unsaved changes in <b>that</b> editor, you won't see them <b>here</b>. And if you start making changes <b>here</b> and then save the changes <b>there</b>, you still won't see those changes here... In general, having multiple editors open makes overwriting yourself easy and is not recommended<br><br>are you sure you want to open this editor?`,
      'yeah, do it anyway', 'nah, hold up', function (resp) {
        if (resp) {
          showWriter('post');
          if (!glo.debugMode) {
            ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:true});
          }
          if (callback) {callback();}
        }
      }, true);
    } else {
      showWriter('post');
      if (!glo.debugMode) {
        ajaxCall('/~postEditorOpen', 'POST', {key:glo.sessionKey, isEditorOpen:true});
      }
      if (callback) {callback();}
    }
  }
}
var hideWriter = function (kind) {
  $(kind+'-writer').classList.add('removed');
  $(kind+'-preview').classList.remove('removed');
  $('write-'+kind+'-button').focus();
  if (!glo.openEditors) {glo.openEditors = {}}
  glo.openEditors[kind] = false;
  if (!isAnEditorOpen()) {
    document.body.onclick = null;
  }
}

var debugMode = function () {
  glo.debugMode = true;
  $('post-editor').oninput = null;
  $('post-editor').onkeydown = null;
  document.body.onkeydown = null;
  return 'you have entered debug mode, this persists only for this session, to go back to normal: refresh. If you want debug mode on in your next session, enter the command again';
}

var resizeEditor = function (kind) {
  if (glo.settings.doNotResizeEditor) {
    return;
  }

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

var editorButtonManagement = function () {
  if (glo.lastClickedElem !== document.activeElement.id) {
    if (document.activeElement.id.substr(-7) === "-editor") {
      var kind = document.activeElement.id.substr(0, document.activeElement.id.length-7);
      $("editor-options-"+kind).classList.remove('removed');
      $(kind+"-editor-key-notice").classList.remove('removed');
    } else if (glo.lastClickedElem && glo.lastClickedElem.substr(-7) === "-editor") {
      var kind = glo.lastClickedElem.substr(0, glo.lastClickedElem.length-7);
      $("editor-options-"+kind).classList.add('removed');
      $(kind+"-editor-key-notice").classList.add('removed');
    }
    glo.lastClickedElem = document.activeElement.id;
  }
}

var styleText = function (tag, src, lineBreak) {
  updateEditorStateList(src);
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (a !== b && y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  //
  var openTag = '<'+tag+'>';
  var closeTag = '</'+tag+'>';
  if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    var found = false;
    for (var i = 0; i < mdLib.swaps.length; i++) {
      if (mdLib.swaps[i][1] === openTag) {
        found = true;
        openTag = mdLib.swaps[i][0];
        break;
      }
    }
    if (found) {
      closeTag = openTag;
    }
  }
  //
  if (!lineBreak) {
    area.value = y.slice(0, a) + openTag +y.slice(a, b)+closeTag + y.slice(b);
    setCursorPosition(area, a+openTag.length, b+openTag.length);
  } else {

    if (a === 0 || y.substr(a-1,1) === "\n") {openTag = openTag+'\n';}
    else { openTag = '\n'+openTag+'\n'; }
    if (y.substr(b,1) === "\n") {closeTag = '\n'+closeTag;}
    else { closeTag = '\n'+closeTag+'\n'; }
    area.value = y.slice(0, a)+ openTag + y.slice(a, b)+ closeTag +y.slice(b);
    setCursorPosition(area, a+openTag.length, b+openTag.length);
  }
}
var hyperlink = function (src) {
  updateEditorStateList(src);
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  if (a !== b) {$("link-prompt-input2").value = convertLineBreaks(y.substr(a,b-a), true);}
  $('link-prompt').classList.remove('hidden');
  blackBacking();
  setCursorPosition($("link-prompt-input1"), 0, $("link-prompt-input1").value.length);
  var exit = function () {
    closePrompt($('link-prompt'));
    setCursorPosition(area, a, b);
  }
  $("pop-up-backing").onclick = exit;
  $("link-prompt-exit").onclick = exit;

  $("link-prompt-submit").onclick = function() {
    var target = $("link-prompt-input1").value;
    var linkText = $("link-prompt-input2").value;
    if (!linkText) {linkText = target}
    if (target) {
      linkText = convertLineBreaks(linkText);
      checkLink(target, linkText, area, y, a, b);
      closePrompt($('link-prompt'));
    } else {
      exit();
    }
  }
}
var checkLink = function (target, linkText, area, y, a, b) {
  var marget = target;
  if (marget.slice(0,1) === "/") {marget = window.location.origin + marget}
  else if (marget.slice(0,8) !== "https://" && marget.slice(0,7) !== "http://") {
    marget = target = "http://" + marget;
  }
  /*
  ajaxCall('/link', 'POST', {url:marget,}, function(json) {
    if (json.linkProblems) {uiAlert(json.linkProblems);}
    if (json.linkProblems) {
      var cursorPos = getCursorPosition(area);
      verify(json.linkProblems, null, null, function (res) {
        if (!res) {
          area.value = y;
          setCursorPosition(area, a, b);
        } else {
          setCursorPosition(area, cursorPos.start, cursorPos.end);
        }
      });
    }
  });
  */
  var open = mdLib.link[1][0];
  var mid = mdLib.link[1][1];
  var close = mdLib.link[1][2];
  if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    open = mdLib.link[0][0]
    mid = mdLib.link[0][1];
    close = mdLib.link[0][2];
  }
  area.value = y.slice(0, a)+ open +target+ mid +linkText+ close +y.slice(b);
  var bump = a+target.length+linkText.length+open.length+mid.length+close.length;
  setCursorPosition(area, bump, bump);
}
var insertImage = function (src) {
  updateEditorStateList(src);
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
    closePrompt($('img-input-prompt'));
    setCursorPosition(area, a, b);
  }
  $("pop-up-backing").onclick = exit;
  $("img-input-prompt-exit").onclick = exit;

  $("img-input-prompt-submit").onclick = function() {
    var url = $('img-input-prompt-input').value;
    var title = $('img-input-prompt-input2').value;
    var alt = $('img-input-prompt-input3').value;
    if (url) {
      var open = mdLib.img[1][0];
      var mid = mdLib.img[1][1];
      var mid2 = mdLib.img[1][2];
      var close = mdLib.img[1][3];
      if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
        open = mdLib.img[0][0]
        mid = mdLib.img[0][1];
        mid2 = mdLib.img[0][2];
        close = mdLib.img[0][3];
      }
      var openTag = '\n'+open;
      if (a === 0 || y.substr(a-1,1) === "\n") {openTag = open}
      //url += '"';
      if (title) {
        title = mid + title;
      } else {title = "";}
      if (alt) {
        alt = mid2 +alt;
      } else {alt = "";}
      var closeTag = close + '\n';
      if (y.substr(b,1) === "\n") {closeTag = close}
      area.value = y.slice(0, a)+ openTag + url + title + alt + closeTag +y.slice(b);
      var bump = a +url.length+ title.length+ alt.length+ openTag.length + closeTag.length;
      setCursorPosition(area, bump, bump);
      closePrompt($('img-input-prompt'));
    } else {
      exit();
    }
  }
}
var insertHR = function (src) {
  updateEditorStateList(src);
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
  //
  var tag = mdLib.hr[1];
  if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    tag = mdLib.hr[0];
  }
  //
  area.value = y.slice(0, a)+ pre + tag + post +y.slice(b);
  var bump = a + tag.length + pre.length + post.length;
  setCursorPosition(area, bump, bump);
}
var insertMDlist = function (src, type) {
  updateEditorStateList(src);
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var pre = "";
  if (a !== 0 && y.substr(a-1,1) !== "\n") {pre = "\n"}
  //
  var tag = mdLib[type];
  //
  area.value = y.slice(0, a)+ pre + tag + y.slice(b);
  var bump = a + tag.length + pre.length;
  setCursorPosition(area, bump, bump);
}
var insertQuote = function (src) {
  updateEditorStateList(src);
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  var quoteText;
  if (a !== b) {quoteText = convertLineBreaks(y.substr(a,b-a), true);}
  //
  var openTag = "<quote>";
  var closeTag = "</quote>";
  if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    openTag = mdLib.quote[0]
    closeTag = mdLib.quote[1];
  }
  if (a === 0 || y.substr(a-1,1) === "\n") {openTag = openTag + '\n'}
  else {openTag = '\n'+openTag+'\n'}
  if (y.substr(b,1) === "\n") {closeTag = '\n'+closeTag;}
  else {closeTag = '\n'+closeTag+'\n'}


  if (quoteText) {$("quote-prompt-input1").value = quoteText;}
  $('quote-prompt').classList.remove('hidden');
  blackBacking();
  setCursorPosition($("quote-prompt-input1"), 0, $("quote-prompt-input1").value.length);
  var exit = function () {
    closePrompt($('quote-prompt'));
    setCursorPosition(area, a, b);
  }
  $("pop-up-backing").onclick = exit;
  $("quote-prompt-exit").onclick = exit;

  $("quote-prompt-submit").onclick = function() {
    quoteText = convertLineBreaks($('quote-prompt-input1').value);
    var sourceText = $('quote-prompt-input2').value;
    var sourceLink = $('quote-prompt-input3').value;

    if (sourceText !== null && sourceText !== "") {
      if (sourceLink !== null && sourceLink !== "") {

        // fudge, validate the link, ehhhh why? (it validates in after submitting, i think that's fine)

        var open = mdLib.link[1][0];
        var mid = mdLib.link[1][1];
        var close = mdLib.link[1][2];
        if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
          open = mdLib.link[0][0]
          mid = mdLib.link[0][1];
          close = mdLib.link[0][2];
        }

        area.value = y.slice(0, a)+openTag+quoteText+'\n<r>'+open+sourceLink+ mid +'-'+sourceText+ close +'</r>'+ closeTag +y.slice(b);
        var bump = a+quoteText.length+sourceLink.length+sourceText.length + 9 + openTag.length + closeTag.length +open.length+mid.length+close.length;
        setCursorPosition(area, bump, bump);
      } else {
        area.value = y.slice(0, a)+openTag+quoteText+'\n<r>-'+sourceText+'</r>'+ closeTag +y.slice(b);
        var bump = a+quoteText.length+sourceText.length +11 + openTag.length + closeTag.length;
        setCursorPosition(area, bump, bump);
      }
    } else {
      area.value = y.slice(0, a)+openTag+quoteText + closeTag +y.slice(b);
      var bump = a + quoteText.length + openTag.length + closeTag.length;
      setCursorPosition(area, bump, bump);
    }
    closePrompt($('quote-prompt'));
  }

}
var insertNote = function (src) {
  updateEditorStateList(src);
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var selectedText;
  if (a !== b && y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  if (a !== b) {selectedText = y.substr(a,b-a);}

  var open = mdLib.note[1][0];
  var mid = mdLib.note[1][1];
  var close = mdLib.note[1][2];
  if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    open = mdLib.note[0][0]
    mid = mdLib.note[0][1];
    close = mdLib.note[0][2];
  }

  if (selectedText) {
    verify("would you like the currently selected text to be the text that is:", "clicked", "initially hidden", function (response) {
      if (response) {
        area.value = y.slice(0, a)+ open +selectedText+ mid +'\n\n'+ close +y.slice(b);
        var bump = a+selectedText.length+open.length+mid.length;
        setCursorPosition(area, bump, bump);
      } else {
        area.value = y.slice(0, a)+ open + mid +'\n'+selectedText+'\n'+ close +y.slice(b);
        var bump = a+open.length;
        setCursorPosition(area, bump, bump);
      }
    });
  } else {
    area.value = y.slice(0, a)+ open+mid +'\n\n'+ close +y.slice(b);
    var bump = a+open.length;
    setCursorPosition(area, bump, bump);
  }
}
var closePrompt = function (elem) {
  blackBacking(true);
  elem.classList.add('hidden');
}

var toggleMoreEditorButtons = function (kind) {
  var cursorPos = getCursorPosition($(kind+'-editor'));
  var elem = $(kind+"-toggle-more-buttons");

  if (elem.title === "more buttons") {
    showMoreEditorButtons(kind);
  } else {
    showLessEditorButtons(kind);
  }

  setCursorPosition($(kind+'-editor'), cursorPos.start, cursorPos.end);
  //
  ajaxCall('/toggleSetting', 'POST', {setting: "showAllEditorButtons"}, function() {
    // do nothing
  });
}
var showMoreEditorButtons = function (kind) {
  var elem = $(kind+"-toggle-more-buttons");
  elem.innerHTML = iconBank.minus;
  elem.title = "less buttons";
  $(kind+"-more-buttons").classList.remove("removed");
}
var showLessEditorButtons = function (kind) {
  var elem = $(kind+"-toggle-more-buttons");
  elem.innerHTML = iconBank.plus;
  elem.title = "more buttons";
  $(kind+"-more-buttons").classList.add("removed");
}

var toggleEditorMarkdown = function (kind) {
  var cursorPos = getCursorPosition($(kind+'-editor'));
  ajaxCall('/toggleSetting', 'POST', {setting: "isUsingHtmlEditorMode"}, function(json) {});
  if (_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    _npa(['glo','settings','isUsingHtmlEditorMode'], false);
    var convert = convertHtmlToMarkdown;
  } else {
    _npa(['glo','settings','isUsingHtmlEditorMode'], true);
    var convert = convertMarkdownToHtml;
  }
  //
  var text = $(kind+'-editor').value;
  text = convert(text);
  $(kind+'-editor').value = text;
  //
  updateEditorModeButtons();
  //
  setCursorPosition($(kind+'-editor'), text.length, text.length);
}

var mdLib = {
  esc: "\\",
  code: "``",
  ascii: "%%",
  latex: "$$",
  ol: "  -",
  ul: "  *",
  hr: ['===','<hr>'],
  quote: [">>","<<"],
  link: [["[[","|","]]"],[`<a href="`,`">`,`</a>`]],
  img: [["{{","|","|","}}"],[`<img src="`,`" title="`,`" alt="`,`">`]],
  note: [["((","|","))"],[`<note linkText="`,`">`,`</note>`, `<note>`]],
  swaps: [
  ['**',"<b>","</b>"],
  ['//',"<i>","</i>"],
  ['__',"<u>","</u>"],
  ['--',"<s>","</s>"],
  ['~~',"<s>","</s>"],
  ['&&',"<cut>","</cut>"],
  ['``',"<code>","</code>"],
  ['$$',"<latex>","</latex>"],
  ['%%',"<ascii>","</ascii>"],
  ['@@',"<spoil>","</spoil>"],
  ],
  straightSwaps : [
    ['>>',"<quote>"],
    ["<<","</quote>"],
    ["((","<note>"],
    ["))","</note>"],
    ["===", "<hr>"],
  ],
  escList: ['**','//','__','--','~~','&&','``','%%','##','@@','>>',"<<","((","))","===","  -","  *","{{","[["]
};

var convertHtmlToMarkdown = function (string) {
  string = escapeMarkdown(string);

  string = mdImgConvert(string, 0, 1);
  string = mdLinkConvert(string, 0, 1);
  string = mdNoteConvert(string, 0, 1);
  string = listConvertHtmlToMd(string);

  for (var i = 0; i < mdLib.straightSwaps.length; i++) {
    string = stringReplaceAll(string, mdLib.straightSwaps[i][1], mdLib.straightSwaps[i][0]);
  }

  for (var i = 0; i < mdLib.swaps.length; i++) {
    //
    string = matchAndConvertHtmlTagPairs(string, 0, i, 1);
    string = matchAndConvertHtmlTagPairs(string, 0, i, 2);
  }
  // unEscape
  string = escapeMdTweenTags(string, 0, 'code', true);
  string = escapeMdTweenTags(string, 0, 'ascii', true);
  string = escapeMdTweenTags(string, 0, 'latex', true);

  return string;
}

var stringReplaceAll = function (string, replacee, replacement, mindEscapes, pos) {
  // because too many chars i want to use mean something special in regex, so i can't use regex, so i can't use the "global" modifier on string.replace so this is my version of that
  if (!pos) {
    pos = 0;
    if (replacement.indexOf(replacee) !== -1) {
      uiAlert("infinite loop catch<br><br>the replacement string can't contain the replacee string");
      return null;
    }
  }

  var pos = string.indexOf(replacee, pos);
  if (pos === -1) {return string;}

  //is the match we found escaped? (...and the escape NOT escaped)
  if (string.substr(pos-1, 1) === mdLib.esc && string.substr(pos-2, 1) !== mdLib.esc) {
    string = string.substr(0,pos-1) + string.substr(pos);
  } else {
    string = string.substr(0,pos) + string.substr(pos).replace(replacee, replacement);
  }

  return stringReplaceAll(string, replacee, replacement, mindEscapes, pos+1);
}

var escapeMarkdown = function (string, pos, mdPos, undo) {
  // inserts an esc char in front of any valid markdown syntax to neuter it
  // and does the reverse with the "undo" flag true
  if (!pos && !mdPos) {
    pos = 0;
    mdPos = 0;
  }

  var next = string.indexOf(mdLib.escList[mdPos], pos);

  if (next === -1) {
    if (mdLib.escList.length === mdPos+1) {
      return string;
    } else {
      return escapeMarkdown(string, 0, mdPos+1, undo);
    }
  }
  pos = next;
  // is it ALREADY escaped? (...and the escape NOT escaped)
  if (string.substr(pos-1, 1) === mdLib.esc && string.substr(pos-2, 1) !== mdLib.esc) {
    if (undo) {
      string = string.substr(0, pos-mdLib.esc.length)+string.substr(pos)
    }
    return escapeMarkdown(string, pos+1, mdPos, undo);
  } else {
    string = string.substr(0, pos) + mdLib.esc + string.substr(pos);
    return escapeMarkdown(string, pos + mdLib.esc.length + mdLib.escList[mdPos].length, mdPos, undo);
  }
}

var matchAndConvertHtmlTagPairs = function (string, pos, mdPos, j) {
  var next = string.indexOf(mdLib.swaps[mdPos][j], pos);
  if (next === -1) {return string;}
  pos = next;

  // hack around double dollar sign problem
  var swapIn = mdLib.swaps[mdPos][0];
  swapIn = swapIn.replace('$$', '$$$$$$$$');
  
  //replace w/ opening tag
  string = string.replace(mdLib.swaps[mdPos][j], swapIn);
  //
  return matchAndConvertHtmlTagPairs(string, pos, mdPos, j);
}

var convertMarkdownToHtml = function (string) {
  string = escapeMdTweenTags(string, 0, 'code');
  string = escapeMdTweenTags(string, 0, 'ascii');
  string = escapeMdTweenTags(string, 0, 'latex');
  //
  // we do the quote tags here first, because i've assigned them >> which can get tripped up if they are used next to other tags that are converted to html
  for (var i = 0; i < 2; i++) {
    string = stringReplaceAll(string, mdLib.straightSwaps[i][0], mdLib.straightSwaps[i][1], true);
  }
  //
  string = mdImgConvert(string, 0, 0);
  string = mdLinkConvert(string, 0, 0);
  string = mdNoteConvert(string, 0, 0);
  string = listConvertMdToHtml(string);

  for (var i = 2; i < mdLib.straightSwaps.length; i++) {
    string = stringReplaceAll(string, mdLib.straightSwaps[i][0], mdLib.straightSwaps[i][1], true);
  }

  for (var i = 0; i < mdLib.swaps.length; i++) {
    string = matchAndConvertMarkdownTagPairs(string, 0, i, true);
  }
  return string;
}

var escapeMdTweenTags = function (string, pos, type, undo) {
  if (!pos) { pos = 0;}

  var first = string.indexOf(mdLib[type], pos);
  if (first !== -1) {
    first += mdLib[type].length
    var second = string.indexOf(mdLib[type], first);
    if (second !== -1) {
      var a = string.substr(0,first);
      var b = string.substr(first,second-first)
      b = escapeMarkdown(b, 0, 0, undo);
      var c = string.substr(second);
      string = a + b + c;
      pos = a.length + b.length + 1;
    } else {
      return string;
    }
  } else {
    return string;
  }

  return escapeMdTweenTags(string, pos, type, undo);
}

var listConvertHtmlToMd = function (string, pos, stack) {
  if (!pos && !stack) { // init
    pos = 0;
    stack = [];
    string = stringReplaceAll(string, "</li>", "");
  }

  var pos = findNext(string, pos, ["<ol>", "<ul>", "</ol>", "</ul>", "<li>"]);
  if (pos === Infinity) { return string; }

  if (string.substr(pos, 4) === "<ol>" || string.substr(pos, 4) === "<ul>") {
    stack.push(string.substr(pos+1,2));
    string = string.substr(0,pos) + string.substr(pos+4);

  } else if (string.substr(pos, 5) === "</ol>" || string.substr(pos, 5) === "</ul>") {
    stack.pop();  // we're assuming that the tag we found is the last item on the stack...
                  // which it should be, but i guess people might type broken nonpaired html tags... and then try to convert them to markdown?
    string = string.substr(0,pos) + string.substr(pos+5);

  } else if (string.substr(pos, 4) === "<li>") {
    if (stack[stack.length-1]) {
      var indent = "";
      while (indent.length !== (stack.length-1)*2) {
        indent += "  ";
      }
      string = string.substr(0,pos) + indent + mdLib[stack[stack.length-1]] + string.substr(pos+4);
    } else {
      // if no stack? as in, they have a <li> floating outside inside a list
      // i guess just leave it be
      pos++;
    }
  }

  return listConvertHtmlToMd(string, pos, stack);
}
var listConvertMdToHtml = function (string, pos, stack) {
  if (!pos) {pos = 0; stack = [];}

  var nextOl = string.indexOf(mdLib.ol, pos);
  var nextUl = string.indexOf(mdLib.ul, pos);

  if (nextUl === -1 && nextOl === -1) {return string;}
  if (nextUl === -1) {nextUl = Infinity;}
  if (nextOl === -1) {nextOl = Infinity;}

  pos = nextUl;
  var tag = "<ul>";
  if (nextOl < nextUl) { pos = nextOl; tag = "<ol>" }

  //is the match we found escaped? (...and the escape NOT escaped)
  if (string.substr(pos-1, 1) === mdLib.esc && string.substr(pos-2, 1) !== mdLib.esc) {
    return listConvertMdToHtml(string.substr(0, pos-1) + string.substr(pos), pos+1, stack);
  }

  // get the ol/ul depth in order
  var spaceDepth = getSpaceDepth(string, pos-1);
  pos -= (spaceDepth-1)*2;
  if (spaceDepth === stack.length) {
    if (stack[stack.length-1] === tag) {  // the list is already open and ready to pop another item on
      // do nothing
    } else {      // the list is at the right depth, but needs to switch to the other kind
      var out = stack.pop();
      stack.push(tag);
      var insert = "</" + out.substr(1) + tag;
      string = insertStringIntoStringAtPos(string, insert, pos);
      pos+=insert.length;
    }
  } else {
    if (spaceDepth > stack.length) {        // we've got to go deeper
      while (spaceDepth !== stack.length) {
        stack.push(tag);
        string = insertStringIntoStringAtPos(string, tag, pos);
        pos+=tag.length;
      }
    } else {                            // we're in too deep
      while (spaceDepth <= stack.length) {
        var out = stack.pop();
        var insert = "</" + out.substr(1);
        string = insertStringIntoStringAtPos(string, insert, pos);
        pos+=insert.length;
      }
      stack.push(tag);
      string = insertStringIntoStringAtPos(string, tag, pos);
      pos+=tag.length;
    }
  }
  // actually swap in the li
  string = string.substr(0,pos)+"<li>"+string.substr(pos + mdLib[tag.substr(1,2)].length + (spaceDepth-1)*2);

  // close out the li
  var pos = string.indexOf("\n", pos);
  if (pos !== -1) {
    string = insertStringIntoStringAtPos(string, '</li>', pos);
    pos +=6;
  } else {
    string = string + '</li>';
    pos = string.length;
  }

  // what comes next?
  while (string[pos] === " ") {
    pos++;
  }
  if (string.substr(pos-2, mdLib.ol.length) === mdLib.ol || string.substr(pos-2, mdLib.ul.length) === mdLib.ul) {
    pos-=2;
    // another list item is what comes next
    // so we do nothing and the next item is handled on the next loop through
  } else {
    // since there's no list item next, we close up shop, pop out the stack
    while (stack.length) {
      var out = stack.pop();
      var insert = "</" + out.substr(1);
      string = insertStringIntoStringAtPos(string, insert, pos);
      pos+=insert.length;
    }
  }

  return listConvertMdToHtml(string, pos, stack);
}

var findNext = function (string, pos, arr) {
  // takes in a base string to search, a pos to start searching from, and an array of strings to search for
  // returns the pos at which it first found any one of the strings
  // you could do this with regex search, but then i'd have to figuer out dynamically esacaping any string i might be searching for

  if (!pos) {pos = 0;}
  if (!arr || !arr[0]) {return -1;}

  var leader = Infinity;
  for (var i = 0; i < arr.length; i++) {
    var next = string.indexOf(arr[i], pos);
    if (next === -1) { next = Infinity; }
    if (next < leader) {
      leader = next;
    }
  }
  return leader;
}

var getSpaceDepth = function (string, pos) {
  var i = 0;
  while (string[pos] === " ") {
    i++;
    pos--;
  }
  return Math.floor(i/2)+1;
}

var mdLinkConvert = function (string, pos, dir) {
  if (!pos) {pos = 0}

  var nextStart = string.indexOf(mdLib.link[dir][0], pos);
  var scndNextStart = string.indexOf(mdLib.link[dir][0], nextStart+1);
  var nextMid = string.indexOf(mdLib.link[dir][1], nextStart+1);
  var nextEnd = string.indexOf(mdLib.link[dir][2], nextStart+1);

  if (nextStart === -1 || nextMid === -1 || nextEnd === -1) {return string;}
  if (scndNextStart === -1) {scndNextStart = Infinity;}
  if (nextMid > scndNextStart || nextMid > nextEnd || nextEnd > scndNextStart) {
    if (scndNextStart !== Infinity) {
      return mdLinkConvert(string, scndNextStart, dir);
    } else {
      return string;
    }
  }
  //
  var undo = false;
  if (dir === 1) {
    undo = true;
  }

  //is the match we found escaped? (...and the escape NOT escaped)
  if ((string.substr(nextStart-1, 1) === mdLib.esc && string.substr(nextStart-2, 1) !== mdLib.esc) && !undo) {
    string = string.substr(0, nextStart-1) + string.substr(nextStart);
  } else {
    // the actual string operation happens here
    string = string.substring(0,nextStart) + mdLib.link[(dir+1)%2][0] +
    escapeMarkdown(string.substring(nextStart+mdLib.link[dir][0].length, nextMid), 0,0,undo) + mdLib.link[(dir+1)%2][1] +
    string.substring(nextMid+mdLib.link[dir][1].length, nextEnd) + mdLib.link[(dir+1)%2][2] +
    string.substring(nextEnd+mdLib.link[dir][2].length);
  }

  if (scndNextStart !== Infinity) {
    return mdLinkConvert(string, nextStart+1, dir);
  } else {
    return string;
  }
}

var mdImgConvert = function (string, pos, dir) {
  if (!pos) {pos = 0}

  var nextStart = string.indexOf(mdLib.img[dir][0], pos);
  var scndNextStart = string.indexOf(mdLib.img[dir][0], nextStart+1);
  var nextEnd = string.indexOf(mdLib.img[dir][3], nextStart+1);
  var nextMid = string.indexOf(mdLib.img[dir][1], nextStart+1);
  if (nextMid > nextEnd) {nextMid = -1;}
  if (nextMid !== -1) {
    var scndnextMid = string.indexOf(mdLib.img[dir][2], nextMid+1);
    if (scndnextMid > nextEnd) {scndnextMid = -1;}
  }

  if (nextStart === -1 || nextEnd === -1) {return string;}
  if (scndNextStart === -1) {scndNextStart = Infinity;}
  if (nextEnd > scndNextStart) {
    if (scndNextStart !== Infinity) {
      return mdImgConvert(string, scndNextStart, dir);
    } else {
      return string;
    }
  }
  var undo = false;
  if (dir === 1) {
    undo = true;
  }

  //is the match we found escaped? (...and the escape NOT escaped)
  if (string.substr(nextStart-1, 1) === mdLib.esc && string.substr(nextStart-2, 1) !== mdLib.esc && !undo) {
    return mdImgConvert(string.substr(0, nextStart-1) + string.substr(nextStart), nextStart+1, dir);
  }

  if (nextMid !== -1) {
    if (scndnextMid !== -1) {
      string = string.substring(0,nextStart) + mdLib.img[(dir+1)%2][0] +
        escapeMarkdown(string.substring(nextStart+mdLib.img[dir][0].length, nextMid), 0,0,undo) + mdLib.img[(dir+1)%2][1] +
        string.substring(nextMid+mdLib.img[dir][1].length, scndnextMid) + mdLib.img[(dir+1)%2][2] +
        string.substring(scndnextMid+mdLib.img[dir][2].length, nextEnd) + mdLib.img[(dir+1)%2][3] +
        string.substring(nextEnd+mdLib.img[dir][3].length);
    } else {
      string = string.substring(0,nextStart) + mdLib.img[(dir+1)%2][0] +
      escapeMarkdown(string.substring(nextStart+mdLib.img[dir][0].length, nextMid), 0,0,undo) + mdLib.img[(dir+1)%2][1] +
      string.substring(nextMid+mdLib.img[dir][1].length, nextEnd) + mdLib.img[(dir+1)%2][3] +
      string.substring(nextEnd+mdLib.img[dir][3].length);
    }
  } else {
    string = string.substring(0,nextStart) + mdLib.img[(dir+1)%2][0] +
    escapeMarkdown(string.substring(nextStart+mdLib.img[dir][0].length, nextEnd), 0,0,undo) + mdLib.img[(dir+1)%2][3] +
    string.substring(nextEnd+mdLib.img[dir][3].length);
  }

  if (scndNextStart !== Infinity) {
    return mdImgConvert(string, nextStart+1, dir);
  } else {
    return string;
  }
}

var mdNoteConvert = function (string, pos, dir) {
  if (!pos) {pos = 0}

  var nextStart = string.indexOf(mdLib.note[dir][0], pos);
  var scndNextStart = string.indexOf(mdLib.note[dir][0], nextStart+ mdLib.note[dir][0].length);
  var nextEnd = string.indexOf(mdLib.note[dir][2], nextStart+ mdLib.note[dir][0].length);
  var nextMid = string.indexOf(mdLib.note[dir][1], nextStart+ mdLib.note[dir][0].length);

  if (scndNextStart === -1) {scndNextStart = Infinity;}
  if (nextMid === -1) {nextMid = Infinity;}
  if (nextEnd === -1) {nextEnd = Infinity;}
  if (nextMid > nextEnd || nextMid > scndNextStart) {nextMid = Infinity;}

  if (nextStart === -1 || nextEnd === Infinity) {return string;}


  //is the match we found escaped? (...and the escape NOT escaped)
  if (string.substr(nextStart-1, 1) === mdLib.esc && string.substr(nextStart-2, 1) !== mdLib.esc && !dir) {
    return mdNoteConvert(string, nextStart+1, dir);
  }

  if (nextMid !== Infinity) {
    string = string.substring(0,nextStart) + mdLib.note[(dir+1)%2][0] +
      string.substring(nextStart+mdLib.note[dir][0].length, nextMid) + mdLib.note[(dir+1)%2][1] +
      string.substring(nextMid+mdLib.note[dir][1].length);
  } else {
    // textless note shorthand, just the + button, <note>, no "linktext"
    string = string.substring(0,nextStart) + mdLib.note[(dir+1)%2][3] +
      string.substring(nextStart+mdLib.note[dir][0].length);
  }

  if (scndNextStart !== Infinity) {
    return mdNoteConvert(string, nextStart+1, dir);
  } else {
    return string;
  }
}

var matchAndConvertMarkdownTagPairs = function (string, pos, mdPos, opening) {
  // find next instance
  var next = string.indexOf(mdLib.swaps[mdPos][0], pos);
  if (next === -1) {return string;}                   // end condition
  pos = next;
                                        //is the match we found escaped? (...and the escape NOT escaped)
  if (string.substr(pos-1, 1) === mdLib.esc && string.substr(pos-2, 1) !== mdLib.esc) {
    string = string.substr(0, pos-1) + string.substr(pos);
    return matchAndConvertMarkdownTagPairs(string, pos+1, mdPos, opening);
  } else {
                              // no, go ahead and replace it with the html tag
    var tag = mdLib.swaps[mdPos][2];
    if (opening) {
      var tag = mdLib.swaps[mdPos][1];
      opening = false;
    } else {
      opening = true;
    }
    string = string.substr(0, pos) + string.substr(pos).replace(mdLib.swaps[mdPos][0], tag);
    return matchAndConvertMarkdownTagPairs(string, pos, mdPos, opening);
  }
}

var updateEditorModeButtons = function () {
  var arr = ["post","message","old-post"];
  if (_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    for (var i = 0; i < arr.length; i++) {
      $(arr[i]+"-editor-mode-button").innerHTML = "markdown";
      $(arr[i]+"-md-list-buttons").classList.add("removed");
      $(arr[i]+"-html-list-buttons").classList.remove("removed");
    }
  } else {
    for (var i = 0; i < arr.length; i++) {
      $(arr[i]+"-editor-mode-button").innerHTML = "HTML";
      $(arr[i]+"-md-list-buttons").classList.remove("removed");
      $(arr[i]+"-html-list-buttons").classList.add("removed");
    }
  }
}

var convertLineBreaks = function (string, dir) {
  if (dir) {
    return string.replace(/\r?\n|\r/g, '<br>');
  } else {
    return string.replace(/<br>/g, '\n');
  }
}

glo.editorState = {
  history: {
    'old-post':[],
    post:[],
    message:[],
  },
  pos: {
    'old-post': null,
    post: null,
    message: null,
  },
  checkLoop: {},
}
var checkEditorState = function (stateList, pos, currentText, cursPosi) {
  if (!stateList[pos] || currentText !== stateList[pos].text) {
    if (pos === stateList.length-1) {
      stateList.push({text:currentText, cursor:cursPosi});
      pos++;
    } else {
      stateList = stateList.slice(0,pos+1).concat({text:currentText, cursor:cursPosi});
      pos = stateList.length-1;
    }
    return {stateList:stateList, pos:pos};
  }
  return false;
}
var updateEditorStateList = function (kind, loop) {
  var changes = checkEditorState(glo.editorState.history[kind], glo.editorState.pos[kind], $(kind+"-editor").value, getCursorPosition($(kind+"-editor")));
  if (changes) {
    glo.editorState.history[kind] = changes.stateList;
    glo.editorState.pos[kind] = changes.pos;
  }
  // is there any undoable history?
  if (glo.editorState.pos[kind] > 0) {
    $(kind+"-undo-button").classList.remove('faded');
  } else {
    $(kind+"-undo-button").classList.add('faded');
  }
  // is there any REdoable history?
  if (glo.editorState.pos[kind]+1 < glo.editorState.history[kind].length) {
    $(kind+"-redo-button").classList.remove('faded');
  } else {
    $(kind+"-redo-button").classList.add('faded');
  }
  if (loop && !glo.debugMode) {
    setTimeout(function () {
      updateEditorStateList(kind, loop);
    }, 2000);
  }
}

var undo = function (kind) {
  var cursorPos = getCursorPosition($(kind+'-editor'));
  updateEditorStateList(kind);  // first check is to make sure we have the lastest
  if (glo.editorState.pos[kind] && glo.editorState.history[kind].length && glo.editorState.history[kind].length > 1) {
    glo.editorState.pos[kind]--;
    changeEditorState(kind);
  } else {
    setCursorPosition($(kind+'-editor'), cursorPos.start, cursorPos.end);
  }
  updateEditorStateList(kind);  // second check is so the buttons update Immediately
}
var redo = function (kind) {
  var cursorPos = getCursorPosition($(kind+'-editor'));
  updateEditorStateList(kind);  // first check is to make sure we have the lastest
  if (glo.editorState.pos[kind] !== undefined && glo.editorState.history[kind].length && glo.editorState.pos[kind] < glo.editorState.history[kind].length-1) {
    glo.editorState.pos[kind]++;
    changeEditorState(kind);
  } else {
    setCursorPosition($(kind+'-editor'), cursorPos.start, cursorPos.end);
  }
  updateEditorStateList(kind);  // second check is so the buttons update Immediately
}
var changeEditorState = function (kind) {
  $(kind+"-editor").value = glo.editorState.history[kind][glo.editorState.pos[kind]].text;
  var cursPos = glo.editorState.history[kind][glo.editorState.pos[kind]].cursor;
  setCursorPosition($(kind+"-editor"), cursPos.start, cursPos.end);
}

var edButtHand = {
  bold: function (kind) {styleText('b', kind);},
  ital: function (kind) {styleText('i', kind);},
  under: function (kind) {styleText('u', kind);},
  strike: function (kind) {styleText('s', kind);},
  li: function (kind) {styleText('li', kind);},
  ul: function (kind) {styleText('ul', kind, true);},
  ol: function (kind) {styleText('ol', kind, true);},
  //
  bulletItem: function (kind) {insertMDlist(kind, 'ul')},
  numberItem: function (kind) {insertMDlist(kind, 'ol')},
  //
  l: function (kind) {styleText('l', kind, true);},
  c: function (kind) {styleText('c', kind, true);},
  r: function (kind) {styleText('r', kind, true);},
  cut: function (kind) {styleText('cut', kind);},
  code: function (kind) {styleText('code', kind);},
  latex: function (kind) {styleText('latex', kind);},
  ascii: function (kind) {styleText('ascii', kind, true);},
  spoil: function (kind) {styleText('spoil', kind);},
  //
  submit: function (kind) {
    if (kind === "post") { return submitPost();}
    if (kind === "message") { return submitMessage();}
    if (kind === "old-post") { return $('submit-editing-old-post').onclick();}
  }
}

var showEditorHotkeyList = function () {
  uiAlert(`<ascii>        Ctrl + b  =>  bold
        Ctrl + i  =>  italic
        Ctrl + u  =>  underline
Ctrl + Shift + K  =>  strikethrough
        Ctrl + l  =>  bullet item
Ctrl + Shift + L  =>  number item
        Ctrl + h  =>  link
        Ctrl + p  =>  img
        Ctrl + o  =>  note
        Ctrl + q  =>  quote
        Ctrl + r  =>  hr
        Ctrl + 8  =>  left
        Ctrl + 9  =>  center
        Ctrl + 0  =>  right
        Ctrl + m  =>  cut
        Ctrl + j  =>  code
        Ctrl + k  =>  LaTeX(KaTeX)
        Ctrl + g  =>  ascii
        Ctrl + d  =>  spoil
Ctrl + Enter or s => submit/save
              Esc => cancel</ascii>`, 'oh wow');
}

var ulHotkeyRouter = function (kind) {
  if (_npa(['glo','settings','isUsingHtmlEditorMode'])) {
      edButtHand.ul(kind);
  } else {
      edButtHand.bulletItem(kind);
  }
}
var olHotKeyRouter = function (kind) {
  if (_npa(['glo','settings','isUsingHtmlEditorMode'])) {
    edButtHand.ol(kind);
  } else {
    edButtHand.numberItem(kind);
  }
}

var cancelEditor = function (kind) {
  if (kind === "post") { return cancelPost();}
  if (kind === "message") { return cancelMessage();}
  if (kind === "old-post") { return $('cancel-edit-button').onclick();}
}

glo.editorHotKeys = {
  ctrlKey: {
    shift:{
      Z: redo,
      L: olHotKeyRouter,
      K: edButtHand.strike,
    },
    z: undo,
    y: redo,
    b: edButtHand.bold,
    i: edButtHand.ital,
    u: edButtHand.under,
    //
    e: edButtHand.li,
    l: ulHotkeyRouter,
    //
    h: hyperlink,
    p: insertImage,
    o: insertNote,
    q: insertQuote,
    r: insertHR,
    //
    8: edButtHand.l,
    9: edButtHand.c,
    0: edButtHand.r,
    m: edButtHand.cut,
    j: edButtHand.code,
    k: edButtHand.latex,
    g: edButtHand.ascii,
    d: edButtHand.spoil,
    //
    Enter: edButtHand.submit,
    s: edButtHand.submit,
  },
}

var editorKeyHandler = function (event, kind) {
  event.stopPropagation();
  if (event.key === "F2") { return showEditorHotkeyList(); }
  if (event.key === "Escape") { return cancelEditor(kind); }

  if ((event.ctrlKey || event.metaKey) && _npa(['event','key',]) !== "Control") {  // ctrl(or meta)
    if (event.shiftKey && _npa(['event','key',]) !== "Shift") {                    // + shift
      if (_npa(['glo','editorHotKeys','ctrlKey','shift',event.key])) {
        event.preventDefault();
        _npa(['glo','editorHotKeys','ctrlKey','shift', event.key])(kind);
      }
    } else if (_npa(['glo','editorHotKeys','ctrlKey', event.key])) {          // no shift
      event.preventDefault();
      _npa(['glo','editorHotKeys','ctrlKey', event.key])(kind);
    }
  }
}
var editorExtraKeyHandler = function (event, kind) {
  event.stopPropagation();
  if (event.key === "Escape") { return cancelEditor(kind); }
  //
  if ((event.ctrlKey || event.metaKey) && _npa(['event','key',]) !== "Control") {  // ctrl(or meta)

    if (event.key === "Enter" || event.key === "s") {
      event.preventDefault();
      edButtHand.submit(kind);
    }
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
  $(i+"-thread").classList.add('removed');
  $("message-writer").classList.add('removed');
  $("message-preview").classList.add('removed');
  $("thread-pic").classList.add('removed');
  $("thread-user-wrapper").removeAttribute('href');
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
          $("inbox-panel-button").classList.remove("special");
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
        $("message-preview").classList.remove('removed');
        if (glo.threads[i].thread && glo.threads[i].thread.length) {
          $("mark-unread").classList.remove('removed');
        } else {
          $("mark-unread").classList.add('removed');
        }
      }
      $('block-button').classList.remove('removed');
      $("thread-list").classList.add('removed');
      $(i+"-thread").classList.remove('removed');
      $("thread-title").innerHTML = glo.threads[i].name;
      // pic
      if (glo.threads[i].image && glo.threads[i].image !== "") {
        $("thread-pic").setAttribute('src', glo.threads[i].image);
        $("thread-pic").setAttribute('alt', "the profile picture of "+glo.threads[i].name);
        $("thread-pic").classList.remove('removed');
      } else {
        $("thread-pic").classList.add('removed');
      }
      //
      $("thread-user-wrapper").setAttribute('href', "/"+glo.threads[i].name);
      (function (id) {
        $("thread-user-wrapper").onclick = function(event){
          modKeyCheck(event, function(){
            fetchPosts(true, {postCode:'TFFF', author:id});
          });
        }
      })(glo.threads[i]._id);
      $("thread-user-wrapper").classList.remove('removed');
      $("thread-title-area").classList.remove('removed');
      $("write-message-button").focus();
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
  ajaxCall('/unread', 'POST', {_id:glo.threads[i]._id, bool:true}, function(json) {});
  $("inbox-panel-button").classList.add("special");
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
    $('pending-message').innerHTML = prepTextForRender(pending, 'pending-message').string;
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
    //
    if (!_npa(['glo','settings','isUsingHtmlEditorMode'])) {
      text = convertMarkdownToHtml(text);
    }
    //
    if (text === "") {return hideWriter('message');}
    // have changes been made?
    if (glo.threads[i].thread[glo.threads[i].thread.length-1]) {
      if (glo.threads[i].thread[glo.threads[i].thread.length-1].body === text) {
        return hideWriter('message');
      }
    }
    if (!glo.threads[i].key) {return uiAlert("you cannot message the person you are trying to message, you shouldn't have this option at all, sorry this is a (strange)bug please note all details and tell staff, sorry");}
    //
    loading();


    var parsedMessage = pool.screenInputTextForImagesAndLinks(text);

    // fudge, need to call the backend for link checking here, parsedMessage.linkList

    if (parsedMessage.imgList.length !== 0) {
      ajaxCall('/image', 'POST', parsedMessage.imgList, function(json) {
        encryptAndSend(parsedMessage.string);
      });
    } else {encryptAndSend(parsedMessage.string);}
  }
}
var encryptAndSend = function (messageBody) {
  var i = glo.activeThreadIndex;

  encrypt(messageBody, glo.keys.pubKey, glo.threads[i].key, function (encSenderText, encRecText) {
    var data = {
      recipient: glo.threads[i]._id,
      encSenderText: encSenderText,
      encRecText: encRecText,
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
          last.body = messageBody;         //overwrite
        } else {
          glo.threads[i].thread.push({
            inbound: false,
            date: pool.getCurDate(-1),
            body: messageBody,
          });
        }
        updatePendingMessage(i);
      }
    });
  });
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
    body.innerHTML = prepTextForRender(x.body, uniqueID).string;
    message.appendChild(body);
  }
}

var createThread = function (i, top) {
  //creates the name and the box where messages will go
  glo.threadRef[glo.threads[i]._id] = i;
  var nameBox = document.createElement("div");
  var name = document.createElement("a");
  name.innerHTML = glo.threads[i].name;
  name.setAttribute('class', 'thread-name clicky');
  name.setAttribute('href', 'javascript:void(0);');
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
  destroyAllChildrenOfElement($("thread-list"));
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
    $("inbox-panel-button").classList.add("special");
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
openpgp.initWorker({ path:'/openpgp.worker.min.js' });

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
      if (!data.password) {
        return uiAlert('empty string is not a valid password, sorry');
      }
      data.forDecryption = true;
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
              var parsedMessage = pool.screenInputTextForImagesAndLinks(text);
              glo.threads[i].thread[j].body = parsedMessage.string;

              // image/link validation goes here
              // parsedMessage.imgList
              // parsedMessage.linkList
              // or do we even need to do links here? worst case it's just a broken link?
            }


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
  } else {
    $('in').classList.remove('removed');
    setCursorPosition($("in-name-input"), 0, $("in-name-input").value.length);
  }
  $('inOrUp').classList.add('removed');
  $('about-section').classList.add('removed');
  $('faq-section').classList.add('removed');
}

var backToLogInMenu = function () {
  $('up').classList.add('removed');
  $('in').classList.add('removed');
  $('about-section').classList.remove('removed');
  $('faq-section').classList.remove('removed');
  $('inOrUp').classList.remove('removed');
}

var scrollToAboutSection = function () {
  var stepSize = 2;
  var steps = Math.floor((window.innerHeight*.85)/stepSize);
  var timeTweenSteps = 2;
  for (var i = 0; i < steps; i++) {
    setTimeout(function () {
      window.scrollBy(0, stepSize);
    }, i*timeTweenSteps);
  }
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

var nameAndPassValidation = function (data) {
  var x = pool.userNameValidate(data.username);
  if (x) {return x;}
  var y = pool.passwordValidate(data.password);
  if (y) {return y;}
  return false;
}

var login = function() {
  var data = {
    username: $('in-name-input').value.toLowerCase(),
    password: $('in-pass-input').value,
  }
  var invalid = nameAndPassValidation(data);
  if (invalid) {return uiAlert(invalid);}
  //
  signIn('/login', data, function () {
    switchPanel('posts-panel');
    fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
  });
}

var signUp = function () {
  var data = {
    username: $('name-input').value,
    password: $('pass-input').value,
  }
  var invalid = nameAndPassValidation(data);
  if (invalid) {return uiAlert(invalid);}
  //
  data.email = $('email-input').value.toLowerCase();
  if (data.password !== $('pass-input-two').value) {
    uiAlert('passwords are not the same<br><br>they must be the same!');
    return;
  }
  verify("now is the time to make sure your password is stored in your password manager or otherwise secured such that it's not lost after you submit this form<br><br>we good?", "yes sir!", "...no, hold up", function (resp) {
    if (!resp) {return;}
    signIn('/register', data, function () {
      switchPanel('posts-panel');
      fetchPosts(true, {postCode:"FFTF", date:pool.getCurDate(),});
    });
  });
}

var cookieNotification = function () {
  if (glo && glo.settings && (!glo.settings.notifiedAboutCookie || pool.getCurDate() >= glo.settings.notifiedAboutCookie || glo.settings.notifiedAboutCookie === true)) {
    notifyWithReminderOption("the cops told me i gotta tell you bout how schlaugh stores exactly two tiny cookies on your browser for persistent sign in, and literally nothing else. If you see the cops tell the cops that I told you about the cookies.", 'notifiedAboutCookie');
  }
}

var notifyWithReminderOption = function (txt, setting) {
  if (!setting || !txt || typeof txt !== "string") {return uiAlert("errorroror!!<br><br>Sorry! Please show this to @staff. Error code 9301");}
  $("how-long-text").innerHTML = txt;
  blackBacking();
  $("how-long").classList.remove("hidden");
  $("how-long-input").value = 31;
  $("how-long-input").focus();
  //
  $("how-long-submit").onclick = function(){
    $("how-long").classList.add("hidden");
    blackBacking(true);
    var duration = Number($("how-long-input").value);
    if (!Number.isInteger(duration) || duration < 0) {
      uiAlert("oh do <i>please</i> at least would you <i>try</i> to only input non negative integers?", "yes doctor i will try", function () {
        notifyWithReminderOption(txt, setting);
      });
    } else {
      ajaxCall("/setReminder", 'POST' ,{setting: setting, days:duration}, function (json) {
        glo.settings[setting] = pool.getCurDate(-(duration));
      });
    }
  }
  $("pop-up-backing").onclick = function(){
    $("how-long").classList.add("hidden");
    blackBacking(true);
    ajaxCall("/setReminder", 'POST' ,{setting: setting, days:1}, function (json) {
      glo.settings[setting] = pool.getCurDate(-1);
    });
  }
}

var signIn = function (url, data, callback) {
  if (!data.password) {
    return uiAlert('empty string is not a valid password, sorry');
  }
  loading();
  ajaxCall(url, 'POST', data, function(json) {
    $('about-section').classList.remove('removed');
    $('faq-section').classList.remove('removed');
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
              unlockInbox(data.password);
              if (callback) {callback(json.payload);}
            });
          });
        } else {
          ajaxCall('/keys', 'POST', keys, function(json) {
            parseUserData(json.payload);
            unlockInbox(data.password);
            if (callback) {callback(json.payload);}
          });
        }
      });
    } else {
      parseUserData(json.payload);
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
  glo.games = data.games;
  glo.threadRef = {};
  glo.settings = data.settings;
  glo.pending = data.pending;
  glo.pendingUpdates = data.pendingUpdates;
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
  //
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

  setGear();

  updatePendingPost(glo.pending);
  updateEditorStateList('post',true);
  updateEditorStateList('old-post',true);
  updateEditorStateList('message',true);
  updateEditorModeButtons();
  populateThreadlist();
  pingPong(data.sessionKey);
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
        switchPanel('posts-panel',true)
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
    if (!glo.openPanel || (glo.openPanel !== "clicker-panel" && glo.openPanel !== "schlaunquer-panel")) {
      $("panel-buttons-wrapper").classList.remove("removed");
    }
    //
    var kinds = ["old-post", "message", "post"];
    if (glo.settings.showAllEditorButtons) {
      for (var i = 0; i < kinds.length; i++) {
        showMoreEditorButtons(kinds[i]);
      }
    } else {
      for (var i = 0; i < kinds.length; i++) {
        showLessEditorButtons(kinds[i]);
      }
    }
    //
    if (glo.settings.includeTaggedPosts) {
      $('include-tagged-posts-toggle').value = 'true';
    } else {
      $('include-tagged-posts-toggle').value = 'false';
    }
    //
    if (glo.settings.autoSaveTagsOnUse) {
      $('auto-save-tags-on-use-toggle').value = 'true';
    } else {
      $('auto-save-tags-on-use-toggle').value = 'false';
    }
    //
    if (glo.settings.doNotResizeEditor) {
      $('resize-editor-setting').value = 'true';
    } else {
      $('resize-editor-setting').value = 'false';
    }
    //
    if (glo.settings.sortOldestPostsAtTop) {
      $('post-stream-toggle').value = "oldest";
    }
    //
    if (glo.settings.postsPerPage) {
      $("posts-per-page").value = glo.settings.postsPerPage;
    } else {
      $("posts-per-page").value = 7;
    }
    //
    if (glo.settings.newPostsToTheLeft) {
      $('pagination-direction-toggle1').value = "right";
      $('pagination-direction-toggle2').value = "left";
    }
    //
    $('sign-to-save2').classList.add('removed');
    $('sign-to-save3').classList.add('removed');
    $('revert-appearance2').classList.add('removed');
    $('revert-appearance3').classList.add('removed');

    $("save-tag-form").classList.remove("removed");
    $("saved-tags-list").classList.remove("removed");
    //
    $('start-new-schlaunquer-game').classList.remove("removed");

    if (glo.games && glo.games.schlaunquer) {
      if (glo.games.schlaunquer.remindNextOn && glo.games.schlaunquer.remindNextOn > pool.getCurDate(-1)) {
        $('schlaunquer-game-reminder-setting').value = 'false';
      }

      if (glo.games.schlaunquer.matchListsLastUpdatedOn !== pool.getCurDate()) { // don't call for the check at all if we already know we're current
        ajaxCall('/~checkPendingSchlaunquerMatches', 'POST', {}, function(json) {
          if (!json.noUpdate) {
            glo.games.schlaunquer = json;
          }
          setSchlaunquerNotificationOnFeed();
        });
      }
      setSchlaunquerNotificationOnFeed();
    }
  }
  //
  updateUserPic();
  //
  cookieNotification();
}

var setSchlaunquerNotificationOnFeed = function () {
  var remindNextOn = _npa(['glo', 'games', 'schlaunquer', 'remindNextOn']);
  if (remindNextOn && remindNextOn >= pool.getCurDate()) {
    $('schlaunquer-reminder').classList.add("removed");
    return;
  }
  if (glo.games && glo.games.schlaunquer && glo.games.schlaunquer.active) {
    var count = 0;
    for (var match in glo.games.schlaunquer.active) {if (glo.games.schlaunquer.active.hasOwnProperty(match)) {
      if (glo.games.schlaunquer.active[match] === true) {
        count++;
      }
    }}
    if (count > 0) {
      if (count === 1) {
        $('schlaunquer-reminder-single').classList.remove("removed");
        $('schlaunquer-reminder-multiple').classList.add("removed");
      } else {
        $('schlaunquer-reminder-single').classList.add("removed");
        $('schlaunquer-reminder-multiple').classList.remove("removed");
      }
      $('schlaunquer-reminder').classList.remove("removed");
    } else {
      $('schlaunquer-reminder').classList.add("removed");
    }
  } else {
    $('schlaunquer-reminder').classList.add("removed");
  }
}

var setSchlaunquerReminder = function (fromSettings) {
  if (fromSettings) {
    if ($('schlaunquer-game-reminder-setting').value === 'false') {
      var date = pool.getCurDate(-999999);
    } else {
      var date = pool.getCurDate(1);
    }
  } else {
    var date = pool.getCurDate();
  }
  ajaxCall('/~setSchlaunquerReminder', 'POST', {date:date}, function(json) {
    _npa(['glo', 'games', 'schlaunquer', 'remindNextOn'], date);
    setSchlaunquerNotificationOnFeed();
  });
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
    // detect if browser is set to prefer dark mode
    if ( window.matchMedia('(prefers-color-scheme: dark)').matches) {
      defaultTheme = 'slate';
    }
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
    var props = [['font-family', "Roboto"], ['font-size', '16px'], ['line-height', 1.25], ['letter-spacing', '0px'],['max-width',"1000"]];
    for (var i = 0; i < props.length; i++) {
      if (!glo.settings[props[i][0]]) {
        glo.settings[props[i][0]] = props[i][1];
      }
      changeFont(glo.settings[props[i][0]], props[i][0]);
      $(props[i][0]+'-select').value = glo.settings[props[i][0]];
    }
    //
    if (!glo.settings.preset) {
      glo.settings.preset = defaultTheme;
    }
    $('preset-select').value = glo.settings.preset;
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
  // set the schlaupdate clock in the footer
  manageSchlaupdateClock();
}

var manageSchlaupdateClock = function () {
  var time = new Date(new Date().getTime() - 9*3600*1000);  //UTC offset by -9

  var hoursRemaining = 24 - time.getUTCHours();
  var minutesRemaining = 60 - time.getUTCMinutes();
  var secondsRemaining = 60 - time.getUTCSeconds();
  var millisecondsRemaining = 1000 - time.getUTCMilliseconds();

  if (hoursRemaining === 1) {
    if (minutesRemaining === 1) {
      if (secondsRemaining === 1) {
        $('schlaupdate-timer').innerHTML =  "1 second to schlaupdate";
        setTimeout(function () {
          $('schlaupdate-timer').innerHTML =  "s c h l a u p d a t e";
          performFrontEndSchlaupdate();
          setTimeout(function () {
            manageSchlaupdateClock();
          }, 2000);
        }, 1000);
      } else {
        $('schlaupdate-timer').innerHTML = secondsRemaining+" seconds to schlaupdate";
        setTimeout(function () { manageSchlaupdateClock(); }, millisecondsRemaining);
      }
    } else {
      $('schlaupdate-timer').innerHTML =  "< "+minutesRemaining+" minutes to schlaupdate";
      setTimeout(function () { manageSchlaupdateClock(); }, (secondsRemaining-1)*1000 + millisecondsRemaining);
    }
  } else {
    $('schlaupdate-timer').innerHTML = "< "+hoursRemaining+" hours to schlaupdate";
    setTimeout(function () { manageSchlaupdateClock(); }, ((minutesRemaining-1)*60 + (secondsRemaining-1))*1000 + millisecondsRemaining);
  }
}

var performFrontEndSchlaupdate = function () {
  if (glo.username) {
    if (isAnEditorOpen()) {
      uiAlert(`It's Schlaupdate isn't it? Isn't it Schlaupdate?<br><br>And it seems you have an editor open, potentially holding unsaved changes! Just a heads up, if you submit the text in the editor, it will now be scheduled to post for the <i>next</i> schlaugh day, not this day that just started right now. If you had previously submitted a prior version of that post/message, then that will have just published/sent for today.`, null, null, true)
    } else {
      updatePendingPost(null);  // removes a saved pending post, now that it's published
      ajaxCall('/getInbox', 'POST', {}, function(json) {
        glo.threads = json.threads;
        glo.threadRef = {};
        populateThreadlist();
      });
    }
  }
  if (glo.postPanelStatus && glo.postPanelStatus.date && glo.postPanelStatus.date < pool.getCurDate()) {
    $("top-right-date-arrow").classList.remove('hidden');
    $("bot-right-date-arrow").classList.remove('hidden');
  }
}

var schlaupdateExplain = function () {
  var time = new Date(new Date().getTime() - 9*3600*1000);  //UTC offset by -9
  var hoursRemaining = 24 - time.getUTCHours();
  var minutesRemaining = 60 - time.getUTCMinutes();
  var timeString;
  if (hoursRemaining === 1) {
    if (minutesRemaining === 1) {
      timeString =  " less than 1 minute "
    } else {
      timeString = " less than "+minutesRemaining+" minutes "
    }
  } else {
    if (minutesRemaining === 1) {
      timeString = " about "+(hoursRemaining-1)+" hours and 1 minute "
    } else if (minutesRemaining === 60) {
      timeString = " about "+hoursRemaining+" hours "
    } else {
      timeString = " about "+(hoursRemaining-1)+" hours and "+minutesRemaining+" minutes "
    }
  }
  uiAlert(`all pending posts and messages will be published/sent at the strike of schlaupdate and not a moment sooner<br><br>you have `+timeString+` until the next schlaupdate`);
}

var setGear = function () {
  var time = new Date(new Date().getTime() - 9*3600*1000);  //UTC offset by -9
  var degrees = ((time.getUTCDay()*24) + time.getUTCHours()) * 2.142857  // 2.142857 = 360 degrees / 168 hrs in a week
  $('gear-box').setAttribute('transform', 'rotate('+degrees+', 100, 100) translate(0,200) scale(0.1,-0.1)')
}

var showPassword = function (elem, elemArr) {
  if (elem.innerHTML.slice(0,4) === 'show') {               // show it
    for (var i = 0; i < elemArr.length; i++) {$(elemArr[i]).type = 'text';}
    elem.innerHTML = 'hide'+ elem.innerHTML.slice(4);

  } else {                                                  // hide it
    for (var i = 0; i < elemArr.length; i++) {$(elemArr[i]).type = 'password';}
    elem.innerHTML = 'show'+ elem.innerHTML.slice(4);
  }
}

var verifyEmailExplain = function () {
  uiAlert(`schlaugh stores your email in <a class='special' href="https://en.wikipedia.org/wiki/Cryptographic_hash_function#Password_verification" target="_blank">"hashed"</a> form, meaning we can't just tell you what email address you have on file with us. But you can input what you think it is and we can tell you if that's right. And it's good to have a good email address stored with us in case you need to reset your password. But please don't need to reset your password, because your private messages are encrypted with your password and will be locked forever after resetting your password via email`)
}

var imageUploadingExplain = function () {
  uiAlert(`schlaugh does not support directly uploading images. You'll need to upload your image elsewhere(such as <a class='special' href="https://imgur.com/upload" target="_blank">imgur</a>), and then provide a link to the image file<br><br>please note that the link you provide must be directly to an image <i>file</i>, not a webpage. As in, right click on your image and click "copy image address", to get a link that ends with a file extension, like "png", "gif", "jpg", etc`);
}

var optionalEmailExplain = function () {
  uiAlert(`providing an email is optional, but strongly recommended<br><br>the ONLY time schlaugh will <i>ever</i> email you is if you lose your password and need to recover it via email. In fact, we only store a hashed form of your email, so we couldn't email you if we tried, and if our database gets hacked your email address won't be compromised. If you still don't want to provide an email, that's fine, it just means we can't help you gain access to your account in the event of a lost or stolen password.`);
}

var customUrlExplain = function (old) {
  var append = "";
  if (old) {
    append = `<br><br>edits to URLs on existing posts take effect immediately`
  }
  uiAlert(`if you'd like to have a convenient/memorable link for this post, you can assign it a custom URL. For example, if you input the text "butts", then your post can be found at: <code>schlaugh.com/`+glo.username+`/butts</code>. Allowed characters are numbers 0-9, upper and lowercase letters A-z, dashes(-), and underscores(_) only. Links ARE case sensitive, so you could assign "BUTTS" to one post, "Butts" to another, and "butts" to another. If you want.`+append, 'huh!');
}

var postsPerPageExplain = function () {
  uiAlert(`this only has an effect on paginated post streams. Namely, when viewing posts by a single author, or all posts with a tag<br><br>please note that large amounts of posts per page may increase page loading times`)
}

var privatePostExplain = function () {
  uiAlert(`a post that has been made private is visible/accessible to only the author and is effectively deleted/nonexistent to everyone else<br><br>you can switch a post between private and public at any time, with no delay`)
}

var changeUsername = function () {
  verify("you sure? This will change the url for your profile, breaking any links to your current username. And your current username will be up for grabs for anyone else to claim<br><br>also this will require a refresh(so just like don't have any unsaved text sitting in an editor)<br><br>go ahead?", "let's do it", "nevermind", function (resp) {
    if (!resp) {return;}
    else {
      loading();
      var newName = $('change-username-input').value;
      ajaxCall('/changeUsername', 'POST', {newName:newName}, function(json) {
        if (!json.error) {
          if (glo.username.toLowerCase() !== newName.toLowerCase()) { // if the case-insensitive name has changed, follow the new tag
            saveTag(false, "@"+newName, function () {
              loading(true);
              uiAlert('your username has been changed<br><br>schlaugh will now reload' ,"huzzah", function () {
                location.reload();
              });
            });
          } else {
            loading(true);
            uiAlert('your username has been changed<br><br>schlaugh will now reload' ,"huzzah", function () {
              location.reload();
            });
          }
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

var callForAllOfAnAuthorsPostData = function (userID, callback) {
  if (!userID) { return; }

  fetchPosts(false, {author:userID ,postCode:'ALL'}, function () {
    var postList = glo.pRef.author[userID].all;
    var output = []
    for (var i = 0; i < postList.length; i++) {
      output.push(glo.postStash[postList[i]]);
    }
    if (callback) {
      callback(output);
    }
  });
}

var findStringInPosts = function (posts, targetString, caseSensitive) {
  var results = [];
  if (!caseSensitive) {
    targetString = targetString.toLowerCase();
  }
  // var resultBufferChars = 13;

  for (var i = 0; i < posts.length; i++) {
    var postBody = posts[i].body;

    if (caseSensitive) {
      var searchBody = postBody;
    } else {
      var searchBody = postBody.toLowerCase();
    }
    // var postMatches = [];

    var index = searchBody.indexOf(targetString);
    if (index !== -1) {
      results.push(posts[i].post_id)
    }

    /*
    while (index !== -1) {

      var match = postBody.substring(index-resultBufferChars, index+targetString.length+resultBufferChars);
      postMatches.push(match);

      // find next
      index = searchBody.indexOf(targetString, index+1);
    }
    if (postMatches && postMatches.length) {
      results.push({postDate:posts[i].date, matches:postMatches})
    }
    */
  }

  return results;
}

var postSearchButtonFire = function (loc) {
  var targetString = $('post-search-input-'+loc).value;
  if (targetString === "") {
    return;
  }
  var caseSensitive = $('case-sensitive-search-'+loc).checked;

  if (glo.postPanelStatus && glo.postPanelStatus.author) {

    callForAllOfAnAuthorsPostData(glo.postPanelStatus.author, function (posts) {
      var results = findStringInPosts(posts, targetString, caseSensitive);

      searchResultQuantityGate(results.length, targetString, function () {
        loading(true);
        displayPosts(results, {search:targetString, postCode:'SEARCH', author:glo.postPanelStatus.author},);
      });

    });
  }
}

var searchResultQuantityGate = function (length, targetString, callback) {
  if (length > 89) {
    return uiAlert(`erm so, it would seem that the search you are attempting to run has turned up, *checks notes* ah yes, <b>`+length+`</b> posts that each contain this "`+targetString+`" string that you so desire. Unfortunately it has been determined that this is a number of posts that is sufficiently likely to brick your browser, such that i will not be attempting to display them for you. I don't know, man, what do you want, paginated search results? Probably if you are looking for some specific post and your search term is returning this many results than this search isn't useful anyway and you should try something else. Tell @staff how you think this should work`);
  } else {
    callback();
  }
}

var extractImgurURLs = function (posts) {
  var allMatches = [];
  var results = [];
  var openStr = `<img src=`;

  for (var i = 0; i < posts.length; i++) {
    var postBody = posts[i].body;
    var postMatches = [];

    var index = postBody.indexOf(openStr);
    while (index !== -1) {

      index += openStr.length;
      var closeChar = `"`;
      if (postBody.charAt(index) === `'`) {
        closeChar = `'`;
      }
      index++;
      var closePos = postBody.indexOf(closeChar, index);
      var url = postBody.substring(index,closePos);

      if (url.toLowerCase().indexOf("imgur") !== -1) {
        postMatches.push(url);
        allMatches.push(url);
      }

      // find next
      index = postBody.indexOf(openStr, index);
    }

    //
    if (postMatches && postMatches.length) {
      results.push({postDate:posts[i].date, matches:postMatches})
    }
  }

  return {all:allMatches, byPost:results};
}

var displayImgurList = function () {

  callForAllOfAnAuthorsPostData(glo.userID, function (posts) {
    var result = extractImgurURLs(posts);

    $('get-imgur-button').classList.add('removed');
    //
    $('get-imgur-text-file').classList.remove('removed');
    $('get-imgur-text-file').onclick = function () {
      downloadImgurTextFile(result.all);
    }
    //
    var container = $('imgur-list');
    var postList = result.byPost;

    for (var i = 0; i < postList.length; i++) {
      var div = document.createElement('div');
      div.setAttribute('class', 'imgur-listing');
      container.appendChild(div);
      //
      var link = document.createElement('a');
      link.href = "/"+glo.username+"/~/"+postList[i].postDate;
      link.innerHTML = postList[i].postDate;
      link.setAttribute('class', 'special imgur-listing-date');
      div.appendChild(link);
      //
      var imageList = document.createElement('ul');
      div.appendChild(imageList);
      //
      for (var j = 0; j < postList[i].matches.length; j++) {
        var imageItem = document.createElement('li');
        imageList.appendChild(imageItem);
        //
        var imageLink = document.createElement('a');
        imageLink.innerHTML = postList[i].matches[j];
        imageLink.href = postList[i].matches[j];
        imageLink.setAttribute('class', 'special');
        imageItem.appendChild(imageLink);
        //
        var downloadButton = document.createElement('text');
        downloadButton.innerHTML = "(download)";
        var pattern = /com\/([^./]+)\./;
        var match = pattern.exec(postList[i].matches[j]);
        var extractedPart = match[1];
        (function (uri, fileName) {
          downloadButton.onclick = function () {
            downloadOneImage(uri, fileName);
          }
        })(postList[i].matches[j], extractedPart);
        downloadButton.setAttribute('class', 'special clicky imgur-dl');
        imageItem.appendChild(downloadButton);
      }
    }
  });
}

var downloadImgurTextFile = function (urlList) {
  var data = "";

  for (var i = 0; i < urlList.length; i++) {
    data += urlList[i] + "\n";
  }

  data = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
  //
  var filename = "allYourImgurUrlsOnSchlaugh" + ".txt";
  //
  var tempLink = document.createElement("a");
  tempLink.download = filename;
  //
  tempLink.href = data;
  tempLink.click();
  //
  removeElement(tempLink);
}

var downloadOneImage = function (uri, filename) {
  fetch(uri)
  .then(response => response.blob())
  .then(data => {
    var url = URL.createObjectURL(data);

    var link = document.createElement('a');
    link.href = url;
    link.download = filename;

    link.click();
    removeElement(link);
  })
  .catch(error => console.error(error));
}
