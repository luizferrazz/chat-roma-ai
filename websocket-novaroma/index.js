const wbs = require("ws");

const ws = new wbs.Server({ port: 3000 });

ws.on("connection", (Socket) => {
  Socket.on("message", (msg) => {
    console.log(msg);
  });
});
