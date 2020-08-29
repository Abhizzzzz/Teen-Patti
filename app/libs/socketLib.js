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
const shuffle = require('shuffle-array');
let room = {
    123: 1,
    "totalCountOfPlayers": 3,
    456: 2,
    789: 3,
    "1.C1": "2s",
    "1.C2": "6s",
    "1.C3": "6c",
    "1.isBlind": true,
    "1.isSideShowAvail": false,
    "1.isPacked": false,
    "2.C1": "8c",
    "2.C2": "6h",
    "2.C3": "Ks",
    "2.isBlind": true,
    "2.isSideShowAvail": false,
    "2.isPacked": false,
    "3.C1": "6d",
    "3.C2": "Ad",
    "3.C3": "9s",
    "3.isBlind": true,
    "3.isSideShowAvail": false,
    "2.isPacked": false,
    "turn": 1
}

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

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('see-cards',(data) =>{
            console.log("*********see-cards***************",data.playerId);
            // side-show available for previous player and make isblind false
            seeCards(data,socket,io);
        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('blind',(data) =>{
            console.log("*********blind***************",data.playerId);
            blind(data,socket,io);
            
        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('chaal',(data) =>{
            console.log("*********chaal***************",data.playerId);
            chaal(data,socket,io)
            
        });

        // playerId,playerNumber
        socket.on('side-show',(data) =>{
            console.log("*********blind***************",data.playerId);
            redisLib.setANewInfoInAHash()
            
        });

        // playerId,playerNumber
        socket.on('pack',(data) =>{
            console.log("*********side-show***************",data.playerId);
            pack(data,socket,io);
            
        });

        // playerId,playerNumber
        socket.on('show',(data) =>{
            console.log("*********show***************",data.playerId);
            redisLib.setANewInfoInAHash()
            
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
                                    fsmState("room-not-full",data,socket,io);
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
                                                fsmState("room-not-full",data,socket,io);
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

let seeCards = (data,socket,io) =>{
    redisLib.setANewInfoInAHash(data.roomId,(err,response) =>{
        if(err){
            console.log(err);
        }
        else {
            if (data.playerNumber < data.totalCountOfPlayers) {

                data.playerNumber = data.playerNumber++;
                redisLib.getAParticularInfoInAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
                    if (err) {
                        console.log(err);
                    }
                    else if (check.isEmpty(response)) {
                        seeCards(data, socket, io);
                    }
                    else {
                        redisLib.setANewInfoInAHash(data.roomId, (err, response) => {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                io.in(data.roomId).emit('saw-cards', data.playerId);
                            }
                        }, `${data.playerNumber}.isSideShowAvail`, true);
                    }
                });
            }
            else {
                data.playerNumber = 0;
                seeCards(data,socket,io);
            }
        }
    },`${data.playerNumber}.isBlind`,false);
};

let blind = (data, socket, io) => {


    if (data.playerNumber < data.totalCountOfPlayers) {

        data.playerNumber = data.playerNumber++;
        redisLib.getAParticularInfoInAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(response)) {
                blind(data, socket, io);
            }
            else {
                redisLib.setANewInfoInAHash(data.roomId, (err, response) => {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        io.in(data.roomId).emit('blind-played', data.playerId,data.playerNumber);
                    }
                }, 'turn',data.playerNumber);
            }
        });
    }
    else {
        data.playerNumber = 0;
        blind(data, socket, io);
    }

};

let chaal = (data, socket, io) => {


    if (data.playerNumber < data.totalCountOfPlayers) {

        data.playerNumber = data.playerNumber++;
        redisLib.getAParticularInfoInAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(response)) {
                chaal(data, socket, io);
            }
            else {
                redisLib.setANewInfoInAHash(data.roomId, (err, response) => {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        io.in(data.roomId).emit('chaal-played', data.playerId,data.playerNumber);
                    }
                }, 'turn',data.playerNumber);
            }
        });
    }
    else {
        data.playerNumber = 0;
        chaal(data, socket, io);
    }

};

let pack = (data,socket,io) =>{
    redisLib.deleteFromAHash(data.roomId,`${data.playerNumber}.isPacked`,(err,response) =>{
        if(err){
            console.log(err);
        }
        else {
            if (data.playerNumber < data.totalCountOfPlayers) {

                data.playerNumber = data.playerNumber++;
                redisLib.getAParticularInfoInAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
                    if (err) {
                        console.log(err);
                    }
                    else if (check.isEmpty(response)) {
                        pack(data, socket, io);
                    }
                    else {
                        redisLib.setANewInfoInAHash(data.roomId, (err, response) => {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                io.in(data.roomId).emit('packed', data.playerId,data.playerNumber);
                            }
                        }, 'turn',data.playerNumber);
                    }
                });
            }
            else {
                data.playerNumber = 0;
                pack(data,socket,io);
            }
        }
    });
};

let distributeCards = (noOfPlayers) =>{
    let deck = ['Ah','2h','3h','4h','5h','6h','7h','8h','9h','Th','Jh','Qh','Kh',
                'As','2s','3s','4s','5s','6s','7s','8s','9s','Ts','Js','Qs','Ks',
                'Ac','2c','3c','4c','5c','6c','7c','8c','9c','Tc','Jc','Qc','Kc',
                'Ad','2d','3d','4d','5d','6d','7d','8d','9d','Td','Jd','Qd','Kd',
    ];

    let cards = shuffle.pick(deck,{'picks': noOfPlayers*3});
    return cards;
};

// totalCards = distributeCards(3);
// console.log("totalCards",totalCards);
// for(let i = 0;i<3;i++){
//     console.log(`${i+1}.C1`,totalCards[0],`${i+1}.C2`,totalCards[1],`${i+1}.C3`,totalCards[2]);
//     totalCards.splice(0,3);
//     console.log("cardsLeft",totalCards);
// }


fsmState = (transition, data, socket, io) => {
    console.log("fsmstate", transition);
    switch (transition) {
        case "room-full":
            fsmState("init",data,socket,io);
            break;
        case "init-round":
            redisLib.getAllInfoInAHash(socket.roomId,(err,result) =>{
                if(err){
                    console.log(err);
                }
                else{
                    let totalCards = distributeCards(result.totalCountOfPlayers);
                    for(let i=0;i<result.totalCountOfPlayers;i++){
                        redisLib.setANewInfoInAHash(socket.roomId,(err,response) =>{
                            if(err){
                                console.log(err);
                            }
                            else{
                                totalCards.splice(0,3);
                            }
                        },`${i+1}.C1`,totalCards[0],`${i+1}.C2`,totalCards[1],`${i+1}.C3`,totalCards[2],`${i+1}.isBlind`,true,`${i+1}.isSideShowAvail`,false,`${i+1}.isPacked`,false);
                    }

                    fsmState("start-game",data,socket,io);
                    
                }
            });
            break;
        case "start-game":
            redisLib.setANewInfoInAHash(socket.roomId,(err,response) =>{
                if(err){
                    console.log(err);
                }
                else{
                    redisLib.getAllInfoInAHash(socket.roomId,(err,result) =>{
                        if(err){
                            console.log(err);
                        }
                        else{
                            io.in(socket.roomId).emit('start-game',result);
                        }
                    });
                    
                }
            },'state','game-in-progress','turn',1);
            break;
        case "winner-declared":

            break;
        default:
            // room-not-full
            redisLib.setANewInfoInAHash(socket.roomId,(err,response) =>{
                if(err){
                    console.log(err);
                }
                else{
                    console.log('room-not-full');
                }
            },'state','room-not-full');
            break;
    }
};

module.exports = {
    setServer: setServer
};