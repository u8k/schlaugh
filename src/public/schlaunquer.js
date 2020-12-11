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
    spawnValue:7,
    unitCap:17,
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
          radius: 4,
          pos: [
            {color:'yellow', tiles:[[-3, 3],[-2,3],[-3,2]]},     //e
            {color:'green', tiles:[[-3, 0],[-3,1],[-2,-1]]},     //d
            {color:'purple', tiles:[[3,-3],[3,-2],[2,-3]]},      //a
            {color:'red', tiles:[[3,0],[2,1],[3,-1]]},           //q
          ],
        },
        3: {
          radius: 4,
          pos: [
            {color:'red', tiles:[[0, 3],[1,2],[-1,3]]},          //w
            {color:'blue', tiles:[[-3, 0],[-3,1],[-2,-1]]},      //d
            {color:'yellow', tiles:[[3,-3],[3,-2],[2,-3]]},      //a
          ],
        },
        2: {
          radius: 3,
          pos: [
            {color:'orange', tiles:[[0, 2],[1,1],[-1,2]]},       //w
            {color:'blue', tiles:[[0,-2],[1,-2],[-1,-1]]},       //s
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
    if (userID && match.players[userID]) {  // Registerd, send gameData, including their own secret data
      return res.send(exp.cleanMatchData(match, userID));
    } else if (devFlag || (userID && String(userID) === "5a0f87ec1d2b9000148368b3")) { // admin
      return res.send(match);
    } else {  // spectator, send only public game data
      return res.send(exp.cleanMatchData(match));
    }
  }

  exp.cleanMatchData = function (match, userID) {
    var cleanedData = {};
    cleanedData.players = match.players;
    cleanedData.radius = match.radius;
    cleanedData.version = match.version;
    cleanedData.startDate = match.startDate;
    cleanedData.dates = {};
    if (match.dates) {
      for (var date in match.dates) {if (match.dates.hasOwnProperty(date)) {
        cleanedData.dates[date] = {};
        for (var tile in match.dates[date]) {if (match.dates[date].hasOwnProperty(tile)) {
          cleanedData.dates[date][tile] = {
            ownerID: match.dates[date][tile].ownerID,
          }
          if (userID && String(match.dates[date][tile].ownerID) === String(userID)) {
            cleanedData.dates[date][tile].score = match.dates[date][tile].score;
            cleanedData.dates[date][tile].pendingMoves = match.dates[date][tile].pendingMoves;
          }
        }}
      }}
    }
    return cleanedData;
  }

  exp.nightAudit = function (match) {
    if (match.victor || match.dates[pool.getCurDate()]) {return null }; // no night audit needed

    var daysAgo = 1;
    while (!match.dates[pool.getCurDate(daysAgo)]) {
      daysAgo++;
    }
    var oldMap = match.dates[pool.getCurDate(daysAgo)];
    var warMap = {};
    var newMap = {};

    // Migration
    var unitCap = exp.gameRef.unitCap;
    if (match.unitCap) {unitCap = match.unitCap;}
    //
    for (var spot in oldMap) {if (oldMap.hasOwnProperty(spot)) {    // for each spot
      spot = spot.split(",");
      var stayers = oldMap[spot].score;
      for (var move in oldMap[spot].pendingMoves) {if (oldMap[spot].pendingMoves.hasOwnProperty(move)) { // for each pendingMove
        stayers = stayers - oldMap[spot].pendingMoves[move]; //emmigration
        var x = Number(spot[0]) + exp.gameRef.moves[move][0];   // determine immigration spot
        var y = Number(spot[1]) + exp.gameRef.moves[move][1];
        if (!warMap[[x,y]]) {warMap[[x,y]] = {};}
        if (!warMap[[x,y]][oldMap[spot].ownerID]) {warMap[[x,y]][oldMap[spot].ownerID] = 0;}
        warMap[[x,y]][oldMap[spot].ownerID] += oldMap[spot].pendingMoves[move]; // immigration
      //  warMap[[x,y]][oldMap[spot].ownerID] = Math.min(unitCap, warMap[[x,y]][oldMap[spot].ownerID]) // popCap
      }}
      // add back the Stayers, to the init Spot
      if (!warMap[spot]) {warMap[spot] = {};}
      if (!warMap[spot][oldMap[spot].ownerID]) {warMap[spot][oldMap[spot].ownerID] = 0;}
      warMap[spot][oldMap[spot].ownerID] += stayers;
      //warMap[spot][oldMap[spot].ownerID] = Math.min(unitCap, warMap[spot][oldMap[spot].ownerID]);
    }}

    // War
    for (var spot in warMap) {if (warMap.hasOwnProperty(spot)) {
      var first = [0, null];
      var second = 0;
      for (var player in warMap[spot]) { // determine the 1st and 2nd place scores in each spot
        if (warMap[spot].hasOwnProperty(player)) {
          warMap[spot][player] = Math.min(unitCap, warMap[spot][player]);  // enforce popCap

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

    // Entropy
    for (var spot in newMap) {if (newMap.hasOwnProperty(spot)) {
      if (newMap[spot].score) {
        newMap[spot].score--;
      }
      if (newMap[spot].score === 0) {
        delete newMap[spot];
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
      if (match.spawnValue) {newMap[spot].score = match.spawnValue;}
      else {newMap[spot].score = exp.gameRef.spawnValue;}
    }}

    // save it!
    match.dates[pool.getCurDate(daysAgo-1)] = newMap;

    if (match.victor || daysAgo === 1) {
      return match;
    } else {
      return exp.nightAudit(match);
    }
  }

  exp.validateMove = function (match, req, res, devFlag, userID) {
    // are they a player in this game?
    if ((!match.players || !match.players[userID]) && !devFlag) {return {error:"userID miscoresponce"};}

    if (!req.body || !req.body.coord || !req.body.moves) {return {error:"malformed request 8875"};}
    if (!match.dates[pool.getCurDate()]) {return {error:"malformed request 8876"};}

    var map = match.dates[pool.getCurDate()];
    //you must be updating a spot you actually hold
    if (!map[req.body.coord] || (!devFlag && String(map[req.body.coord].ownerID) !== String(userID)) || !map[req.body.coord].score) {return {error:"malformed request 8877"};}

    var moveCount = 0;
    var dir = null;
    for (var move in req.body.moves) {
      if (req.body.moves.hasOwnProperty(move)) {
        if (Number(req.body.moves[move]) > 0) {
          moveCount++;
          dir = move;
        }
      }
    }
    if (moveCount > 1) {return {error:"malformed request 8786"};}
    // magnitude to the max of the inputed value or the allowed maximum, also "floor" takes care of nonInt values
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
