'use strict';

const _ = require('underscore');
const createMySQLWrap = require('mysql-wrap-production');

module.exports = fig => {
    let self = {};

    const table = fig.table || 'user';
    const sql = createMySQLWrap(fig.connection);

    const parse = data => data && (
        _.isArray(data) ?
            _.map(data, parse) :
            _.extend(data, { isConfirmed: Boolean(data.isConfirmed) })
    );

    self.findByField = (field, value) => {
        const q = {};
        q[field] = value;
        return sql.selectOne(table, q)
        .then(parse);
    };

    self.setConfirmedByUsername = fig => sql.update(
        table,
        { isConfirmed: fig.isConfirmed },
        { username: fig.username }
    );

    self.insert = fig => sql.insert(table, fig);

    return self;
};
