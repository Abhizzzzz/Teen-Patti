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
const teenPattiAlgo = require('./teen-patti-algo');

// let room = {
//     123: 1,
//     "totalCountOfPlayers": 3,
//     456: 2,
//     789: 3,
//     "1.C1": "2s",
//     "1.C2": "6s",
//     "1.C3": "6c",
//     "1.isBlind": true,
//     "1.isSideShowAvail": false,
//     "1.isPacked": false,
//     "2.C1": "8c",
//     "2.C2": "6h",
//     "2.C3": "Ks",
//     "2.isBlind": true,
//     "2.isSideShowAvail": false,
//     "2.isPacked": false,
//     "3.C1": "6d",
//     "3.C2": "Ad",
//     "3.C3": "9s",
//     "3.isBlind": true,
//     "3.isSideShowAvail": false,
//     "2.isPacked": false,
//     "turn": 1
// }

let setServer = (server) => {

    let io = socketio.listen(server);
    let myIo = io.of('teen-patti');

    myIo.on('connection', (socket) => {

        console.log("Socket connection");

        // playerId
        socket.on('verify-player', (data) => {
            console.log("*********verify-player***************", data.playerId);
            socket.playerId = data.playerId;
            searchRoom(socket, io);
        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('see-cards', (data) => {
            console.log("*********see-cards***************", data.playerId);
            // side-show available for previous player and make isblind false
            data.myPlayerNumber = data.playerNumber;
            seeCards(data, socket, io);
        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('blind', (data) => {
            console.log("*********blind***************", data.playerId);
            data.myPlayerNumber = data.playerNumber;
            blind(data, socket, io);

        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('chaal', (data) => {
            console.log("*********chaal***************", data.playerId);
            data.myPlayerNumber = data.playerNumber;
            chaal(data, socket, io)

        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('side-show', (data) => {
            console.log("*********side-show***************", data.playerId);
            data.myPlayerNumber = data.playerNumber;
            sideShow(data, socket, io);

        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('pack', (data) => {
            console.log("*********pack***************", data.playerId);
            data.myPlayerNumber = data.playerNumber;
            pack(data, socket, io);

        });

        // playerId,playerNumber,roomId,totalCountOfPlayers
        socket.on('show', (data) => {
            console.log("*********show***************", data.playerId);
            data.myPlayerNumber = data.playerNumber;
            show(data, socket, io);

        });

        // disconnect
        // As we close the client side browsers tab,disconnect event emits
        socket.on('disconnect', () => {
            console.log("Player disconnected", socket.playerId, socket.roomId);
            if (socket.playerId && socket.roomId) {
                redisLib.getAllInfoInAHash(socket.roomId, (err, response) => {
                    if (err) {
                        console.log(err);
                    }
                    else if (response.hasOwnProperty("state")) {
                        // game have'nt started
                        if (response.state === 'room-not-full') {
                            redisLib.incrDecrAInfoInAHash('Player-List', "PlayerCount", -1, (err, decremented) => {
                                if (err) {

                                }
                                else {
                                    redisLib.deleteFromAHash(socket.roomId, socket.playerId);
                                    redisLib.incrDecrAInfoInAHash(socket.roomId, totalCountOfPlayers, -1, (err, decr));
                                    io.in(socket.roomId).emit('player-left', socket.playerId, socket.playerNumber);
                                }
                            });
                        }// player left while game in progress
                        else {
                            // my turn
                            if (response.turn === socket.playerNumber) {
                                data.totalCountOfPlayers = response.totalCountOfPlayers;
                                pack(data, socket, io);
                                io.in(socket.roomId).emit('player-left', socket.playerId, socket.playerNumber);
                            }
                            else {
                                redisLib.deleteFromAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                    else {
                                        io.in(socket.roomId).emit('player-left', socket.playerId, socket.playerNumber);
                                    }
                                });
                            }
                        }
                    }
                    // game is not started yet
                    else {
                        redisLib.incrDecrAInfoInAHash('Player-List', "PlayerCount", -1, (err, decremented) => {
                            if (err) {

                            }
                            else {
                                redisLib.deleteFromAHash(socket.roomId, socket.playerId);
                                redisLib.incrDecrAInfoInAHash(socket.roomId, totalCountOfPlayers, -1, (err, decr));
                                io.in(socket.roomId).emit('player-left', socket.playerId, socket.playerNumber);
                            }
                        });
                    }
                });
            }
            else {
                console.log("Player left before joining a room");
            }
        });
    });

}; // end of setServer


let searchRoom = (socket, io) => {
    console.log("search-room");
    redisLib.getAllInfoInAHash(`Room-List`, (err, responseRoom) => {
        if (err) {
            console.log(err);
        }
        // need to create a new room
        else if (check.isEmpty(responseRoom)) {
            let roomId = shortid.generate();
            redisLib.setANewInfoInAHash(`Room-List`, (err, resultRoom) => {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("Room created - ", roomId);
                    addPlayerInRoom(roomId, socket, io);
                }
            }, 'RoomNo', roomId);
        }
        // existing room available
        else {
            console.log(" Found room to join - ", responseRoom);
            addPlayerInRoom(responseRoom, socket, io);
        }
    })
};

let addPlayerInRoom = (roomId, socket, io) => {
    let getPlayerList = () => {
        return new Promise((resolve, reject) => {
            redisLib.getAllInfoInAHash(`Player-List`, (err, responsePlayer) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                else {
                    resolve(responsePlayer);
                }
            });
        });
    };

    let checkPlayerList = (responsePlayer) => {
        return new Promise((resolve, reject) => {
            // create player-list from 1
            if (check.isEmpty(responsePlayer) || parseInt(responsePlayer.PlayerCount) <= 0) {
                redisLib.setANewInfoInAHash(`Player-List`, (err, resultPlayer) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    else {
                        let currentPlayers = 1;
                        redisLib.setANewInfoInAHash(roomId, (err, resultRoomId) => {
                            if (err) {
                                console.log(err);
                                reject(err);
                            }
                            else {
                                redisLib.getAllInfoInAHash(roomId, (err, responseRoom) => {
                                    if (err) {
                                        console.log(err);
                                        reject(err);
                                    }
                                    else {
                                        let data = {
                                            roomId: roomId,
                                            roomDetails: responseRoom
                                        };
                                        socket.join(roomId);
                                        socket.roomId = roomId;
                                        socket.player = currentPlayers;
                                        io.in(roomId).emit('player-joined', data);
                                        console.log("Player joined", data);
                                        fsmState("room-not-full", data, socket, io);
                                        resolve(data);
                                    }
                                });

                            }
                        }, socket.playerId, currentPlayers, 'totalCountOfPlayers', currentPlayers);
                    }
                }, "PlayerCount", 1);
            }
            // use the old player-list
            else {
                resolve(responsePlayer);
            }
        });
    }

    let addPlayers = (responsePlayer) => {
        return new Promise((resolve, reject) => {
            if (responsePlayer.roomId) {
                resolve(responsePlayer);
            }
            else {
                let currentPlayers = parseInt(responsePlayer.PlayerCount) + 1;
                console.log("Current Players", currentPlayers);
                // joining the existing room
                if (currentPlayers <= maxPlayers) {
                    redisLib.setANewInfoInAHash(`Player-List`, (err, resultPlayer) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        }
                        else {
                            let currentPlayers = 1;
                            redisLib.setANewInfoInAHash(roomId, (err, resultRoomId) => {
                                if (err) {
                                    console.log(err);
                                    reject(err);
                                }
                                else {
                                    redisLib.getAllInfoInAHash(roomId, (err, responseRoom) => {
                                        if (err) {
                                            console.log(err);
                                            reject(err);
                                        }
                                        else {
                                            let data = {
                                                roomId: roomId,
                                                roomDetails: responseRoom
                                            };
                                            socket.join(roomId);
                                            socket.roomId = roomId;
                                            socket.player = currentPlayers;
                                            io.in(roomId).emit('player-joined', data);
                                            console.log("Player joined", data);
                                            resolve(data);
                                            if (currentPlayers === minPlayers) {
                                                setTimeout(() => {
                                                    fsmState("room-full", data, socket, io);
                                                }, 10000);
                                            }
                                        }
                                    });

                                }
                            }, socket.playerId, currentPlayers, 'totalCountOfPlayers', currentPlayers);
                        }
                    }, "PlayerCount", 1);
                }
                // init player-list and create a new room
                else {
                    let roomId = shortid.generate();
                    redisLib.setANewInfoInAHash(`Room-List`, (err, resultPlayer) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        }
                        else {
                            redisLib.setANewInfoInAHash(`Player-List`, (err, resultPlayer) => {
                                if (err) {
                                    console.log(err);
                                    reject(err);
                                }
                                else {
                                    let currentPlayers = 1;
                                    redisLib.setANewInfoInAHash(roomId, (err, resultRoomId) => {
                                        if (err) {
                                            console.log(err);
                                            reject(err);
                                        }
                                        else {
                                            redisLib.getAllInfoInAHash(roomId, (err, responseRoom) => {
                                                if (err) {
                                                    console.log(err);
                                                    reject(err);
                                                }
                                                else {
                                                    let data = {
                                                        roomId: roomId,
                                                        roomDetails: responseRoom
                                                    };
                                                    socket.join(roomId);
                                                    socket.roomId = roomId;
                                                    socket.player = currentPlayers;
                                                    io.in(roomId).emit('player-joined', data);
                                                    console.log("Player joined", data);
                                                    fsmState("room-not-full", data, socket, io);
                                                    resolve(data);
                                                }
                                            });

                                        }
                                    }, socket.playerId, currentPlayers, 'totalCountOfPlayers', currentPlayers);
                                }
                            }, "PlayerCount", 1);
                        }
                    }, "RoomNo", roomId);
                }
            }
        });
    };

    getPlayerList(roomId, socketio, io)
        .then(checkPlayerList)
        .then(addPlayers)
        .then((resolve) => {
            console.log("Success");
        }).catch((err) => {
            console.log("Error", err);
        });
};

let seeCards = (data, socket, io) => {
    redisLib.setANewInfoInAHash(data.roomId, (err, response) => {
        if (err) {
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
                seeCards(data, socket, io);
            }
        }
    }, `${data.playerNumber}.isBlind`, false);
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
                        io.in(data.roomId).emit('blind-played', data.playerId, data.playerNumber);
                    }
                }, 'turn', data.playerNumber);
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
                        io.in(data.roomId).emit('chaal-played', data.playerId, data.playerNumber);
                    }
                }, 'turn', data.playerNumber);
            }
        });
    }
    else {
        data.playerNumber = 0;
        chaal(data, socket, io);
    }

};

let sideShow = (data, socket, io) => {


    if (data.playerNumber === 1) {

        data.playerNumber = data.playerNumber--;
        redisLib.getAParticularInfoInAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(response)) {
                sideShow(data, socket, io);
            }
            else {
                redisLib.setANewInfoInAHash(data.roomId, (err, response) => {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        redisLib.getAllInfoInAHash(data.roomId, (err, responseRoom) => {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                data.P1.cardsScore = teenPattiAlgo.cardsScore([`${data.myPlayerNumber}.C1`, `${data.myPlayerNumber}.C2`, `${data.myPlayerNumber}.C3`]);
                                data.P2.cardsScore = teenPattiAlgo.cardsScore([`${data.playerNumber}.C1`, `${data.playerNumber}.C2`, `${data.playerNumber}.C3`]);
                                if (data.P1.cardsScore > data.P2.cardsScore) {
                                    pack(data, socket, io);
                                }
                                else {
                                    data.playerNumber = data.myPlayerNumber;
                                    pack(data, socket, io);
                                }

                            }
                        });
                    }
                }, 'turn', data.playerNumber);
            }
        });
    }
    else {
        data.playerNumber = data.totalCountOfPlayers + 1;
        sideShow(data, socket, io);
    }

};

let pack = (data, socket, io) => {
    redisLib.deleteFromAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
        if (err) {
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
                                io.in(data.roomId).emit('packed', data.playerId, data.playerNumber);
                            }
                        }, 'turn', data.playerNumber);
                    }
                });
            }
            else {
                data.playerNumber = 0;
                pack(data, socket, io);
            }
        }
    });
};

let show = (data, socket, io) => {


    if (data.playerNumber === 1) {

        data.playerNumber = data.playerNumber--;
        redisLib.getAParticularInfoInAHash(data.roomId, `${data.playerNumber}.isPacked`, (err, response) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(response)) {
                show(data, socket, io);
            }
            else {
                redisLib.setANewInfoInAHash(data.roomId, (err, response) => {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        redisLib.getAllInfoInAHash(data.roomId, (err, responseRoom) => {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                data.P1.cardsScore = teenPattiAlgo.cardsScore([`${data.myPlayerNumber}.C1`, `${data.myPlayerNumber}.C2`, `${data.myPlayerNumber}.C3`]);
                                data.P2.cardsScore = teenPattiAlgo.cardsScore([`${data.playerNumber}.C1`, `${data.playerNumber}.C2`, `${data.playerNumber}.C3`]);
                                if (data.P1.cardsScore > data.P2.cardsScore) {
                                    data.winner = myPlayerNumber;
                                    pack(data, socket, io);
                                    fsmState("winner-declared", data, socket, io);
                                }
                                else {
                                    data.playerNumber = data.myPlayerNumber;
                                    data.winner = playerNumber;
                                    pack(data, socket, io);
                                    fsmState("winner-declared", data, socket, io);
                                }

                            }
                        });
                    }
                }, 'turn', data.playerNumber);
            }
        });
    }
    else {
        data.playerNumber = data.totalCountOfPlayers + 1;
        show(data, socket, io);
    }

};

let distributeCards = (count) => {
    let deck = ['02h', '03h', '04h', '05h', '06h', '07h', '08h', '09h', '10h', '11h', '12h', '13h', '14h',
        '02s', '03s', '04s', '05s', '06s', '07s', '08s', '09s', '10s', '11s', '12s', '13s', '14s',
        '02c', '03c', '04c', '05c', '06c', '07c', '08c', '09c', '10c', '11c', '12c', '13c', '14c',
        '02d', '03d', '04d', '05d', '06d', '07d', '08d', '09d', '10d', '11d', '12d', '13d', '14d',
    ];
    let cards = [];
    for (let i = 0; i < count; i++) {
        deck.sort(() => Math.random() - 0.5);
        cards.push(deck.pop());
    }
    return cards;
};

// totalCards = distributeCards(3*3);
// console.log("totalCards",totalCards);
// for(let i = 0;i<3;i++){
//     console.log(`${i+1}.C1`,totalCards[0],`${i+1}.C2`,totalCards[1],`${i+1}.C3`,totalCards[2]);
//     totalCards.splice(0,3);
//     console.log("cardsLeft",totalCards);
// }

// console.log(teenPattiAlgo.cardsScore(['14h', '13d', '11c']));


fsmState = (transition, data, socket, io) => {
    console.log("fsmstate", transition);
    switch (transition) {
        case "room-full":
            fsmState("init", data, socket, io);
            break;
        case "init-round":
            redisLib.getAllInfoInAHash(socket.roomId, (err, result) => {
                if (err) {
                    console.log(err);
                }
                else {
                    let totalCards = distributeCards((result.totalCountOfPlayers) * 3);
                    for (let i = 0; i < result.totalCountOfPlayers; i++) {
                        redisLib.setANewInfoInAHash(socket.roomId, (err, response) => {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                totalCards.splice(0, 3);
                            }
                        }, `${i + 1}.C1`, totalCards[0], `${i + 1}.C2`, totalCards[1], `${i + 1}.C3`, totalCards[2], `${i + 1}.isBlind`, true, `${i + 1}.isSideShowAvail`, false, `${i + 1}.isPacked`, false);
                    }

                    fsmState("start-game", data, socket, io);

                }
            });
            break;
        case "start-game":
            redisLib.setANewInfoInAHash(socket.roomId, (err, response) => {
                if (err) {
                    console.log(err);
                }
                else {
                    redisLib.getAllInfoInAHash(socket.roomId, (err, result) => {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            io.in(socket.roomId).emit('start-game', result);
                        }
                    });

                }
            }, 'state', 'game-in-progress', 'turn', 1);
            break;
        case "winner-declared":
            redisLib.setANewInfoInAHash(socket.roomId, (err, response) => {
                if (err) {
                    console.log(err);
                }
                else {
                    redisLib.getAllInfoInAHash(socket.roomId, (err, result) => {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            io.in(socket.roomId).emit('winner-declared', result);
                            redisLib.deleteAHash(data.roomId);
                        }
                    });

                }
            }, 'state', 'winner-declared', 'winner', data.winner);
            break;
        default:
            // room-not-full
            redisLib.setANewInfoInAHash(socket.roomId, (err, response) => {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log('room-not-full');
                }
            }, 'state', 'room-not-full');
            break;
    }
};

module.exports = {
    setServer: setServer
};