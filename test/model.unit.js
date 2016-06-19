'use strict';

const _ = require('underscore');
const Q = require('q');
const chai = require('chai');

const password = require('../src/password');
const token = require('../src/token');

const dataModel = require('../src/data-model-memory')();
const model = require('../src/model')({
    dataModel: dataModel,
    tokenSecret: 'secret',
    loginExpirationSeconds: 2,
    passwordResetExpirationSeconds: 2,
    confirmationExpirationSeconds: 2
});

describe('model', () => {
    beforeEach(done => {
        this.data = () => ({
            username: 'username',
            password: 'password'
        });

        dataModel.clearData();

        password.hash('password')
        .then(hashedPassword => dataModel.insert({
            username: 'bob',
            password: hashedPassword
        }))
        .then(() => dataModel.findByUsername('bob'))
        .then(user => {
            this.user = user;
            done();
        }).done();
    });

    describe('register', () => {
        it('should create unconfirmed user with hashed password', done => {
            model.register(this.data())
            .then(() => dataModel.findByUsername(this.data().username))
            .then(user => {
                chai.assert.deepEqual(
                    _.omit(user, 'password'),
                    {
                        username: this.data().username,
                        isConfirmed: false
                    }
                );
                return password.compare(this.data().password, user.password)
            })
            .then(isMatch => {
                chai.assert.ok(isMatch);
                done();
            }).done();
        });

        it('should require username', done => {
            model.register(_.omit(this.data(), 'username'))
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'A validation error occurred'
                );
                done();
            }).done();
        });

        it('should require password', done => {
            model.register(_.omit(this.data(), 'password'))
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'A validation error occurred'
                );
                done();
            }).done();
        });

        it('should require username is unique', done => {
            model.register(_.extend(
                this.data(),
                { username: this.user.username }
            ))
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'The supplied username has already been taken'
                );
                done();
            }).done();
        });
    });

    describe('login', () => {
        it('should return a valid login token', done => {
            model.login({
                username: this.user.username,
                password: 'password'
            })
            .then(loginToken => token.decode({
                password: 'secret',
                token: loginToken
            }))
            .then(decodedToken => {
                chai.assert.deepEqual(
                    decodedToken,
                    { type: 'login', username: this.user.username }
                );
                done();
            }).done();
        });

        it('should require username', done => {
            model.login({ password: 'password' })
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'A validation error occurred'
                );
                done();
            }).done();
        });

        it('should require password', done => {
            model.login({ username: this.user.username })
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'A validation error occurred'
                );
                done();
            }).done();
        });

        it('should validate that user exists with username', done => {
            model.login({
                username: 'wrong',
                password: 'password'
            })
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'Invalid username or password'
                );
                done();
            }).done();
        });

        it('should validate that password is correct', done => {
            model.login({
                username: this.user.username,
                password: 'wrong'
            })
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'Invalid username or password'
                );
                done();
            }).done();
        });
    });

    describe('extractLoginToken', () => {
        beforeEach(done => {
            token.create({
                password: 'secret',
                expiresInSeconds: 2,
                content: {
                    type: 'login',
                    username: this.user.username
                }
            })
            .then(tokenData => {
                this.token = tokenData;
                return token.create({
                    password: 'secret',
                    expiresInSeconds: 1,
                    content: {
                        type: 'wrong',
                        username: this.user.username
                    }
                })
            })
            .then(tokenData => {
                this.invalidToken = tokenData;
                done();
            })
            .done();
        });

        it('should extract login token', done => {
            model.extractLoginToken(this.token)
            .then(decodedToken => {
                chai.assert.deepEqual(
                    decodedToken,
                    {
                        type: 'login',
                        username: this.user.username
                    }
                );
                done();
            }).done();
        });

        it('should validate that token has correct type', done => {
            model.extractLoginToken(this.invalidToken)
            .catch(err => {
                chai.assert.strictEqual(err.message, 'Invalid type');
                done();
            }).done();
        });
    });
});
