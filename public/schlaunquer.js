if (typeof require !== 'undefined') { var pool = require('./pool.js'); }

(function(exp){

  exp.gameRef = {
    moves: {
      w:[0, 1],
      e:[-1, 1],
      d:[-1, 0],
      s:[0, -1],
      a:[1, -1],
      q:[1, 0],
    },
    entropy: {
      0:0,
      1:1,
      2:1,
      3:2,
      4:3,
      5:5,
      6:8,
    },
    spawnValue:10,
    // unitCap:17,
    init: {
      players: {
        6: {
          radius: 5,
          pos: [
            {color:'orange', tiles:[[0, 4],[1,3],[-1,4]]},       //w
            {color:'yellow', tiles:[[-4, 4],[-3,4],[-4,3]]},     //e
            {color:'green', tiles:[[-4, 0],[-4,1],[-3,-1]]},     //d
            {color:'blue', tiles:[[0,-4],[1,-4],[-1,-3]]},       //s
            {color:'purple', tiles:[[4,-4],[4,-3],[3,-4]]},      //a
            {color:'red', tiles:[[4,0],[3,1],[4,-1]]},           //q
          ],
        },
        4: {
          radius: 5,
          pos: [
            {color:'yellow', tiles:[[-4, 4],[-3,4],[-4,3]]},     //e
            {color:'green', tiles:[[-4, 0],[-4,1],[-3,-1]]},     //d
            {color:'purple', tiles:[[4,-4],[4,-3],[3,-4]]},      //a
            {color:'red', tiles:[[4,0],[3,1],[4,-1]]},           //q
          ],
        },
        3: {
          radius: 5,
          pos: [
            {color:'green', tiles:[
              [-4, 0],[-4,1],[-3,-1],
              [0,-4],[1,-4],[-1,-3],
            ]},
            {color:'orange', tiles:[
              [0, 4],[1,3],[-1,4], 
              [-4, 4],[-3,4],[-4,3],
            ]},
            {color:'purple', tiles:[
              [4,0],[3,1],[4,-1],
              [4,-4],[4,-3],[3,-4],
            ]},

          ],
        },
        2: {
          radius: 5,
          pos: [
            {color:'green', tiles:[
              [-4, 0],[-4,1],[-3,-1],
              [0,-4],[1,-4],[-1,-3],
              [4,-4],[4,-3],[3,-4],
            ]},
            {color:'red', tiles:[
              [4,0],[3,1],[4,-1],
              [0, 4],[1,3],[-1,4], 
              [-4, 4],[-3,4],[-4,3],
            ]},
          ],
        },
      }
    }
  }

  exp.getRange = function (spot, radius) {
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

  exp.tidyUp = function (userID, match, res, errMsg, devFlag) {
    if (match.victor || devFlag) { // give it all up
      return res.send(match);
    } else if (userID && match.players[userID]) {  // Registerd, send gameData, including their own secret data
      return res.send(exp.cleanMatchData(match, userID));
    } else {                                        // spectator, send only public game data
      return res.send(exp.cleanMatchData(match));
    }
  }

  exp.cleanMatchData = function (match, userID) {
    var cleanedData = {};
    cleanedData.players = match.players;
    cleanedData.radius = match.radius;
    cleanedData.version = match.version;
    cleanedData.startDate = match.startDate;
    cleanedData.gameState = match.gameState;
    cleanedData.totalPlayers = match.totalPlayers;
    cleanedData.victor = match.victor;
    cleanedData._id = match._id;
    // cleanedData.unitCap = match.unitCap;
    cleanedData.spawnValue = match.spawnValue;
    cleanedData.opaqueEnemyUnits = match.opaqueEnemyUnits;
    cleanedData.dates = {};
    if (match.dates) {
      for (var date in match.dates) {if (match.dates.hasOwnProperty(date)) {
        if (!match.opaqueEnemyUnits && date !== pool.getCurDate()) {
          cleanedData.dates[date] = match.dates[date];
        } else {
          cleanedData.dates[date] = {};
          for (var tile in match.dates[date]) {if (match.dates[date].hasOwnProperty(tile)) {
            cleanedData.dates[date][tile] = {
              ownerID: match.dates[date][tile].ownerID,
            }
            if (!match.opaqueEnemyUnits || (userID && String(match.dates[date][tile].ownerID) === String(userID))) {
              cleanedData.dates[date][tile].score = match.dates[date][tile].score;
              if (userID && String(match.dates[date][tile].ownerID) === String(userID)) {
                cleanedData.dates[date][tile].pendingMoves = match.dates[date][tile].pendingMoves;
              }
            }
          }}
        }
      }}
    }
    return cleanedData;
  }

  exp.nightAudit = function (match) {
    if (match.gameState && match.gameState === "pending") {
      return exp.pendingAudit(match);
    }
    if (match.victor || match.dates[pool.getCurDate()]) { return null }; // no night audit needed

    var daysAgo = 1;
    while (!match.dates[pool.getCurDate(daysAgo)]) {
      daysAgo++;
    }
    //
    var oldMap = match.dates[pool.getCurDate(daysAgo)];
    var warMap = {};
    var newMap = {};

    //
    // var unitCap = exp.gameRef.unitCap;
    // if (typeof match.unitCap !== "undefined") {unitCap = match.unitCap;}
    // if (unitCap === 0) {unitCap = Infinity;}

    // Migration
    for (var spot in oldMap) {if (oldMap.hasOwnProperty(spot)) {    // for each spot
      spot = spot.split(",");
      var stayers = oldMap[spot].score;

      // check for forfeit
      if (oldMap[spot].ownerID !== 'forsaken' && !match.players[oldMap[spot].ownerID].forfeit) {
      for (var move in oldMap[spot].pendingMoves) {if (oldMap[spot].pendingMoves.hasOwnProperty(move)) { // for each pendingMove
          stayers = stayers - oldMap[spot].pendingMoves[move]; //emmigration
          var x = Number(spot[0]) + exp.gameRef.moves[move][0];   // determine immigration spot
          var y = Number(spot[1]) + exp.gameRef.moves[move][1];
          if (!warMap[[x,y]]) {warMap[[x,y]] = {};}
          if (!warMap[[x,y]][oldMap[spot].ownerID]) {warMap[[x,y]][oldMap[spot].ownerID] = 0;}
          warMap[[x,y]][oldMap[spot].ownerID] += oldMap[spot].pendingMoves[move]; // immigration
        }}
      }
      
      // add back the Stayers, to the init Spot
      if (!warMap[spot]) {warMap[spot] = {};}

      if (oldMap[spot].ownerID !== 'forsaken' && !match.players[oldMap[spot].ownerID].forfeit) {
        if (!warMap[spot][oldMap[spot].ownerID]) {warMap[spot][oldMap[spot].ownerID] = 0;}
        warMap[spot][oldMap[spot].ownerID] += stayers;

      } else {
        warMap[spot]['forsaken'] = stayers;

        if (!match.forfeitures) {match.forfeitures = {}}
        if (!match.forfeitures[pool.getCurDate(daysAgo)]) {match.forfeitures[pool.getCurDate(daysAgo)] = {};}
        if (!match.forfeitures[pool.getCurDate(daysAgo)][oldMap[spot].ownerID]) {
          match.forfeitures[pool.getCurDate(daysAgo)][oldMap[spot].ownerID] = true;
        }
      }
    }}

    // War
    for (var spot in warMap) {if (warMap.hasOwnProperty(spot)) {
      var first = [0, null];
      var second = 0;
      for (var player in warMap[spot]) { // determine the 1st and 2nd place scores in each spot
        if (warMap[spot].hasOwnProperty(player)) {

          // warMap[spot][player] = Math.min(unitCap, warMap[spot][player]);  // enforce popCap

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
        newMap[spot] = {
          ownerID: first[1],
          score: first[0] - second,
        }
      }
    }}

    // Creation
    var spawnMap = {};
    var tileList = exp.getRange([0,0], match.radius);
    for (var i = 0; i < tileList.length; i++) { // for every tile on the map
      if (!newMap[tileList[i]]) {               // is it unnoccupied?
        var adj = exp.getRange(tileList[i], 2);
        var ref = {};
        for (var j = 0; j < adj.length; j++) {    // for each tile adjacent to said tile
          if (newMap[adj[j]] && newMap[adj[j]].ownerID) { // is THAT occupied
            if (!ref[newMap[adj[j]].ownerID]) {
              ref[newMap[adj[j]].ownerID] = 0;
            }
            ref[newMap[adj[j]].ownerID]++;
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
      newMap[spot] = {
        ownerID: spawnMap[spot],
      }
      if (typeof match.spawnValue !== "undefined") {
        if (match.spawnValue > 0) {         // 0 is a valid spawnValue, to indicate no spawning
          newMap[spot].score = match.spawnValue;
        }
      } else {newMap[spot].score = exp.gameRef.spawnValue;}
    }}


    // Entropy/victory/defeat check
    var activePlayerList = [];
    // mark all players dead
    for (var player in match.players) { if (match.players.hasOwnProperty(player)) {
      match.players[player].active = false;
    }}
    
    // entropy
    // for each occupied spot on the map,
    for (var spot in newMap) {if (newMap.hasOwnProperty(spot)) {
      spot = spot.split(",");
      var adj = exp.getRange([Number(spot[0]), Number(spot[1])], 2);
      var neigborCount = -1;  // the getRange above includes the spot itself, which it then counts as a neigbor, so start -1 to correct this
      for (var j = 0; j < adj.length; j++) {    // for each tile adjacent to said tile
        // is the adj spot occupied by the same owner?
        if (newMap[adj[j]] && newMap[adj[j]].ownerID && newMap[adj[j]].ownerID === newMap[spot].ownerID) {
          neigborCount++;
        }
      }
      if (newMap[spot].score) {   // do the entropy
        newMap[spot].score = newMap[spot].score - exp.gameRef.entropy[neigborCount];
      }
    }}

    // THEN delete spots, after they've counted for the above
    for (var spot in newMap) {if (newMap.hasOwnProperty(spot)) {
      spot = spot.split(",");
      if (newMap[spot].score < 1) { // is it dead?
        delete newMap[spot];
      } else {              // take census
        if (newMap[spot].ownerID !== 'forsaken') {
          if (activePlayerList[0] !== newMap[spot].ownerID) {
            activePlayerList.push(newMap[spot].ownerID);
          }
          // mark player as alive
          match.players[newMap[spot].ownerID].active = true;
        }
      }
    }}
    
    //
    var cornerTiles = [[-4, 0], [0,-4], [4,-4], [4,0], [0, 4], [-4, 4]];
    var cornerRef = {};
    for (var i = 0; i < cornerTiles.length; i++) {
      if (newMap[cornerTiles[i]] && newMap[cornerTiles[i]].ownerID) {
        if (!cornerRef[newMap[cornerTiles[i]].ownerID]) {
          cornerRef[newMap[cornerTiles[i]].ownerID] = 0
        }
        cornerRef[newMap[cornerTiles[i]].ownerID]++;
        if (cornerRef[newMap[cornerTiles[i]].ownerID] === 4) {
          match.victor = newMap[cornerTiles[i]].ownerID;
          match.gameState = 'finished';
        }
      }
    }

    if (activePlayerList.length === 0) {  // nobody wins(but match is over)
      match.victor = true;
      match.gameState = 'finished';
    } else if (activePlayerList.length === 1) {
      match.victor = activePlayerList[0];
      match.gameState = 'finished';
    }


    // all done! save it!
    match.dates[pool.getCurDate(daysAgo-1)] = newMap;

    if (match.victor || daysAgo === 1) {
      return match;
    } else {
      return exp.nightAudit(match);
    }
  }

  exp.pendingAudit = function (match) { // nightAudit when a game is in the "pending" state
    if (match.lastUpdatedOn === pool.getCurDate()) { return false; }

    match.lastUpdatedOn = pool.getCurDate();
    var available = match.totalPlayers;
    for (var player in match.players) {if (match.players.hasOwnProperty(player)) {
      available--;
    }}
    var waitList = [];
    for (var player in match.pendingPlayers) {if (match.pendingPlayers.hasOwnProperty(player)) {
      waitList.push(player);
    }}
    waitList.sort(function(a, b){return 0.5 - Math.random()});
    //
    if (available > waitList.length) {    // not full
      for (var i = 0; i < waitList.length; i++) {
        match.players[waitList[i]] = match.pendingPlayers[waitList[i]];
      }
      match.pendingPlayers = {};
      return match;
    } else {                // full up
      for (var i = 0; i < available; i++) {
        match.players[waitList[i]] = match.pendingPlayers[waitList[i]];
      }
      // initiate the match
      match.gameState = 'active';
      delete match.pendingPlayers;

      var playArr = [];
      for (var player in match.players) {if (match.players.hasOwnProperty(player)) {
        playArr.push(player)
      }}
      playArr.sort(function(a, b){return 0.5 - Math.random()});

      var map = {};
      //
      var ref = exp.gameRef.init.players[match.totalPlayers];
      for (var i = 0; i < playArr.length; i++) {
        // assign color
        match.players[playArr[i]].color = ref.pos[i].color;
        // assign init tiles
        for (var j = 0; j < ref.pos[i].tiles.length; j++) {
          map[ref.pos[i].tiles[j]] = {
            ownerID: playArr[i],
            score: match.spawnValue,
          }
        }
      }
      match.dates = {};
      match.dates[pool.getCurDate()] = map;
      //
      match.radius = ref.radius;
      match.startDate = pool.getCurDate();
      //
      return match;
    }
  }

  exp.validateMove = function (match, req, res, devFlag, userID) {
    // are they a player in this game?
    if ((!match.players || !match.players[userID]) && !devFlag) {return {error:"userID miscoresponce"};}

    if (!req.body) {return {error:"malformed request 8874"};}

    if (typeof req.body.forfeit !== 'undefined' && match.players[userID]) {
      match.players[userID].forfeit = req.body.forfeit;
      return match;
    }

    if (!req.body.coord || !req.body.moves) {return {error:"malformed request 8875"};}
    if (!match.dates[pool.getCurDate()]) {return {error:"malformed request 8876"};}

    var map = match.dates[pool.getCurDate()];
    //you must be updating a spot you actually hold
    if (!map[req.body.coord] || (!devFlag && String(map[req.body.coord].ownerID) !== String(userID)) || !map[req.body.coord].score) {return {error:"malformed request 8877"};}

    var moveCount = 0;
    var dir = null;
    for (var move in req.body.moves) {
      if (req.body.moves.hasOwnProperty(move)) {
        if (Number(req.body.moves[move]) !== 0) {
          moveCount++;
          dir = move;
        }
      }
    }
    // each tile can only transfer units to one adjacent tile
    if (moveCount > 1) {return {error:"malformed request 8786"};}
    // the number of units being sent must be positive
    if (Number(req.body.moves[dir]) < 0) {return {error:"malformed request 8787"};}

    // magnitude to the min of the inputed value or the allowed maximum, also "floor" takes care of nonInt values
    var mag = Math.min(Math.floor(Number(req.body.moves[dir])), map[req.body.coord].score);
    // make sure destination is in bounds
    if (dir) {
      var x = req.body.coord[0] + exp.gameRef.moves[dir][0];
      var y = req.body.coord[1] + exp.gameRef.moves[dir][1];
      if (!(Math.abs(x) < match.radius && Math.abs(y) < match.radius && Math.abs(x+y) < match.radius)) {return {error:"malformed request 8783"};}
    }
    //
    if (!map[req.body.coord].pendingMoves) {map[req.body.coord].pendingMoves = {}}
    for (var move in exp.gameRef.moves) {
      if (exp.gameRef.moves.hasOwnProperty(move)) {
        if (move === dir) {
          map[req.body.coord].pendingMoves[move] = mag;
        } else {
          map[req.body.coord].pendingMoves[move] = 0;
        }
      }
    }
    return match;
  }

}(typeof exports === 'undefined' ? this.schlaunquer = {} : exports));
