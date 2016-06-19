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
    const confirmationModel = fig.confirmationModel;
    const tokenSecret = fig.tokenSecret;
    const loginExpirationSeconds = fig.loginExpirationSeconds || 60 * 60;
    const passwordResetExpirationSeconds = fig.passwordResetExpirationSeconds || 60 * 5;
    const confirmationExpirationSeconds = fig.confirmationExpirationSeconds || 60 * 60 * 24;
    const emailField = fig.emailField;

    const schema = () => {
        let s = {
            username: ['required', 'type:string'],
            password: ['required', 'type:string']
        };

        if(emailField) {
            s[emailField] = ['required', 'type:string', 'email'];
        }

        return s;
    };

    self.register = fig => validate(schema(), fig)
    .then(() => dataModel.findByField('username', fig.username))
    .then(userData => userData && Q.reject(new ValidationError(400, {
        message: 'The supplied username has already been taken'
    })))
    .then(() => (emailField && emailField !== 'username') ?
        dataModel.findByField(emailField, fig[emailField])
        .then(userData => userData && Q.reject(new ValidationError(400, {
            message: 'The supplied ' + emailField + ' has already been taken'
        }))) : Q()
    )
    .then(() => password.hash(fig.password))
    .then(hashedPassword => dataModel.insert(_.extend(
        _.clone(fig),
        {
            password: hashedPassword,
            isConfirmed: false
        }
    )));

    self.login = (usernameOrEmail, passwordString) => {
        let loginError = new ValidationError(400, {
            message: 'Invalid username or password'
        });

        return dataModel.findByField('username', usernameOrEmail)
        .then(userData => !userData && emailField && emailField !== 'username' ?
            dataModel.findByField(emailField, usernameOrEmail) : userData
        )
        .then(userData => userData || Q.reject(loginError))
        .then(userData => {
            return password.compare(passwordString, userData.password)
            .then(isMatch => isMatch || Q.reject(loginError))
            .then(() => token.create({
                password: tokenSecret,
                expiresInSeconds: loginExpirationSeconds,
                content: {
                    type: 'login',
                    username: userData.username
                }
            }));
        });
    };

    self.validateLoginToken = tokenString => token.decode({
        password: tokenSecret,
        token: tokenString
    })
    .then(decryptedToken => decryptedToken.type === 'login' ?
        decryptedToken : Q.reject(new ValidationError(400, {
            message: 'Invalid type'
        }))
    );

    self.findByUsername = _.partial(dataModel.findByField, 'username');

    if(emailField) {
        self.findByEmail = _.partial(dataModel.findByField, emailField);
    }

    if(confirmationModel) {
        self.sendConfirmation = username => dataModel.findByField('username', username)
        .then(userData => userData || Q.reject(new ValidationError(400, {
            message: 'User not found'
        })))
        .then(userData => userData.isConfirmed ?
            Q.reject(new ValidationError(400, {
                message: 'User is already confirmed'
            })) : userData
        )
        .then(userData => {
            return token.create({
                password: tokenSecret,
                expiresInSeconds: confirmationExpirationSeconds,
                content: {
                    type: 'confirmation',
                    username: userData.username
                }
            })
            .then(tokenData => confirmationModel.send({
                token: tokenData,
                user: userData
            }));
        });
    }

    self.confirmWithToken = confirmationToken => token.decode({
        password: tokenSecret,
        token: confirmationToken
    })
    .then(tokenData => tokenData.type === 'confirmation' ?
        tokenData.username : Q.reject(new ValidationError(400, {
            message: 'Invalid type'
        }))
    )
    .then(username => dataModel.setConfirmedByUsername({
        username: username,
        isConfirmed: true
    }));

    return self;
};
