"use strict";

var glo = {dateOffset: -1, authorPics:{}};

var $ = function (id) {return document.getElementById(id);}

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

var fontSelect = function () {
  if (glo.settings.font !== $('font-select').value) {
    changeFont($('font-select').value);
  }
}

var changeFont = function (font) {
  var sheet = document.styleSheets[document.styleSheets.length-1];
  var selector = ".editor, .post, .message, .author-header-right";
  var attribute = "font-family";
  for (var i = sheet.cssRules.length-1; i > -1; i--) {
    if (sheet.cssRules[i].selectorText === selector) {
      sheet.deleteRule(i);
      i = -1;
    }
  }
  glo.settings.font = font;
  sheet.insertRule(selector+" {"+attribute+": "+font+";}", sheet.cssRules.length);

  $('save-appearance').classList.remove('hidden');
}

var changeColor = function (colorCode, type) {
  colorCode = String(colorCode);
  if (colorCode.slice(0,3) !== "rgb" && colorCode.slice(0,1) !== "#") {
    colorCode = "#"+colorCode;
  }
  var sheet = document.styleSheets[document.styleSheets.length-1];
  switch (type) {
    case "postBackground":                 //post background
      var selector = ".post, .message, .editor, #settings-box, #thread-list, button, .pop-up";
      var attribute = "background-color";
      break;
    case "text":                        //text
      var selector = "body, h1, input, select, .post, .message, .editor, #settings-box, #thread-list, button, .not-special, .pop-up";
      var attribute = "color";
      for (var i = sheet.cssRules.length-1; i > -1; i--) {
        if (sheet.cssRules[i].selectorText === 'button') {
          sheet.deleteRule(i);
          i = -1;
        }
      }
      sheet.insertRule("button {border-color: "+colorCode+";}", sheet.cssRules.length);
      break;
    case "linkText":                 //link text
      var selector = ".special, a, a.visited, a.hover";
      var attribute = "color";
      break;
    case "background":                 //background
      var selector = "body, h1, input, select";
      var attribute = "background-color";
      break;
  }
  for (var i = sheet.cssRules.length-1; i > -1; i--) {
    if (sheet.cssRules[i].selectorText === selector) {
      sheet.deleteRule(i);
      i = -1;
    }
  }
  glo.settings.colors[type] = colorCode;
  sheet.insertRule(selector+" {"+attribute+": "+colorCode+";}", sheet.cssRules.length);
  $('save-appearance').classList.remove('hidden');
}

var saveAppearance = function () {
  ajaxCall('/saveAppearance', 'POST', glo.settings, function(json) {
    $('save-appearance').classList.add('hidden');
  });
}

var colorPreset = function (num) {
  switch (num) {
    case 1:           // classic
      var colors = {
        postBackground: '#32363F',
        text: '#D8D8D8',
        linkText: '#BFA5FF',
        background: '#324144',
      }
      break;
    case 2:          // slate
      var colors = {
        postBackground: '#3c4654',
        text: '#FFFCEA',
        linkText: '#9CB1FF',
        background: '#1c1922',
      }
      break;
    case 3:         // evan's theme
      var colors = {
        postBackground: '#0E0E0E',
        text: '#FFFFFF',
        linkText: '#64C6FF',
        background: '#000000',
      }
      break;
    case 4:         // definite
      var colors = {
        postBackground: '#FFFFFF',
        text: '#000000',
        linkText: '#0500FF',
        background: '#E4E4E4',

      }
      break;
    case 5:       // eyesore
      var colors = {
        postBackground: '#C6FFC1',
        text: '#00518B',
        linkText: '#A41A90',
        background: '#BCFAFF',
      }
      break;
  }
  changeAllColors(colors);
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
        if (glo.currentAuthor && glo.currentAuthor._id) {
          data.authorID = glo.currentAuthor._id;
        }
        signIn('/login', data, function (resp) {
          if (glo.currentAuthor) {
            if (resp && resp.otherKey) {glo.currentAuthor.key = resp.otherKey;}
            createFollowButton($(glo.currentAuthor.author+"-header-left"), glo.currentAuthor);
            createMessageButton($(glo.currentAuthor.author+"-header-left"), glo.currentAuthor);
            createEditBioButtons($(glo.currentAuthor.author+"-header-left"), glo.currentAuthor);
            var postArr = glo.currentAuthor.posts;
            for (var i = 0; i < postArr.length; i++) {
              if (postArr[i].post_id && postArr[i].date) {
                createPostFooter($("author-"+postArr[i].post_id), {_id:glo.currentAuthor._id, name:glo.currentAuthor.author}, postArr[i], 'author');
              }
            }
          }
          loading(true);
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
  loading();
  ajaxCall('/~logout', 'GET', {}, function(json) {
    location.reload();
  });
}

var simulatePageLoad = function (newPath, newTitle, faviconSrc) {
  // scrolls to top, updates the url, and the browser/tab title
  // defaults to home if no args given, second arg defaults to first if not given
  window.scroll(0, 0);
  if (!newPath) {
    newPath = "";
  }
  if (!newPath || newTitle === false) {
    newTitle = "s c h l a u g h";
  }
  if (newPath === true) {     //leave the path, still change the other stuff
    document.title = newTitle;
  } else if (newPath !== window.location.pathname) {
    history.pushState(null, null, "/"+newPath);
    if (!newTitle) {newTitle = newPath;}
    document.title = newTitle;
  }
  if (faviconSrc) {changeFavicon(faviconSrc);}
  else {changeFavicon(null);}
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

var ajaxCall = function(url, method, data, callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.open(method, url, true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        var json = (xhttp.responseText);
        json = JSON.parse(json);
        if (json.error) {uiAlert(json.error);}
        else {callback(json);}
      } else {
        uiAlert("error, sorry!<br><br>unethical response from server, please show this to staff<br><br>"+url+"<br>"+this.statusText+"<br>"+this.responseText)
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

var collapseNote = function (id, dir, postID) {
  if (dir) {  // expand
    $(id).classList.remove('removed')
    $(id+"-note-open").onclick = function () {collapseNote(id, false);}
    if ($(id+"-br")) {
      $(id+"-br").classList.add('removed');
    }
    if ($(id).offsetHeight > window.innerHeight) {
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

var backToMain = function () {
  if (glo.username) {
    switchPanel("posts-panel");
  } else {
    switchPanel('login-panel');simulatePageLoad();
  }
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
      faqBody.setAttribute('class', 'post');
      faqBody.innerHTML = convertText(json.text, "~faq~");
      $("faq-bucket").appendChild(faqBody)
      switchPanel('~faq-panel');
      simulatePageLoad('~faq', false);
      loading(true);
    });
  }
}

var switchPanel = function (panelName) {
  if (glo.openPanel) {
    $(glo.openPanel).classList.add('removed');
    if ($(glo.openPanel+"-button")) {$(glo.openPanel+"-button").classList.remove('highlight');}
  }
  if ($(panelName+"-button")) {
    simulatePageLoad();
    $(panelName+"-button").classList.add('highlight');
  }
  if (panelName === "login-panel" || panelName === "bad-recovery-panel" || panelName === "recovery-panel") {
    $("sign-in").classList.add('removed');
    $("username-recovery").value = "";
    $("password-recovery1").value = "";
    $("password-recovery2").value = "";
  }
  $(panelName).classList.remove('removed');
  // open the editor if editPanelButton is clicked when editPanel is already open
  if (glo.openPanel && glo.openPanel === "write-panel" && panelName === "write-panel") {
    showWriter('post');
  }
  glo.openPanel = panelName;
}

var followingListDisplay = function (open) {
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
}

var openDateJump = function (close) {
  if (close) {
    if (!glo.tag) {
      $('tag-menu-open').classList.remove('removed');
    }
    $('jump-open').classList.remove('removed');
    $('date-jump').classList.add('removed');
  } else {
    $('date-jump').classList.remove('removed');
    $('tag-menu-open').classList.add('removed');
    $('jump-open').classList.add('removed');
  }
}

var dateJump = function (input) {
  var target = input;
  if (!target) {target = $("date-picker").value;}
  if (!target) {target = pool.getCurDate();}
  if (target.length !== 10 || target[4] !== "-" || target[7] !== "-" || !isNumeric(target.slice(0,4)) || !isNumeric(target.slice(5,7)) || !isNumeric(target.slice(8,10))) {
    return uiAlert("date must be formatted YYYY-MM-DD");
  } else {
    target = getEpochSeconds(target);
    if (target > getEpochSeconds(pool.getCurDate())) {
      return uiAlert("and no future vision either!");
    } else {
      if (input) {
        loadPosts(Math.floor((getEpochSeconds(pool.getCurDate(glo.dateOffset)) - target) /(24*3600000)), false);
      } else {
        loadPosts(Math.floor((getEpochSeconds(pool.getCurDate(glo.dateOffset)) - target) /(24*3600000)));
      }
    }
  }
}

var getEpochSeconds = function (dateStamp) {
  if (typeof dateStamp === 'string' && dateStamp.length === 10) {
    var year = dateStamp.slice(0,4);
    var month = dateStamp.slice(5,7)-1;
    var day = dateStamp.slice(8,10);
    return new Date(year,month,day).getTime();
  }
}

var loadPosts = function (dir, tag, init) { // load all posts for a day/tag
  if (glo.loading) {
    if (!glo.queue) {glo.queue = [];}
    glo.queue.push({dir:dir,tag:tag});
    return;
  }
  else {
    glo.loading = true;
    loading();
  }
  var date = pool.getCurDate(glo.dateOffset);
  // clear out currently displayed posts
  if (glo.tag) {
    if ($('posts-for-'+ date +'-'+glo.tag)) {$('posts-for-'+ date +'-'+glo.tag).classList.add('removed');}
  } else {
    if ($('posts-for-'+ date)) {$('posts-for-'+ date).classList.add('removed');}
    if ($('tags-for-'+ date)) {$('tags-for-'+ date).classList.add('removed');}
  }
  //
  if (tag === false) {
    glo.tag = null;
    $("tag-display").classList.add("removed");
    $("clear-tag").classList.add("removed");
    $("save-tag").classList.add("removed");
    $("tag-menu-open").classList.remove("removed");
    $('date-jump').classList.add("removed");
  } else if (!tag) {
    tag = glo.tag;
  }
  glo.dateOffset += dir;
  date = pool.getCurDate(glo.dateOffset);
  // hide/unhide nextDay button as needed
  if (glo.dateOffset === 0) {$("day-forward").classList.add("hidden");}
  else {$("day-forward").classList.remove("hidden");}
  $('date-display').innerHTML = date;
  if (tag) {
    glo.tag = tag;
    if (!glo.savedTags[tag]) {$("save-tag").classList.remove("removed");}
    else {$("save-tag").classList.add("removed");}
    if ($('date-jump').classList.contains('removed')) {
      $("jump-open").classList.remove("removed");
    }
    $("tag-display").innerHTML = 'posts tagged "'+tag+'" on';
    $("tag-menu").classList.add("removed");
    $("tag-menu-open").classList.add("removed");
    $("clear-tag").classList.remove("removed");
    $("tag-display").classList.remove("removed");
    // check if we already have the data
    if ($('posts-for-'+ date +'-'+tag)) {
      $('posts-for-'+ date +'-'+tag).classList.remove('removed');
      loadManage();
    } else {
      // we don't, so make the ajax call
      $('loading').classList.remove('removed');
      ajaxCall('/~getTag', 'POST', {date:date, tag:tag,}, function(json) {
        renderPostFeed(json.posts, date, tag);
        $('loading').classList.add('removed');
        loadManage();
      });
    }
    if (glo.openPanel !== 'posts-panel') {switchPanel('posts-panel');}
  } else {  //no tag, load posts by following
    // check if we already have the data
    if ($('posts-for-'+date)) {
      $('posts-for-'+date).classList.remove('removed');
      if ($('tags-for-'+date)) {$('tags-for-'+date).classList.remove('removed');}
      loadManage();
    } else {
      // we don't, so make the ajax call
      $('loading').classList.remove('removed');
      if (init) {var data = {init:true};}
      else {var data = {};}
      ajaxCall('/posts/'+date, 'POST', data, function(json) {
        var filteredPosts = [];
        if (!glo.settings || !glo.settings.includeTaggedPosts) {
          for (var i = 0; i < json.posts.length; i++) {
            if (glo.followingRef) {
              if (glo.followingRef[json.posts[i]._id]) {
                filteredPosts.push(json.posts[i]);
              }
            }
          }
        } else {
          filteredPosts = json.posts;
        }
        renderPostFeed(filteredPosts, date);
        $('loading').classList.add('removed');
        //following list, if this is the first call for posts,
        if (init) {
          var followingBucket = $("following-bucket");
          for (var i = 0; i < json.followingList.length; i++) {
            var listing = document.createElement("div");
            listing.setAttribute('class', 'following-listing');
            var link = document.createElement("a");
            link.setAttribute('href', "/"+json.followingList[i].name);
            link.setAttribute('class', 'not-special');
            (function (id) {
              link.onclick = function(){
                event.preventDefault();
                openAuthorPanel(id);
                followingListDisplay(false);
              }
            })(json.followingList[i]._id);
            var name = document.createElement("text");
            name.innerHTML = json.followingList[i].name;
            var pic = document.createElement("img");
            pic.setAttribute('class', 'little-pic');
            pic.setAttribute('src', json.followingList[i].pic);
            link.appendChild(pic);
            link.appendChild(name);
            listing.appendChild(link);
            followingBucket.appendChild(listing);
          }
        }
        // render saved tags, with counts for that day, and tag feeds for each
        var tagArr = json.tagList;
        if (!tagArr || tagArr.length === 0) {
          $("none-tags").classList.remove('removed');
        } else {
          $("none-tags").classList.add('removed');
          var bucket = document.createElement("div");
          bucket.setAttribute('id', 'tags-for-'+date);
          for (var i = 0; i < tagArr.length; i++) {
            var count = 0;
            var taggedPosts = [];
            for (var j = 0; j < json.posts.length; j++) {
              if (json.posts[j].tags && json.posts[j].tags[tagArr[i]]) {
                taggedPosts.push(json.posts[j]);
                count++;
              }
            }
            renderPostFeed(taggedPosts, date, tagArr[i]).classList.add('removed');
            var tagShell = document.createElement("div");
            var tag = document.createElement("text");
            tag.setAttribute('class', 'clicky top-tag special');
            tag.innerHTML = tagArr[i] + "("+count+")";
            (function (tagName) {
              tag.onclick = function(){
                loadPosts(0, tagName);
              }
            })(tagArr[i]);
            var detag = document.createElement("text");
            detag.setAttribute('class', 'clicky de-tag-button special');
            detag.innerHTML = ' &nbsp; <icon class="fas fa-trash-alt"></icon>';
            (function (tagName) {
              detag.onclick = function(){
                saveTag(true, tagName);
              }
            })(tagArr[i]);
            tagShell.appendChild(tag);
            tagShell.appendChild(detag);
            bucket.appendChild(tagShell);
          }
          $("tag-bucket").appendChild(bucket);
        }
        loadManage();
      });
    }
  }
}

var loadManage = function () {
  glo.loading = false;
  if (glo.queue && glo.queue.length !== 0) {
    var obj = glo.queue[glo.queue.length-1];
    loadPosts(obj.dir, obj.tag);
    glo.queue.pop();
  } else {
    loading(true);
  }
}

var renderPostFeed = function (postList, date, tag) {
  var bucket = document.createElement("div");
  bucket.setAttribute('class', 'post-bucket monospace');
  if (tag) {bucket.setAttribute('id', 'posts-for-'+date+'-'+tag);}
  else {bucket.setAttribute('id', 'posts-for-'+date);}
  // if there are no posts for the day/tag
  if (postList.length === 0) {
    var post = document.createElement("div");
    post.innerHTML = "Not Schlaugh!";
    bucket.appendChild(document.createElement("br"));
    bucket.appendChild(document.createElement("br"));
    bucket.appendChild(post);
  } else {
    postList.sort(function(a, b) {
        if(a.post_id < b.post_id) { return -1; }
        if(a.post_id > b.post_id) { return 1; }
        return 0;
    });
    var freshPosts = [];
    // create posts
    for (var i = 0; i < postList.length; i++) {
      //postList[i]
      if (tag) {
        var post = renderOnePost(postList[i], 'tag', tag)
        bucket.appendChild(post);
      } else {
        var post = renderOnePost(postList[i], 'feed', null)
        bucket.appendChild(post);
      }
      freshPosts.push(post)
    }
  }
  $('posts').appendChild(bucket);
  if (freshPosts) {
    for (var i = 0; i < freshPosts.length; i++) {
      if (freshPosts[i].offsetHeight > window.innerHeight) {
        $(freshPosts[i].id +'collapse-button-bottom').classList.remove("hidden");
      }
    }
  }
  return bucket;
}

var renderOnePost = function (postData, type, typeName, postID) {
  // type = 'author','tag','feed','bookmark','sequence','preview'
  // postData needs fields: post_id, date, authorPic, author, body, tags, _id,

  if (postData === null && postID && glo.postStash) {
    if (glo.postStash[postID]) {
      postData = glo.postStash[postID];
    } else {
      return;
    }
  }
  // id
  if (type === 'tag') {var uniqueID = postData.post_id+"-"+postData.date+"-"+typeName+"-feed";}
  else if (type === 'author') {var uniqueID = 'author-'+postData.post_id}
  else if (type === 'bookmark') {var uniqueID = 'bookmarkFeed-'+postData.post_id;}
  else if (type === 'feed') {var uniqueID = postData.post_id+"-"+postData.date+"-feed"}
  else if (type === 'sequence') {var uniqueID = 'sequence-'+typeName+'-'+postData.post_id;}
  else if (type === 'preview') {var uniqueID = 'preview-'+typeName;}
  else {return uiAlert("error, sorry! render error, post is not of a valid type???, please show this to staff");}

  // has post already been rendered?
  if ($(uniqueID) && type !== 'preview') {
    $(uniqueID).classList.remove('removed')
    return $(uniqueID);
  }

  // add id to postRef
  if (!glo.postRef) {glo.postRef = {}}
  if (!glo.postRef[postData.post_id]) {glo.postRef[postData.post_id] = true;}

  // add incoming post data to postStash
  if (!glo.postStash) {glo.postStash = {}}
  if (type !== 'preview') {
    if (!glo.postStash[postData.post_id]) {
      glo.postStash[postData.post_id] = {
        post_id:postData.post_id,
        date:postData.date,
        body:postData.body,
        tags:postData.tags,
        title:postData.title,
        authorPic:postData.authorPic,
        author:postData.author,
        _id:postData._id,
        elemList: [],
      };
    }
    // add elem to postStash
    glo.postStash[postData.post_id].elemList.push(uniqueID);
  }
  //
  var post = document.createElement("div");
  post.setAttribute('class', 'post');
  post.setAttribute('id', uniqueID);
  // collapse button
  var collapseBtn = document.createElement("clicky");
  collapseBtn.setAttribute('class', 'collapse-button-top');
  collapseBtn.setAttribute('id', uniqueID+'collapse-button-top');
  if (glo.collapsed && glo.collapsed[postData.post_id]) {
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
  collapseBtn2.setAttribute('id', uniqueID+'collapse-button-bottom');
  if (glo.collapsed && glo.collapsed[postData.post_id]) {
    collapseBtn2.classList.add('removed');
  }
  collapseBtn2.onclick = function () {collapsePost(uniqueID, postData.post_id, true);}
  post.appendChild(collapseBtn2);
  // post header
  var postHeader = document.createElement("div");
  post.appendChild(postHeader);
  // author stuff in header
  if (type !== 'author' && (type !== 'preview' || typeName !== "edit")) {
    postHeader.setAttribute('class', 'post-header-feed');
    var authorBox = document.createElement("div");
    postHeader.appendChild(authorBox);
    // authorPic
    if (postData.authorPic && postData.authorPic !== "") {
      var authorPic = document.createElement("img");
      authorPic.setAttribute('src', postData.authorPic);
      (function (id) {
        authorPic.onclick = function(event){
          event.preventDefault();
          openAuthorPanel(id);
        }
      })(postData._id);
      authorPic.setAttribute('href', "/"+postData.author);
      authorPic.setAttribute('class', 'author-pic clicky');
      authorBox.appendChild(authorPic);
      //
      authorBox.appendChild(document.createElement("br"));
    }
    // authorName
    var author = document.createElement("a");
    (function (id) {
      author.onclick = function(event){
        event.preventDefault();
        openAuthorPanel(id);
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
  body.setAttribute('class', 'body-text');
  body.setAttribute('id', uniqueID+'body');
  body.innerHTML = convertText(postData.body, uniqueID);
  if (glo.collapsed && glo.collapsed[postData.post_id]) {body.classList.add('removed');}
  post.appendChild(body);
  // tags
  var authorOption = null;
  if (type === 'author' || (type === 'preview' && typeName === "edit")) {authorOption = {_id:postData._id, name:postData.author}}
  var tagString = formatTags(postData.tags, authorOption);
  var tagElem = document.createElement("div");
  tagElem.setAttribute('class', 'tag-section');
  tagElem.innerHTML = tagString;
  post.appendChild(tagElem);
  //
  if (type !== 'preview') {
    createPostFooter(post, {_id:postData._id, name:postData.author}, postData, type);
  }
  //
  /* (from the old system of filteringPostsByAnAuthorByTag)
  if (type === 'author') {
    //create tag ref
    if (!glo.authors) {glo.authors = {};}
    if (!glo.authors[postData.author]) {glo.authors[postData.author] = {}}
    glo.authors[postData.author][postData.post_id] = postData.tags;
  }
  */
  //
  return post;
}

var collapsePost = function (uniqueID, postID, isBtmBtn) {
  var btnElem = $(uniqueID+'collapse-button-top');
  var btnElem2 = $(uniqueID+'collapse-button-bottom');
  if (btnElem.title === 'expand') {     // expand the post
    btnElem.title = 'collapse';
    btnElem.innerHTML = '<i class="far fa-minus-square"></i>';
    btnElem2.title = 'collapse';
    btnElem2.innerHTML = '<i class="far fa-minus-square"></i>';
    btnElem2.classList.remove('removed');
    $(uniqueID+'body').classList.remove('removed');
    if ($(uniqueID).offsetHeight > window.innerHeight) {
      $(uniqueID +'collapse-button-bottom').classList.remove("hidden");
    }
    var collapse = false;
    if (glo.collapsed) {glo.collapsed[postID] = false;}
  } else {                             // collapse the post
    btnElem.title = 'expand';
    btnElem.innerHTML = '<i class="far fa-plus-square"></i>';
    btnElem2.classList.add('removed');

    if (isBtmBtn) {
      var initScroll = window.scrollY;
      var initHeight = $(uniqueID).offsetHeight;
    }
    $(uniqueID+'body').classList.add('removed');
    if (isBtmBtn) {
      if (initScroll === window.scrollY) {
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
    // update all other rendered versions of the post
    if (glo.postStash && glo.postStash[postID]) {
      var posArr = glo.postStash[postID].elemList;
      for (var i = 0; i < posArr.length; i++) {
        if (uniqueID !== posArr[i]) {
          if (!collapse) {
            $(posArr[i]+'collapse-button-top').title = 'collapse';
            $(posArr[i]+'collapse-button-top').innerHTML = '<i class="far fa-minus-square"></i>';
            $(posArr[i]+'collapse-button-bottom').title = 'collapse';
            $(posArr[i]+'collapse-button-bottom').innerHTML = '<i class="far fa-minus-square"></i>';
            $(posArr[i]+'collapse-button-bottom').classList.remove('removed');
            $(posArr[i]+'body').classList.remove('removed');
            if ($(posArr[i]).offsetHeight > window.innerHeight) {
              $(posArr[i] +'collapse-button-bottom').classList.remove("hidden");
            }
          } else {
            $(posArr[i]+'collapse-button-top').title = 'expand';
            $(posArr[i]+'collapse-button-top').innerHTML = '<i class="far fa-plus-square"></i>';
            $(posArr[i]+'collapse-button-bottom').classList.add('removed');
            $(posArr[i]+'body').classList.add('removed');
          }
        }
      }
    }
  }
}

var displayBookmarks = function () {
  if (glo.bookmarksFetched) {
    switchPanel('bookmarks-panel');
  } else {
    loading();
    ajaxCall('/bookmarks', 'GET', {}, function(json) {
      glo.bookmarksFetched = true;
      var bucket = $("bookmark-bucket");
      // if there are no posts
      if (json.posts.length === 0) {
        renderNoMarks();
      } else {
        for (var i=json.posts.length-1; i > -1; i--) {
          bucket.appendChild(renderOnePost(json.posts[i], 'bookmark', null));
        }
      }
      loading(true);
      switchPanel('bookmarks-panel');
    });
  }
}

var renderNoMarks = function () {
  var bucket = $("bookmark-bucket");
  var post = document.createElement("div");
  bucket.appendChild(document.createElement("br"));
  bucket.appendChild(document.createElement("br"));
  post.innerHTML = "None Marked!";
  bucket.appendChild(post);
}

var createMessageButton = function (parent, author, insert) {
  // OPTIONAL 'insert' is the element before which the button is to be inserted
  if (glo.username && author.author !== glo.username && author.key) {
    var message = document.createElement("button");
    message.innerHTML = "message";
    message.onclick = function(){
      //look for a thread btwn the author and logged in user
      checkForThread({
        name: author.author,
        _id: author._id,
        key: author.key,
        image: author.authorPic,
      });
    }
    if (insert) {
      parent.insertBefore(document.createElement("br"), insert);
      parent.insertBefore(message, insert);
    } else {
      parent.appendChild(document.createElement("br"));
      parent.appendChild(message);
    }
  } else if (!glo.username) { // not logged in, store the info in case they log in
    glo.currentAuthor = author;
  }
}

var createFollowButton = function (parent, author, insert) {
  // OPTIONAL 'insert' is the element before which the button is to be inserted
  if (glo.username && author._id) {
    var follow = document.createElement("button");
    // is the user already following the author?
    if (glo.followingRef[author._id]) {
      follow.innerHTML = "defollow";
      var remove = true;
    } else {
      follow.innerHTML = "follow";
      var remove = false;
    }
    follow.onclick = function(){
      ajaxCall('/follow', 'POST', {id:author._id, remove:remove}, function(json) {
        if (remove) {glo.followingRef[author._id] = false;}
        else {glo.followingRef[author._id] = true;}
        // refresh button(by hiding and creating new)
        follow.classList.add('removed');
        createFollowButton(parent, author, follow);
      });
    }
    if (insert) {
      parent.insertBefore(follow, insert);
    } else {
      parent.appendChild(follow);
    }
  }
}

var createEditBioButtons = function (parent, data) {
  // edit bio button,
  if (glo.username && glo.username === data.author) {
    parent.appendChild(document.createElement("br"));
    var editButton = document.createElement("button");
    editButton.innerHTML = "edit bio";
    editButton.onclick = function(){
      editBio();
    }
    parent.appendChild(editButton);
    // delete bio button
    if (data.bio && data.bio !== "") {
      parent.appendChild(document.createElement("br"));
      var deleteButton = document.createElement("button");
      deleteButton.innerHTML = "delete bio";
      deleteButton.setAttribute('id', data.author+'-delete-bio-button');
      deleteButton.onclick = function(){
        deleteBio();
      }
      parent.appendChild(deleteButton);
    }
  }
}

var createPostFooter = function (postElem, author, post, type) {
  // is there an extant footer?
  if (postElem.childNodes[postElem.childNodes.length-1].classList[0] === "post-footer") {
    var footer = postElem.childNodes[postElem.childNodes.length-1];
    // remove the sub-sections
    footer.removeChild(footer.childNodes[footer.childNodes.length-1]);
    footer.removeChild(footer.childNodes[footer.childNodes.length-1]);
  } else {
    var footer = document.createElement("div");
    footer.setAttribute('class', 'post-footer');
    postElem.appendChild(footer);
  }
  // footer left
  if (type !== 'feed' && type !== 'tag') {
    var footerLeft = document.createElement("div");
    footerLeft.setAttribute('class', 'post-footer-left');
    footer.appendChild(footerLeft);
    var dateStamp = document.createElement("text");
    dateStamp.innerHTML = post.date;
    dateStamp.setAttribute('class', 'date-stamp');
    if (glo.username) {
      dateStamp.setAttribute('class', 'clicky special date-stamp');
      dateStamp.onclick = function(){
        dateJump(post.date);
        switchPanel('posts-panel');
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
      if (post.post_id && post.post_id.length !== 8) {
        // quote button
        var quoteBtn = document.createElement("footerButton");
        quoteBtn.innerHTML = '<icon class="fas fa-quote-left"></icon>';
        quoteBtn.title = "quote";
        quoteBtn.onclick = function() {
          if (glo.postStash && glo.postStash[post.post_id]) {     // is it already stashed?
            console.log('toots');
            var text = "<quote>"+glo.postStash[post.post_id].body+
            '<r><a href="/~/'+post.post_id+'">-'+author.name+"</a></r></quote>"
            if ($('post-editor').value !== "") {text = '<br>'+text;}
            $('post-editor').value += prepTextForEditor(text);
            showWriter('post');
            switchPanel('write-panel');
          } else {                                               // no, so make the call
            loading();
            ajaxCall('/~getPost/'+author._id+"/"+post.date, 'GET', "", function(json) {
              if (json.four04) {return uiAlert("eRoRr! post not found???")}
              loading(true);
              var text = "<quote>"+json.post.body+
              '<r><a href="/~/'+post.post_id+'">-'+author.name+"</a></r></quote>"
              if ($('post-editor').value !== "") {text = '<br>'+text;}
              $('post-editor').value += prepTextForEditor(text);
              showWriter('post');
              switchPanel('write-panel');
            });
          }
        }
        footerButtons.appendChild(quoteBtn);
      }
      //
      createBookmarkButton(footerButtons, author._id, post);
    }
    // perma-link
    if (post.post_id && post.post_id.length !== 8) {
      var permalinkWrapper = document.createElement("a");
      permalinkWrapper.setAttribute('href', "/~/"+post.post_id);
      permalinkWrapper.setAttribute('class', 'not-special');
      var permalink = document.createElement("footerButton");
      permalink.innerHTML = '<i class="fas fa-link"></i>';
      permalink.title = "permalink";
      permalink.onclick = function(event) {
        event.preventDefault();
        openPost(author._id, post.post_id, post.date);
      }
      permalinkWrapper.appendChild(permalink);
      footerButtons.appendChild(permalinkWrapper);
    }
    //
    if (type === 'author' && glo.username && glo.username === author.name) {
      //edit button
      var editBtn = document.createElement("footerButton");
      editBtn.innerHTML = '<i class="fas fa-pen"></i>';
      editBtn.title = "edit";
      editBtn.onclick = function() {
        editPost(post, author);
      }
      footerButtons.appendChild(editBtn);
      // delete button
      var deleteBtn = document.createElement("footerButton");
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.title = "delete";
      deleteBtn.onclick = function() {
        deletePost(post);
      }
      footerButtons.appendChild(deleteBtn);
    }
  }
}

var createBookmarkButton = function (parent, author_id, post) {
  if (!parent || !author_id || !post.date || !post.post_id) {return;}
  // is there an extant bookmark button?
  var x = parent.childNodes;
  if (x[x.length-2] && x[1].classList[0] === "bookmark-button") {
    var insert = x[1];
  }
  var elem = document.createElement("footerButton");
  elem.setAttribute('class', "bookmark-button");
  var alreadyMarked = false;
  if (glo.bookmarks && glo.bookmarks[author_id] && glo.bookmarks[author_id][post.date]) {
    alreadyMarked = true;
    elem.innerHTML = '<icon class="fas fa-bookmark"></icon>';
    elem.title = "un-bookmark";
  } else {
    elem.innerHTML = '<icon class="far fa-bookmark"></icon>';
    elem.title = "bookmark";
  }
  elem.onclick = function() {
    ajaxCall('/bookmarks', 'POST', {author_id:author_id, date:post.date, remove:alreadyMarked}, function(json) {
      if (!glo.bookmarks) {glo.bookmarks = {}}
      if (alreadyMarked) {
        if (glo.bookmarks[author_id] && glo.bookmarks[author_id][post.date]) {
          glo.bookmarks[author_id][post.date] = false;
        }
        // check if bookmarks have been rendered and if so, remove!
        if (glo.bookmarksFetched) {
          $('bookmarkFeed-'+post.post_id).classList.add('removed');
          // if the bookmark list is now empty, indicate
          if (isBookmarkListEmpty()) {
            renderNoMarks();
          }
        }
      } else {
        // check if bookmarks have been rendered and if so, add!
        if (glo.bookmarksFetched) {
          // check if list was previously empty, and remove the empty indicator
          if (isBookmarkListEmpty()) {
            var childrenCount = $("bookmark-bucket").childNodes.length;
            for (var i = 0; i < childrenCount; i++) {
              $("bookmark-bucket").removeChild($("bookmark-bucket").childNodes[0]);
            }
          }
          if (!glo.bookmarks[author_id]) {glo.bookmarks[author_id] = {}}
          glo.bookmarks[author_id][post.date] = true;
          $("bookmark-bucket").insertBefore(renderOnePost(post, 'bookmark', null), $("bookmark-bucket").childNodes[0]);
        } else {
          if (!glo.bookmarks[author_id]) {glo.bookmarks[author_id] = {}}
          glo.bookmarks[author_id][post.date] = true;
        }
      }
      // update bookmark buttons on all rendered versions of the post
      if (glo.postStash && glo.postStash[post.post_id]) {
        var posArr = glo.postStash[post.post_id].elemList;
        for (var i = 0; i < posArr.length; i++) {
          var x = $(posArr[i]).childNodes;
          var y = x[x.length-1].childNodes[x[x.length-1].childNodes.length-1]
          if (y && y.classList[0] === "post-footer-right") {
            createBookmarkButton(y, author_id, post);
          }
        }
      }
    });
  }
  if (insert) {
    parent.insertBefore(elem, insert);
    insert.parentNode.removeChild(insert);
  } else {
    parent.appendChild(elem);
  }
}

var isBookmarkListEmpty = function () {
  for (var auth in glo.bookmarks) {
    if (glo.bookmarks.hasOwnProperty(auth)) {
      for (var mark in glo.bookmarks[auth]) {
        if (glo.bookmarks[auth].hasOwnProperty(mark)) {
          if (glo.bookmarks[auth][mark]) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

var deletePost = function (post) {
  verify('you would like to Permanently and Immediately delete this post?', 'yeah', 'nope', function (resp) {
    if (!resp) {return}
    verify('YOU SURE???', 'YES!', '...no', function (resp) {
      if (!resp) {return}
      loading();
      ajaxCall('/deleteOldPost', 'POST', post, function(json) {
        loading(true);
        // remove the DOM elements of ALL instances of the post that may be floating about
        if (glo.postStash && glo.postStash[post.post_id]) {
          var posArr = glo.postStash[post.post_id].elemList;
          for (var i = 0; i < posArr.length; i++) {
            $(posArr[i]).parentNode.removeChild($(posArr[i]));
          }
        }
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
        glo.bio = "";
        $(glo.username+'-bio').parentNode.removeChild($(glo.username+'-bio'));
        $(glo.username+'-delete-bio-button').parentNode.removeChild($(glo.username+'-delete-bio-button'));
      });
    });
  });
}

var editPost = function (post, author) {
  $('pending-post-edit').classList.remove("removed");
  $('pending-header-preview').classList.add("removed");
  //
  $("old-post-editor-title").innerHTML = "<l>editing your post for "+post.date+'</l>';
  $('edit-post-button').onclick = function () {
    showWriter('old-post');
  }
  //
  $("old-tag-box").classList.remove("removed");
  if (glo.pendingUpdates[post.date]) {
    var savedPost = glo.pendingUpdates[post.date][0];
    $('old-post-editor').value = prepTextForEditor(savedPost.body);
    $("old-post-status").innerHTML = "pending edit for your post on "+post.date;
    updatePendingEdit(savedPost);
    hideWriter('old-post');
    $('edit-post-button').innerHTML = "edit edit";
    switchPanel("edit-panel");
  } else {
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
      hideWriter('old-post');
      switchPanel("edit-panel");
    } else {                                               // no, so make the call
      loading();
      ajaxCall('/~getPost/'+author._id+"/"+post.date, 'GET', "", function(json) {
        if (json.four04) {return uiAlert("eRoRr! post not found???")}
        loading(true);
        var tags = getTagString(json.post.tags);
        glo.fetchedPosts[post.date] = [json.post];
        $('old-tag-input').value = tags;
        if (json.post.title) {$('old-title-input').value = post.title;}
        $("old-post-status").innerHTML = "no pending edit for your post on "+post.date;
        $('old-post-editor').value = prepTextForEditor(json.post.body);
        $('delete-pending-old-post').classList.add("removed");
        $('pending-post-edit').classList.add("removed");
        $('edit-post-button').innerHTML = "new edit";
        hideWriter('old-post');
        switchPanel("edit-panel");
      });
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
          editPost(post, author);
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
    if (bio) {$('pending-header-preview').classList.add("removed");}
    else {$('pending-post-edit').classList.add("removed");}
    $('edit-post-button').innerHTML = "new edit";
  } else {
    var str = $('old-post-status').innerHTML;
    if (str.substr(0,3) === "no ") {$('old-post-status').innerHTML = str.substr(3);}
    $('delete-pending-old-post').classList.remove("removed");
    if (bio) {$('pending-header-preview').classList.remove("removed");}
    else {$('pending-post-edit').classList.remove("removed");}
    $('edit-post-button').innerHTML = "edit edit";
  }
  var tags = getTagString(post.tags);
  $('old-tag-input').value = tags;
  if (post.title) {$('old-title-input').value = post.title;}
  $('old-post-editor').value = prepTextForEditor(post.body);
  if (bio) {$('pending-right-preview').innerHTML = convertText(post.body, 'old-pending')}
  else {
    post.author = glo.username;
    var newEditElem = renderOnePost(post, "preview", "edit");
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
  $('pending-header-preview').classList.remove("removed");
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
    $('pending-header-preview').classList.add("removed");
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

/* userAndPostLinkHandler, not connected to anything
var userAndPostLinkHandler = function (author, post) { // not connected to anything
  if (glo.username) {
    if (post !== null) {
      openPost(author, post);
    } else {
      openAuthorPanel(author);
    }
  } else {
    if (post !== null) {
      window.location.href = "/"+author+"/"+post;
    } else {
      window.location.href = "/"+author;
    }
  }
}
*/

var clearAuthorPage = function (authorID) {
  var children = $(authorID+'-posts').childNodes;
  for (var i = 0; i < children.length; i++) {
    children[i].classList.add('removed');
  }
}

var openAuthorPanel = function (authorID, callback) {
  // see if a panel for the author already exists
  if ($("user-"+authorID+"-panel")) {
    switchPanel("user-"+authorID+"-panel");
    $(authorID+'-tag-nav').classList.add('removed');
    $(authorID+'-page-nav').classList.remove('removed');
    turnAuthorPage(authorID, 0);
    //clearAuthorPage(authorID);

    if ($(authorID+'-panel-404')) {$(authorID+'-panel-404').classList.add('removed');}
    $(authorID+'-panel-title').onclick = "";
    $(authorID+'-panel-title').removeAttribute('href');
    $(authorID+'-panel-title').classList.remove("clicky");
    $(authorID+'-panel-title').classList.add("not-special");
    if (callback) {callback();}
    else {
      simulatePageLoad($(authorID+'-panel-title').innerHTML, null, glo.authorPics[authorID]);
    }
  } else {
    // call for data and render a new panel
    loading();
    ajaxCall('/~getAuthor/'+authorID+'/1', 'POST', {postRef:glo.postRef}, function(json) {
      loading(true);
      if (json.four04) {
        uiAlert("this shouldn't ever happen now, right?");
      } else {
        json = json.data;
        // panel
        var panel = document.createElement("div");
        panel.setAttribute('id', "user-"+authorID+"-panel");
        $("main").appendChild(panel);
        // header
        var authorHeader = document.createElement("div");
        authorHeader.setAttribute('class', 'author-header');
        panel.appendChild(authorHeader);
        // header-left
        var authorHeaderLeft = document.createElement("div");
        authorHeaderLeft.setAttribute('class', 'author-header-left');
        authorHeaderLeft.setAttribute('id', json.author+'-header-left');
        authorHeader.appendChild(authorHeaderLeft);
        // pic
        if (json.authorPic !== "") {
          var authorPic = document.createElement("img");
          authorPic.setAttribute('src', json.authorPic);
          authorPic.setAttribute('class', 'author-panel-pic');
          glo.authorPics[json._id] = json.authorPic;
          authorHeaderLeft.appendChild(authorPic);
          var x = authorPic.cloneNode();
          if (glo.username && glo.username === json.author) {
            $("pending-left-preview").insertBefore(x, $("preview-follow-button"));
          }
        }
        // title
        var title = document.createElement("a");
        title.setAttribute('class', 'author-page-title not-special');
        // text sizing based on name length
        if (json.author.length < 6) {title.classList.add('author-page-title-0')}
        else if (json.author.length < 12) {title.classList.add('author-page-title-1')}
        else if (json.author.length < 20) {title.classList.add('author-page-title-2')}
        else if (json.author.length < 30) {title.classList.add('author-page-title-3')}
        else if (json.author.length < 40) {title.classList.add('author-page-title-4')}
        else if (json.author.length < 50) {title.classList.add('author-page-title-5')}
        else {title.classList.add('author-page-title-6')}
        //
        title.innerHTML = json.author;
        var x = title.cloneNode(true);
        title.setAttribute('id', json._id+'-panel-title');
        authorHeaderLeft.appendChild(title);
        if (glo.username && glo.username === json.author) {
          $("pending-left-preview").insertBefore(x, $("preview-follow-button"));
          $("pending-left-preview").insertBefore(document.createElement("br"), $("preview-follow-button"));
        }
        // follow and message and bio buttons
        createFollowButton(authorHeaderLeft, json);
        createMessageButton(authorHeaderLeft, json);
        createEditBioButtons(authorHeaderLeft, json);
        // header-right
        if (json.bio && json.bio !== "") {
          var authorHeaderRight = document.createElement("div");
          authorHeaderRight.setAttribute('class', 'author-header-right');
          authorHeaderRight.setAttribute('id', json.author+'-bio');
          authorHeaderRight.innerHTML = convertText(json.bio, json.author+"-bio");
          authorHeader.appendChild(authorHeaderRight);
        }
        // tag nav
        var tagNav = document.createElement("div");
        tagNav.setAttribute('class','removed')
        tagNav.setAttribute('id', json._id+'-tag-nav')
        panel.appendChild(tagNav);
        tagNav.appendChild(document.createElement("br"));
        var tagText = document.createElement("h2");
        tagText.setAttribute('id', json._id+'-tag-text')
        tagText.setAttribute('class','top-tag')
        tagNav.appendChild(tagText);
        var tagClear = document.createElement("button");
        tagClear.innerHTML = 'clear tag';
        (function (authorID) {
          tagClear.onclick = function(){openAuthorPanel(authorID);}
        })(authorID);
        tagNav.appendChild(tagClear);
        // post bucket
        var bucket = document.createElement("div");
        bucket.setAttribute('id', json._id+'-posts');
        panel.appendChild(bucket);

        renderAuthorPage(json, 1);

        //page nav
        var pageNav = document.createElement("div");
        pageNav.setAttribute('class','author-page-nav');
        pageNav.setAttribute('id', json._id+'-page-nav');
        panel.appendChild(pageNav);
        var arrowBox = document.createElement("div");
        pageNav.appendChild(arrowBox);
        var leftArrow = document.createElement("clicky");
        leftArrow.setAttribute('class', "author-arrow");
        leftArrow.setAttribute('id', json._id+"-left-arrow");
        leftArrow.innerHTML = '<icon class="fas fa-caret-left"></icon>';
        leftArrow.onclick = function () {
          turnAuthorPage(json._id, 1);
        }
        arrowBox.appendChild(leftArrow);
        var rightArrow = document.createElement("clicky");
        rightArrow.setAttribute('class', "author-arrow hidden");
        rightArrow.setAttribute('id', json._id+"-right-arrow");
        rightArrow.innerHTML = '<icon class="fas fa-caret-right"></icon>';
        rightArrow.onclick = function () {
          turnAuthorPage(json._id, -1);
        }
        arrowBox.appendChild(rightArrow);
        var page = document.createElement('text');
        page.innerHTML = "page<br>";
        page.setAttribute('class', "monospace")
        pageNav.appendChild(page);
        var pageNumberLeft = document.createElement('text');
        pageNumberLeft.innerHTML = 1;
        pageNumberLeft.setAttribute('class', "monospace")
        pageNumberLeft.setAttribute('id', json._id+ "-page-number-left")
        pageNav.appendChild(pageNumberLeft);
        var pageNumber = document.createElement('text');
        pageNumber.innerHTML = " of ";
        pageNumber.setAttribute('class', "monospace")
        pageNav.appendChild(pageNumber);
        var pageNumberRight = document.createElement('text');
        pageNumberRight.innerHTML = json.pages;
        pageNumberRight.setAttribute('class', "monospace")
        pageNumberRight.setAttribute('id', json._id+ "-page-number-right")
        pageNav.appendChild(pageNumberRight);
        // put jump stuff here
        //
        switchPanel("user-"+json._id+"-panel");
        if (callback) {callback();}
        else {
          simulatePageLoad(json.author, null, json.authorPic);
        }
      }
    });
  }
}

var turnAuthorPage = function (authorID, dir) {
  var newPage = parseInt($(authorID+ "-page-number-left").innerHTML) + dir;
  $(authorID+ "-page-number-left").innerHTML = newPage;
  if (parseInt($(authorID+ "-page-number-right").innerHTML) === newPage) {
    $(authorID+"-left-arrow").classList.add('hidden');
  } else {
    $(authorID+"-left-arrow").classList.remove('hidden');
  }
  if (newPage === 1) {
    $(authorID+"-right-arrow").classList.add('hidden');
  } else {
    $(authorID+"-right-arrow").classList.remove('hidden');
  }
  clearAuthorPage(authorID);
  if (glo.page && glo.page[authorID] && glo.page[authorID].num[newPage]) {
    for (var i = 0; i < glo.page[authorID].num[newPage].length; i++) {
      $("author-" +glo.page[authorID].num[newPage][i]).classList.remove('removed');
    }
  } else {
    loading();
    ajaxCall('/~getAuthor/'+authorID+'/'+newPage, 'POST', {postRef:glo.postRef}, function(json) {
      loading(true);
      renderAuthorPage(json.data, newPage)
    });
  }
}

var renderAuthorPage = function (data, pageNum, tag) {
  // like 'page' as in a page of posts, on the author panel

  // add incoming post data to postStash
  for (var i = 0; i < data.posts.length; i++) {
    if (!glo.postStash) {glo.postStash = {}}
    if (!glo.postStash[data.posts[i].post_id]) {
      glo.postStash[data.posts[i].post_id] = {
        post_id:data.posts[i].post_id,
        date:data.posts[i].date,
        body:data.posts[i].body,
        tags:data.posts[i].tags,
        title:data.posts[i].title,
        authorPic:data.authorPic,
        author:data.author,
        _id:data._id,
        elemList: [],
      };
    }
  }
  if (!glo.page) {glo.page = {};}
  if (!glo.page[data._id]) {glo.page[data._id] = {num:{}, tag: {}};}
  if (tag === undefined) {
    glo.page[data._id].num[pageNum] = data.list;
  } else {
    glo.page[data._id].tag[tag] = data.list;
  }
  var bucket = $(data._id+'-posts');
  // posts
  if (data.list.length === 0) {
    bucket.appendChild(document.createElement("br"));
    var text = document.createElement("h2");
    text.innerHTML = "no posts!";
    bucket.appendChild(text);
  } else {
    for (var i = 0; i < data.list.length; i++) {
      var postElem = renderOnePost(null, 'author', data.author, data.list[i]);
      bucket.appendChild(postElem);
      if (postElem.offsetHeight > window.innerHeight) {
        $(postElem.id +'collapse-button-bottom').classList.remove("hidden");
      }
    }
  }
}

var open404page = function (type) {
  if (type === 'ever') {
    if ($('404-panel-ever')) {switchPanel("404-panel-ever");}
    else {
      // panel
      var panel = document.createElement("div");
      panel.setAttribute('id', '404-panel-ever');
      $("main").appendChild(panel);
      // title
      var title = document.createElement("text");
      title.setAttribute('class', 'page-title-404 monospace');
      title.innerHTML = "once here<br>there was something<br><br>now here<br>there is nothing<br><br><i>time</i><br><br>";
      panel.appendChild(title);
      switchPanel("404-panel-ever");
    }
  } else if (type === 'post') {
    if ($('404-panel-post')) {switchPanel("404-panel-post");}
    else {
      var panel = document.createElement("div")
      panel.setAttribute('id', '404-panel-post');
      $("main").appendChild(panel);
      // title
      var title = document.createElement("text");
      title.setAttribute('class', 'page-title-404 monospace');
      title.innerHTML = "<br>not even a single thing!<br><br>";
      panel.appendChild(title);
      switchPanel("404-panel-post");
    }
  } else {
    if ($('404-panel')) {switchPanel("404-panel");}
    else {
      // panel
      var panel = document.createElement("div");
      panel.setAttribute('id', '404-panel');
      $("main").appendChild(panel);
      // title
      var title = document.createElement("text");
      title.setAttribute('class', 'page-title-404 monospace');
      title.innerHTML = "<br>but there was nobody home<br><br>";
      panel.appendChild(title);
      switchPanel("404-panel");
    }
  }
}

var openPost = function (authorID, post_id, date) { //individual post on an author page
  openAuthorPanel(authorID, function () {
    clearAuthorPage(authorID);
    $(authorID+'-page-nav').classList.add('removed');
    //
    if ($('author-'+post_id)) {                // is the post already rendered?
      $('author-'+post_id).classList.remove('removed');
      simPageLoadForSinglePost(post_id, authorID);
    } else if (glo.postStash[post_id]) {         // can we render it from postStash?
      var postElem = renderOnePost(null, 'author', null, post_id);
      $(authorID+'-posts').appendChild(postElem);
      if (postElem.offsetHeight > window.innerHeight) {
        $(postElem.id +'collapse-button-bottom').classList.remove("hidden");
      }
      simPageLoadForSinglePost(post_id, authorID);
    } else {                              // we don't have the post, call for it
      loading();
      ajaxCall('/~getPost/'+authorID+"/"+date, 'GET', "", function(json) {
        if (json.four04) {return uiAlert("eRoRr! post not found???")}
        loading(true);
        json.post.date = date;
        json.post._id = authorID;
        var postElem = renderOnePost(json.post, 'author', json.post.username);
        $(authorID+'-posts').appendChild(postElem);
        if (postElem.offsetHeight > window.innerHeight) {
          $(postElem.id +'collapse-button-bottom').classList.remove("hidden");
        }
        simPageLoadForSinglePost(post_id, authorID);
      });
    }
    // set title
    $(authorID+'-panel-title').onclick = function (event) {
      event.preventDefault();
      openAuthorPanel(authorID);
    }
    $(authorID+'-panel-title').setAttribute('href', "/"+$(authorID+'-panel-title').innerHTML);
    $(authorID+'-panel-title').classList.add("clicky");
    $(authorID+'-panel-title').classList.remove("not-special");
  });
}
var simPageLoadForSinglePost = function (post_id, authorID) {   // helper function for ^^^
  if (glo.postStash[post_id].title !== undefined && glo.postStash[post_id].title !== "") {
    simulatePageLoad("~/"+post_id, glo.postStash[post_id].title, glo.authorPics[authorID]);
  } else {
    simulatePageLoad("~/"+post_id, $(authorID+'-panel-title').innerHTML, glo.authorPics[authorID]);
  }
}

var submitPost = function (remove) { //also handles editing and deleting
  var text = $('post-editor').value;
  var tags = $('tag-input').value;
  var title = $('title-input').value;
  if (text === "" && tags === "" && title === "" && !glo.pending) {return hideWriter('post');}
  // have changes been made?
  if (!remove && glo.pending && prepTextForEditor(glo.pending.body) === text) {
    if (glo.pending.title === title) {
      if (getTagString(glo.pending.tags) === tags) {
        return hideWriter('post');
      }
    }
  }
  if (remove || text === "") {
    verify("you sure you want me should delete it?", null, null, function (result) {
      if (!result) {return;}
      loading();
      ajaxCall("/", 'POST', {text:"", tags:{}, title:""}, function(json) {
        updatePendingPost(json.text, json.tags, json.title);
      });
    });
  } else {
    loading();
    ajaxCall("/", 'POST', {text:text, tags:tags, title:title}, function(json) {
      updatePendingPost(json.text, json.tags, json.title);
    });
  }
}

var updatePendingPost = function (newText, newTags, newTitle) {
  if (newText === "") {
    glo.pending = false;
    $('pending-status').innerHTML = "no pending post for tomorrow";
    $('delete-pending-post').classList.add("removed");
    $('pending-post').classList.add("removed");
    $('write-post-button').innerHTML = "new post";
  } else {
    glo.pending = {};
    glo.pending.body = newText;
    glo.pending.tags = newTags;
    glo.pending.title = newTitle;
    $('pending-status').innerHTML = "your pending post for tomorrow:";
    $('delete-pending-post').classList.remove("removed");
    $('pending-post').classList.remove("removed");
    $('write-post-button').innerHTML = "edit post";
  }
  var tags = getTagString(newTags);
  $('tag-input').value = tags;
  if (newTitle) {$('title-input').value = newTitle;}
  var postData = {
    body: newText,
    tags: newTags,
    title: newTitle,
    author: glo.username,
    authorPic: glo.userPic,
    _id: glo.userID,
  }
  var newPostElem = renderOnePost(postData, "preview", "new");
  if ($('pending-post').childNodes[0]) {
    $('pending-post').replaceChild(newPostElem, $('pending-post').childNodes[0]);
  } else {
    $('pending-post').appendChild(newPostElem);
  }
  $('post-editor').value = prepTextForEditor(newText);
  hideWriter('post');
  loading(true);
}

var cancelPost = function () {
  if (glo.pending) {    // there is a current saved/pending post
    // have changes been made?
    if (prepTextForEditor(glo.pending.body) === $('post-editor').value) {
      if (glo.pending.title === $('title-input').value) {
        if (getTagString(glo.pending.tags) === $('tag-input').value) {
          return hideWriter('post');
        }
      }
    }
    verify("you want to lose any current edits and revert to the last saved version?", null, null, function (result) {
      if (!result) {return;}
      else {
        updatePendingPost(glo.pending.body, glo.pending.tags, glo.pending.title);
      }
    });
  } else {        // there is NOT a current saved/pending post
    if ($('post-editor').value === "" && $('tag-input').value === "") {return hideWriter('post');}
    verify("you want to lose all current text in the editor?", null, null, function (result) {
      if (!result) {return;}
      else {
        updatePendingPost("", {}, "");
      }
    });
  }
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

var formatTags = function (tagRef, author) {
  var tags = "";
  for (var tag in tagRef) {
    if (tagRef.hasOwnProperty(tag)) {
      if (author) {
        tags += '<a onclick="filterAuthorByTag(`'+author._id+'`,`'+tag+
          '`); return false;" href="'+author.name+'/~tagged/'+tag+'">'+tag+'</a>, ';
      } else {
        tags += '<a onclick="loadPosts(0,`'+tag+
        '`); return false;" href="/~tagged/'+tag+'">'+tag+'</a>, ';
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

var openTagMenu = function (close) {
  if (close) {
    $('jump-open').classList.remove('removed');
    $('tag-menu-open').classList.remove('removed');
    $('tag-menu').classList.add('removed');
  } else {
    $('tag-menu').classList.remove('removed');
    $('tag-menu-open').classList.add('removed');
    $('jump-open').classList.add('removed');
  }
}

var tagSearch = function () {
  loadPosts(0, $("tag-picker").value);
}

var saveTag = function (remove, tag) {
  if (tag === undefined) {
    tag = $("tag-picker").value;
    if (tag === "") {return uiAlert("ya can't track nothin!");}
  }
  loading();
  ajaxCall("/saveTag", 'POST', {tag, remove:remove}, function(json) {
    if (remove) {glo.savedTags[tag] = false;}
    else {glo.savedTags[tag] = true;}
    destroyCurrentBucketsAndReload();
  });
}

var destroyCurrentBucketsAndReload = function () {
  // Let the past die, kill it if you have to
  var children = $("tag-bucket").childNodes;
  for (var i = children.length-1; i > -1; i--) {
    $("tag-bucket").removeChild(children[i]);
  }
  var oldPostArr = document.getElementsByClassName('post-bucket');
  for (var i = oldPostArr.length-1; i > -1; i--) {
    oldPostArr[i].parentNode.removeChild(oldPostArr[i]);
  }
  loadPosts(0, glo.tag);
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
    destroyCurrentBucketsAndReload();
  });
}

var filterAuthorByTag = function (authorID, tag) {
  openAuthorPanel(authorID, function () {
    clearAuthorPage(authorID);

    if (glo.page && glo.page[authorID] && glo.page[authorID].tag[tag]) {
      for (var i = 0; i < glo.page[authorID].tag[tag].length; i++) {
        $("author-" +glo.page[authorID].tag[tag][i]).classList.remove('removed');
      }
    } else {
      var stuff = {
        authorID:authorID,
        tag:tag,
        postRef:glo.postRef,
      }
      loading();
      ajaxCall('/~getTaggedByAuthor', 'POST', stuff, function(json) {
        loading(true);
        if (json.four04) {return uiAlert("eRoRr! author not found???")}
        renderAuthorPage(json.data, null, tag);
      });
    }
    $(authorID+'-page-nav').classList.add('removed');
    var authorName = $(authorID+'-panel-title').innerHTML;
    simulatePageLoad(authorName+"/~tagged/"+tag, authorName, glo.authorPics[authorID]);
    $(authorID+'-tag-nav').classList.remove('removed');
    $(authorID+'-tag-text').innerHTML = 'posts tagged "'+tag+'"';
  });
}

var prepTextForEditor = function (text) {
  if (text === null || text === undefined) {
    return "";
  }
  // a bunch garbage hacking of html whitespace handling

  //
  text = text.replace(/\/cut>/g, '/cut><br>');
  text = text.replace(/\/ascii>/g, '/ascii><br>');
  text = text.replace(/\/li>/g, '/li><br>');
  text = text.replace(/\/quote>/g, '/quote><br>');
  text = text.replace(/\/r>/g, '/r><br>');
  text = text.replace(/\/c>/g, '/c><br>');
  text = text.replace(/\/l>/g, '/l><br>');
  text = text.replace(/\/ol>/g, '/ol><br>');
  text = text.replace(/\/ul>/g, '/ul><br>');
  //
  text = text.replace(/<quote>/g, '<quote><br>');
  text = text.replace(/<ascii>/g, '<ascii><br>');
  text = text.replace(/<r>/g, '<r><br>');
  text = text.replace(/<c>/g, '<c><br>');
  text = text.replace(/<l>/g, '<l><br>');
  text = text.replace(/<ol>/g, '<ol><br>');
  text = text.replace(/<ul>/g, '<ul><br>');


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
  var tagArr = [/<ul>/, /<ol>/, /<li>/, /<quote>/, /<ascii>/, /<r>/, /<c>/, /<l>/];
  for (var i = 0; i < tagArr.length; i++) {
    preTagLineBreakRecurse(1, tagArr[i]);
  }

  text = text.replace(/<br>/g, '\n');

  var imgRecurse = function (pos) {
    var next = text.substr(pos).search(/<img src="/);
    if (next !== -1) {
      pos = pos+next+9;
      var qPos = text.substr(pos+1).search(/"/)+2;
      if (qPos === -1) {
        text += '">';
        return;
      }
      else {
        pos += qPos;
        text = text.substr(0,pos+1) + '\n' + text.substr(pos+1);
      }
      imgRecurse(pos+1);
    }
  }
  imgRecurse(0);

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

// editor stuff
var showWriter = function (kind) {
  $(kind+'-writer').classList.remove('removed');
  $(kind+'-preview').classList.add('removed');
}
var hideWriter = function (kind) {
  //if ($(kind+'-editor').value !== prepTextForEditor(last.body)) {}  // later, for "revert"
  $(kind+'-writer').classList.add('removed');
  $(kind+'-preview').classList.remove('removed');
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
  uiPrompt({
    label: `image url<clicky onclick="imageUploadingExplain()" class="special">(?)</clicky>`,
    value:"https://i.imgur.com/hDEXSt7.jpg",
    placeholder: "hiss",
    callback: function(target) {
      if (target !== null) {
        var openTag = '\n<img src="';
        if (a === 0 || y.substr(a-1,1) === "\n") {openTag = '<img src="'}
        var closeTag = '">\n';
        if (y.substr(b,1) === "\n") {closeTag = '">'}
        area.value = y.slice(0, a)+ openTag +target+ closeTag +y.slice(b);
        var bump = a+target.length+ openTag.length + closeTag.length;
        setCursorPosition(area, bump, bump);
      }
    }
  });
}
var insertHR = function (src) {
  var area = $(src+'-editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  if (y.substr(b-1,1) === " " && y.substr(b-2,1) !== " ") {b--;} //rid the trailing space
  area.value = y.slice(0, a)+ "<hr>" +y.slice(b);
  setCursorPosition(area, a+4, a+4);
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
          event.preventDefault();
          openAuthorPanel(id);
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
    $('pending-message-status').innerHTML = "pending:";
    $('pending-message').innerHTML = convertText(pending, 'pending'+glo.threads[index]._id);
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
    var x = pool.cleanseInputText(text);
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
  //showWriter('message');
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
    var message = document.createElement("div");
    message.setAttribute('class', 'message '+orri);
    //message.setAttribute('id', i+"-"+j+"-message");
    $(i+"-thread").appendChild(message);
    var dateStamp = document.createElement("div");
    dateStamp.setAttribute('class', 'date-stamp-box');
    dateStamp.innerHTML = x.date;
    message.appendChild(dateStamp);
    var body = document.createElement("div");
    body.setAttribute('class', 'message-body');
    body.innerHTML = convertText(x.body, glo.threads[i]._id+'-'+x.date+orri);
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
        event.preventDefault();
        openAuthorPanel(id);
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
  if (glo.unread > 0) {$("inbox-panel-button").classList.add("special");}
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
              glo.threads[i].thread[j].body = pool.cleanseInputText(text)[1];
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
      data.email = $('email-input').value;
      //data.secretCode = $('secret-code').value;
      if (data.password !== $('pass-input-two').value) {
        uiAlert('passwords are not the same');
        return;
      }
    }
    signIn(url, data, function () {
      switchPanel('posts-panel');
      loading(true);
    })
  }
}

var signIn = function (url, data, callback) {
  loading();
  ajaxCall(url, 'POST', data, function(json) {
    if (json.needKeys) {
      makeKeys(data.password, function (keys) {
        if (json.newUser) {
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

var parseUserData = function (data) {
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
  // init stuff
  loadPosts(1, null, true);
  if (glo.pending) {updatePendingPost(glo.pending.body, glo.pending.tags, glo.pending.title);}
  populateThreadlist();
  setAppearance();
  //
  if (glo.username) {
    $("username").innerHTML = glo.username;
    $("username").classList.remove("removed");
    $('username').setAttribute('href', "/"+glo.username);
    $("username").onclick = function () {
      event.preventDefault();
      openAuthorPanel(glo.userID);
    }
    $('edit-panel-title').innerHTML = glo.username;
    $('edit-panel-title').setAttribute('href', "/"+glo.username);
    $('edit-panel-title').onclick = function (event) {
      event.preventDefault();
      openAuthorPanel(glo.userID);
    }
    $("sign-out").classList.remove("removed");
    $("sign-in").classList.add("removed");
    //
    $("nav").classList.remove("removed");
    $("footer-footer").classList.remove("removed");
    //
    if (glo.settings.includeTaggedPosts) {
      $('include-tagged-posts-toggle').innerHTML = '<icon class="far fa-check-square"></icon>';
    } else {
      $('include-tagged-posts-toggle').innerHTML = '<icon class="far fa-square"></icon>';
    }
  }
  //
  if (glo.userPic) {updateUserPic(false, glo.userPic);}
  if (glo.unread > 0) {$("inbox-panel-button").classList.add("special");}
}

var setAppearance = function () {
  if (glo.settings && glo.settings.colors) {
    var savedColors = glo.settings.colors;
    if (glo.settings.font) {
      changeFont(glo.settings.font);
    } else {
      glo.settings.font = 'serif'
    }
    $('font-select').value = glo.settings.font;
  } else {
    if (!glo.settings) {glo.settings = {};}
    var savedColors = {
      postBackground: '#32363F',
      text: '#D8D8D8',
      linkText: '#BFA5FF',
      background: '#324144',
    }
    glo.settings.colors = savedColors;
  }
  changeAllColors(savedColors);
  $('save-appearance').classList.add('hidden');
}

var changeAllColors = function (colorObject) {
  for (var prop in colorObject) {
    if (colorObject.hasOwnProperty(prop)) {
      changeColor(colorObject[prop], prop);
      // set button
      if (colorObject[prop][0] === '#') {
        $(prop+'-color-button').jscolor.fromString(String(colorObject[prop]).slice(1));
      } else {
        var arr = colorObject[prop].slice(4,-1).replace(/ /g, '').split(",");
        $(prop+'-color-button').jscolor.fromRGB(Number(arr[0]),Number(arr[1]),Number(arr[2]));
      }
    }
  }
}

var fetchData = function (callback) {
  ajaxCall('/~payload', 'GET', "", function(json) {
    //keys are created at sign in, this forces out people who are already in
    //  with a persistent login cookie, such that they will have to sign in and make keys
    if (json.needKeys) {return signOut();}
    else {
      parseUserData(json.payload);
      if (callback) {callback();}
    }
  });
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
  uiAlert(`schlaugh does not support directly uploading images. You'll need to upload your image elsewhere(such as <a href="https://imgur.com/upload" target="_blank">imgur</a>), and then provide a link to the image file.<br><br>Please note that the link you provide must be directly to an image <i>file</i>, not a webpage. As in, right click on your image and click "copy image address", to get a link that ends with a file extension, like "png", "gif", "jpg" etc`);
}

var verifyEmail = function () {
  loading();
  ajaxCall('/verifyEmail', 'POST', {email:$("email-verify-input").value}, function(json) {
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
    var data = {username: $("username-lost").value, email: $("email-lost").value,}
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
