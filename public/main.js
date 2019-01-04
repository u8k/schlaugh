"use strict";

var glo = {dateOffset: -1,};

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
  } else {
    $("user-pic").setAttribute('src', picURL);
    $("user-pic").classList.remove('removed');
    $("remove-pic").classList.remove('removed');
  }
}

var fontSelect = function () {
  if (glo.settings.font !== $('font-select').value) {
    changeFont($('font-select').value);
  }
}

var changeFont = function (font) {
  var sheet = document.styleSheets[document.styleSheets.length-1];
  var selector = "*";
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

var prompt = function (options) {
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
          if (resp && resp.otherKey) {glo.currentAuthor.key = resp.otherKey;}
          createFollowButton($(glo.openPanel), glo.currentAuthor, $(glo.currentAuthor.author+"-posts"));
          createMessageButton($(glo.openPanel), glo.currentAuthor, $(glo.currentAuthor.author+"-posts"));
          var postArr = glo.currentAuthor.posts;
          for (var i = 0; i < postArr.length; i++) {
            if (postArr[i].post_id && postArr[i].date) {
              createPostFooter($("author-"+postArr[i].post_id), {_id:glo.currentAuthor._id, name:glo.currentAuthor.author}, postArr[i]);
            }
          }
          loading(true);
        });
      }
    }
  });
}

var alert = function (message, btnTxt, callback) {
  if (!$("alert")) {return console.log(message);}
  loading(true, true);
  if (!message) {  //close the alert
    $("alert").classList.add("hidden");
    blackBacking(true);
  } else {
    $("alert").classList.remove("hidden");
    blackBacking();
    $("alert-text").innerHTML = message;
    if (btnTxt) {$('alert-submit').innerHTML = btnTxt;}
    else {$('alert-submit').innerHTML = "'kay";}
    var exit = function(){
      if (callback) {callback();}
      alert(false);
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
    setTimeout(function () {
      $("loading-box").classList.add('hidden');
    }, 300);
  } else {
    blackBacking();
    $("loading-box").classList.remove('hidden');
    $("loading-box").style.opacity="1";
  }
}

var signOut = function() {
  ajaxCall('/~logout', 'GET', {}, function(json) {
    location.reload();
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
      json = JSON.parse(json);
      if (json.error) {alert(json.error);}
      else {callback(json);}
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
  if (panelName === "login-panel" || panelName === "bad-recovery-panel" || panelName === "recovery-panel") {
    $("sign-in").classList.add('removed');
    $("username-recovery").value = "";
    $("password-recovery1").value = "";
    $("password-recovery2").value = "";
  }
  $(panelName).classList.remove('removed');
  glo.openPanel = panelName;
}

var openDateJump = function (close) {
  if (close) {
    $('jump-open').classList.remove('removed');
    $('tag-menu-open').classList.remove('removed');
    $('date-jump').classList.add('removed');
  } else {
    $('date-jump').classList.remove('removed');
    $('tag-menu-open').classList.add('removed');
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
      loadPosts(Math.floor((getEpochSeconds(pool.getCurDate(glo.dateOffset)) - target) /(24*3600000)));
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

var loadPosts = function (dir, tag) { // load and display all posts for a day/tag
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
    if ($('top-tags-for-'+ date)) {$('top-tags-for-'+ date).classList.add('removed');}
  }
  //
  if (tag === false) {
    glo.tag = null;
    $("tag-display").classList.add("removed");
    $("clear-tag").classList.add("removed");
    $("tag-menu-open").classList.remove("removed");
    $("jump-open").classList.remove("removed");
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
    $("tag-display").innerHTML = 'all posts tagged "'+tag+'" on';
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
      ajaxCall('/~getTag/'+tag+"/"+date, 'GET', {}, function(json) {
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
      if ($('top-tags-for-'+date)) {
        $('top-tags-for-'+date).classList.remove('removed');
        $("top-tag-bucket").classList.remove('removed');
      } else {
        $("top-tag-bucket").classList.add('removed');
      }
      loadManage();
    } else {
      // we don't, so make the ajax call
      $('loading').classList.remove('removed');
      ajaxCall('/posts/'+date, 'POST', {}, function(json) {
        renderPostFeed(json.posts, date);
        $('loading').classList.add('removed');
        // render top tags for the day
        var tagArr = json.topTags;
        if (!tagArr || tagArr.length === 0) {
          $("top-tag-bucket").classList.add('removed');
        } else {
          var bucket = document.createElement("div");
          bucket.setAttribute('id', 'top-tags-for-'+date);
          for (var i = 0; i < tagArr.length; i++) {
            var tagShell = document.createElement("div");
            var tag = document.createElement("text");
            tag.setAttribute('class', 'clicky');
            tag.innerHTML = tagArr[i];
            (function (tagName) {
              tag.onclick = function(){
                loadPosts(0, tagName);
              }
            })(tagArr[i]);
            tagShell.appendChild(tag);
            bucket.appendChild(tagShell);
          }
          $("top-tags").appendChild(bucket);
          $("top-tag-bucket").classList.remove('removed');
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
  bucket.setAttribute('class', 'post-bucket');
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
    // create temporary randomizing helper array
    var rando = [];
    for (var i = 0; i < postList.length; i++) {
      rando.push(i);
    }
    // create posts
    while(rando.length !== 0) {
      var i = Math.floor(Math.random() * (rando.length));
      var post = document.createElement("div");
      post.setAttribute('class', 'post');
      if (tag) {post.setAttribute('id', 'tag-'+tag+"-"+postList[rando[i]].post_id);}
      else {post.setAttribute('id', 'feed-'+postList[rando[i]].post_id);}
      // pic
      if (postList[rando[i]].authorPic !== "") {
        var authorPic = document.createElement("img");
        authorPic.setAttribute('src', postList[rando[i]].authorPic);
      } else {
        var authorPic = document.createElement("div");
      }
      var authorPicBox = document.createElement("a");
      authorPicBox.setAttribute('href', "/"+postList[rando[i]].author);
      (function (name) {
        authorPicBox.onclick = function(event){
          event.preventDefault();
          openAuthorPanel(name);
        }
      })(postList[rando[i]].author);
      post.appendChild(authorPicBox);
      authorPic.setAttribute('class', 'author-pic clicky');
      authorPicBox.appendChild(authorPic);
      // author/meta text
      var authorBox = document.createElement("div");
      authorBox.setAttribute('class', 'meta-text');
      var author = document.createElement("a");
      (function (post) {
        author.onclick = function(event){
          event.preventDefault();
          openPost(post.author, post.post_id);
        }
      })(postList[rando[i]]);
      author.setAttribute('class', 'author special');
      author.setAttribute('href', "~/"+postList[rando[i]].post_id);
      author.innerHTML = "<clicky>"+postList[rando[i]].author+"</clicky>";
      authorBox.appendChild(author);
      authorBox.appendChild(document.createElement("br"));
      createFollowButton(authorBox, postList[rando[i]]);
      post.appendChild(authorBox);
      // actual post body
      var text = document.createElement("text");
      text.setAttribute('class', 'body-text');
      if (tag) {var uniqueID = postList[rando[i]].post_id+"-"+date+"-"+tag+"-feed";}
      else {var uniqueID = postList[rando[i]].post_id+"-"+date+"-feed"}
      text.innerHTML = appendTags(convertText(postList[rando[i]].body, uniqueID), postList[rando[i]].tags);
      post.appendChild(text);
      //
      postList[rando[i]].date = date;
      createPostFooter(post, {_id:postList[rando[i]]._id, name:postList[rando[i]].author}, postList[rando[i]]);
      bucket.appendChild(post);
      //remove the current index refference from the randomizing helper array
      rando.splice(i,1);
    }
  }
  $('posts').appendChild(bucket);
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
  if (glo.username && author._id) {
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
        if (remove) {glo.following[author._id] = false;}
        else {glo.following[author._id] = true;}
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

var createPostFooter = function (postElem, author, post) {
  if (glo.username) {
    var footer = document.createElement("div");
    footer.setAttribute('class', 'post-footer');
    postElem.appendChild(footer);
    if (glo.username === author.name) {
      // delete button
      var deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = "delete";
      deleteBtn.onclick = function() {
        deletePost(post);
      }
      footer.appendChild(deleteBtn);
      //edit button
      /*
      var editBtn = document.createElement("button");
      editBtn.innerHTML = "edit";
      editBtn.onclick = function() {
        editPost(post, author);
      }
      footer.appendChild(editBtn);
      */
    }
    // quote button
    var quoteBtn = document.createElement("button");
    quoteBtn.innerHTML = "quote";
    quoteBtn.onclick = function() {
      loading();
      ajaxCall('/~getPost/'+author._id+"/"+post.date, 'GET', "", function(json) {
        if (json.four04) {return alert("eRoRr! post not found???")}
        loading(true);
        var text = "<quote>"+json.post.body+
          '<r><a href="/~/'+post.post_id+'">-'+author.name+"</a></r></quote>"
        if ($('postEditor').value !== "") {text = '<br>'+text;}
        $('postEditor').value += prepTextForEditor(text);
        showWriter('post');
        switchPanel('write-panel');
      });
    }
    footer.appendChild(quoteBtn);
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
        // remove the DOM elements of ALL intances of the post that may be floating about
        var authVers = $('author-'+post.post_id);
        var feedVers = $('feed-'+post.post_id);
        if (authVers) {authVers.parentNode.removeChild(authVers);}
        if (feedVers) {feedVers.parentNode.removeChild(feedVers);}
        for (var tag in post.tags) {
          if (post.tags.hasOwnProperty(tag)) {
            var tagVers = $("tag-"+tag+"-"+post.post_id);
            if (tagVers) {tagVers.parentNode.removeChild(tagVers);}
          }
        }
      });
    });
  });
}

var editPost = function () {
  alert('not yet!');
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
  // see if a panel for the author already exists
  if ($(author+"-panel")) {
    switchPanel(author+"-panel");
    $(author+'-tag-nav').classList.add('removed')
    var children = $(author+'-posts').childNodes;
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
    loading();
    ajaxCall('/~getAuthor/'+author, 'GET', "", function(json) {
      loading(true);
      if (json.four04) {
        simulatePageLoad(author, "404s & Heartbreak");
        open404author();
      } else {
        json = json.data;
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
        // tag nav
        var tagNav = document.createElement("div");
        tagNav.setAttribute('class','removed')
        tagNav.setAttribute('id', json.author+'-tag-nav')
        panel.appendChild(tagNav);
        tagNav.appendChild(document.createElement("br"));
        var tagText = document.createElement("h2");
        tagText.setAttribute('id', json.author+'-tag-text')
        tagNav.appendChild(tagText);
        var tagClear = document.createElement("button");
        tagClear.innerHTML = 'clear tag';
        (function (author) {
          tagClear.onclick = function(){openAuthorPanel(author);}
        })(author);
        tagNav.appendChild(tagClear);
        // post bucket
        var bucket = document.createElement("div");
        bucket.setAttribute('id', json.author+'-posts');
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
            post.setAttribute('id', 'author-'+json.posts[i].post_id);
            bucket.appendChild(post);
            // date
            var dateBox = document.createElement("div");
            dateBox.setAttribute('class', 'date-stamp-box');
            var date = document.createElement("a");
            date.setAttribute('href', "/~/"+json.posts[i].post_id);
            (function (author, post_id) {
              date.onclick = function(event){
                event.preventDefault();
                openPost(author, post_id);
              }
            })(json.author, json.posts[i].post_id);
            date.innerHTML = json.posts[i].date;
            date.setAttribute('class', 'clicky special');
            dateBox.appendChild(date);
            post.appendChild(dateBox);
            // body
            var text = document.createElement("text");
            text.setAttribute('class', 'body-text');
            text.innerHTML = appendTags(convertText(json.posts[i].body, json._id+"-"+json.posts[i].date+"-panel"), json.posts[i].tags, json.author);
            post.appendChild(text);
            //
            createPostFooter(post, {_id:json._id, name:json.author}, json.posts[i]);
            //create tag ref
            if (!glo.authors) {glo.authors = {};}
            if (!glo.authors[json.author]) {glo.authors[json.author] = {}}
            glo.authors[json.author][json.posts[i].post_id] = json.posts[i].tags;
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

var open404author = function (ever) {
  if (ever) {
    if ($('404-panel-ever')) {switchPanel("404-panel-ever");}
    else {
      // panel
      var panel = document.createElement("div");
      panel.setAttribute('id', '404-panel-ever');
      $("main").appendChild(panel);
      // title
      var title = document.createElement("h2");
      title.setAttribute('class', 'author-page-title');
      title.innerHTML = "once here<br>there was something<br><br>now here<br>there is nothing<br><br><i>time</i><br><br>";
      panel.appendChild(title);
      switchPanel("404-panel-ever");
    }
  } else {
    if ($('404-panel')) {switchPanel("404-panel");}
    else {
      // panel
      var panel = document.createElement("div");
      panel.setAttribute('id', '404-panel');
      $("main").appendChild(panel);
      // title
      var title = document.createElement("h2");
      title.setAttribute('class', 'author-page-title');
      title.innerHTML = "<br>but there was nobody home<br><br>";
      panel.appendChild(title);
      switchPanel("404-panel");
    }
  }
}

/*var postLookup = function () { //open post when we don't know the author
  ajaxCall('/~getPost/'+post_id, 'GET', "", function(json) {
    if (json.four04) {
      simulatePageLoad("~/"+post_id, "404s & Heartbreak");
      open404author();
    }
    else {openPost(json.author, post_id);}
  });
} can we avoid ever actually having to do this???*/

var openPost = function (author, post_id, index) { //individual post on an author page
  openAuthorPanel(author, function () {
    // hide all posts
    var children = $(author+'-posts').childNodes;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.add('removed');
    }
    // open the One
    if (post_id) {                                // by ID
      simulatePageLoad("~/"+post_id, author);
      if ($('author-'+post_id)) {
        $('author-'+post_id).classList.remove('removed');
      } else {
        open404post(author);
      }
    } else if (index) {                          // by index
      simulatePageLoad(author+"/"+index, author);
      if (!isNumeric(index) || index >= children.length || index<0) {
        open404post(author);
      } else {
        children[children.length -1 - index].classList.remove('removed');
      }
    }
    // set title
    $(author+'-panel-title').onclick = function (event) {
      event.preventDefault();
      openAuthorPanel(author);
    }
    $(author+'-panel-title').setAttribute('href', "/"+author);
    $(author+'-panel-title').classList.add("clicky");
    $(author+'-panel-title').classList.remove("not-special");
  });
}

var open404post = function (author) {
  if ($(author+'-panel-404')) {$(author+'-panel-404').classList.remove('removed');}
  else {
    var e404 = document.createElement("h2")
    e404.setAttribute('id', author+'-panel-404');
    e404.innerHTML = "<c>not even a single thing</c>";
    $(author+'-panel').appendChild(e404);
  }
}

var submitPost = function (remove) { //also handles editing and deleting
  if (remove) {
    verify("you sure you want me should delete it?", null, null, function (result) {
      loading();
      if (!result) {return;}
      else {
        var data = {text:null, tags:null, remove:remove}
        ajaxCall("/", 'POST', data, function(json) {
          updatePendingPost("", {}, remove);
        });
      }
    });
  } else {
    var text = $('postEditor').value;
    var tags = $('tag-input').value;
    if (text === "") {
      hideWriter('post');
      return;
    }
    loading();
    var data = {text:text, remove:remove, tags:tags}
    ajaxCall("/", 'POST', data, function(json) {
      updatePendingPost(json.text, json.tags, remove)
    });
  }
}

var updatePendingPost = function (newText, newTags, remove) {
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
  var tags = "";
  for (var tag in newTags) {
    if (newTags.hasOwnProperty(tag)) {
      tags += tag + ", ";
    }
  }
  $('tag-input').value = tags;
  $('pending-post').innerHTML = appendTags(convertText(newText, 'pending'), newTags);
  $('postEditor').value = prepTextForEditor(newText);
  hideWriter('post');
  loading(true);
}

var appendTags = function (postString, tagRef, author) {
  var tags = "";
  for (var tag in tagRef) {
    if (tagRef.hasOwnProperty(tag)) {
      if (author) {
        tags += '<a onclick="filterAuthorByTag(`'+author+'`,`'+tag+
          '`); return false;" href="'+author+'/~tagged/'+tag+'">'+tag+'</a>, ';
      } else {
        tags += '<a onclick="loadPosts(0,`'+tag+
        '`); return false;" href="/~tagged/'+tag+'">'+tag+'</a>, ';
      }
    }
  }
  if (tags.substr(tags.length-2, tags.length) === ", ") {
    tags = tags.substr(0,tags.length-2);
  }
  if (tags !== "") {return postString +"<br><br><hr><i>"+ tags+"</i>";}
  else {return postString;}
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

var filterAuthorByTag = function (author, tag) {
  openAuthorPanel(author, function () {
    // hide all posts
    var children = $(author+'-posts').childNodes;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.add('removed');
    }
    // open the so tagged
    var none = true;
    var obj = glo.authors[author];
    for (var post in obj) {
      if (obj.hasOwnProperty(post)) {
        if (obj[post]) {
          if (obj[post][tag]) {
            none = false;
            $('author-'+post).classList.remove('removed');
          }
        }
      }
    }
    if (none) {open404post(author);}
    simulatePageLoad(author+"/~tagged/"+tag, author);
    $(author+'-tag-nav').classList.remove('removed');
    $(author+'-tag-text').innerHTML = 'posts tagged "'+tag+'"';
  });
}

var prepTextForEditor = function (text) {
  // we usually want br tags and nbsp codes in the text, so we save it that way
  // and convert it for the one place we don't want that, editors
  text = text.replace(/\/cut>/g, '/cut><br>');
  text = text.replace(/\/li>/g, '/li><br>');
  text = text.replace(/\/quote>/g, '/quote><br>');
  text = text.replace(/\/r>/g, '/r><br>');
  text = text.replace(/\/c>/g, '/c><br>');
  text = text.replace(/\/l>/g, '/l><br>');
  text = text.replace(/\/ol>/g, '/ol><br>');
  text = text.replace(/\/ul>/g, '/ul><br>');

  var preTagLineBreakRecurse = function (pos, tag) {
    var next = text.substr(pos).search(tag);
    if (next !== -1) {
      pos = pos+next;
      if (text.substr(pos-4, 4) !== '<br>') {
        text = text.substr(0,pos)+'<br>'+text.substr(pos);
      }
      preTagLineBreakRecurse(pos+1, tag);
    }
  }
  var tagArr = [/<ul>/, /<ol>/, /<li>/, /<quote>/, /<r>/, /<c>/, /<l>/, /<img/];
  for (var i = 0; i < tagArr.length; i++) {
    preTagLineBreakRecurse(0, tagArr[i]);
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
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  prompt({
    label: "image url:",
    value:"https://i.imgur.com/hDEXSt7.jpg",
    placeholder: "hiss",
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
    placeholder: "",
    callback: function(cutText) {
      if (cutText != null) {
        area.value = y.slice(0, a)+'<cut>'+cutText+'</cut>'+y.slice(b);
        var bump = a+cutText.length+11;
        setCursorPosition(area, bump, bump);
      }
    }
  });
}
var insertQuote = function (src) {
  var area = $(src+'Editor');
  var x = getCursorPosition(area);
  var a = x.start;
  var b = x.end;
  var y = area.value;
  var quoteText;
  if (a !== b) {quoteText = y.substr(a,b-a)}
  prompt({
    label:"quote text:",
    value:quoteText,
    placeholder: "nitwit blubber oddment tweak",
    callback: function(quoteText) {
      if (quoteText !== null) {
        prompt({
          label: "source text(optional):",
          placeholder: "dumbledore",
          callback: function(sourceText) {
            if (sourceText !== null && sourceText !== "") {
              prompt({
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
                    area.value = y.slice(0, a)+'<quote>'+quoteText+'<r><a href="'+sourceLink+'">-'+sourceText+'</a></r></quote>'+y.slice(b);
                    var bump = a+quoteText.length+sourceLink.length+sourceText.length+38;
                    setCursorPosition(area, bump, bump);
                  } else {
                    area.value = y.slice(0, a)+'<quote>'+quoteText+'<r>-'+sourceText+'</r></quote>'+y.slice(b);
                    var bump = a+quoteText.length+sourceText.length+23;
                    setCursorPosition(area, bump, bump);
                  }
                }
              });
            } else {
              area.value = y.slice(0, a)+'<quote>'+quoteText+'</quote>'+y.slice(b);
              var bump = a+quoteText.length+15;
              setCursorPosition(area, bump, bump);
            }
          }
        });
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
      (function (name) {
        $("thread-title").onclick = function(event){
          event.preventDefault();
          openAuthorPanel(name);
        }
      })(glo.threads[i].name);
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
    var text = $('messageEditor').value;
    if (text === "") {return;}
    if (!glo.threads[i].key) {return alert("you cannot message the person you are trying to message, you shouldn't have this option at all, sorry this is a bug please note all details and tell staff sorry");}
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
    (function (name) {
      authorPicBox.onclick = function(event){
        event.preventDefault();
        openAuthorPanel(name);
      }
    })(glo.threads[i].name);
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
          return alert("huh!? that's a different account...", "switcheroo!", function () {location.reload();});
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
  var y = pool.passwordValidate(data.password);
  if (x) {alert(x);}
  else if (y) {alert(y);}
  else {
    if (inOrUp === 'in') {
      var url = '/login';
    } else {
      var url = '/register';
      data.email = $('email-input').value;
      //data.secretCode = $('secret-code').value;
      if (data.password !== $('pass-input-two').value) {
        alert('passwords are not the same');
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
        ajaxCall('/keys', 'POST', keys, function(json) {
          parseUserData(json.payload);
          if (callback) {callback(json.payload);}
        });
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
  loadPosts(1);
  if (glo.pending) {updatePendingPost(glo.pending.body, glo.pending.tags);}
  populateThreadlist();
  setAppearance();
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
    //keys are created at sign in, this, force out people who are already in
    //  with a persistent login cookie, such that they will have to sign in and make keys
    if (json.needKeys) {return signOut();}
    else {
      parseUserData(json.payload);
      if (callback) {callback();}
    }
  });
}

var togglePassTextVisibility = function (btn, elemArr) {
  if (btn.innerHTML === 'show password') {
    btn.innerHTML = 'hide password';
    for (var i = 0; i < elemArr.length; i++) {$(elemArr[i]).type = 'text';}
  } else {
    btn.innerHTML = 'show password'
    for (var i = 0; i < elemArr.length; i++) {$(elemArr[i]).type = 'password';}
  }
}

var verifyEmailExplain = function () {
  alert(`schlaugh stores your email in <a href="https://en.wikipedia.org/wiki/Cryptographic_hash_function#Password_verification" target="_blank">"hashed"</a> form, meaning we can't just tell you what email address you have on file with us. But you can input what you think it is and we can tell you if that's right. And it's good to have a good email address stored with us in case you need to reset your password. But please don't need to reset your password.`)
}

var verifyEmail = function () {
  loading();
  ajaxCall('/verifyEmail', 'POST', {email:$("email-verify-input").value}, function(json) {
    if (json.match) {
      alert('a perfect match!<br><br>in the event of a lost password, "'+$("email-verify-input").value+'" is your recovery email', "aye, aye, captain!");
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
                  alert('congratulations!<br><br>in the event of a lost password, "'+json.email+'" is your recovery email')
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
    alert("empty field");
  } else if ($("password-change1").value !== $("password-change2").value) {
    alert("must be same same");
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
            return alert("incorrect current password");
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
    alert('your password has been changed<br><br>schlaugh will now reload' ,"huzzah", function () {
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
    alert("invalid input");
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
  if ($("username-recovery").value === "") {return alert("empty input!")}
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
    } else {return alert("password fields are not identical!");}
  } else if ($("password-recovery1").value !== "" || $("password-recovery2").value !== "") {
    return alert("password fields are not identical!");
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
        alert(`the inputted username does not match the code for which it was generated<br><br>attempt 5 of 5<br><br>try a new code?`, "ok", function () {
          switchPanel('lost-panel');
          simulatePageLoad();
        });
      } else {
        alert("the inputted username does not match the code for which it was generated<br>please try again<br><br>attempt "+json.attempt+" of 5");
      }
    }
  });
}
