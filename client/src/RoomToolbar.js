import React, { useState, useEffect, useRef } from "react";

const RoomToolbar = ({ socket, name, setName }) => {
  const [room, setRoom] = useState("");
  const [curr, setCurr] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(isReady);

  const handleRoomJoin = (e) => {
    e.preventDefault();
    setCurr({ name, room });
    //if a user joins the same room twice, this will mess up the player count locally
    //this is b/c we currently have no way of determining if the user is already in the room or not
    socket.emit("join-room", { name, room });
  };

  const handleReady = () => {
    setIsReady((prevReady) => {
      isReadyRef.current = !prevReady;
      socket.emit("player-ready", isReadyRef);
      return !prevReady;
    });
  };

  return (
    <>
      <div className="userRoom">
        {curr && `${curr.name} is currently in ${curr.room}`}
      </div>
      <form className="RoomToolbar" onSubmit={handleRoomJoin}>
        <div>
          <label htmlFor="nameInput">Name: </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            id="nameInput"
            className="formInput"
            required
            type="text"
          ></input>
        </div>

        <div>
          <label htmlFor="roomInput">Room: </label>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            id="roomInput"
            className="formInput"
            required
            type="text"
          ></input>
        </div>

        <button type="submit" className="btn">
          Submit
        </button>
        <button className="btn" type="btn" onClick={handleReady}>
          {isReady ? "Ready Down" : "Ready Up"}
        </button>
      </form>
    </>
  );
};

export default RoomToolbar;
