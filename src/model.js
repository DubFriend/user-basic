'use strict';

const _ = require('underscore');
const Q = require('q');
const ValidationError = require('./error');
const validate = require('./validate');
const password = require('./password');
const token = require('./token');

module.exports = fig => {
    let self = {};

    const dataModel = fig.dataModel;
    const tokenSecret = fig.tokenSecret;
    const loginExpirationSeconds = fig.loginExpirationSeconds || 60 * 60;
    const passwordResetExpirationSeconds = fig.passwordResetExpirationSeconds || 60 * 5;
    const confirmationExpirationSeconds = fig.confirmationExpirationSeconds || 60 * 60 * 24;

    const schema = () => ({
        username: ['required', 'type:string'],
        password: ['required', 'type:string']
    });

    self.register = fig => validate(schema(), fig)
    .then(() => dataModel.findByUsername(fig.username))
    .then(userData => userData && Q.reject(new ValidationError(400, {
        message: 'The supplied username has already been taken'
    })))
    .then(() => password.hash(fig.password))
    .then(hashedPassword => dataModel.insert(_.extend(
        _.clone(fig),
        {
            password: hashedPassword,
            isConfirmed: false
        }
    )));

    self.login = fig => {
        let loginError = new ValidationError(400, {
            message: 'Invalid username or password'
        });

        return validate(schema(), fig)
        .then(() => dataModel.findByUsername(fig.username))
        .then(userData => userData || Q.reject(loginError))
        .then(userData => password.compare(fig.password, userData.password))
        .then(isMatch => isMatch || Q.reject(loginError))
        .then(() => token.create({
            password: tokenSecret,
            expiresInSeconds: loginExpirationSeconds,
            content: {
                type: 'login',
                username: fig.username
            }
        }));
    };

    self.extractLoginToken = tokenString => token.decode({
        password: tokenSecret,
        token: tokenString
    })
    .then(decryptedToken => decryptedToken.type === 'login' ?
        decryptedToken : Q.reject(new ValidationError(400, {
            message: 'Invalid type'
        }))
    );

    self.findByUsername = dataModel.findByUsername;

    return self;
};
