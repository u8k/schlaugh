"use strict";

var gameRef = {
  tileHeight:174,
  tileWidth:200,
  side:100,
  colors:['red', 'orange', 'yellow', 'green', 'blue', 'purple'],
}

var openSchlaunquerGame = function () {
  $("panel-buttons").classList.add("removed");
  switchPanel("schlaunquer-panel");
  simulatePageLoad('~schlaunquer', 'schlaunquer');

  loading();
  ajaxCall('/~getSchlaunquer', 'POST', {}, function(json) {
    loading(true);
    if (json.openSpot) {
      if (glo.username) {
        $("full-schlaunquer").classList.add('removed');
        $("open-schlaunquer").classList.remove('removed');
      } else {
        $("full-schlaunquer").classList.add('removed');
        $("open-schlaunquer").classList.add('removed');
        $("sign-in-schlaunquer").classList.remove('removed');
      }
    } else {
      $("full-schlaunquer").classList.remove('removed');
      $("open-schlaunquer").classList.add('removed');
      setUpGameBoards(json);
    }
  });
}

var setUpGameBoards = function (json) {
  gameRef.radius = json.radius;
  var height = ((json.radius*2)-1)*gameRef.tileHeight;
  var width = gameRef.tileWidth*(1 +(1.5*((json.radius-1))));
  gameRef.originX = (width/2) - (.5*gameRef.tileWidth);
  gameRef.originY = (json.radius-1)*gameRef.tileHeight;
  //
  gameRef.players = json.players;
  gameRef.dates = json.dates;
  var dayCount = 0;
  destroyAllChildrenOfElement($('board-bucket'));
  gameRef.currentBoardDate = pool.getCurDate();
  for (var date in gameRef.dates) { if (gameRef.dates.hasOwnProperty(date)) {
    for (var spot in gameRef.dates[date]) { if (gameRef.dates[date].hasOwnProperty(spot)) {
      if (gameRef.dates[date][spot].ownerID) {
        gameRef.dates[date][spot].color = json.players[gameRef.dates[date][spot].ownerID].color;
      }
    }}
    dayCount++;
  }}
  for (var i = 0; i < dayCount; i++) {  // render the boards in reverse order
    var date = pool.getCurDate(i);
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
    label.setAttribute('x', '10px');
    label.setAttribute('y', '64px');
    label.classList.add('score-label');
    board.appendChild(label);
    renderTiles(animationDelay, date);
  }
  setTimeout(function () {window.scroll(0, 50);}, 100);
}

var checkForSchlaunquerSpot = function () {
  loading();
  ajaxCall('/~getSchlaunquer', 'POST', {}, function(json) {
    loading(true);
    if (json.openSpot) {
      if (glo.username) {
        verify("there is an open spot for you in the inschlaugural game of schlaunquers, would you like to take this once in a lifetime opportunity?", 'chyeah!', 'no games for me thanks', function (resp) {
          if (!resp) {return}
          else {requestToPlay()}
        });
      }
    } else {
      uiAlert("sorry! looks like we're all full up!");
      $("full-schlaunquer").classList.remove('removed');
      $("open-schlaunquer").classList.add('removed');
      setUpGameBoards(json);
    }
  });
}

var requestToPlay = function () {
  ajaxCall('~moveSchlaunquer', 'POST', {signMeUp:true}, function (json) {
    if (json.color) {
      uiAlert(`registration: SUCCESS<br><br>you got `+json.color+`!`, 'h u z z a h', function () {
        $("open-schlaunquer").classList.add('removed');
        setUpGameBoards(json);
      });
    }
  });
}

var renderTiles = function (delay, date) {
  if (!delay) {delay = 0;}
  var tiles = getRange([0,0], gameRef.radius);
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
      for (var spot in gameRef.dates[date]) {
        if (gameRef.dates[date].hasOwnProperty(spot)) {
          if (gameRef.dates[date][spot].ownerID === glo.userID) {
            highlightTile(spot, date);
          }
        }
      }
    }, (i+1)*delay);
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
    if (gameRef.dates[date][coord].score) {label.innerHTML = gameRef.dates[date][coord].score;}
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

var tileClick = function (coord, date) {
  blackBacking();
  $("pop-up-backing").onclick = function(){closeTilePopUp();}
  var spot = gameRef.dates[date][coord];
  if (spot.ownerID === glo.userID && date === pool.getCurDate()) {
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

var moveInputChange = function (event) {
  var moves = getMoveVals();
  var score = gameRef.activeTile.score;
  var bad = false;
  for (var move in moves) {
    if (moves.hasOwnProperty(move)) {
      if (!Number.isInteger(Number(moves[move]))) {bad = true;}
      score = score - moves[move];
    }
  }
  if (bad || score < 0) {  // reset
    $("w-move-input").value = gameRef.curMovVals['w'];
    $("e-move-input").value = gameRef.curMovVals['e'];
    $("d-move-input").value = gameRef.curMovVals['d'];
    $("s-move-input").value = gameRef.curMovVals['s'];
    $("a-move-input").value = gameRef.curMovVals['a'];
    $("q-move-input").value = gameRef.curMovVals['q'];
  } else {
    $('tile-options-current-score').innerHTML = score;
    gameRef.curMovVals = moves;
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
  ajaxCall('/~moveSchlaunquer', 'POST', {coord:coord, moves:moves}, function(json) {
    gameRef.dates[date][coord].pendingMoves = moves;
    setMoveLabels(coord, date);
  });
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
      label.innerHTML = moves[move];
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
  if (!undo) {
    tile.childNodes[0].classList.add('tile-highlight');
    tile.parentElement.appendChild(tile);
  } else {
    tile.childNodes[0].classList.remove('tile-highlight');
  }
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
  } else {
    $('game-round-forward').classList.add('removed');
  }

  $(gameRef.currentBoardDate+"-board").classList.add('removed');
  gameRef.currentBoardDate = newDate;
  $(gameRef.currentBoardDate+"-board").classList.remove('removed');
}

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
