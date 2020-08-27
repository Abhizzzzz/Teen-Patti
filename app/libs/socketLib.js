const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const check = require('./checkLib');
const response = require('./responseLib');
const events = require('events');
const eventEmitter = new events.EventEmitter();
const redisLib = require('../libs/redisLib');

let setServer = (server) =>{
    // required to create a connection,initialize the socketio,syntax of initializing socketio
    let io = socketio.listen(server);
    let myIo = io.of('teen-patti');

    myIo.on('connection',(socket) =>{

        console.log("Socket connection");

        // disconnect
        // As we close the client side browsers tab,disconnect event emits
        socket.on('disconnect',() =>{
            console.log("User is disconnected");
        });
    });

}; // end of setServer

module.exports = {
    setServer: setServer
};