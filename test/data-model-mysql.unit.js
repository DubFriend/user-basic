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

    describe('findByField', () => {
        it('should find by username success', done => {
            dataModel.findByField('username', this.user.username)
            .then(userData => {
                chai.assert.deepEqual(
                    userData,
                    _.extend(this.user, { isConfirmed: false })
                );
                done();
            }).done();
        });

        it('should find by username fail', done => {
            dataModel.findByField('username', 'wrong')
            .then(userData => {
                chai.assert.notOk(userData);
                done();
            }).done();
        });
    });

    describe('setConfirmedByUsername', () => {
        it('should set isConfirmed', done => {
            dataModel.setConfirmedByUsername({
                username: this.user.username,
                isConfirmed: true
            })
            .then(() => sql.selectOne('user', { username: this.user.username }))
            .then(userData => {
                chai.assert.ok(userData.isConfirmed);
                done();
            }).done();
        });

        it('should not set for wrong username', done => {
            dataModel.setConfirmedByUsername({
                username: 'wrong',
                isConfirmed: true
            })
            .then(() => sql.selectOne('user', { username: this.user.username }))
            .then(userData => {
                chai.assert.notOk(userData.isConfirmed);
                done();
            }).done();
        });
    });
});
