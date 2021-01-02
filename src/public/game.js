"use strict";

var gameRef = {
  tileHeight:174,
  tileWidth:200,
}

var openSchlaunquerPanel = function (game_id) {
  $("panel-buttons-wrapper").classList.add("removed");
  $('schlaunquer-exposition').innerHTML = prepTextForRender(exposition, "schlaunquer-exposition");
  switchPanel("schlaunquer-panel");
  simulatePageLoad('~schlaunquer', 'schlaunquer', 'https://i.imgur.com/i4Py62f.png');
  // load menu page
  if (game_id) {loadGame(game_id);}
  else {refreshMenu();}
}

var refreshMenu = function (game_id) {
  if (glo.username) {
    $('games-list').classList.remove('removed');
    $('sign-in-to-schlaunquer').classList.add('removed');
    $("start-new-schlaunquer-game").classList.remove('removed');
    //
    var matchTypes = ['active','pending','finished'];
    for (var i = 0; i < matchTypes.length; i++) {
      destroyAllChildrenOfElement($(matchTypes[i]+'-game-list'));
      var matches = _npa(['glo','games','schlaunquer', matchTypes[i]]);
      var noMatch = true;
      for (var match in matches) {if (matches.hasOwnProperty(match)) {
        noMatch = false;
        var listingWrapper = document.createElement("li");
        var listing = document.createElement("a");
        if (!game_id || game_id !== match) {
          listing.innerHTML = match;
          listing.setAttribute('href', "/~schlaunquer/"+match);
          listing.setAttribute('class', "special clicky game-listing");
          (function (match) {
            listing.onclick = function(event){
              modKeyCheck(event, function(){
                loadGame(match)
              });
            }
          })(match);
        } else {
          listing.innerHTML = match+' (this one)';
          listing.setAttribute('class', "game-listing");
        }
        listingWrapper.appendChild(listing);
        $(matchTypes[i]+'-game-list').appendChild(listingWrapper);
      }}
      if (noMatch) {
        var listing = document.createElement("div");
        listing.innerHTML = "(empty)";
        $(matchTypes[i]+'-game-list').appendChild(listing);
      }
    }
  } else {
    $('games-list').classList.add('removed');
    $("start-new-schlaunquer-game").classList.add('removed');
    $('sign-in-to-schlaunquer').classList.remove('removed');
  }
}

var showGameCreationMenu = function (close) {
  if (close) {
    $("start-new-schlaunquer-game").classList.remove('removed');
    $("schlaunquer-game-creation-menu").classList.add('removed');
  } else {
    $("schlaunquer-game-creation-menu").classList.remove('removed');
    $("start-new-schlaunquer-game").classList.add('removed');
    $('schlaunquer-game-info').classList.add('removed');
    $('schlaunquer-board-wrapper').classList.add('removed');
    simulatePageLoad('~schlaunquer', 'schlaunquer', 'https://i.imgur.com/i4Py62f.png');
    refreshMenu();
  }
}

var gameCreationCall = function () {
  loading();
  var params = {
  players: Number($('schlaunquer-game-creation-players').value),
  unitCap: Number($('schlaunquer-game-creation-unitCap').value),
  spawnValue: Number($('schlaunquer-game-creation-spawnValue').value),
  }
  if ($('schlaunquer-game-creation-opaqueEnemyUnits').value === "true") {
    params.opaqueEnemyUnits = true;
  }
  ajaxCall('/~initSchlaunquerMatch', 'POST', params, function(json) {
    loading(true);
    showGameCreationMenu(true);
    _npa(['glo','games','schlaunquer','pending', json.game_id], true);
    loadGame(json.game_id);
  });
}

var joinMatch = function (leave) {
  loading()
  ajaxCall('/~joinSchlaunquerMatch', 'POST', {game_id:gameRef.game_id, remove:leave}, function(json) {
    loading(true);
    if (leave) {
      delete glo.games.schlaunquer.pending[gameRef.game_id];
      $('schlaunquer-game-info').classList.add('removed');
      simulatePageLoad('~schlaunquer', 'schlaunquer', 'https://i.imgur.com/i4Py62f.png');
      refreshMenu();
    } else {
      _npa(['glo','games','schlaunquer','pending', gameRef.game_id], true);
      loadGame(gameRef.game_id);
    }
  });
}

var loadGame = function (game_id) {
  loading();
  ajaxCall('/~getSchlaunquer', 'POST', {game_id:game_id}, function(json) {
    simulatePageLoad('~schlaunquer/'+game_id, 'schlaunquer', 'https://i.imgur.com/i4Py62f.png');
    loading(true);
    showGameCreationMenu(true);
    gameRef.game_id = game_id;
    if (!json.gameState || json.gameState !== 'pending') {
      setUpGameBoards(json);
    } else {
      $('schlaunquer-board-wrapper').classList.add('removed');
    }
    setUpGameInfo(json);
    refreshMenu(game_id);
  });
}

var setUpGameInfo = function (data) {
  //
  $('schlaunquer-match-link').value = `schlaugh.com/~schlaunquer/`+data._id;
  $('schlaunquer-match-unitCap').innerHTML = data.unitCap;
  $('schlaunquer-match-spawnValue').innerHTML = data.spawnValue;
  if (data.opaqueEnemyUnits) {
    $('schlaunquer-match-opaqueEnemyUnits').innerHTML = "true";
  } else {
    $('schlaunquer-match-opaqueEnemyUnits').innerHTML = "false";
  }
  //
  destroyAllChildrenOfElement($('schlaunquer-game-player-list'));
  var playerCount = 0;
  for (var player in data.players) {if (data.players.hasOwnProperty(player)) {
    playerCount++;
    // put in the iconURI

    var listing = document.createElement("li");
    listing.setAttribute('class', "game-listing");
    // make these links to the users


    listing.innerHTML = data.players[player].username;
    $('schlaunquer-game-player-list').appendChild(listing);
  }}
  for (var i = playerCount; i < data.totalPlayers; i++) {
    var listing = document.createElement("li");
    listing.setAttribute('class', "game-listing");
    listing.innerHTML = "(open)";
    $('schlaunquer-game-player-list').appendChild(listing);
  }
  //
  if (data.gameState === 'pending') {
    $("join-schlaunquer-game-info").classList.remove('removed');
    $('schlaunquer-application-pending').classList.add('removed');
    if (glo.username) {
      $('sign-in-to-join').classList.add('removed');
      if (_npa(['glo','games','schlaunquer','pending',data._id])) {
        if (!data.players[glo.userID]) {
          $('schlaunquer-application-pending').classList.remove('removed');
        }
        $('join-schlaunquer-game').classList.add('removed');
        $('leave-schlaunquer-game').classList.remove('removed');
      } else {
        $('join-schlaunquer-game').classList.remove('removed');
        $('leave-schlaunquer-game').classList.add('removed');
      }
    } else {
      $('join-schlaunquer-game').classList.add('removed');
      $('leave-schlaunquer-game').classList.add('removed');
      $('sign-in-to-join').classList.remove('removed');
    }
  } else {
    $("join-schlaunquer-game-info").classList.add('removed');
  }
  //
  $('schlaunquer-game-info').classList.remove('removed');
}

var setUpGameBoards = function (json) {
  if (json.notFound) { return uiAlert('404<br><br>game not found');}
  $('schlaunquer-board-wrapper').classList.remove('removed');
  //
  gameRef.radius = json.radius;
  gameRef.startDate = json.startDate;
  gameRef.victor = json.victor;
  gameRef.forfeitures = json.forfeitures;
  var height = ((json.radius*2)-1)*gameRef.tileHeight;
  var width = gameRef.tileWidth*(1 +(1.5*((json.radius-1))));
  gameRef.originX = (width/2) - (.5*gameRef.tileWidth);
  gameRef.originY = (json.radius-1)*gameRef.tileHeight;
  //
  gameRef.players = json.players;
  gameRef.dates = json.dates;
  var dayCount = 0;
  destroyAllChildrenOfElement($('board-bucket'));
  var latestDate = "0";
  for (var date in gameRef.dates) { if (gameRef.dates.hasOwnProperty(date)) {
    for (var spot in gameRef.dates[date]) { if (gameRef.dates[date].hasOwnProperty(spot)) {
      if (gameRef.dates[date][spot].ownerID) {
        gameRef.dates[date][spot].color = json.players[gameRef.dates[date][spot].ownerID].color;
      }
    }}
    dayCount++;
    if (date > latestDate) {latestDate = date;}
  }}
  gameRef.currentBoardDate = latestDate;
  //
  for (var i = 0; i < dayCount; i++) {    // render the boards in reverse order
    var date = calcDateByOffest(latestDate, -i);
    if (gameRef.dates[date]) {
      var board = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      board.setAttribute("viewBox", "-7 -7 "+(width+14)+" "+(height+14));   // 14 is margarine
      board.setAttribute("id", date+"-board");
      board.setAttribute("preserveAspectRatio", "none");
      $('board-bucket').appendChild(board);
      board.classList.add("gameBoard");
      var animationDelay = 0;
      if (i === 0) {
        animationDelay = 30;
      } else {
        board.classList.add("removed");
      }
      // put the round label on the board
      var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.innerHTML = "day "+((dayCount-i)-1);
      var toolTip = document.createElementNS("http://www.w3.org/2000/svg", "title");
      toolTip.innerHTML = date;
      label.setAttribute('x', '10px');
      label.setAttribute('y', '64px');
      label.classList.add('score-label');
      label.appendChild(toolTip);
      board.appendChild(label);
      renderTiles(animationDelay, date);
    } else {
      dayCount++
    }
  }
  changeBoardRound(0); //this is just to hide/display the date arrows
  setTimeout(function () {window.scroll(0, 50);}, 100);
}

var renderTiles = function (delay, date) {
  if (!delay) {delay = 0;}
  var oldTiles = getRange([0,0], gameRef.radius);
  var tiles = [];
  while (oldTiles.length > 0) {
    var j = Math.floor(Math.random()*oldTiles.length);
    tiles.push(oldTiles[j]);
    oldTiles.splice(j,1);
  }

  for (var i = 0; i < tiles.length; i++) {
    (function (i) {
      setTimeout(function () {
        createTile(tiles[i], date);
      }, delay*i);
    })(i);
  }
  // highlight a player's spots
  if (glo.userID && gameRef.players[glo.userID]) {
    setTimeout(function () {
      for (var spot in gameRef.dates[date]) {if (gameRef.dates[date].hasOwnProperty(spot)) {
        if (gameRef.dates[date][spot].ownerID === glo.userID) {
          highlightTile(spot, date);
          // flag player as "active" if they have spots on the board today
          if (date === pool.getCurDate()) {
            gameRef.active = true;
          }
        }
      }}
      setForfeitButton();
    }, (i)*delay);
  }
}

var getRange = function (spot, radius) {
  var arr = [];
  for (var i = -(radius-1); i < radius; i++) {
    for (var j = -(radius-1); j < radius; j++) {
      if (Math.abs(i+j) < radius) {
        arr.push([
          spot[0] + i,
          spot[1] + j,
        ]);
      }
    }
  }
  return arr;
}

var createTile = function (coord, date) {
  var wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  var tile = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  tile.setAttribute('points', "200,87 150,0 50,0 0,87 50,174 150,174");
  //
  var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  if (gameRef.dates[date][coord]) {
    wrapper.onclick = function() {tileClick(coord, date);}
    wrapper.classList.add('clicky');
    gameRef.dates[date][coord].elem = wrapper;
    if (gameRef.dates[date][coord].score) {label.innerHTML = formatScore(gameRef.dates[date][coord].score);}
    if (gameRef.dates[date][coord].color) {tile.classList.add(gameRef.dates[date][coord].color);}
  } else {
    gameRef.dates[date][coord] = {ownerID:null}
  }
  label.setAttribute('x', .5*gameRef.tileWidth+'px');
  label.setAttribute('y', .5*gameRef.tileHeight+'px');
  label.setAttribute('dominant-baseline', "middle");
  label.setAttribute('text-anchor', "middle");
  label.classList.add('score-label');
  //
  var xPix = -(coord[0]*.75*gameRef.tileWidth) + gameRef.originX;
  var yPix = -(coord[1]*gameRef.tileHeight + coord[0]*.5*gameRef.tileHeight) + gameRef.originY;
  wrapper.setAttribute('transform', "translate("+xPix+","+yPix+")");
  //
  wrapper.appendChild(tile);
  wrapper.appendChild(label);
  $(date+"-board").appendChild(wrapper);
  setMoveLabels(coord, date);
}

var formatScore = function (score) {
  var output = Number(score);
  if (!Number.isInteger(output) || output < 10000) {return score;}
  if (output < 100000) {
    return String(output).substr(0,2) + "k";
  } else if (output < 1000000) {
    return String(output).substr(0,3) + "k";
  } else if (output < 10000000) {
    return (String(Math.round(output/10000)/100)).substr(0,4) + "m";
  } else if (output < 100000000) {
    return String(output).substr(0,2) + "m";
  } else if (output < 1000000000) {
    return String(output).substr(0,3) + "m";
  } else if (output < 10000000000) {
    return String(output).substr(0,1) + "b";
  } else if (output < 100000000000) {
    return String(output).substr(0,2) + "b";
  } else if (output < 1000000000000) {
    return String(output).substr(0,3) + "b";
  } else {
    return String(output).substr(0,1) + "t";
  }
}

var tileClick = function (coord, date) {
  blackBacking();
  $("pop-up-backing").onclick = function(){closeTilePopUp();}
  var spot = gameRef.dates[date][coord];
  if (spot.ownerID === glo.userID && date === pool.getCurDate() && !gameRef.victor) {  // the user owns this spot
    gameRef.activeTile = {score: spot.score};
    $('tile-options-submit').onclick = function () {sendMove(coord, date);}
    var score = spot.score;               // subtract out the already allocated points
    for (var move in spot.pendingMoves) {
      if (spot.pendingMoves.hasOwnProperty(move)) {
        score = score - spot.pendingMoves[move];
      }
    }

    gameRef.curMovVals = {}
    for (var move in moveRef) {           // show/hide inputs if they are valid directions or not for that spot
      if (moveRef.hasOwnProperty(move)) {
        if (gameRef.dates[date][[coord[0] + moveRef[move][0], coord[1] + moveRef[move][1]]]) {  // is the adjacent spot a valid spot on the map?
          $(move+"-move-input").classList.remove('hidden');
          if (spot.pendingMoves && spot.pendingMoves[move]) {$(move+"-move-input").value = spot.pendingMoves[move];}
          else {$(move+"-move-input").value = 0;}
          gameRef.curMovVals[move] = $(move+"-move-input").value;
          if (score > 9999) {
            $(move+"-move-input").classList.add('game-move-input-wide');
          } else {
            $(move+"-move-input").classList.remove('game-move-input-wide');
          }
        } else {
          $(move+"-move-input").classList.add('hidden');
          $(move+"-move-input").value = "";
        }
      }
    }
    $('tile-options-current-score').innerHTML = score;
    $("tile-options").classList.remove("hidden");
  } else {
    $("tile-info-text").innerHTML = 'spot owned by '+gameRef.players[spot.ownerID].username;
    if (gameRef.players[spot.ownerID].iconURI) {
      $('tile-info-pic').setAttribute('src', gameRef.players[spot.ownerID].iconURI);
      $('tile-info-pic').classList.remove('removed')
    } else {
      $('tile-info-pic').classList.add('removed')
    }
    $("tile-info").classList.remove("hidden");
  }
}
var closeTilePopUp = function () {
  $("tile-options").classList.add("hidden");
  $("tile-info").classList.add("hidden");
  gameRef.activeTile = null;
  blackBacking(true);
}

var moveRef = {
  w:[0, 1],           //w
  e:[-1, 1],          //e
  d:[-1, 0],          //d
  s:[0, -1],          //s
  a:[1, -1],          //a
  q:[1, 0],           //q
}

var moveInputChange = function (event, dir) {
  var newVal = $(dir+"-move-input").value
  if (!Number.isInteger(Number(newVal))) {  // reset
    $("w-move-input").value = gameRef.curMovVals['w'];
    $("e-move-input").value = gameRef.curMovVals['e'];
    $("d-move-input").value = gameRef.curMovVals['d'];
    $("s-move-input").value = gameRef.curMovVals['s'];
    $("a-move-input").value = gameRef.curMovVals['a'];
    $("q-move-input").value = gameRef.curMovVals['q'];
  } else {
    var score = gameRef.activeTile.score;
    var mag = Math.min(Math.floor(Number(newVal)), score);
    $("w-move-input").value = 0;
    $("e-move-input").value = 0;
    $("d-move-input").value = 0;
    $("s-move-input").value = 0;
    $("a-move-input").value = 0;
    $("q-move-input").value = 0;
    $(dir+"-move-input").value = mag;
    $('tile-options-current-score').innerHTML = score-mag;
    gameRef.curMovVals = getMoveVals();
  }
}

var getMoveVals = function () {
  var moves = {
    w: $("w-move-input").value,
    e: $("e-move-input").value,
    d: $("d-move-input").value,
    s: $("s-move-input").value,
    a: $("a-move-input").value,
    q: $("q-move-input").value,
  }
  for (var move in moves) {
    if (moves.hasOwnProperty(move)) {
      if (moves[move] === "") {
        delete moves[move];
      }
    }
  }
  return moves;
}

var sendMove = function (coord, date) {
  closeTilePopUp();
  var moves = getMoveVals();
  ajaxCall('/~moveSchlaunquer', 'POST', {coord:coord, moves:moves, game_id:gameRef.game_id}, function(json) {
    gameRef.dates[date][coord].pendingMoves = moves;
    setMoveLabels(coord, date);
  });
}

var forfeit = function (dir) {
  if (dir) {dir = pool.getCurDate();}
  ajaxCall('/~moveSchlaunquer', 'POST', {forfeit:dir, game_id:gameRef.game_id}, function(json) {
    if (dir) {  // forfeiting
      uiAlert(`🎵sad trombone🎵<br><br>at the schlaupdate, all of your units will expire<br><br>you have until then to change your mind`,'understood');
    } else {    // de-forfeiting
      uiAlert(`get'cha get'cha get'cha get'cha head in the game`);
    }
    gameRef.players[glo.userID].forfeit = dir;
    setForfeitButton();
  });
}

var setForfeitButton = function () {
  if (!gameRef.victor && gameRef.active && glo.userID && gameRef.players[glo.userID]) {
    if (!gameRef.players[glo.userID].forfeit) {
      $('forfeit-button').innerHTML = "give up";
      $('forfeit-button').onclick = function () {forfeit(true)}
      $('forfeit-button').classList.remove('hidden');
      return;
    } else if (gameRef.players[glo.userID].forfeit === pool.getCurDate()) {
      $('forfeit-button').innerHTML = "un-give up";
      $('forfeit-button').onclick = function () {forfeit(false)}
      $('forfeit-button').classList.remove('hidden');
      return;
    }
  }
  $('forfeit-button').classList.add('hidden');
}

var setMoveLabels = function (coord, date) {
  var map = gameRef.dates[date][coord];
  if (map.moveLabels && map.moveLabels.length) {
    for (var i = 0; i < map.moveLabels.length; i++) {
      removeElement(map.moveLabels[i]);
    }
  }
  map.moveLabels = [];

  var moves = map.pendingMoves;
  for (var move in moves) {
    if (moves.hasOwnProperty(move) && Number(moves[move]) !== 0) {
      var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.innerHTML = formatScore(moves[move]);
      label.setAttribute('x', mLabPos[move].x*gameRef.tileWidth+'px');
      label.setAttribute('y', mLabPos[move].y*gameRef.tileHeight+'px');
      label.setAttribute('dominant-baseline', "middle");
      label.setAttribute('text-anchor', "middle");
      label.classList.add('move-label');
      map.elem.appendChild(label);
      map.moveLabels.push(label)
    }
  }
}

var mLabPos = {
  w:{x:.5 ,y:.17,},
  e:{x:.76 ,y:.33,},
  d:{x:.76 ,y:.7,},
  s:{x:.5 ,y:.86,},
  a:{x:.23 ,y:.7,},
  q:{x:.24 ,y:.33,},
}

var highlightTile = function (coord, date) {
  var tile = gameRef.dates[date][coord].elem;
  tile.childNodes[0].classList.add('tile-highlight');
  tile.parentElement.appendChild(tile);
}

var changeBoardRound = function (offset) {
  var newDate = calcDateByOffest(gameRef.currentBoardDate, offset);

  // disable/enabel left/right buttons
  var prevDate = calcDateByOffest(newDate, -1);
  var nextDate = calcDateByOffest(newDate, 1);
  if ($(prevDate+"-board")) {
    $('game-round-back').classList.remove('removed');
  } else {
    $('game-round-back').classList.add('removed');
  }
  if ($(nextDate+"-board")) {
    $('game-round-forward').classList.remove('removed');
  } else {                      // on the latest day
    $('game-round-forward').classList.add('removed');
    if (gameRef.victor) {
      showVictory();
    }
  }
  $(gameRef.currentBoardDate+"-board").classList.add('removed');
  gameRef.currentBoardDate = newDate;
  $(gameRef.currentBoardDate+"-board").classList.remove('removed');
  // forfeiture notification
  if (gameRef.forfeitures && gameRef.forfeitures[newDate]) {
    var arr = [];
    for (var userID in gameRef.forfeitures[newDate]) {if (gameRef.forfeitures[newDate].hasOwnProperty(userID)) {
      arr.push(gameRef.players[userID].username);
    }}
    if (arr.length === 1) {
      var string = arr[0]+' has forfeited';
    } else if (arr.length === 2) {
      var string = arr[0]+" and "+arr[1]+" have forfeited";
    } else if (arr.length > 2) {
      var string = arr[0];
      for (var i = 1; i < arr.length-1; i++) {
        string = string +", "+arr[i];
      }
      string = string + ", and "+arr[arr.length-1]+" have forfeited";
    }
    uiAlert(string)
  }
}

var showVictory = function () {
  blackBacking();
  $("pop-up-backing").onclick = function(){closeVictory();}
  if (gameRef.victor === true || typeof gameRef.victor !== "string") {
    $("schlaunquer-victor-text").innerHTML = 'NOBODY WINS'
    $('schlaunquer-victor-pic').classList.add('removed');
  } else {
    $("schlaunquer-victor-text").innerHTML = 'ALL HAIL VICTORIOUS SCHLAUNQUEROR<br>'+(gameRef.players[gameRef.victor].username).toUpperCase();
    if (gameRef.players[gameRef.victor].iconURI) {
      $('schlaunquer-victor-pic').setAttribute('src', gameRef.players[gameRef.victor].iconURI);
      $('schlaunquer-victor-pic').classList.remove('removed');
    } else {
      $('schlaunquer-victor-pic').classList.add('removed');
    }
  }
  $("schlaunquer-victor").classList.remove("hidden");
}

var closeVictory = function () {
  $("schlaunquer-victor").classList.add("hidden");
  blackBacking(true);
}

var tilePopulationCapExplain = function () {
  uiAlert(`'0' indicates no limit`);
}
var spawnValueExplain = function () {
  uiAlert(`this is also the number of units that each of each player's initial 3 tiles will have to start the game`)
}

  var exposition = `<u>Objective:</u><br>Be the only player left with any units on the board <note linkText="">(it might take a very long time for someone to achieve such a complete victory. I don't know. This is the first playtest. The winning condition may be revised to be whoever holds the most tiles or units after round X. If that change is made, I'll give plenty of notice and it will only happen if there's a consensus of the players to do it.)<br></note><br><br><u>Mechanics:</u><br>You control the movement of your Units. You can schedule movements at any time during the day. All the action takes place at the schlaupdate. Your scheduled moves are secret until the schlaupdate.<br><br>Units live on Tiles. A tile containing at least one of your units is Occupied by you. The color of a tile indicates which player currently occupies it.<br><br>A tile may hold a maximum of 17 units<br><br><i>The number of units on a tile is <b>secret</b>, displayed only to the occupying player</i><br><br><u>The Schlaupdate:</u><br>at the strike of Schlaupdate, the following occurs, in order:<br><ol><li>Migration</li><li>War</li><li>Entropy</li><li>Creation</li></ol><br><u>Migration</u><br>Every unit, on every turn, can either Move or Stay. You may pick <i>one</i> of a tile's adjacent tiles to move units to, and can move some or all units, leaving the rest on their original tile.<br><br>By default, all units Stay. They only Move if you assign it.<br><br>If you move more than 17 units to a tile, then at this time the extra units will be destroyed, leaving exactly 17.<br><br><u>War</u><br>Units on the same Tile as another player's Units will fight. Units on opposing sides destroy each other one-for-one. I.e., if 7 red and 10 blue units occupy the same Tile, then after the battle the tile will be held by Blue with 3 remaining units. Ties result in all units destroyed and no one occupying the Tile.<br><br>If more than 2 players have units on a tile, then units from all players simultaneously destroy each other in the same manner. E.g., if red has 6 units in a tile , and all 5 other players also each have 5 units in the tile, then only 1 red unit will remain.<br><br><u>Entropy</u><br>1 unit is subtracted from every occupied tile on the board<br><br><u>Creation</u><br>If a tile is: <br><ol><li>unoccupied</li><li>adjacent to <i>exactly</i> 4(four) tiles that are occupied by the same player</li></ol>Then: 7(seven) new units will spawn on the tile, belonging to the player occupying the four(4) adjacent tiles<br><br><note linkText="">an alternate metaphor, which may or may not make the gameplay more or less easy to grok:<br>is to think of the units instead as health, belonging to a single unit<br>you spawn in a new unit that starts with a default HP of 7<br>units can fuse with each other to combine HP, up to a max of 17<br>a unit can un-fuse, splitting off part of itself to live on an adjacent tile<br>(but can only perform one such split at a time)<br>you can see that a tile contains an enemy unit, but don't know their HP until you start fighting them<br></note><br><hr>i am probably forgetting things, please ask questions. You can do so by messaging the <a href="/schlaunquer">schlaunquer account</a>, or tagging a post with <code>schlaunquer</code><br><br>`

/* rotation
var rotateGrid = function () {
  var tiles = getRange([0,0], gameRef.radius);
  var newMap = {}
  for (var i = 0; i < tiles.length; i++) {
    newMap[rotateTile(1, tiles[i])] = gameRef.map[tiles[i]];
  }
  gameRef.map = newMap;
  renderTiles();
}
var rotateTile = function (amnt, coords) {
  amnt = Math.floor(amnt)%6;
  var x = -(coords[1]);
  var y = coords[0] + coords[1];
  if (amnt === 1) {return [x,y];}
  else {return rotateTile(amnt-1, [x,y]);}
}
*/
