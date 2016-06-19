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

    self.findByUsername = username => sql.selectOne(
        table, { username: username }
    )
    .then(parse);

    self.insert = fig => sql.insert(table, fig);

    return self;
};
