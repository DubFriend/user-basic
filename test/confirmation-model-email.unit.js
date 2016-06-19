'use strict';

const Q = require('q');
const chai = require('chai');
const config = require('../test-config');
const confirmationModel = require('../src/confirmation-model-email')({
    from: config.smtp.auth.user,
    smtp: config.smtp,
    getToField: fig => Q(fig.user.to),
    bodyTemplate: fig => Q('<h1>Hello</h1><pre>' +JSON.stringify(fig, null , 2) + '</pre>'),
    subjectTemplate: fig => Q('user-basic: ' + fig.user.foo)
});

describe('confirmationModelEmail', () => {
    describe('send', () => {
        it('should send an email', done => {
            confirmationModel.send({
                token: 'token',
                user: { foo: 'bar', to: config.mailTo }
            })
            .then(() => done())
            .done();
        });
    });
});
