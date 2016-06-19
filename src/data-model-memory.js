'use strict';

const _ = require('underscore');
const Q = require('q');

module.exports = () => {
    let self = {};

    let data = [];

    self.findByField = (field, value) => {
        const q = {};
        q[field] = value;
        return Q(_.findWhere(data, q));
    };

    self.insert = fig => {
        data.push(fig);
        return Q();
    };

    self.clearData = () => {
        data = [];
    };

    self.setConfirmedByUsername = fig => {
        for(let i = 0; i < data.length; i += 1) {
            if(data[i].username === fig.username) {
                data[i].isConfirmed = fig.isConfirmed;
            }
        }
    };

    return self;
};
