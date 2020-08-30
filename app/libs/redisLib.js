const check = require('../libs/checkLib');
const redis = require('ioredis');

let client = new redis({
    port: 17544,
    host: 'redis-17544.c57.us-east-1-4.ec2.cloud.redislabs.com',
    password: 'Phf5zdxxlCAJAD2HBUSil69sajkN5KXT'
});

client.on('connect', () => {
    console.log("Redis connection open success");
});

let getAllInfoInAHash = (hashName, callBack) => {
    client.hgetall(hashName, (err, result) => {
        if (err) {
            console.log(err);
            callBack(err, null);
        }
        else if (check.isEmpty(result)) {
            console.log(" list is empty");
            console.log(result);
            callBack(null, {});
        }
        else {
            console.log(result);
            callBack(null, result);
        }
    });
};

let getAParticularInfoInAHash = (hashName, key, callBack) => {
    client.hget(hashName, key, (err, result) => {
        if (err) {
            console.log(err);
            callBack(err, null);
        }
        else if (check.isEmpty(result)) {
            console.log(" list is empty");
            console.log(result);
            callBack(null, {});
        }
        else {
            console.log(result);
            callBack(null, result);
        }
    });
};

let setANewInfoInAHash = (hashName, callBack, ...keyValues) => {
    client.hmset(hashName, keyValues, (err, result) => {
        if (err) {
            console.log(err);
            callBack(err, null);
        }
        else {
            console.log(" set online successfully");
            console.log(result);
            callBack(null, result);
        }
    });
};

let incrDecrAInfoInAHash = (hashName, key, incrDecr, callBack) => {
    client.hincrby(hashName, key, incrDecr, (err, result) => {
        if (err) {
            console.log(err);
            callBack(err, null);
        }
        else {
            console.log("Incr/Decr successfully");
            console.log(result);
            callBack(null, result);
        }
    });
};

let deleteAHash = (hashName, key) => {
    client.del(hashName, key);
    return true;
};

let deleteFromAHash = (hashName, key) => {
    client.hdel(hashName, key);
    return true;
};


module.exports = {
    getAllInfoInAHash: getAllInfoInAHash,
    getAParticularInfoInAHash: getAParticularInfoInAHash,
    setANewInfoInAHash: setANewInfoInAHash,
    incrDecrAInfoInAHash: incrDecrAInfoInAHash,
    deleteAHash: deleteAHash,
    deleteFromAHash: deleteFromAHash

};