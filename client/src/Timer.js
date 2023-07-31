import React from "react";

const Timer = ({ timer }) => {
  return (
    <div className="Timer">
      {timer.minutes} : {timer.seconds}
    </div>
  );
};

export default Timer;
