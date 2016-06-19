'use strict';

const _ = require('underscore');
const Q = require('q');

module.exports = fig => {
    let self = {};

    const data = {};

    self.findByUsername = username => Q(data[username]);
    self.insert = fig => {
        if(!data[fig.username]) {
            data[fig.username] = fig;
        }
        else {
            return Q.reject(new Error('Cannot insert: unique constraint'));
        }
    };

    return self;
};
