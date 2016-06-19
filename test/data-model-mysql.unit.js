'use strict';

const _ = require('underscore');
const Q = require('q');
const chai = require('chai');

const mysql = require('mysql');
const connection = mysql.createPool({
    host: '127.0.0.1',
    user: 'username',
    password: 'password',
    database: 'user-basic'
});
const sql = require('mysql-wrap-production')(connection);
const password = require('../src/password');

const dataModel = require('../src/data-model-mysql')({
    table: 'user',
    connection: connection
});

describe('dataModelMysql', () => {
    beforeEach(done => {
        this.data = () => ({
            username: 'bob',
            password: 'password'
        });

        sql.delete('user')
        .then(() => sql.insert('user', {
            username: 'foo',
            password: 'password'
        }))
        .then(() => sql.selectOne('user'))
        .then(userData => {
            this.user = userData;
            done();
        }).done();
    });

    describe('insert', () => {
        it('should save new user to database', done => {
            dataModel.insert(this.data())
            .then(() => sql.selectOne('user', { username: this.data().username }))
            .then(userData => {
                chai.assert.deepEqual(
                    userData, _.extend(this.data(), { isConfirmed: 0 })
                );
                done();
            }).done();
        });
    });

    describe('findByUsername', () => {
        it('should find by username success', done => {
            dataModel.findByUsername(this.user.username)
            .then(userData => {
                chai.assert.deepEqual(
                    userData,
                    _.extend(this.user, { isConfirmed: false })
                );
                done();
            }).done();
        });

        it('should find by username fail', done => {
            dataModel.findByUsername('wrong')
            .then(userData => {
                chai.assert.notOk(userData);
                done();
            }).done();
        });
    });
});
