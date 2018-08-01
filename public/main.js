"use strict";

var glo = {dateOffset: -1,};

var $ = function (id) {return document.getElementById(id);}

/*var homeButton = function () {
  if (glo.username) {
    switchPanel('posts-panel');
  } else {
    window.location.href = "/";
  }
}*/

var submitPic = function (remove) {
  if (remove) {$('pic-url').value = "";}
  var picURL = $('pic-url').value;
  ajaxCall('/changePic', 'POST', {url:picURL}, function(json) {
    if (json === 'success') {
      updateUserPic(remove, picURL);
    } else {
      alert(json);
    }
  });
}

var updateUserPic = function (remove, picURL) {
  if (remove) {
    $("remove-pic").classList.add('removed');
    $("user-pic").classList.add('removed');
  } else {
    $("user-pic").setAttribute('src', picURL);
    $("user-pic").classList.remove('removed');
    $("remove-pic").classList.remove('removed');
  }
}

var changeColor = function (colorCode, type) {
  colorCode = String(colorCode);
  if (colorCode.slice(0,3) !== "rgb" && colorCode.slice(0,1) !== "#") {
    colorCode = "#"+colorCode;
  }
  var sheet = document.styleSheets[0];
  switch (type) {
    case "postBackground":                 //post background
      var selector = ".post, .message, .editor, #settings-panel, #thread-list, button, .prompt";
      var attribute = "background-color";
      break;
    case "text":                        //text
      var selector = "body, h1, input, .post, .message, .editor, #settings-panel, #thread-list, button";
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
      var selector = "a, a.visited, .special";
      var attribute = "color";
      break;
    case "background":                 //background
      var selector = "body, h1, input";
      var attribute = "background-color";
      break;
  }
  for (var i = sheet.cssRules.length-1; i > -1; i--) {
    if (sheet.cssRules[i].selectorText === selector) {
      sheet.deleteRule(i);
      i = -1;
    }
  }
  glo.colors[type] = colorCode;
  sheet.insertRule(selector+" {"+attribute+": "+colorCode+";}", sheet.cssRules.length);
  $('save-colors').classList.remove('hidden');
}

var saveColors = function () {
  ajaxCall('/saveColors', 'POST', glo.colors, function(json) {
    if (json === 'success') {
      $('save-colors').classList.add('hidden');
    } else {
      alert(json);
    }
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

var prompt = function (options) {
  // options is an object that can include props for
  //      'label', 'placeholder', 'value', 'callback'(function)
  if (!options) {  //close the prompt
    $("prompt").classList.add("hidden");
    $("prompt-backing").classList.add("hidden");
  } else {
    $("prompt").classList.remove("hidden");
    $("prompt-backing").classList.remove("hidden");
    //
    $("prompt-label").innerHTML = options.label;
    if (options.placeholder) {$("prompt-input").placeholder = options.placeholder;}
    if (options.value) {$("prompt-input").value = options.value;}
    else {$("prompt-input").value = "";}
    $("prompt-input").type = "";
    setCursorPosition($("prompt-input"), 0, $("prompt-input").value.length);
    //
    $("prompt-submit").onclick = function(){
      prompt(false);
      options.callback($("prompt-input").value);
    }
    var exit = function(){
      options.callback(null);
      prompt(false);
    }
    $("prompt-close").onclick = exit;
    $("prompt-backing").onclick = exit;
  }
}

var passPrompt = function (options) {
  // options is an object that can include props for
  //      'label', 'username', 'orUp'(boolean), 'callback'(function)
  if (!options) {  //close the prompt
    $("password-prompt").classList.add("hidden");
    $("prompt-backing").classList.add("hidden");
  } else {
    $("password-prompt").classList.remove("hidden");
    $("prompt-backing").classList.remove("hidden");
    //
    $("password-prompt-label").innerHTML = options.label;
    if (typeof glo !== undefined && glo.username) {
      $("prompt-username").value = glo.username;
      setCursorPosition($("prompt-password"), 0, 0);
    } else {
      setCursorPosition($("prompt-username"), 0, 0);
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
    $("prompt-backing").onclick = exit;
  }
}

var orSchlaughUp = function () {
  switchPanel("login-panel");
  passPrompt(false);
  chooseInOrUp(true);
  updatePath("/");
  changeBrowserTitle();
}

var passPromptSubmit = function () {  // from the prompt box an a user/post page
  passPrompt({
    label:"schlaugh in",
    orUp:true,
    callback: function(data) {
      if (data === null) {return;}
      else {
        signIn('/login', data, function () {
          createMessageButton($(glo.openPanel), glo.currentAuthor, $(glo.openPanel+"-all"));
        });
      }
    }
  });
}

var signOut = function() {
  ajaxCall('/~logout', 'GET', {}, function(json) {
    if (json === 'success') {
      location.reload();
    } else {
      alert("something has gone wrong... please screenshot this and show staff", json);
    }
  });
}

var updatePath = function (newPath) {
  // simulates a page load, basically
  // scrolls to top, updates the url, and the browser/tab title
  scroll(0, 0);
  if (newPath && newPath !== window.location.pathname) {
    history.pushState(null, null, newPath);
  }
}

var changeBrowserTitle = function (newTitle) { // defaults if no arg given
  if (!newTitle) {newTitle = "s c h l a u g h"}
  if (newTitle !== document.title) {
    document.title = newTitle;
  }
}

var ajaxCall = function(url, method, data, callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.open(method, url, true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var json = (xhttp.responseText);
      callback(json);
    }
  }
  xhttp.send(JSON.stringify(data));
}

var switchPanel = function (panelName) {
  if (glo.openPanel) {
    $(glo.openPanel).classList.add('removed');
    if ($(glo.openPanel+"-button")) {$(glo.openPanel+"-button").classList.remove('highlight');}
  }
  if ($(panelName+"-button")) {
    updatePath("/");
    changeBrowserTitle();
    $(panelName+"-button").classList.add('highlight');
  }
  if (panelName === "login-panel") {$("sign-in").classList.add('removed');}
  $(panelName).classList.remove('removed');
  glo.openPanel = panelName;
}

var changeDay = function (dir) { // load and display all posts for a given day
  //don't allow changing day if currently loading
  if (glo.loading) {return;}
  else {glo.loading = true;}
  var date = pool.getCurDate(glo.dateOffset);
  // hide the previously displayed day
  if ($('posts-for-'+ date)) {
    $('posts-for-'+ date).classList.add('removed');
  }
  glo.dateOffset += dir;
  date = pool.getCurDate(glo.dateOffset);
  // hide/unhide nextDay button as needed
  if (glo.dateOffset === 0) {
    $("day-forward").classList.add("hidden");
  } else if (glo.dateOffset === 1 && dir === 1) {
    $("day-forward").classList.remove("hidden");
  }
  $('date-display').innerHTML = date;
  // check if we already have the post data for that day
  if ($('posts-for-'+date)) {
    $('posts-for-'+date).classList.remove('removed');
    glo.loading = false;
  } else {
    // we don't, so make the ajax call
    $('loading').classList.remove('removed');
    ajaxCall('/posts', 'POST', {date: date}, function(json) {
      var bucket = document.createElement("div");
      bucket.setAttribute('class', 'post-bucket');
      bucket.setAttribute('id', 'posts-for-'+date);
      json = JSON.parse(json)
      // if there are no posts for the day
      if (json.length === 0) {
        var post = document.createElement("div");
        post.innerHTML = "Not Schlaugh!";
        bucket.appendChild(post);
      } else {
        // create temporary randomizing helper array
        var rando = [];
        for (var i = 0; i < json.length; i++) {
          rando.push(i);
        }
        // create posts
        while(rando.length !== 0) {
          var i = Math.floor(Math.random() * (rando.length));
          var post = document.createElement("div");
          post.setAttribute('class', 'post');
          // pic
          if (json[rando[i]].authorPic !== "") {
            var authorPic = document.createElement("img");
            authorPic.setAttribute('src', json[rando[i]].authorPic);
          } else {
            var authorPic = document.createElement("div");
          }
          var authorPicBox = document.createElement("a");
          (function (name) {
            authorPicBox.onclick = function(){
              openAuthorPanel(name);
            }
          })(json[rando[i]].author);
          post.appendChild(authorPicBox);
          authorPic.setAttribute('class', 'author-pic clicky');
          authorPicBox.appendChild(authorPic);
          // author/meta text
          var authorBox = document.createElement("div");
          authorBox.setAttribute('class', 'meta-text');
          var author = document.createElement("a");
          (function (name) {
            author.onclick = function(){
              openAuthorPanel(name);
            }
          })(json[rando[i]].author);
          author.setAttribute('class', 'author');
          author.innerHTML = "<clicky>"+json[rando[i]].author+"</clicky>";
          authorBox.appendChild(author);
          authorBox.appendChild(document.createElement("br"));
          createMessageButton(authorBox, json[rando[i]]);
          post.appendChild(authorBox);
          // actual post body
          var text = document.createElement("text");
          text.setAttribute('class', 'body-text');
          text.innerHTML = json[rando[i]].body;
          post.appendChild(text);
          bucket.appendChild(post);
          //remove the current index refference from the randomizing helper array
          rando.splice(i,1);
        }
      }
      $('loading').classList.add('removed');
      $('posts').appendChild(bucket);
      glo.loading = false;
    });
  }
}

var createMessageButton = function (parent, author, insert) {
  // OPTIONAL 'insert' is the element before which the button is to be inserted
  if (glo.username && author.author !== glo.username && author.key) {
    var message = document.createElement("clicky");
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
      parent.insertBefore(message, insert);
    } else {
      parent.appendChild(message);
    }
  } else if (!glo.username) { // not logged in, store the info in case they log in
    glo.currentAuthor = author;
  }
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

var openAuthorPanel = function (author, callback) {
  // see if a panel for that author already exists
  if ($(author+"-panel")) {
    switchPanel(author+"-panel");
    var children = $(author+'-panel-all').childNodes;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.remove('removed');
    }
    if ($(author+'-panel-404')) {$(author+'-panel-404').classList.add('removed');}
    $(author+'-panel-title').onclick = "";
    $(author+'-panel-title').classList.remove("clicky");
    $(author+'-panel-title').classList.remove("special");
    if (callback) {callback();}
    else {
      updatePath("/"+author);
      changeBrowserTitle(author);
    }
  } else {
    // call for data and render a new panel
    ajaxCall('/~get/'+author, 'GET', "", function(json) {
      json = JSON.parse(json);
      if (!json[0]) {
        if (!json[1]) {alert(json[2])}
        else {                                          //404
          if ($('404-panel')) {switchPanel("404-panel");}
          else {
            // panel
            var panel = document.createElement("div");
            panel.setAttribute('id', '404-panel');
            $("main").appendChild(panel);
            // title
            var title = document.createElement("h2");
            title.setAttribute('class', 'author-page-title');
            title.innerHTML = "but there was nobody home";
            panel.appendChild(title);
            switchPanel("404-panel");
          }
        }
      } else {
        json = json[1];
        // panel
        var panel = document.createElement("div");
        panel.setAttribute('id', json.author+'-panel');
        $("main").appendChild(panel);
        // pic
        if (json.authorPic !== "") {
          var authorPic = document.createElement("img");
          authorPic.setAttribute('src', json.authorPic);
          authorPic.setAttribute('class', 'author-panel-pic');
          panel.appendChild(authorPic);
        }
        // title
        var title = document.createElement("h2")
        title.setAttribute('id', json.author+'-panel-title');
        title.setAttribute('class', 'author-page-title');
        title.innerHTML = json.author;
        panel.appendChild(title);
        // message button
        createMessageButton(panel, json);
        // post bucket
        var bucket = document.createElement("div");
        bucket.setAttribute('id', json.author+'-panel-all');
        panel.appendChild(bucket);
        // posts
        for(var i=json.posts.length-1; i > -1; i--) {
          var post = document.createElement("div");
          post.setAttribute('class', 'post');
          bucket.appendChild(post);
          // date
          var dateBox = document.createElement("div");
          dateBox.setAttribute('class', 'date-stamp-box');
          var date = document.createElement("a");
          (function (index) {
            date.onclick = function(){
              openPost(json.author, index);
            }
          })(i);
          date.innerHTML = json.posts[i].date;
          date.setAttribute('class', 'clicky');
          dateBox.appendChild(date);
          post.appendChild(dateBox);
          // body
          var text = document.createElement("text");
          text.setAttribute('class', 'body-text');
          text.innerHTML = json.posts[i].body;
          post.appendChild(text);
        }
        switchPanel(json.author+"-panel");
        if (callback) {callback();}
        else {
          updatePath("/"+json.author);
          changeBrowserTitle(json.author);
        }
      }
    });
  }
}

var openPost = function (author, index) { //individual post on an author page
  openAuthorPanel(author, function () {
    updatePath("/"+author+"/"+index);
    changeBrowserTitle(author);
    var children = $(author+'-panel-all').childNodes;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.add('removed');
    }
    if (!isNumeric(index) || index >= children.length || index<0) {    //404 and Heartbreak
      if ($(author+'-panel-404')) {$(author+'-panel-404').classList.remove('removed');}
      else {
        var e404 = document.createElement("h2")
        e404.setAttribute('id', author+'-panel-404');
        e404.innerHTML = "<c>not even a single thing</c>";
        $(author+'-panel').appendChild(e404);
      }
    } else {
      children[children.length -1 - index].classList.remove('removed');
    }
    $(author+'-panel-title').onclick = function () {
      openAuthorPanel(author);
    }
    $(author+'-panel-title').classList.add("clicky");
    $(author+'-panel-title').classList.add("special");
  });
}

var submitPost = function (remove) { //also handles editing and deleting
  if (remove) {
    if (!confirm("you sure you want me should delete it?")) {return;}
    var text = null;
  }
  else {var text = $('postEditor').value;}
  if (text === "") {
    hideWriter('post');
    return;
    }
  var data = {text:text, remove:remove}
  ajaxCall("/", 'POST', data, function(json) {
    json = JSON.parse(json)
    if (!json[0]) {alert(json[1]);}
    else {updatePendingPost(remove, json[1])}
  });
}

var updatePendingPost = function (remove, newText) {
  if (remove) {
    $('pending-status').innerHTML = "no pending post";
    $('delete-pending-post').classList.add("removed");
    $('pending-post').classList.add("removed");
    $('write-post-button').innerHTML = "new post";
  } else {
    $('pending-status').innerHTML = "your pending post for tomorrow:";
    $('delete-pending-post').classList.remove("removed");
    $('pending-post').classList.remove("removed");
    $('write-post-button').innerHTML = "edit post";
  }
  $('pending-post').innerHTML = pool.checkForCuts(newText, 'pending');
  $('postEditor').value = prepTextForEditor(newText);
  hideWriter('post');
}

var prepTextForEditor = function (text) {
  // we usually want br tags and nbsp codes in the text, so we save it that way
  // and convert it for the one place we don't want that, editors
  text = text.replace(/<br>/g, '\n');
  return text.replace(/&nbsp;/g, ' ');
}

// editor stuff
var showWriter = function (kind) {
  $(kind+'-writer').classList.remove('removed');
  $(kind+'-preview').classList.add('removed');
}
var hideWriter = function (kind) {
  $(kind+'-writer').classList.add('removed');
  $(kind+'-preview').classList.remove('removed');
}

var styleText = function (s, src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end + 3;
  var y = area.value;
  area.value = y.slice(0, a)+'<'+s+'>'+y.slice(a, b-3)+'</'+s+'>'+y.slice(b-3);
  setCursorPosition(area, a+2+s.length, b-1+s.length);
}
var hyperlink = function (src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var linkText;
  if (a !== b) {linkText = y.substr(a,b-a)}
  prompt({
    label: "target url:",
    placeholder: "http://www.butts.cash/",
    callback: function(target) {
      if (target !== null) {
        prompt({
          placeholder: "butts.cash",
          value: linkText,
          label: "link text:",
          callback: function(linkText) {
            if (linkText !== null) {
              if (target.substr(0,4) !== "http") {
                target = "http://" + target;
              }
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
var image = function (src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  prompt({
    label: "image url:",
    value:"https://i.imgur.com/hDEXSt7.jpg",
    callback: function(target) {
      if (target !== null) {
        area.value = y.slice(0, a)+'<img src="'+target+'">'+y.slice(b);
        var bump = a+target.length+12;
        setCursorPosition(area, bump, bump);
      }
    }
  });
}
var insertCut = function (src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var cutText = "more";
  if (a !== b) {cutText = y.substr(a,b-a)}
  prompt({
    label:"text:",
    value:cutText,
    callback: function(cutText) {
      if (cutText != null) {
        area.value = y.slice(0, a)+'<cut>'+cutText+'</cut>'+y.slice(b);
        var bump = a+cutText.length+11;
        setCursorPosition(area, bump, bump);
      }
    }
  });
}

// thread stuff
var closeThread = function () { // returns true for threadClosed, false for NO
  if (glo.activeThreadIndex === undefined) {return true;}
  var i = glo.activeThreadIndex;
  //does the open thread have unsaved text?
  var text = $('messageEditor').value;
  if (text !== "") {
    var last = glo.threads[i].thread[glo.threads[i].thread.length-1];
    if (!last || last.date !== pool.getCurDate(-1) || text !== prepTextForEditor(last.body)) {
      //is it okay to lose that unsaved text?
      if (!confirm("lose current unsaved message text?")) {
        //and then take to the thread?

        return false;
      }
    }
  }
  //hide current thread
  glo.activeThreadIndex = undefined;
  $("back-arrow").classList.add('removed');
  $(i+"-thread").classList.add('removed');
  if ($(i+"-thread-pic")) {$(i+"-thread-pic").classList.add('removed');}
  $("message-writer").classList.add('removed');
  $("message-preview").classList.add('removed');
  $("thread-title").classList.add('removed');
  $("mark-unread").classList.add('removed');
  $("thread-title-area").classList.add('removed');
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
      $("thread-list").classList.add('removed');
      $("mark-unread").classList.remove('removed');
      $(i+"-thread").classList.remove('removed');
      if ($(i+"-thread-pic")) {$(i+"-thread-pic").classList.remove('removed');}
      $("message-preview").classList.remove('removed');
      $("back-arrow").classList.remove('removed');
      $("thread-title").innerHTML = glo.threads[i].name;
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
    $('pending-message').innerHTML = pool.checkForCuts(pending, 'pending'+glo.threads[index]._id);
  } else {
    $('delete-message').classList.add('removed');
    $('pending-message').classList.add('removed');
    $('write-message-button').innerHTML = "new message";
    $('pending-message-status').innerHTML = "no pending message";
    $('pending-message').innerHTML = "";
  }
  $('messageEditor').value = prepTextForEditor(pending);
  hideWriter('message');
}

var submitMessage = function (remove) {  //also handles editing and deleting
  if (remove && !confirm("you sure you want me should delete it?")) {return;}
  var text = $('messageEditor').value;
  if (text === "") {return;}
  var i = glo.activeThreadIndex;
  if (!glo.threads[i].key) {return alert("you cannot message the person you are trying to message, you shouldn't have this option, sorry this is a bug please note all details and tell staff sorry");}
  //
  var encryptAndSend = function () {
    encrypt(text, glo.keys.pubKey, glo.threads[i].key, function (encSenderText, encRecText) {
      var data = {
        recipient: glo.threads[i]._id,
        encSenderText: encSenderText,
        encRecText: encRecText,
        remove: remove,
      };
      ajaxCall('/inbox', 'POST', data, function(json) {
        json = JSON.parse(json)
        if (!json[0]) {
          alert(json[1]);
          return;
        }
        var len = glo.threads[i].thread.length-1;
        var last = glo.threads[i].thread[len];
        // is the thread's last message already a pending message?
        if (last && last.date === pool.getCurDate(-1)) {
          if (remove) {glo.threads[i].thread.splice(len,1);}
          else {last.body = text;}    //overwrite
        } else {
          glo.threads[i].thread.push({
            inbound: false,
            date: pool.getCurDate(-1),
            body: text,
          });
        }
        updatePendingMessage(i);
      });
    });
  }

  // cleanse and image validate
  var x = pool.cleanseInputText(text);
  text = x[1];
  if (x[0].length !== 0) {
    ajaxCall('/image', 'POST', x[0], function(json) {
      json = JSON.parse(json);
      if (!json[0]) {
        alert(json[1]);
        return;
      } else {encryptAndSend();}
    });
  } else {encryptAndSend();}
}

var checkForThread = function (user) {
  // if the thread already exists, open it
  if (glo.threadRef[user._id] !== undefined) {openThread(glo.threadRef[user._id]);}
  else {  //create a new thread
    user.thread = [];
    var index = glo.threads.length;
    glo.threadRef[user._id] = index;
    glo.threads.push(user);
    if (index === 0) {
      $("thread-list").removeChild($("thread-list").childNodes[0]);
    }
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
    body.innerHTML = pool.checkForCuts(x.body, glo.threads[i]._id+'-'+x.date+orri);
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
    (function (name) {
      authorPicBox.onclick = function(){
        openAuthorPanel(name);
      }
    })(glo.threads[i].name);
    authorPicBox.appendChild(authorPic);
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
  var parent = $("thread-list");
  if (glo.threads.length === 0) {
    var name = document.createElement("div");
    name.innerHTML = "no threads!";
    parent.appendChild(name);
  } else {
    for (var i = 0; i < glo.threads.length; i++) {
      createThread(i);
    }
    if (glo.unread > 0) {
      $("inbox-panel-button").classList.add("special");
    }
  }
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
    });
  });
}

var decryptPrivKey = function (pass, privKey) {
  var key = openpgp.key.readArmored(privKey).keys[0];
  try {
    key.decrypt(pass);
  } catch(err) {
    alert("EEErrrorrr?????");
  }
  return key;
}

var decrypt = function (text, key, callback) {
  var options = {
    message: openpgp.message.readArmored(text),
    privateKeys: [key]
  };
  openpgp.decrypt(options).then(decryptedMessage => {
    callback(decryptedMessage.data);
  });
}

var verifyPass = function (callback) {      // for decryption
  passPrompt({
    label:"<i>please</i> re-enter your password to decrypt your messages",
    callback: function(data) {
      if (data === null) {return;}
      ajaxCall('/login', 'POST', data, function(json) {
        json = JSON.parse(json);
        if (json[0]) { //password is good
          if (json[1]) {  // are they trying to log in as a Different user?
            alert("switcheroo!");
            return location.reload();
          } else {
            unlockInbox(data.password, callback);
          }
        } else {  // bad username/password
          alert(json[1]);
          signOut();
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
          decrypt(glo.threads[i].thread[j].body, key, function (text) {
            glo.threads[i].thread[j].body = pool.cleanseInputText(text)[1];
            // image validation
            //(goes here)

            msgCount[i]--;
            if (msgCount[i] === 0) {
              glo.threads[i].locked = false;
              populateThread(i);
              threadCount--;
              if (threadCount === 0) {
                if (callback) {callback();}
              }
            }
          })
        })(i,j)
      }
    }
  }
}

// login page stuff
var chooseInOrUp = function (up) {
  if (up === true) {$('up').classList.remove('removed');}
  else {$('in').classList.remove('removed');}
  $('inOrUp').classList.add('removed');
}

var backToLogInMenu = function () {
  $('up').classList.add('removed');
  $('in').classList.add('removed');
  $('inOrUp').classList.remove('removed');
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
  if (x) {
    alert(x);
    return false;
  }
  var y = pool.passwordValidate(data.password);
  if (y) {
    alert(y);
    return false;
  }
  if (inOrUp === 'in') {
    var url = '/login';
  } else {
    var url = '/register';
    data.email = $('email-input').value;
    //data.secretCode = $('secret-code').value;
    if (data.password !== $('pass-input-two').value) {
      alert('passwords are not the same');
      return false;
    }
  }
  signIn(url, data, function () {
    switchPanel('posts-panel');
  })
  return false;
}

var signIn = function (url, data, callback) {
  ajaxCall(url, 'POST', data, function(json) {
    json = JSON.parse(json);
    if (json[0]) {    //password is good, do they need keys?
      if (json[1]) {  // (no)
        parseUserData(json[2]);
        unlockInbox(data.password);
        if (callback) {callback();}
      } else {        //they need keys
        makeKeys(data.password, function (keys) {
          ajaxCall('/keys', 'POST', keys, function(json) {
            if (json[0]) {
              json = JSON.parse(json);
              parseUserData(json[1]);
              if (callback) {callback();}
            } else {
              alert(json[1]);
            }
          });
        });
      }
    } else {  // bad login
      alert(json[1]);
    }
  });
}

var parseUserData = function (data) {
  glo.username = data.username;
  glo.unread = 0;
  glo.threads = data.threads;
  glo.keys = data.keys;
  glo.threadRef = {};
  glo.colors = data.colors;
  glo.pending = data.pending;
  glo.userPic = data.userPic;
  // init stuff
  changeDay(1);
  setColors(data.colors);
  if (glo.pending) {updatePendingPost(false, glo.pending);}
  populateThreadlist();
  //
  if (glo.username) {
    $("username").innerHTML = glo.username;
    $("username").classList.remove("removed");
    $("sign-out").classList.remove("removed");
    $("sign-in").classList.add("removed");
    //
    $("nav").classList.remove("removed");
  }
  //
  if (glo.userPic) {updateUserPic(false, glo.userPic);}
}

var setColors = function (savedColors) {
  for (var prop in savedColors) {
    if (savedColors.hasOwnProperty(prop)) {
      changeColor(savedColors[prop], prop);
      $(prop+'-color-button').jscolor.fromString(String(savedColors[prop]).slice(1));
    }
  }
}

var fetchData = function () {
  ajaxCall('/~payload', 'GET', "", function(json) {
    json = JSON.parse(json);
    //keys are created at sign in, this^ will force out people who are already in
    // ,with a persistent login cookie, such that they will have to sign in and make keys
    if (json[0] === false || !json[1].keys) {return signOut();}
    else {parseUserData(json[1]);
    }
  });
}
