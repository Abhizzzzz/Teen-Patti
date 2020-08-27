const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const check = require('./checkLib');
const response = require('./responseLib');
const events = require('events');
const eventEmitter = new events.EventEmitter();
const redisLib = require('../libs/redisLib');
const { search } = require('../..');
redisLib.setAOnlineInAHash("hashName",(err,is) =>{
    console.log(is);
},"key","value","key1","key2");

let setServer = (server) =>{
    // required to create a connection,initialize the socketio,syntax of initializing socketio
    let io = socketio.listen(server);
    let myIo = io.of('teen-patti');

    myIo.on('connection',(socket) =>{

        console.log("Socket connection");

        // playerId
        socket.on('verify-player',(data) =>{
            console.log("*********verify-player***************",data.playerId);
            socket.playerId = data.playerId;
            searchRoom(socket,io);

        });

        // disconnect
        // As we close the client side browsers tab,disconnect event emits
        socket.on('disconnect',() =>{
            console.log("Player disconnected");
        });
    });

}; // end of setServer


let searchRoom = (socket,io) =>{
    console.log("search-room");

};


fsmState = (transition,data) =>{
    console.log("fsmstate",transition);
    switch (transition) {
        case "room-full":
            
            break;
    
        default:
            // room-not-full
            break;
    }
};

module.exports = {
    setServer: setServer
};