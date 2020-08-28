const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const check = require('./checkLib');
const response = require('./responseLib');
const events = require('events');
const eventEmitter = new events.EventEmitter();
const redisLib = require('../libs/redisLib');
const maxPlayers = 6;
const minPlayers = 2;

let setServer = (server) =>{
    
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
    redisLib.getAllInfoInAHash(`Room-List`,(err,responseRoom) =>{
        if(err){
            console.log(err);
        }
        // need to create a new room
        else if(check.isEmpty(responseRoom)){
            let roomId = shortid.generate();
            redisLib.setANewInfoInAHash(`Room-List`,(err,resultRoom) =>{
                if(err){
                    console.log(err);
                }
                else{
                    console.log("Room created - ",roomId);
                    addPlayerInRoom(roomId,socket,io);
                }
            },'RoomNo',roomId);
        }
        // existing room available
        else{
            console.log(" Found room to join - ",responseRoom);
            addPlayerInRoom(responseRoom,socket,io);
        }
    })
};

let addPlayerInRoom = (roomId,socket,io) =>{
    redisLib.getAllInfoInAHash(`Player-List`,(err,responsePlayer) =>{
        if(err){
            console.log(err);
        }
        // create player-list from 1
        else if(check.isEmpty(responsePlayer) || parseInt(responsePlayer.PlayerCount) <= 0){
            redisLib.setANewInfoInAHash(`Player-List`,(err,resultPlayer) =>{
                if(err){
                    console.log(err);
                }
                else{
                    let currentPlayers = 1;
                    redisLib.setANewInfoInAHash(roomId,(err,resultRoomId) =>{
                        if(err){
                            console.log(err);
                        }
                        else{
                            redisLib.getAllInfoInAHash(roomId,(err,responseRoom) =>{
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    let data = {
                                        roomId: roomId,
                                        roomDetails: responseRoom
                                    };
                                    socket.join(roomId);
                                    socket.roomId = roomId;
                                    socket.player = currentPlayers;
                                    io.in(roomId).emit('player-joined',data);
                                    console.log("Player joined",data);
                                    fsmState("room-not-full",data,null,null);
                                }
                            });
                            
                        }
                    },socket.playerId,currentPlayers,'totalCountOfPlayers',currentPlayers);
                }
            },"PlayerCount",1);
        }
        // use the old player-list
        else{
            let currentPlayers = parseInt(responsePlayer.PlayerCount) + 1;
            console.log("Current Players",currentPlayers);
            if(currentPlayers <= maxPlayers){
                redisLib.setANewInfoInAHash(`Player-List`,(err,resultPlayer) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        let currentPlayers = 1;
                        redisLib.setANewInfoInAHash(roomId,(err,resultRoomId) =>{
                            if(err){
                                console.log(err);
                            }
                            else{
                                redisLib.getAllInfoInAHash(roomId,(err,responseRoom) =>{
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        let data = {
                                            roomId: roomId,
                                            roomDetails: responseRoom
                                        };
                                        socket.join(roomId);
                                        socket.roomId = roomId;
                                        socket.player = currentPlayers;
                                        io.in(roomId).emit('player-joined',data);
                                        console.log("Player joined",data);
                                        if(currentPlayers === minPlayers){
                                            setTimeout(() => {
                                                fsmState("room-full",data,socket,io);
                                            }, 10000);
                                        }
                                    }
                                });
                                
                            }
                        },socket.playerId,currentPlayers,'totalCountOfPlayers',currentPlayers);
                    }
                },"PlayerCount",1);
            }
            // init player-list and create a new room
            else{
                let roomId = shortid.generate();
                redisLib.setANewInfoInAHash(`Room-List`,(err,resultPlayer) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        redisLib.setANewInfoInAHash(`Player-List`,(err,resultPlayer) =>{
                            if(err){
                                console.log(err);
                            }
                            else{
                                let currentPlayers = 1;
                                redisLib.setANewInfoInAHash(roomId,(err,resultRoomId) =>{
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        redisLib.getAllInfoInAHash(roomId,(err,responseRoom) =>{
                                            if(err){
                                                console.log(err);
                                            }
                                            else{
                                                let data = {
                                                    roomId: roomId,
                                                    roomDetails: responseRoom
                                                };
                                                socket.join(roomId);
                                                socket.roomId = roomId;
                                                socket.player = currentPlayers;
                                                io.in(roomId).emit('player-joined',data);
                                                console.log("Player joined",data);
                                                fsmState("room-not-full",data,null,null);
                                            }
                                        });
                                        
                                    }
                                },socket.playerId,currentPlayers,'totalCountOfPlayers',currentPlayers);
                            }
                        },"PlayerCount",1);
                    }
                },"RoomNo",roomId);
            }
        }
    });
};


fsmState = (transition,data,socket,io) =>{
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