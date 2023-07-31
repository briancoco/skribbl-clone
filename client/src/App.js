import { useState, useEffect, useRef } from "react";
import RoomToolbar from "./RoomToolbar";
import Chat from "./Chat";
import { io } from "socket.io-client";
import useTimer from "react-timer-hook";
import Timer from "./Timer";
import logo from "./assets/logo.gif";
const socket = io("http://localhost:8080");
socket.connect();
socket.on("connect", () => console.log("client connected"));

function App() {
  const [name, setName] = useState("");
  const [word, setWord] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const drawing = useRef(false);
  const currentDrawer = useRef(false);
  const time = new Date();
  time.setSeconds(time.getSeconds() + 60);
  const timer = useTimer({
    expiryTimestamp: time,
  });

  useEffect(() => {
    timer.pause();
    socket.on("draw-client", (e) => {
      drawing.current = true;
      draw(e);
    });

    socket.on("draw-end", () => {
      finishDrawing({ receiving: true });
    });

    socket.on("current-drawer", ({ wordToDraw }) => {
      currentDrawer.current = true;
      setWord(wordToDraw);
    });

    socket.on("current-guesser", () => {
      currentDrawer.current = false;
      setWord(null);
    });

    socket.on("new-player", ({ name }) => {
      setMsgs((prevMsgs) => {
        console.log("New player");
        return [...prevMsgs, `${name} has joined!`];
      });
    });

    const canvas = canvasRef.current;
    contextRef.current = canvas.getContext("2d");
    canvas.height = "500";
    canvas.width = "500";
    contextRef.current.lineWidth = 10;
    contextRef.current.lineCap = "round";

    socket.on("clear-board", () => {
      contextRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      const time = new Date();
      time.setSeconds(time.getSeconds() + 60);
      timer.restart(time);
    });
  }, []);

  const startDrawing = (e) => {
    if (!currentDrawer.current) return;
    drawing.current = true;
    draw(e);
  };

  const finishDrawing = (e) => {
    if (!e.receiving && !currentDrawer.current) return;
    drawing.current = false;
    contextRef.current.beginPath();
    if (e && !e.receiving) socket.emit("draw-end");
  };

  const draw = (e) => {
    if (!drawing.current) return;

    const { left, top } = canvasRef.current.getBoundingClientRect();
    const canvasX = e.canvasX ? e.canvasX : e.clientX - left;
    const canvasY = e.canvasY ? e.canvasY : e.clientY - top;

    contextRef.current.lineTo(canvasX, canvasY);
    contextRef.current.stroke();
    contextRef.current.beginPath();
    contextRef.current.moveTo(canvasX, canvasY);

    if (!e.canvasX && !e.canvasY)
      socket.emit("draw-server", { canvasX, canvasY });
  };

  return (
    <div className="App">
      <img src={logo} />
      {word && <div>Word to draw: {word}</div>}
      <Timer timer={timer} />
      <RoomToolbar socket={socket} name={name} setName={setName} />
      <div className="drawContainer">
        <canvas
          className="canvas"
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
        />
        <Chat socket={socket} name={name} msgs={msgs} setMsgs={setMsgs} />
      </div>
    </div>
  );
}

export default App;
