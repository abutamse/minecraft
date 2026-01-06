import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer,{ cors:{ origin:"*" }});

app.use(express.static(".")); // Serviert HTML/JS

const players = new Map(); // socket.id -> {name,pos}
const blocks = new Map();  // key -> {type}
const key=(x,y,z)=>`${x},${y},${z}`;

io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  socket.on("spawn", data=>{
    players.set(socket.id,{name:data.name,pos:data.pos});
    socket.emit("updatePlayers", Array.from(players.entries()).map(([id,p])=>({id,...p})));
    for(const [k,b] of blocks.entries()){
      const [x,y,z] = k.split(",").map(Number);
      socket.emit("addBlock",{x,y,z,type:b.type});
    }
  });

  socket.on("move", data=>{
    if(players.has(socket.id)){
      players.get(socket.id).pos = data.pos;
      io.emit("updatePlayers", Array.from(players.entries()).map(([id,p])=>({id,...p})));
    }
  });

  socket.on("addBlock", data=>{
    const k=key(data.x,data.y,data.z);
    if(!blocks.has(k)){ blocks.set(k,{type:data.type}); io.emit("addBlock", data); }
  });

  socket.on("removeBlock", data=>{
    const k=key(data.x,data.y,data.z);
    if(blocks.has(k)){ blocks.delete(k); io.emit("removeBlock", data); }
  });

  socket.on("disconnect", ()=>{
    players.delete(socket.id);
    io.emit("removePlayer", socket.id);
  });
});

httpServer.listen(3000,()=>console.log("Server läuft auf http://localhost:3000"));
