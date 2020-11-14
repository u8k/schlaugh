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
      setUpGameBoard(json);
    }
  });
}

var setUpGameBoard = function (json) {
  $('gameBoard').classList.remove('removed');
  gameRef.radius = json.radius;
  var height = ((json.radius*2)-1)*gameRef.tileHeight;
  var width = gameRef.tileWidth*(1 +(1.5*((json.radius-1))));
  $('gameBoard').setAttribute("viewBox", "-7 -7 "+(width+14)+" "+(height+14));   // 14 is margarine
  gameRef.originX = (width/2) - (.5*gameRef.tileWidth);
  gameRef.originY = (json.radius-1)*gameRef.tileHeight;
  //
  gameRef.players = json.players;
  gameRef.map = json.dates[pool.getCurDate()];
  for (var spot in gameRef.map) {
    if (gameRef.map.hasOwnProperty(spot)) {
      if (gameRef.map[spot].ownerID) {
        gameRef.map[spot].color = json.players[gameRef.map[spot].ownerID].color;
      }
    }
  }
  refreshDisplay(30);
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
      setUpGameBoard(json);
    }
  });
}

var requestToPlay = function () {
  ajaxCall('~moveSchlaunquer', 'POST', {signMeUp:true}, function (json) {
    if (json.color) {
      uiAlert(`registration: SUCCESS<br><br>you got `+json.color+`!`, 'h u z z a h', function () {
        $("open-schlaunquer").classList.add('removed');
        window.scroll(0, 50);
        setUpGameBoard(json);
      });
    }
  });
}

var refreshDisplay = function (delay) {
  if (!delay) {delay = 0;}
  destroyAllChildrenOfElement($('gameBoard'));
  var tiles = getRange([0,0], gameRef.radius);
  for (var i = 0; i < tiles.length; i++) {
    (function (i) {
      setTimeout(function () {
        createTile(tiles[i]);
      }, delay*i);
    })(i);
  }
  // highlight a player's spots
  if (glo.userID && gameRef.players[glo.userID]) {
    setTimeout(function () {
      for (var spot in gameRef.map) {
        if (gameRef.map.hasOwnProperty(spot)) {
          if (gameRef.map[spot].ownerID === glo.userID) {
            highlightTile(spot);
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

var createTile = function (coord) {
  var wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  var tile = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  tile.setAttribute('points', "200,87 150,0 50,0 0,87 50,174 150,174");
  //
  var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  if (gameRef.map[coord]) {
    wrapper.onclick = function() {tileClick(coord);}
    wrapper.classList.add('clicky');
    gameRef.map[coord].elem = wrapper;
    if (gameRef.map[coord].score) {label.innerHTML = gameRef.map[coord].score;}
    if (gameRef.map[coord].color) {tile.classList.add(gameRef.map[coord].color);}
  } else {
    gameRef.map[coord] = {ownerID:null}
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
  $('gameBoard').appendChild(wrapper);
  setMoveLabels(coord);
}

var tileClick = function (coord) {
  blackBacking();
  $("pop-up-backing").onclick = function(){closeTilePopUp();}
  var spot = gameRef.map[coord];
  if (spot.ownerID === glo.userID) {
    gameRef.activeTile = coord;
    $('tile-options-submit').onclick = function () {sendMove(coord);}

    var score = spot.score;               // subtract out the already allocated points
    for (var move in spot.pendingMoves) {
      if (spot.pendingMoves.hasOwnProperty(move)) {
        score = score - spot.pendingMoves[move];
      }
    }

    gameRef.curMovVals = {}
    for (var move in moveRef) {           // show/hide inputs if they are valid directions or not for that spot
      if (moveRef.hasOwnProperty(move)) {
        if (gameRef.map[[coord[0] + moveRef[move][0], coord[1] + moveRef[move][1]]]) {  // is the adjacent spot a valid spot on the map?
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
    $("tile-info-text").innerHTML = 'spot currently owned by '+gameRef.players[spot.ownerID].username;
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
  var score = gameRef.map[gameRef.activeTile].score;
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

var sendMove = function (coord) {
  closeTilePopUp();
  var moves = getMoveVals();
  ajaxCall('/~moveSchlaunquer', 'POST', {coord:coord, moves:moves}, function(json) {
    gameRef.map[coord].pendingMoves = moves;
    setMoveLabels(coord);
  });
}

var setMoveLabels = function (coord) {
  if (gameRef.map[coord].moveLabels && gameRef.map[coord].moveLabels.length) {
    for (var i = 0; i < gameRef.map[coord].moveLabels.length; i++) {
      removeElement(gameRef.map[coord].moveLabels[i]);
    }
  }
  gameRef.map[coord].moveLabels = [];

  var moves = gameRef.map[coord].pendingMoves;
  for (var move in moves) {
    if (moves.hasOwnProperty(move) && Number(moves[move]) !== 0) {
      var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.innerHTML = moves[move]; //mLabPos[move].arrow+moves[move];
      label.setAttribute('x', mLabPos[move].x*gameRef.tileWidth+'px');
      label.setAttribute('y', mLabPos[move].y*gameRef.tileHeight+'px');
      label.setAttribute('dominant-baseline', "middle");
      label.setAttribute('text-anchor', "middle");
      label.classList.add('move-label');
      gameRef.map[coord].elem.appendChild(label);
      gameRef.map[coord].moveLabels.push(label)
    }
  }
}

var mLabPos = {
  w:{x:.5 ,y:.17, arrow:'⭡'},
  e:{x:.76 ,y:.33, arrow:'⭧'},
  d:{x:.76 ,y:.7, arrow:'⭨'},
  s:{x:.5 ,y:.86, arrow:'⭣'},
  a:{x:.23 ,y:.7, arrow:'⭩'},
  q:{x:.24 ,y:.33, arrow:'⭦'},
}

var highlightTile = function (coord, undo) {
  var tile = gameRef.map[coord].elem;
  if (!undo) {
    tile.childNodes[0].classList.add('tile-highlight');
    tile.parentElement.appendChild(tile);
  } else {
    tile.childNodes[0].classList.remove('tile-highlight');
  }
}

/* rotation
var rotateGrid = function () {
  var tiles = getRange([0,0], gameRef.radius);
  var newMap = {}
  for (var i = 0; i < tiles.length; i++) {
    newMap[rotateTile(1, tiles[i])] = gameRef.map[tiles[i]];
  }
  gameRef.map = newMap;
  refreshDisplay();
}
var rotateTile = function (amnt, coords) {
  amnt = Math.floor(amnt)%6;
  var x = -(coords[1]);
  var y = coords[0] + coords[1];
  if (amnt === 1) {return [x,y];}
  else {return rotateTile(amnt-1, [x,y]);}
}
*/

setTimeout(function () {window.scroll(0, 50);}, 300);
