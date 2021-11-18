"use strict";

var gameRef = {
  tileHeight:174,
  tileWidth:200,
}

var openSchlaunquerPanel = function (game_id, num) {
  $("panel-buttons-wrapper").classList.add("removed");
  $('schlaunquer-exposition').innerHTML = prepTextForRender(exposition, "schlaunquer-exposition").string;
  switchPanel("schlaunquer-panel");
  // load menu page
  if (game_id) {loadGame(game_id, num);}
  else {
    simulatePageLoad('~schlaunquer', 'schlaunquer', 'https://i.imgur.com/i4Py62f.png');
    refreshMenu();
  }
}

var refreshMenu = function (game_id) {
  if (glo.username) {
    $('games-list').classList.remove('removed');
    $('sign-in-to-schlaunquer').classList.add('removed');
    $("start-new-schlaunquer-game").classList.remove('removed');
    //
    var matchTypes = ['active','pending','finished','bookmarked'];
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
  unitCap: 17,
  spawnValue: 10,
  opaqueEnemyUnits: false,
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

var loadGame = function (game_id, num) {
  loading();
  ajaxCall('/~getSchlaunquer', 'POST', {game_id:game_id}, function(json) {
    loading(true);
    showGameCreationMenu(true);
    gameRef.game_id = game_id;
    if (!json.gameState || json.gameState !== 'pending') {
      simulatePageLoad('~schlaunquer/'+game_id+'/', 'schlaunquer', 'https://i.imgur.com/i4Py62f.png', true);
      setUpGameBoards(json, num);
    } else {
      $('game-status').innerHTML = "PENDING";
      simulatePageLoad('~schlaunquer/'+game_id+'/', 'schlaunquer', 'https://i.imgur.com/i4Py62f.png');
      $('schlaunquer-board-wrapper').classList.add('removed');
      updateScoreBoard();
    }
    setUpGameInfo(json);
    refreshMenu(game_id);
  });
}

var setUpGameInfo = function (data) {
  if (data.notFound) { return;}
  //
  $('schlaunquer-match-link').value = `schlaugh.com/~schlaunquer/`+data._id;
  $('schlaunquer-match-unitCap').innerHTML = data.unitCap;
  $('schlaunquer-match-spawnValue').innerHTML = data.spawnValue;
  if (data.opaqueEnemyUnits) {
    $('schlaunquer-match-opaqueEnemyUnits').innerHTML = "true";
  } else {
    $('schlaunquer-match-opaqueEnemyUnits').innerHTML = "false";
  }
  if (data.gameState) {
    $('game-status').innerHTML = (data.gameState).toUpperCase();
  }

  // is it bookmarked?
  if (glo.username) {
    if (_npa(['glo','games','schlaunquer','bookmarked',data._id])) {
      $('schlaunquer-bookmark').classList.add('removed');
      $('schlaunquer-unbookmark').classList.remove('removed');
    } else {
      $('schlaunquer-bookmark').classList.remove('removed');
      $('schlaunquer-unbookmark').classList.add('removed');
    }
  } else {
    $('schlaunquer-bookmark').classList.add('removed');
    $('schlaunquer-unbookmark').classList.add('removed');
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

var setUpGameBoards = function (json, num) {
  if (json.notFound) { return uiAlert('404<br><br>game not found');}
  $('schlaunquer-board-wrapper').classList.remove('removed');
  //
  gameRef.gameState = json.gameState;
  gameRef.radius = json.radius;
  gameRef.startDate = json.startDate;
  gameRef.victor = json.victor;
  gameRef.forfeitures = json.forfeitures;
  gameRef.unitCap = json.unitCap;
  gameRef.spawnValue = json.spawnValue;
  gameRef.boardHeight = ((json.radius*2)-1)*gameRef.tileHeight;
  gameRef.boardWidth = gameRef.tileWidth*(1 +(1.5*((json.radius-1))));
  gameRef.originX = (gameRef.boardWidth/2) - (.5*gameRef.tileWidth);
  gameRef.originY = (json.radius-1)*gameRef.tileHeight;
  //
  gameRef.players = json.players;
  gameRef.dates = json.dates;
  gameRef.scores = {};
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
  gameRef.totalDays = dayCount;
  gameRef.currentBoardDate = latestDate;
  gameRef.currentBoardStep = 0;
  //
  if (pool.isNumeric(num) && Number.isInteger(Number(num))) {
    var targetDate = calcDateByOffest(gameRef.startDate, Number(num));
  } else if (pool.isStringValidDate(num)) {
    var targetDate = num;
  }
  if (!gameRef.dates[targetDate]) {
    if (gameRef.gameState === 'active' || (gameRef.gameState === 'finished' && latestDate === pool.getCurDate())) {
      targetDate = latestDate;
    } else {
      targetDate = gameRef.startDate;
    }
  }
  //
  for (var i = 0; i < dayCount; i++) {    // render the boards starting most recent day and going backwards in time
    var date = calcDateByOffest(latestDate, -i);
    if (gameRef.dates[date]) {
      createBoard(dayCount, i, date, targetDate);
      if (date !== latestDate) {
        createBoard(dayCount, i, date, targetDate, 1);
        createBoard(dayCount, i, date, targetDate, 2);
      }
    } else {
      dayCount++;
    }
  }

  setTimeout(function () {window.scroll(0, 50);}, 50);
}

var createBoard = function (dayCount, index, date, initBoard, step) {
  var board = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  board.setAttribute("viewBox", "-7 -7 "+(gameRef.boardWidth+14)+" "+(gameRef.boardHeight+14));   // 14 is margarine
  if (step) {
    board.setAttribute("id", date+"."+step+"-board");
  } else {
    board.setAttribute("id", date+"-board");
  }
  board.setAttribute("preserveAspectRatio", "none");
  $('board-bucket').appendChild(board);
  board.classList.add("gameBoard");
  var animationDelay = 0;
  if (date === initBoard && !step) {
    gameRef.currentBoardDay = (dayCount-index)-1;
    if (gameRef.radius === 5) {
      animationDelay = 30;
    } else {
      animationDelay = 50;
    }
  } else {
    board.classList.add("removed");
  }
  // put the round label on the board
  var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  if (index === -1 || (index === 0 && step)) {
    if (step) {
      label.innerHTML = "day "+((dayCount-index)-1)+"."+step+" (preview)";
      var label2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
      if (step === 1) {label2.innerHTML = "(after Migration and War)";}
      else if (step === 2) {label2.innerHTML = "(after Creation)";}
      label2.classList.add('sub-label');
      label2.classList.add('no-select');
      label2.setAttribute('y', '100px');
      label2.setAttribute('x', '10px');
      board.appendChild(label2);
    } else {
      label.innerHTML = "day "+((dayCount-index)-1)+" (preview)";
    }
    label.classList.add('preview-label');
    label.classList.add('no-select');
    label.setAttribute('y', '54px');
  } else {
    label.innerHTML = "day "+((dayCount-index)-1);
    label.classList.add('score-label');
    label.classList.add('no-select');
    label.setAttribute('y', '64px');
    if (step) {
      label.innerHTML = "day "+((dayCount-index)-1)+"."+step;
      var label2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
      if (step === 1) {label2.innerHTML = "(after Migration and War)";}
      else if (step === 2) {label2.innerHTML = "(after Creation)";}
      label2.classList.add('sub-label');
      label2.classList.add('no-select');
      label2.setAttribute('y', '100px');
      label2.setAttribute('x', '10px');
      board.appendChild(label2);
    }
  }
  var toolTip = document.createElementNS("http://www.w3.org/2000/svg", "title");
  toolTip.innerHTML = date;
  label.setAttribute('x', '10px');
  label.appendChild(toolTip);
  board.appendChild(label);
  //
  if (date === initBoard) {
    // we do this here to display the board as the units pop up onto it
    // but will have to do it again when we have everything loaded that determines arrow visibility
    changeBoardRound(false, date);
  }
  renderTiles(animationDelay, date, step);

  // tally score for each day
  var map = gameRef.dates[date];
  var ref = {};
  for (var spot in map) {if (map.hasOwnProperty(spot) && map[spot].color) {
    if (ref[map[spot].color]) {
      ref[map[spot].color].units += map[spot].score;
      ref[map[spot].color].tiles++;
    } else {
      ref[map[spot].color] = {
        player: gameRef.players[map[spot].ownerID].username,
        units: map[spot].score,
        tiles: 1,
        color: gameRef.players[map[spot].ownerID].color,
      }
    }
  }}

  gameRef.scores[date] = [];
  for (var player in ref) { if (ref.hasOwnProperty(player)) {
    gameRef.scores[date].push(ref[player])
  }}
}

var renderTiles = function (delay, date, step) {
  // do we need to perform an audit?
  if (date === pool.getCurDate(-1) || (date === pool.getCurDate() && step)) {
    var preview = true;
    // but are the previews already made? (only need to check any 1, to know all 3 are made)
    if (gameRef.dates[pool.getCurDate(-1)]) {
      preview = false;
    }
  }
  if (preview || (step && !gameRef.dates[date+".1"])) { // if for tomorrow, then generate a preview by performing a full audit
    //                                                                       // OR if for an intermediary step view
    if (preview) {
      var todayMap = gameRef.dates[pool.getCurDate()];
      var filteredMap = {};                  // create a filter of today's map with only the player's units
      for (var spot in todayMap) {if (todayMap.hasOwnProperty(spot)) {
        if (glo.userID === todayMap[spot].ownerID) {
          filteredMap[spot] = {
            ownerID: todayMap[spot].ownerID,
            score: Number(todayMap[spot].score),
          };
          filteredMap[spot].pendingMoves = {};
          for (var move in todayMap[spot].pendingMoves) {if (todayMap[spot].pendingMoves.hasOwnProperty(move)) {
            filteredMap[spot].pendingMoves[move] = todayMap[spot].pendingMoves[move];
          }}
        }
      }}
      var oldMap = filteredMap;
    } else {
      var oldMap = gameRef.dates[date];
    }
    var warMap = {};
    var tomorrowMap = {};             // run migration, entropy, and spawning on the filtered map

    // Migration
    for (var spot in oldMap) {if (oldMap.hasOwnProperty(spot)) {    // for each spot
      spot = spot.split(",");
      var stayers = oldMap[spot].score;
      for (var move in oldMap[spot].pendingMoves) {if (oldMap[spot].pendingMoves.hasOwnProperty(move)) { // for each pendingMove
        stayers = stayers - oldMap[spot].pendingMoves[move]; //emmigration
        var x = Number(spot[0]) + moveRef[move][0];   // determine immigration spot
        var y = Number(spot[1]) + moveRef[move][1];
        if (!warMap[[x,y]]) {warMap[[x,y]] = {};}
        if (!warMap[[x,y]][oldMap[spot].ownerID]) {warMap[[x,y]][oldMap[spot].ownerID] = 0;}
        warMap[[x,y]][oldMap[spot].ownerID] += oldMap[spot].pendingMoves[move]; // immigration
      }}
      // add back the Stayers, to the init Spot
      if (!warMap[spot]) {warMap[spot] = {};}
      if (!warMap[spot][oldMap[spot].ownerID]) {warMap[spot][oldMap[spot].ownerID] = 0;}
      warMap[spot][oldMap[spot].ownerID] += stayers;
    }}
    // War
    for (var spot in warMap) {if (warMap.hasOwnProperty(spot)) {
      var first = [0, null];
      var second = 0;
      for (var player in warMap[spot]) { // determine the 1st and 2nd place scores in each spot
        if (warMap[spot].hasOwnProperty(player)) {
          warMap[spot][player] = Math.min(gameRef.unitCap, warMap[spot][player]);  // enforce popCap

          if (warMap[spot][player] > first[0]) {
            second = first[0];
            first[0] = warMap[spot][player];
            first[1] = player;
          } else if (warMap[spot][player] > second) {
            second = warMap[spot][player];
          }
        }
      }
      if (first[0] !== second) {  // if tie, leave spot empty
        tomorrowMap[spot] = {
          ownerID: first[1],
          score: first[0] - second,
          color: gameRef.players[first[1]].color,
        }
      }
    }}

    // save the x.1 step, after migration/war
    if (date === pool.getCurDate(-1)) {
      var tDate = pool.getCurDate();
    } else {
      var tDate = date;
    }
    gameRef.dates[tDate+".1"] = {};
    for (var spot in tomorrowMap) { if (tomorrowMap.hasOwnProperty(spot)) {
      gameRef.dates[tDate+".1"][spot] = {
        ownerID: tomorrowMap[spot].ownerID,
        score: Number(tomorrowMap[spot].score),
        color: tomorrowMap[spot].color,
      };
    }}


    // Creation
    var spawnMap = {};
    var tileList = getRange([0,0], gameRef.radius);
    for (var i = 0; i < tileList.length; i++) { // for every tile on the map
      if (!tomorrowMap[tileList[i]]) {               // is it unnoccupied?
        var adj = getRange(tileList[i], 2);
        var ref = {};
        for (var j = 0; j < adj.length; j++) {    // for each tile adjacent to said tile
          if (tomorrowMap[adj[j]] && tomorrowMap[adj[j]].ownerID) { // is THAT occupied
            if (!ref[tomorrowMap[adj[j]].ownerID]) {
              ref[tomorrowMap[adj[j]].ownerID] = 0;
            }
            ref[tomorrowMap[adj[j]].ownerID]++;
          }
        }
        for (var user in ref) {if (ref.hasOwnProperty(user)) {
          if (ref[user] === 4) {                    // huzzah! spawn conditions met!
            spawnMap[tileList[i]] = user;   // mark on intermediary spawn map,
            // otherwise, newly spawned tiles can change the counts for other spawn candidates
          }
        }}
      }
    }
    for (var spot in spawnMap) {if (spawnMap.hasOwnProperty(spot)) {
      tomorrowMap[spot] = {
        ownerID: spawnMap[spot],
      }
      tomorrowMap[spot].score = gameRef.spawnValue;
      tomorrowMap[spot].newSpawn = true;
      tomorrowMap[spot].color = gameRef.players[spawnMap[spot]].color;
    }}


    // entropy
    // for each occupied spot on the map,
    for (var spot in tomorrowMap) {if (tomorrowMap.hasOwnProperty(spot)) {
      spot = spot.split(",");
      var adj = getRange([Number(spot[0]), Number(spot[1])], 2);
      var neigborCount = -1;  // the getRange above includes the spot itself, which it then counts as a neigbor, so start -1 to correct this
      for (var j = 0; j < adj.length; j++) {    // for each tile adjacent to said tile
        // is the adj spot occupied by the same owner?
        if (tomorrowMap[adj[j]] && tomorrowMap[adj[j]].ownerID && tomorrowMap[adj[j]].ownerID === tomorrowMap[spot].ownerID) {
          neigborCount++;
        }
      }
      if (tomorrowMap[spot].score) {   // save the entropy value
        tomorrowMap[spot].entropy = schlaunquer.gameRef.entropy[neigborCount];

      }
    }}

    // save the x.2 step, after creation(with entropy values)
    gameRef.dates[tDate+".2"] = {};
    for (var spot in tomorrowMap) { if (tomorrowMap.hasOwnProperty(spot)) {
      gameRef.dates[tDate+".2"][spot] = {
        ownerID: tomorrowMap[spot].ownerID,
        score: Number(tomorrowMap[spot].score),
        newSpawn: tomorrowMap[spot].newSpawn,
        entropy: tomorrowMap[spot].entropy,
        color: tomorrowMap[spot].color,
      };
    }}

    if (preview) {
      for (var spot in tomorrowMap) {if (tomorrowMap.hasOwnProperty(spot)) {
        spot = spot.split(",");
        tomorrowMap[spot].score = tomorrowMap[spot].score - tomorrowMap[spot].entropy;  // do the entropy
        delete tomorrowMap[spot].entropy;
        if (tomorrowMap[spot].score < 1) { // is it dead?
          delete tomorrowMap[spot];
        } else {
          tomorrowMap[spot].color = gameRef.players[glo.userID].color;
          tomorrowMap[spot].newSpawn = false;
        }
      }}
      //
      gameRef.dates[pool.getCurDate(-1)] = tomorrowMap;
    }
  }

  //

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
        createTile(tiles[i], date, step);
      }, delay*i);
    })(i);
  }
  // highlight a player's spots
  if (glo.userID && gameRef.players[glo.userID]) {
    setTimeout(function () {
      for (var spot in gameRef.dates[date]) {if (gameRef.dates[date].hasOwnProperty(spot)) {
        if (gameRef.dates[date][spot].ownerID === glo.userID && date === pool.getCurDate()) {
          highlightTile(spot, date);
          // flag player as "active" if they have spots on the board today
          gameRef.active = true;
        }
      }}
      if (delay) {            // delay is only non zero once
        setForfeitButton();
        changeBoardRound(0); //this is just to hide/display the date arrows
        // because we need to check that again after all boards are rendered and "active" status determined
      }
    }, (i)*delay);
  } else if (delay) {
    setTimeout(function () {
      changeBoardRound(0); //this is just to hide/display the date arrows
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

var createTile = function (coord, date, step) {
  var wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  var tile = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  tile.setAttribute('points', "200,87 150,0 50,0 0,87 50,174 150,174");
  //
  if (step) {
    var dateVar = date+"."+step;
  } else {
    var dateVar = date;
  }
  // position the tile
  var xPix = -(coord[0]*.75*gameRef.tileWidth) + gameRef.originX;
  var yPix = -(coord[1]*gameRef.tileHeight + coord[0]*.5*gameRef.tileHeight) + gameRef.originY;
  wrapper.setAttribute('transform', "translate("+xPix+","+yPix+")");
  wrapper.appendChild(tile);

  // if a player is occupying the spot
  if (gameRef.dates[dateVar][coord]) {
    wrapper.onclick = function() {tileClick(coord, date, step);}
    wrapper.classList.add('clicky');
    gameRef.dates[dateVar][coord].elem = wrapper;
    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    if (gameRef.dates[dateVar][coord].score) {label.innerHTML = formatScore(gameRef.dates[dateVar][coord].score);}
    if (gameRef.dates[dateVar][coord].color) {tile.classList.add(gameRef.dates[dateVar][coord].color);}
    label.setAttribute('x', .5*gameRef.tileWidth+'px');
    label.setAttribute('y', .5*gameRef.tileHeight+'px');
    label.setAttribute('dominant-baseline', "middle");
    label.setAttribute('text-anchor', "middle");
    if (gameRef.dates[dateVar][coord].newSpawn) {label.setAttribute('fill', "#ffffff"); label.setAttribute('stroke', "black");}
    label.classList.add('score-label');
    label.classList.add('no-select');
    wrapper.appendChild(label);
    //
    if (gameRef.dates[dateVar][coord].entropy) {
      var entropyLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      entropyLabel.innerHTML = "-"+gameRef.dates[dateVar][coord].entropy;
      entropyLabel.setAttribute('x', .65*gameRef.tileWidth+'px');
      entropyLabel.setAttribute('y', .7*gameRef.tileHeight+'px');
      entropyLabel.setAttribute('dominant-baseline', "middle");
      entropyLabel.setAttribute('text-anchor', "middle");
      entropyLabel.setAttribute('fill', "#ff0000");
      entropyLabel.setAttribute('stroke', "black");
      entropyLabel.classList.add('entropy-label');
      entropyLabel.classList.add('no-select');
      wrapper.appendChild(entropyLabel);
    }
  } else {
    gameRef.dates[dateVar][coord] = {ownerID:null}
  }

  //
  if (step) {
    $(date+"."+step+"-board").appendChild(wrapper);
  } else {
    $(date+"-board").appendChild(wrapper);
  }
  if (!step) {
    setMoveLabels(coord, date);
  }
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

var tileClick = function (coord, date, step) {
  blackBacking();
  $("pop-up-backing").onclick = function(){closeTilePopUp();}
  if (step) {
    var spot = gameRef.dates[date+"."+step][coord];
  } else {
    var spot = gameRef.dates[date][coord];
  }
  if (spot.ownerID === glo.userID && date === pool.getCurDate() && !step && !gameRef.victor) {  // the user owns this spot, and is eligible to assign moves
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
    w: Number($("w-move-input").value),
    e: Number($("e-move-input").value),
    d: Number($("d-move-input").value),
    s: Number($("s-move-input").value),
    a: Number($("a-move-input").value),
    q: Number($("q-move-input").value),
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
  // refresh preview
  var today = pool.getCurDate();
  var tomar = pool.getCurDate(-1);
  removeElement($(tomar+"-board"));
  removeElement($(today+".1-board"));
  removeElement($(today+".2-board"));
  delete gameRef.dates[tomar];
  delete gameRef.dates[today+".1"];
  delete gameRef.dates[today+".2"];
  //
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
  var spot = gameRef.dates[date][coord];
  if (spot) {
    if (spot.moveLabels && spot.moveLabels.length) {
      for (var i = 0; i < spot.moveLabels.length; i++) {
        removeElement(spot.moveLabels[i]);
      }
    }
    spot.moveLabels = [];

    var moves = spot.pendingMoves;
    for (var move in moves) {
      if (moves.hasOwnProperty(move) && Number(moves[move]) !== 0) {
        var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.innerHTML = formatScore(moves[move]);
        label.setAttribute('x', mLabPos[move].x*gameRef.tileWidth+'px');
        label.setAttribute('y', mLabPos[move].y*gameRef.tileHeight+'px');
        label.setAttribute('dominant-baseline', "middle");
        label.setAttribute('text-anchor', "middle");
        label.classList.add('move-label');
        label.classList.add('no-select');
        spot.elem.appendChild(label);
        spot.moveLabels.push(label)
      }
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
  if (tile) {
    tile.childNodes[0].classList.add('tile-highlight');
    tile.parentElement.appendChild(tile);
  }
}

var updateScoreBoard = function (date) { // if no date, then removes the score board
  destroyAllChildrenOfElement($('schlaunquer-score-board'));

  if (!date || !gameRef.scores[date] || !gameRef.scores[date].length) { return; }

  gameRef.scores[date].sort(function(a, b) {
    return b.units - a.units;
  });

  var headRow = document.createElement('tr');
  var arr = ['', 'total units', 'tiles occupied'];
  for (var i = 0; i < arr.length; i++) {
    var header = document.createElement('th');
    header.innerHTML = arr[i];
    headRow.appendChild(header);
  }
  $('schlaunquer-score-board').appendChild(headRow);

  for (var i = 0; i < gameRef.scores[date].length; i++) {
    var row = document.createElement("tr");

    var cell1 = document.createElement('td');
    cell1.innerHTML = gameRef.scores[date][i].player;
    cell1.classList.add('table-name');
    cell1.classList.add(gameRef.scores[date][i].color);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    cell2.innerHTML = gameRef.scores[date][i].units;
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    cell3.innerHTML = gameRef.scores[date][i].tiles;
    row.appendChild(cell3);


    $('schlaunquer-score-board').appendChild(row);
  }
}

var changeBoardRound = function (offset, date, step) {
  if (offset !== false) {
    if (step) {
      var newStep = gameRef.currentBoardStep + step;
      if (newStep === 3) {
        offset = 1;
      } else if (newStep === -1) {
        offset = -1;
      }
      newStep = (newStep+3)%3;
    } else {
      var newStep = 0;
      if (offset === -1 && gameRef.currentBoardStep) {
        offset = 0;
      }
    }
    var newDate = calcDateByOffest(gameRef.currentBoardDate, offset);
    gameRef.currentBoardDay += offset;
  } else {
    var newDate = date;
    var newStep = 0;
  }

  // disable/enable left/right buttons
  if (!date) {
    var prevDate = calcDateByOffest(newDate, -1);
    var nextDate = calcDateByOffest(newDate, 1);
    if ($(prevDate+"-board")) {
      $('schlaunquer-previous-day').classList.remove('removed');
      $('schlaunquer-previous-step').classList.remove('removed');
    } else {
      $('schlaunquer-previous-day').classList.add('removed');
      if (newStep === 0) {
        $('schlaunquer-previous-step').classList.add('removed');
      } else {
        $('schlaunquer-previous-step').classList.remove('removed');
      }
    }
    if ($(nextDate+"-board") || nextDate === pool.getCurDate(-1)) {
      if (nextDate === pool.getCurDate(-1)) {           // is the nextDay tomorrow?
        if (gameRef.active && !gameRef.victor) {        // is the viewer an active player?
          $('schlaunquer-next-day').classList.remove('removed');    // then allow for preview
          $('schlaunquer-next-step').classList.remove('removed');
        } else {
          $('schlaunquer-next-day').classList.add('removed');
          $('schlaunquer-next-step').classList.add('removed');
          if (gameRef.victor) {
            showVictory();
          }
        }
      } else {
        $('schlaunquer-next-day').classList.remove('removed');
        $('schlaunquer-next-step').classList.remove('removed');
      }
    } else {                      // on the latest day
      $('schlaunquer-next-day').classList.add('removed');
      $('schlaunquer-next-step').classList.add('removed');
      if (gameRef.victor) {
        showVictory();
      }
    }
  }

  //
  simulatePageLoad('~schlaunquer/'+gameRef.game_id+'/'+gameRef.currentBoardDay, 'schlaunquer', 'https://i.imgur.com/i4Py62f.png', true);

  if (gameRef.currentBoardDate !== newDate || newStep !== undefined) { // do we actually need to switch anything?

    // show/hide the actual boards
    if (gameRef.currentBoardStep) {
      $(gameRef.currentBoardDate+"."+gameRef.currentBoardStep+"-board").classList.add('removed');
    } else {
      $(gameRef.currentBoardDate+"-board").classList.add('removed');
    }
    gameRef.currentBoardStep = newStep;
    gameRef.currentBoardDate = newDate;
    if (gameRef.currentBoardStep) {
      var boardID = gameRef.currentBoardDate+"."+gameRef.currentBoardStep+"-board";
    } else {
      var boardID = gameRef.currentBoardDate+"-board";
    }
    if (!$(boardID)) {    // if the board doesn't exist then create it
      if (newDate === pool.getCurDate(-1)) {
        var index = -1;
      } else {
        var index = 0;  // this assumes we are only ever creating preview boards here, on the fly. Needs to be changed if we want justInTime rendering of old boards
      }
      createBoard(gameRef.totalDays, index, gameRef.currentBoardDate, false, gameRef.currentBoardStep)
    }
    $(boardID).classList.remove('removed');
  }

  updateScoreBoard(newDate);

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
  if (!$("schlaunquer-victor").classList.contains("hidden")) {return;}
  //
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

var bookmarkMatch = function (remove) {
  ajaxCall('/~setSchlaunquerBookmark', 'POST', {game_id:gameRef.game_id, remove:remove}, function(json) {
    // update the button
    if (remove) {
      $('schlaunquer-bookmark').classList.remove('removed');
      $('schlaunquer-unbookmark').classList.add('removed');
    } else {
      $('schlaunquer-bookmark').classList.add('removed');
      $('schlaunquer-unbookmark').classList.remove('removed');
    }
    // update the list
    _npa(['glo','games','schlaunquer','bookmarked'], json);
    refreshMenu(gameRef.game_id);
  });
}

var tilePopulationCapExplain = function () {
  uiAlert(`'0' indicates no limit`);
}
var spawnValueExplain = function () {
  uiAlert(`this is also the number of units that each of each player's initial 3 tiles will have to start the game`)
}

var exposition = `<u>Objective:</u><br>Be the only player left with any units on the board<br><br><img src="https://i.imgur.com/p5g71PL.png"><c>[a schlaunquer board at the start of a match]<br></c><br><u>Mechanics:</u><br>You control the movement of your Units. You can schedule movements at any time during the day. All the action takes place at the schlaupdate. Your scheduled moves are secret until the schlaupdate.<br><br>Units live on Tiles. A tile containing at least one of your units is Occupied by you. The color of a tile indicates which player currently occupies it. The number on a tile indicates how many units occupy it. The maximum allowed units on a single tile is 17.<br><br><img src="https://i.imgur.com/ufEZfMD.png"><c>[a tile occupied by 6 blue units, adjacent to a tile occupied by 4 yellow units]<br></c><br><br><u>The Schlaupdate:</u><br>at the strike of Schlaupdate, the following occurs, in order:<br><ol><li>Migration</li><li>War</li><li>Creation</li><li>Entropy</li></ol><br><br><u>Migration</u><br>Every unit, on every turn, can either Move or Stay. For each tile, you may pick <i>one</i> of the tile's adjacent tiles to move units to, and can move some or all units, leaving the rest on their original tile.<br><br>By default, all units Stay. They only Move if you assign it.<br><br><img src="https://i.imgur.com/sbDSnFl.png"><c>[the smaller numbers indicate upcoming scheduled moves. In this case, 3 of the 6 green units are splitting off and heading south, to be joined by another green unit also migrating from an adjacent tile]<br></c><br>If you move more than the maximum of 17 units to a tile, then at this time the extra units will be destroyed, leaving exactly 17.<br><br><br><u>War</u><br>Units on the same Tile as another player's Units will fight. Units on opposing sides destroy each other one-for-one. For example, if 7 red and 10 blue units occupy the same Tile, then after the battle the tile will be held by Blue with 3 remaining units.<br><br><img src="https://i.imgur.com/0sOa38Z.png"><c>[10 red units invade a tile containing 7 blue units. After battle 3 red units remain]<br></c><br>Ties result in all units destroyed and no one occupying the Tile.<br><br>If more than 2 players have units on a tile, then units from all players simultaneously destroy each other in the same manner. For example, if red has 6 units on a tile , and 5 other players also each have 5 units on the tile, then after battle only 1 red unit will remain.<br><br><br><u>Creation</u><br>If a tile is: <br><ol><li>unoccupied</li><li>adjacent to <i>exactly</i> 4(four) tiles that are occupied by the same player</li></ol>Then: 10 new units will spawn on the tile, belonging to the player occupying the four(4) adjacent tiles.<br><br><img src="https://i.imgur.com/RsA7Jc4.png"><c>[3 example configurations of units that would cause new units to spawn in the center tile]<br></c><br><br><u>Entropy</u><br>units are subtracted from every occupied tile, depending on the tile's number of adjacent like-colored units, according to the following table:<br><l><ascii><u>neighbors    entropy</u><br>0            0<br>1            1<br>2            1<br>3            2<br>4            3<br>5            5<br>6            8<br></ascii></l><br><img src="https://i.imgur.com/iUAz2wE.png"><c>[the same 3 example configurations from before, now shown after Creation, with red text indicating the entropy each tile is subject to]<br></c><br><br><note linkText="an alternate metaphor">which may or may not make the gameplay more or less easy to grok:<br><br>is to instead think of the "units" as being "health points", belonging to a single unit<br>you spawn in a new unit that starts with 10 HP<br>units can fuse with each other to combine HP(up to a maximum of 17)<br>a unit can un-fuse, splitting off part of itself to be a new unit living on an adjacent tile<br>    (but can only perform one such split at a time)<br>units are decaying and lose HP to entropy each round<br>    with the amount lost depending on their environment<br></note><br><hr>i am probably forgetting things, please ask questions. You can do so by messaging the <a href="/schlaunquer">schlaunquer account</a>, or tagging a post with <code>schlaunquer</code>`;

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
