const check = require('../libs/checkLib');
const redis =require('ioredis');

let client = new redis({
    port: 17544,
    host: 'redis-17544.c57.us-east-1-4.ec2.cloud.redislabs.com',
    password: 'Phf5zdxxlCAJAD2HBUSil69sajkN5KXT'
});

client.on('connect',() =>{
    console.log("Redis connection open success");
});

let getAllInAHash = (hashName,callBack) =>{
    client.hgetall(hashName,(err,result) =>{
        if(err){
            console.log(err);
            callBack(err,null);
        }
        else if(check.isEmpty(result)){
            console.log(" list is empty");
            console.log(result);
            callBack(null,{});
        }
        else{
            console.log(result);
            callBack(null,result);
        }
    });
};

let setAOnlineInAHash = (hashName,callBack,...keyValues) =>{
    client.hmset(hashName,keyValues,(err,result) =>{
        if(err){
            console.log(err);
            callBack(err,null);
        }
        else{
            console.log(" set online successfully");
            console.log(result);
            callBack(null,result);
        }
    });
};

let deleteFromAHash = (hashName,key) =>{
    client.hdel(hashName,key);
    return true;
};


module.exports = {
    getAllInAHash: getAllInAHash,
    setAOnlineInAHash: setAOnlineInAHash,
    deleteFromAHash: deleteFromAHash
};