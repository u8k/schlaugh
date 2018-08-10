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
      var selector = ".post, .message, .editor, #settings-panel, #thread-list, button, .pop-up";
      var attribute = "background-color";
      break;
    case "text":                        //text
      var selector = "body, h1, input, .post, .message, .editor, #settings-panel, #thread-list, button, .not-special";
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
  glo.settings.colors[type] = colorCode;
  sheet.insertRule(selector+" {"+attribute+": "+colorCode+";}", sheet.cssRules.length);
  $('save-colors').classList.remove('hidden');
}

var saveColors = function () {
  ajaxCall('/saveColors', 'POST', glo.settings.colors, function(json) {
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
    $("pop-up-backing").classList.add("hidden");
  } else {
    $("prompt").classList.remove("hidden");
    $("pop-up-backing").classList.remove("hidden");
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
    $("pop-up-backing").onclick = exit;
  }
}

var passPrompt = function (options) {
  // options is an object that can include props for
  //      'label', 'username', 'orUp'(boolean), 'callback'(function)
  if (!options) {  //close the prompt
    $("password-prompt").classList.add("hidden");
    $("pop-up-backing").classList.add("hidden");
  } else {
    $("password-prompt").classList.remove("hidden");
    $("pop-up-backing").classList.remove("hidden");
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
        signIn('/login', data, function () {
          createFollowButton($(glo.openPanel), glo.currentAuthor, $(glo.openPanel+"-all"));
          createMessageButton($(glo.openPanel), glo.currentAuthor, $(glo.openPanel+"-all"));
        });
      }
    }
  });
}

var alert = function (message, callback) {
  if (!message) {  //close the alert
    $("alert").classList.add("hidden");
    $("pop-up-backing").classList.add("hidden");
  } else {
    $("alert").classList.remove("hidden");
    $("pop-up-backing").classList.remove("hidden");
    $("alert-text").innerHTML = message;
    var exit = function(){
      if (callback) {callback();}
      alert(false);
    }
    $("alert-submit").onclick = exit;
    $("pop-up-backing").onclick = exit;
  }
}

var verify = function (message, callback) {
  if (!message) {  //close the confirm
    $("confirm").classList.add("hidden");
    $("pop-up-backing").classList.add("hidden");
  } else {
    $("confirm").classList.remove("hidden");
    $("pop-up-backing").classList.remove("hidden");
    $("confirm-text").innerHTML = message;
    $("confirm-yes").onclick = function () {
      if (callback) {callback(true);}
      verify(false);
    }
    var exit = function(){
      if (callback) {callback(false);}
      verify(false);
    }
    $("confirm-no").onclick = exit;
    $("pop-up-backing").onclick = exit;
  }
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

var simulatePageLoad = function (newPath, newTitle) {
  // scrolls to top, updates the url, and the browser/tab title
  // defaults to home if no args given, second arg defaults to first if not given
  scroll(0, 0);
  if (!newPath) {
    newPath = "";
    newTitle = "s c h l a u g h";
  }
  if (newPath !== window.location.pathname) {
    history.pushState(null, null, "/"+newPath);
    if (!newTitle) {newTitle = newPath;}
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

var convertCuts = function (string, id) {
  // changes cut tags into functional cuts, needs id so that every cut has a unique id tag on the front end,
  // this will need alteration if multiple posts per user are allowed
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

var convertLinks = function (string) {
  // adds the " target="_blank" " property to links in user posts/messages
  //        (so that they open in new tabs automatically)
  if (typeof string !== "string") {return;}
  var b = ' target="_blank"';
  var recurse = function (pos) {
    var next = string.substr(pos).search(/a href="/);
    if (next === -1) {
      return string;}
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
  return convertLinks(convertCuts(string, id));
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
  if (panelName === "login-panel") {$("sign-in").classList.add('removed');}
  $(panelName).classList.remove('removed');
  glo.openPanel = panelName;
}

var openDateJump = function (close) {
  if (close) {
    $('jump-open').classList.remove('removed');
    $('date-arrow-box').classList.remove('removed');
    $('date-jump').classList.add('removed');
  } else {
    $('date-jump').classList.remove('removed');
    $('date-arrow-box').classList.add('removed');
    $('jump-open').classList.add('removed');
  }
}

var dateJump = function () {
  var target = $("date-picker").value;
  if (!target) { target = pool.getCurDate();}
  if (target.length !== 10 || target[4] !== "-" || target[7] !== "-" || !isNumeric(target.slice(0,4)) || !isNumeric(target.slice(5,7)) || !isNumeric(target.slice(8,10))) {
    return alert("date must be formatted YYYY-MM-DD");
  } else {
    target = getEpochSeconds(target);
    if (target > getEpochSeconds(pool.getCurDate())) {
      return alert("and no future vision either!");
    } else {
      changeDay(Math.floor((getEpochSeconds(pool.getCurDate(glo.dateOffset)) - target) /(24*3600000)));
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

var changeDay = function (dir) { // load and display all posts for a given day
  //don't allow changing day if currently loading
  if (glo.loading) {return;}
  else {
    glo.loading = true;
  }
  var date = pool.getCurDate(glo.dateOffset);
  // hide the previously displayed day
  if ($('posts-for-'+ date)) {$('posts-for-'+ date).classList.add('removed');}
  glo.dateOffset += dir;
  date = pool.getCurDate(glo.dateOffset);
  // hide/unhide nextDay button as needed
  if (glo.dateOffset === 0) {$("day-forward").classList.add("hidden");}
  else {$("day-forward").classList.remove("hidden");}
  $('date-display').innerHTML = date;
  // check if we already have the post data for that day
  if ($('posts-for-'+date)) {
    $('posts-for-'+date).classList.remove('removed');
    glo.loading = false;
  } else {
    // we don't, so make the ajax call
    $('loading').classList.remove('removed');
    ajaxCall('/posts/'+date, 'POST', {}, function(json) {
      json = JSON.parse(json)
      if (!json[0]) {return alert(json[1]);}
      else {
        json = json[1];
        var bucket = document.createElement("div");
        bucket.setAttribute('class', 'post-bucket');
        bucket.setAttribute('id', 'posts-for-'+date);
        // if there are no posts for the day
        if (json.length === 0) {
          var post = document.createElement("div");
          post.innerHTML = "Not Schlaugh!";
          bucket.appendChild(document.createElement("br"));
          bucket.appendChild(document.createElement("br"));
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
            authorPicBox.setAttribute('href', "/"+json[rando[i]].author);
            (function (name) {
              authorPicBox.onclick = function(event){
                event.preventDefault();
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
              author.onclick = function(event){
                event.preventDefault();
                openAuthorPanel(name);
              }
            })(json[rando[i]].author);
            author.setAttribute('class', 'author special');
            author.setAttribute('href', "/"+json[rando[i]].author);
            author.innerHTML = "<clicky>"+json[rando[i]].author+"</clicky>";
            authorBox.appendChild(author);
            authorBox.appendChild(document.createElement("br"));
            createFollowButton(authorBox, json[rando[i]]);
            createMessageButton(authorBox, json[rando[i]]);
            post.appendChild(authorBox);
            // actual post body
            var text = document.createElement("text");
            text.setAttribute('class', 'body-text');
            text.innerHTML = convertText(json[rando[i]].body, json[rando[i]]._id+"-"+date+"-feed");
            post.appendChild(text);
            bucket.appendChild(post);
            //remove the current index refference from the randomizing helper array
            rando.splice(i,1);
          }
        }
        $('loading').classList.add('removed');
        $('posts').appendChild(bucket);
        glo.loading = false;
      }
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
  if (glo.username) {
    var follow = document.createElement("clicky");
    // is the user already following the author?
    if (glo.following[author._id]) {
      follow.innerHTML = "defollow";
      var remove = true;
    } else {
      follow.innerHTML = "follow";
      var remove = false;
    }
    follow.onclick = function(){
      ajaxCall('/follow', 'POST', {id:author._id, remove:remove}, function(json) {
        json = JSON.parse(json)
        if (!json[0]) {return alert(json[1]);}
        else {
          if (remove) {glo.following[author._id] = false;}
          else {glo.following[author._id] = true;}
          // refresh button(by hiding and creating new)
          follow.classList.add('removed');
          createFollowButton(parent, author, follow);
        }
      });
    }
    if (insert) {
      parent.insertBefore(follow, insert);
    } else {
      parent.appendChild(follow);
    }
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
    $(author+'-panel-title').removeAttribute('href');
    $(author+'-panel-title').classList.remove("clicky");
    $(author+'-panel-title').classList.add("not-special");
    if (callback) {callback();}
    else {
      simulatePageLoad(author);
    }
  } else {
    // call for data and render a new panel
    ajaxCall('/~get/'+author, 'GET', "", function(json) {
      json = JSON.parse(json);
      if (!json[0]) {
        if (!json[1]) {return alert(json[2])}
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
        var title = document.createElement("a")
        title.setAttribute('id', json.author+'-panel-title');
        title.setAttribute('class', 'author-page-title not-special');
        title.innerHTML = json.author;
        panel.appendChild(title);
        panel.appendChild(document.createElement("br"));
        // follow and message buttons
        createFollowButton(panel, json);
        createMessageButton(panel, json);
        // post bucket
        var bucket = document.createElement("div");
        bucket.setAttribute('id', json.author+'-panel-all');
        panel.appendChild(bucket);
        // posts
        if (json.posts.length === 0) {
          bucket.appendChild(document.createElement("br"));
          var text = document.createElement("h2");
          text.innerHTML = "no posts!";
          bucket.appendChild(text);
        } else {
          for(var i=json.posts.length-1; i > -1; i--) {
            var post = document.createElement("div");
            post.setAttribute('class', 'post');
            bucket.appendChild(post);
            // date
            var dateBox = document.createElement("div");
            dateBox.setAttribute('class', 'date-stamp-box');
            var date = document.createElement("a");
            date.setAttribute('href', "/"+author+"/"+i);
            (function (index) {
              date.onclick = function(event){
                event.preventDefault();
                openPost(json.author, index);
              }
            })(i);
            date.innerHTML = json.posts[i].date;
            date.setAttribute('class', 'clicky special');
            dateBox.appendChild(date);
            post.appendChild(dateBox);
            // body
            var text = document.createElement("text");
            text.setAttribute('class', 'body-text');
            text.innerHTML = convertText(json.posts[i].body, json._id+"-"+json.posts[i].date+"-panel");
            post.appendChild(text);
          }
        }
        switchPanel(json.author+"-panel");
        if (callback) {callback();}
        else {
          simulatePageLoad(json.author);
        }
      }
    });
  }
}

var openPost = function (author, index) { //individual post on an author page
  openAuthorPanel(author, function () {
    simulatePageLoad(author+"/"+index, author);
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
    $(author+'-panel-title').onclick = function (event) {
      event.preventDefault();
      openAuthorPanel(author);
    }
    $(author+'-panel-title').setAttribute('href', "/"+author);
    $(author+'-panel-title').classList.add("clicky");
    $(author+'-panel-title').classList.remove("not-special");
  });
}

var submitPost = function (remove) { //also handles editing and deleting
  if (remove) {
    verify("you sure you want me should delete it?", function (result) {
      if (!result) {return;}
      else {
        var data = {text:null, remove:remove}
        ajaxCall("/", 'POST', data, function(json) {
          json = JSON.parse(json)
          if (!json[0]) {alert(json[1]);}
          else {updatePendingPost(remove, json[1])}
        });
      }
    });
  } else {
    var text = $('postEditor').value;
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
  $('pending-post').innerHTML = convertText(newText, 'pending');
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
              ajaxCall('/link', 'POST', {url:target}, function(json) {
                json = JSON.parse(json);
                if (json.error) {
                  verify(json.error, function (res) {
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
      verify("lose current unsaved message text?", function (result) {
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
    $('pending-message').innerHTML = convertText(pending, 'pending'+glo.threads[index]._id);
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
  var i = glo.activeThreadIndex;
  if (remove) {
    verify("you sure you want me should delete it?", function (result) {
      if (!result) {return;}
      else {
        var data = {
          recipient: glo.threads[i]._id,
          encSenderText: '',
          encRecText: '',
          remove: remove,
        };
        ajaxCall('/inbox', 'POST', data, function(json) {
          json = JSON.parse(json)
          if (json.error) {return alert(json.error);}
          else if (json.reKey) {
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
    var text = $('messageEditor').value;
    if (text === "") {return;}
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
          if (json.error) {return alert(json.error);}
          else if (json.reKey) {
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
        json = JSON.parse(json);
        if (!json[0]) {return alert(json[1]);}
        else {encryptAndSend();}
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
    (function (name) {
      authorPicBox.onclick = function(event){
        event.preventDefault();
        openAuthorPanel(name);
      }
    })(glo.threads[i].name);
    authorPicBox.setAttribute('href', "/"+glo.threads[i].name);
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
  openpgp.decrypt(options).then(function (decryptedMessage) {
    callback(decryptedMessage.data);
  }, function () {                // callback for failed decryption
    callback("<c>***encryption/decryption error! SORRY! Tell staff about this!***</c>");
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
            return alert("switcheroo!", function () {location.reload();});
          } else {
            unlockInbox(data.password, callback);
          }
        } else {  // bad username/password
          return alert(json[1], function () {signOut();});
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
          });
        })(i,j);
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
  glo.settings = data.settings;
  glo.pending = data.pending;
  glo.userPic = data.userPic;
  glo.following = {};
  for (var i = 0; i < data.following.length; i++) {
    glo.following[data.following[i]] = true;
  }
  // init stuff
  changeDay(1);
  if (glo.pending) {updatePendingPost(false, glo.pending);}
  populateThreadlist();
  setColors();
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

var setColors = function () {
  if (glo.settings && glo.settings.colors) {
    var savedColors = glo.settings.colors;
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
  for (var prop in savedColors) {
    if (savedColors.hasOwnProperty(prop)) {
      changeColor(savedColors[prop], prop);
      // set button
      if (savedColors[prop][0] === '#') {
        $(prop+'-color-button').jscolor.fromString(String(savedColors[prop]).slice(1));
      } else {
        var arr = savedColors[prop].slice(4,-1).replace(/ /g, '').split(",");
        $(prop+'-color-button').jscolor.fromRGB(Number(arr[0]),Number(arr[1]),Number(arr[2]));
      }
    }
  }
}

var fetchData = function (callback) {
  ajaxCall('/~payload', 'GET', "", function(json) {
    json = JSON.parse(json);
    //keys are created at sign in, this^ will force out people who are already in
    // ,with a persistent login cookie, such that they will have to sign in and make keys
    if ((json[0] === false && json[1] === false) || !json[1].keys) {return signOut();}
    else if (json[0] === false) {return alert(json[1]);}
    else {
      parseUserData(json[1]);
      if (callback) {callback();}
    }
  });
}
