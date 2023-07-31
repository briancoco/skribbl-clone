import React, { useState, useEffect, useRef } from "react";

const Chat = ({ socket, name, msgs, setMsgs }) => {
  const [chatInput, setChatInput] = useState("");
  const msgsRef = useRef();
  msgsRef.current = msgs;

  const handleSend = (e) => {
    e.preventDefault();
    const copy = [...msgs];
    copy.push(`You: ${chatInput}`);
    setMsgs(copy);
    setChatInput("");
    socket.emit("send-msg", { name, content: chatInput });
  };

  const handleReceive = ({ name, content }) => {
    const copy = [...msgsRef.current];
    copy.push(`${name}: ${content}`);
    setMsgs(copy);
  };

  useEffect(() => {
    socket.on("receive-msg", (msg) => handleReceive(msg));

    socket.on(
      "player-ready",
      ({ name, readyUp, playersReady, totalPlayers }) => {
        const copy = [...msgsRef.current];
        copy.push(
          `${name} is ${
            readyUp ? "ready" : "not ready"
          } (${playersReady}/${totalPlayers})`
        );
        setMsgs(copy);
      }
    );

    socket.on("round-end", ({ winner }) => {
      const copy = [...msgsRef.current];
      copy.push(`${winner} guessed right!`);
      setMsgs(copy);
    });

    socket.on("game-end", ({ winner }) => {
      const copy = [...msgsRef.current];
      copy.push(`${winner} won the game!!`);
      setMsgs(copy);
    });
  }, []);

  return (
    <div className="Chat">
      <section className="chatBox">
        {msgs.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </section>
      <span className="chatSend">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          type="text"
          className="formInput"
          required
        ></input>
        <button className="sendBtn btn" onClick={handleSend} type="submit">
          Send
        </button>
      </span>
    </div>
  );
};

export default Chat;
