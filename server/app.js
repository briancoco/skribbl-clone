const express = require("express");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);

//used to store ws session data
//can migrate to DB if we want to
const clientData = {};
const rooms = {};
const words = ["tree", "apple", "sun"];

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const getWinner = (room) => {
  const roomData = rooms[room];
  let winnerName;
  let winnerPoints = 0;
  for (const player of roomData.players) {
    if (player.points > winnerPoints) {
      winnerName = player.name;
      winnerPoints = player.points;
    }
  }
  return winnerName;
};

const startGame = (room) => {
  //takes in a room
  //sets the word to be guessed
  //sets the current player based on the prev currPlayer
  //calls the function again after a set timeout of 1 min
  const currRoom = rooms[room];
  currRoom.currentWord = words[Math.floor(Math.random() * words.length)];
  if (
    !currRoom.currPlayer ||
    currRoom.currPlayer.pos + 1 == currRoom.players.length
  ) {
    currRoom.currPlayer = currRoom.players[0];
  } else {
    currRoom.currPlayer = currRoom.players[currRoom.currPlayer.pos + 1];
  }
  console.log(
    `Current Player: ${currRoom.currPlayer.name} Current Word: ${currRoom.currentWord}`
  );
  //iterate thru the players in our room
  //for each player, check if they're the current drawer
  //if yes, emit current-drawer event to signify to client that it should allow drawing
  //if no, emit current-guesser event to signfiy to client that it shouldn't allow drawing
  for (const player of currRoom.players) {
    if (player.pos == currRoom.currPlayer.pos) {
      io.to(player.id).emit("current-drawer", {
        wordToDraw: currRoom.currentWord,
      });
    } else {
      io.to(player.id).emit("current-guesser");
    }
  }
  io.sockets.in(room).emit("clear-board");
  const currRound = currRoom.currRound;
  setTimeout(() => {
    if (currRoom.players.length > 0 && !currRoom.isRoundDone[currRound]) {
      currRoom.isRoundDone[currRound] = true;
      currRoom.currRound += 1;
      if (currRoom.currRound >= 5) {
        const winner = getWinner(room);
        io.sockets.in(room).emit("game-end", { winner });
        return;
      }
      startGame(room);
    }
  }, 60000);
};

const isCurrentPlayer = (room, playerId) => {
  return rooms[room].currPlayer.id == playerId;
};

io.on("connection", (socket) => {
  console.log(`client ${socket.id} has connected`);

  socket.on("draw-server", (e) => {
    const room = clientData[socket.id] ? clientData[socket.id].room : socket.id;
    //using the room data, we can check if the person trying to draw is the current drawer
    //if yes, emit their stroke to the other clients otherwise do nothing
    if (!isCurrentPlayer(room, socket.id)) return;
    socket.to(room).emit("draw-client", e);
  });

  socket.on("draw-end", () => {
    const room = clientData[socket.id] ? clientData[socket.id].room : socket.id;
    socket.to(room).emit("draw-end");
  });

  socket.on("join-room", ({ name, room }) => {
    if (clientData[socket.id]) {
      if (clientData[socket.id].room == room) return;
      socket.leave(clientData[socket.id].room);
    }
    socket.join(room);
    //check if the room exists in the rooms ds
    //if no, create it and push it
    //if yes, add the current client data to the room

    if (rooms[room]) {
      rooms[room].players.push({
        name,
        id: socket.id,
        pos: rooms[room].players.length,
        points: 0,
      });
    } else {
      rooms[room] = {
        currPlayer: null,
        players: [{ name, id: socket.id, pos: 0, points: 0 }],
        currentWord: null,
        playersReady: 0,
        isRoundDone: new Array(5).fill(false),
        currRound: 0,
      };
    }

    socket.to(room).emit("new-player", { name });
    clientData[socket.id] = { name, room, isReady: false };
  });

  socket.on("send-msg", (msg) => {
    const user = clientData[socket.id];
    if (!user) return;
    const room = user.room;
    //add logic to check if the msg in the chat matches the word to be guessed
    //if yes, we also want to emit another event to signify that the round
    //has been won, and we want to end the current round
    const roomData = rooms[room];
    let gameDone = false;
    socket.to(room).emit("receive-msg", msg);
    if (
      socket.id !== roomData.currPlayer.id &&
      msg.content.toLowerCase() === roomData.currentWord.toLowerCase()
    ) {
      for (const player of roomData.players) {
        if (player.id === socket.id) {
          player.points += 1;
          io.sockets.in(room).emit("round-end", { winner: player.name });
          if (player.points === 5) {
            //end game
            io.sockets.in(room).emit("game-end", { winner: player.name });
            gameDone = true;
          }
          break;
        }
      }
      roomData.isRoundDone[roomData.currRound] = true;
      roomData.currRound += 1;
      if (!gameDone) startGame(room);
    }
  });

  socket.on("player-ready", ({ current: readyUp }) => {
    //modify the ready status of the room
    //and broadcast that status to every other client in the same room
    console.log(readyUp);
    const user = clientData[socket.id];
    if (!user) return;
    const room = user.room;
    //check if the given socket is in a room, if not simply return
    //if yes, determine if the user's ready up state has changed
    //and modify it accordingly if so
    //then emit event to other users in the room signifying this ready up status change
    if (user.isReady != readyUp) {
      user.isReady = readyUp;
      if (readyUp) {
        rooms[room].playersReady += 1;
      } else {
        rooms[room].playersReady -= 1;
      }
      const playersReady = rooms[room].playersReady;
      const totalPlayers = rooms[room].players.length;
      socket.to(room).emit("player-ready", {
        name: user.name,
        readyUp,
        playersReady,
        totalPlayers,
      });

      if (playersReady == totalPlayers) {
        startGame(room);
      }
    }
  });
});

server.listen(8080, () => {
  console.log("Server listening on port 8080");
});
