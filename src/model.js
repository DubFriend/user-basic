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
    const passwordResetModel = fig.passwordResetModel;
    const tokenSecret = fig.tokenSecret;
    const loginExpirationSeconds = fig.loginExpirationSeconds || 60 * 60;
    const passwordResetExpirationSeconds = fig.passwordResetExpirationSeconds || 60 * 5;
    const confirmationExpirationSeconds = fig.confirmationExpirationSeconds || 60 * 60 * 24;
    const emailField = fig.emailField;
    const usernameField = fig.usernameField || 'username';

    const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1);

    const schema = () => {
        let s = {
            password: ['required', 'type:string']
        };

        s[usernameField] = ['required', 'type:string'];

        if(emailField) {
            s[emailField] = ['required', 'type:string', 'email'];
        }

        return s;
    };

    self.register = fig => validate(schema(), fig)
    .then(() => dataModel.findByField(usernameField, fig.username))
    .then(userData => userData && Q.reject(new ValidationError(400, {
        message: `The supplied ${usernameField} has already been taken`
    })))
    .then(() => (emailField && emailField !== usernameField) ?
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

    self.login = fig => {
        let loginError = new ValidationError(400, {
            message: `Invalid ${usernameField} or password`
        });

        const validateFig = {
            password: ['required', 'type:string']
        };

        const usernameOrEmailField = emailField ? `${usernameField}Or${capitalize(emailField)}` : usernameField;

        validateFig[usernameOrEmailField] = ['required', 'type:string'];

        return validate(validateFig, fig)
        .then(() => dataModel.findByField(usernameField, fig[usernameOrEmailField]))
        .then(userData => !userData && emailField && emailField !== usernameField ?
            dataModel.findByField(emailField, fig[usernameOrEmailField]) : userData
        )
        .then(userData => userData || Q.reject(loginError))
        .then(userData => {
            return password.compare(fig.password, userData.password)
            .then(isMatch => isMatch || Q.reject(loginError))
            .then(() => {
                const content = { type: 'login' };
                content[usernameField] = userData[usernameField];
                return token.create({
                    password: tokenSecret,
                    expiresInSeconds: loginExpirationSeconds,
                    content: content
                });
            });
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

    self[`findBy${capitalize(usernameField)}`] = _.partial(dataModel.findByField, usernameField);

    if(emailField) {
        self[`findBy${capitalize(emailField)}`] = _.partial(dataModel.findByField, emailField);
    }

    if(passwordResetModel) {
        self.sendPasswordReset = username => dataModel.findByField(usernameField, username)
        .then(userData => userData || Q.reject(new ValidationError(400, {
            message: 'User not found'
        })))
        .then(userData => {
            const content = { type: 'password-reset' };
            content[usernameField] = userData[usernameField];
            return token.create({
                password: tokenSecret,
                expiresInSeconds: passwordResetExpirationSeconds,
                content: content
            })
            .then(tokenData => passwordResetModel.send({
                token: tokenData,
                user: userData
            }));
        });
    }

    self.resetPasswordWithToken = fig => validate({
        token: ['required', 'type:string'],
        newPassword: ['required', 'type:string']
    }, fig)
    .then(() => token.decode({
        password: tokenSecret,
        token: fig.token
    }))
    .then(tokenData => tokenData.type === 'password-reset' ?
        tokenData[usernameField] : Q.reject(new ValidationError(400, {
            message: 'Invalid type'
        }))
    )
    .then(username => {
        return password.hash(fig.newPassword)
        .then(hashedPassword => {
            const setFig = { password: hashedPassword };
            setFig[usernameField] = username;
            return dataModel[`setPasswordBy${capitalize(usernameField)}`](setFig);
        });
    });

    if(confirmationModel) {
        self.sendConfirmation = username => dataModel.findByField(usernameField, username)
        .then(userData => userData || Q.reject(new ValidationError(400, {
            message: 'User not found'
        })))
        .then(userData => userData.isConfirmed ?
            Q.reject(new ValidationError(400, {
                message: 'User is already confirmed'
            })) : userData
        )
        .then(userData => {
            const content = { type: 'confirmation' };
            content[usernameField] = userData[usernameField];

            return token.create({
                password: tokenSecret,
                expiresInSeconds: confirmationExpirationSeconds,
                content: content
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
        tokenData[usernameField] : Q.reject(new ValidationError(400, {
            message: 'Invalid type'
        }))
    )
    .then(username => {
        const setFig = { isConfirmed: true };
        setFig[usernameField] = username;
        return dataModel.setConfirmedByUsername(setFig);
    });

    return self;
};
