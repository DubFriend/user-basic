'use strict';

let Q = require('q');
let bcrypt = require('bcrypt');

exports.compare = (plainText, hashed) => Q.promise((resolve, reject) => {
    bcrypt.compare(
        plainText, hashed,
        (err, isValid) => err ? reject(err) : resolve(isValid)
    );
});

exports.hash = password => Q.promise((resolve, reject) => {
    bcrypt.genSalt(
        10,
        (err, salt) => err ?
            reject(err) :
            bcrypt.hash(
                password, salt,
                (err, hash) => err ? reject(err) : resolve(hash)
            )
    );
});
