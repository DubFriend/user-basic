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

    const setFieldByUsername = fig => {
        for(let i = 0; i < data.length; i += 1) {
            if(data[i].username === fig.username) {
                data[i][fig.field] = fig[fig.field];
            }
        }
        return Q();
    };

    self.setConfirmedByUsername = fig => setFieldByUsername(_.extend(
        _.clone(fig), { field: 'isConfirmed' }
    ));

    self.setPasswordByUsername = fig => setFieldByUsername(_.extend(
        _.clone(fig), { field: 'password' }
    ));

    return self;
};
