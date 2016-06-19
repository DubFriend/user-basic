'use strict';

const _ = require('underscore');
const Q = require('q');
const chai = require('chai');

const password = require('../src/password');
const token = require('../src/token');

const dataModel = require('../src/data-model-memory')();

const createModel = override => require('../src/model')(_.extend({
    dataModel: dataModel,
    tokenSecret: 'secret',
    loginExpirationSeconds: 2,
    passwordResetExpirationSeconds: 2,
    confirmationExpirationSeconds: 2
}, override));

const model = createModel();

describe('model', () => {
    beforeEach(done => {
        this.data = () => ({
            username: 'username',
            password: 'password'
        });

        dataModel.clearData();

        this.assertValidationError = err => {
            chai.assert.strictEqual(
                err.message,
                'A validation error occurred'
            );
        };

        this.assertLoginError = err => {
            chai.assert.strictEqual(
                err.message,
                'Invalid username or password'
            );
        };

        password.hash('password')
        .then(hashedPassword => dataModel.insert({
            username: 'bob',
            email: 'bob@foo.com',
            password: hashedPassword
        }))
        .then(() => dataModel.findByField('username', 'bob'))
        .then(user => {
            this.user = user;
            return token.create({
                password: 'secret',
                expiresInSeconds: 5,
                content: {
                    type: 'wrong',
                    username: this.user.username
                }
            });
        })
        .then(tokenData => {
            this.invalidToken = tokenData;
            done();
        })
        .done();
    });

    describe('register', () => {
        it('should create unconfirmed user with hashed password', done => {
            model.register(this.data())
            .then(() => dataModel.findByField('username', this.data().username))
            .then(user => {
                chai.assert.deepEqual(
                    _.omit(user, 'password'),
                    {
                        username: this.data().username,
                        isConfirmed: false
                    }
                );
                return password.compare(this.data().password, user.password);
            })
            .then(isMatch => {
                chai.assert.ok(isMatch);
                done();
            }).done();
        });

        it('should require username', done => {
            model.register(_.omit(this.data(), 'username'))
            .catch(err => {
                this.assertValidationError(err);
                done();
            }).done();
        });

        it('should require password', done => {
            model.register(_.omit(this.data(), 'password'))
            .catch(err => {
                this.assertValidationError(err);
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

    describe('register (with emailField)', () => {
        beforeEach(done => {
            this.data = () => ({
                username: 'username',
                email: 'mail@foo.com',
                password: 'password'
            });
            this.model = createModel({ emailField: 'email' });
            done();
        });

        it('should create unconfirmed user with hashed password', done => {
            this.model.register(this.data())
            .then(() => dataModel.findByField('username', this.data().username))
            .then(user => {
                chai.assert.deepEqual(
                    _.omit(user, 'password'),
                    {
                        username: this.data().username,
                        email: this.data().email,
                        isConfirmed: false
                    }
                );
                return password.compare(this.data().password, user.password);
            })
            .then(isMatch => {
                chai.assert.ok(isMatch);
                done();
            }).done();
        });

        it('should require email', done => {
            this.model.register(_.omit(this.data(), 'email'))
            .catch(err => {
                this.assertValidationError(err);
                done();
            }).done();
        });

        it('should require valid email format', done => {
            this.model.register(_.extend(this.data(), { email: 'wrong' }))
            .catch(err => {
                this.assertValidationError(err);
                done();
            }).done();
        });

        it('should require that email is unique', done => {
            this.model.register(_.extend(
                this.data(),
                { email: this.user.email }
            ))
            .catch(err => {
                chai.assert.strictEqual(
                    err.message,
                    'The supplied email has already been taken'
                );
                done();
            }).done();
        });
    });

    describe('register (with emailField the same as username)', done => {
        beforeEach(done => {
            this.data = () => ({
                username: 'mail@foo.com',
                password: 'password'
            });
            this.model = createModel({ emailField: 'username' });
            done();
        });

        it('should create unconfirmed user with hashed password', done => {
            this.model.register(this.data())
            .then(() => dataModel.findByField('username', this.data().username))
            .then(user => {
                chai.assert.deepEqual(
                    _.omit(user, 'password'),
                    {
                        username: this.data().username,
                        isConfirmed: false
                    }
                );
                return password.compare(this.data().password, user.password);
            })
            .then(isMatch => {
                chai.assert.ok(isMatch);
                done();
            }).done();
        });

        it('should require valid email format', done => {
            this.model.register(_.extend(this.data(), { username: 'wrong' }))
            .catch(err => {
                this.assertValidationError(err);
                done();
            }).done();
        });
    });

    describe('login', () => {
        it('should return a valid login token', done => {
            model.login({
                usernameOrEmail: this.user.username,
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

        it('should validate that user exists with username', done => {
            model.login({
                usernameOrEmail: 'wrong',
                password: 'password'
            })
            .catch(err => {
                this.assertLoginError(err);
                done();
            }).done();
        });

        it('should validate that password is correct', done => {
            model.login({
                usernameOrEmail: this.user.username,
                password: 'wrong'
            })
            .catch(err => {
                this.assertLoginError(err);
                done();
            }).done();
        });
    });

    describe('login (with email field)', done => {
        beforeEach(done => {
            this.model = createModel({ emailField: 'email' });
            done();
        });

        it('should login with email', done => {
            this.model.login({
                usernameOrEmail: this.user.email,
                password: 'password'
            })
            .then(token => {
                chai.assert.ok(token);
                done();
            }).done();
        });

        it('should login with username', done => {
            this.model.login({
                usernameOrEmail: this.user.username,
                password: 'password'
            })
            .then(token => {
                chai.assert.ok(token);
                done();
            }).done();
        });

        it('should validate that user exists with email', done => {
            model.login({
                usernameOrEmail: 'wrong@mail.com',
                password: 'password'
            })
            .catch(err => {
                this.assertLoginError(err);
                done();
            }).done();
        });

        it('should validate that password is correct', done => {
            model.login({
                usernameOrEmail: this.user.email,
                password: 'wrong'
            })
            .catch(err => {
                this.assertLoginError(err);
                done();
            }).done();
        });
    });

    describe('validateLoginToken', () => {
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
                done();
            })
            .done();
        });

        it('should extract login token', done => {
            model.validateLoginToken(this.token)
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
            model.validateLoginToken(this.invalidToken)
            .catch(err => {
                chai.assert.strictEqual(err.message, 'Invalid type');
                done();
            }).done();
        });
    });

    describe('findByUsername', () => {
        it('should find by username', done => {
            model.findByUsername(this.user.username)
            .then(user => {
                chai.assert.deepEqual(user, this.user);
                done();
            }).done();
        });

        it('should not find for wrong username', done => {
            model.findByUsername('wrong')
            .then(user => {
                chai.assert.notOk(user);
                done();
            }).done();
        });
    });

    describe('findByEmail', () => {
        beforeEach(done => {
            this.model = createModel({ emailField: 'email' });
            done();
        });

        it('should find by email', done => {
            this.model.findByEmail(this.user.email)
            .then(user => {
                chai.assert.deepEqual(user, this.user);
                done();
            }).done();
        });

        it('should not find for wrong email', done => {
            this.model.findByEmail('wrong')
            .then(user => {
                chai.assert.notOk(user);
                done();
            }).done();
        });

        it('should not have method if emailField not configured', done => {
            chai.assert.notOk(model.findByEmail);
            done();
        });
    });

    describe('sendPasswordReset', () => {
        beforeEach(done => {
            this.calledSend = false;
            this.model = createModel({
                passwordResetModel: {
                    send: fig => {
                        chai.assert.deepEqual(fig.user, this.user);
                        return token.decode({
                            password: 'secret',
                            token: fig.token
                        })
                        .then(decodedToken => {
                            chai.assert.deepEqual(decodedToken, {
                                type: 'password-reset',
                                username: this.user.username
                            });
                            this.calledSend = true;
                        });
                    }
                }
            });
            done();
        });

        it('should send password reset with token', done => {
            this.model.sendPasswordReset(this.user.username)
            .then(() => {
                chai.assert.ok(this.calledSend);
                done();
            }).done();
        });

        it('should validate that user exists', done => {
            this.model.sendPasswordReset('wrong')
            .catch(err => {
                chai.assert.strictEqual(err.message, 'User not found');
                done();
            }).done();
        });
    });

    describe('sendConfirmation', () => {
        beforeEach(done => {
            this.calledSend = false;
            this.model = createModel({
                confirmationModel: {
                    send: fig => {
                        chai.assert.deepEqual(fig.user, this.user);
                        return token.decode({
                            password: 'secret',
                            token: fig.token
                        })
                        .then(decodedToken => {
                            chai.assert.deepEqual(decodedToken, {
                                type: 'confirmation',
                                username: this.user.username
                            });
                            this.calledSend = true;
                        });
                    }
                }
            });
            done();
        });

        it('should send confirmation with token', done => {
            this.model.sendConfirmation(this.user.username)
            .then(() => {
                chai.assert.ok(this.calledSend);
                done();
            }).done();
        });

        it('should validate that user exists', done => {
            this.model.sendConfirmation('wrong')
            .catch(err => {
                chai.assert.strictEqual(err.message, 'User not found');
                done();
            }).done();
        });

        it('should validate that user is not already confirmed', done => {
            dataModel.clearData();
            dataModel.insert(_.extend(this.user, {
                isConfirmed: true
            }))
            .then(() => this.model.sendConfirmation(this.user.username))
            .catch(err => {
                chai.assert.strictEqual(err.message, 'User is already confirmed');
                done();
            }).done();
        });
    });

    describe('resetPasswordWithToken', () => {
        beforeEach(done => {
            token.create({
                password: 'secret',
                expiresInSeconds: 3,
                content: {
                    type: 'password-reset',
                    username: this.user.username
                }
            })
            .then(tokenData => {
                this.passwordResetToken = tokenData;
                done();
            }).done();
        });

        it('should reset password', done => {
            model.resetPasswordWithToken({
                token: this.passwordResetToken,
                newPassword: 'new-pass'
            })
            .then(() => dataModel.findByField('username', this.user.username))
            .then(userData => password.compare('new-pass', userData.password))
            .then(isMatch => {
                chai.assert.ok(isMatch);
                done();
            }).done();
        });

        it('should validate token type', done => {
            model.resetPasswordWithToken({
                token: this.invalidToken,
                newPassword: 'new-pass'
            })
            .catch(err => {
                chai.assert.strictEqual(err.message, 'Invalid type');
                done();
            }).done();
        });
    });

    describe('confirmWithToken', () => {
        beforeEach(done => {
            token.create({
                password: 'secret',
                expiresInSeconds: 3,
                content: {
                    type: 'confirmation',
                    username: this.user.username
                }
            })
            .then(tokenData => {
                this.confirmationToken = tokenData;
                done();
            }).done();
        });

        it('should set user to confirmed', done => {
            model.confirmWithToken(this.confirmationToken)
            .then(() => dataModel.findByField('username', this.user.username))
            .then(userData => {
                chai.assert.ok(userData.isConfirmed);
                done();
            }).done();
        });

        it('should validate token type', done => {
            model.confirmWithToken(this.invalidToken)
            .catch(err => {
                chai.assert.strictEqual(err.message, 'Invalid type');
                done();
            }).done();
        });
    });
});
