'use strict';

const Q = require('q');
const nodemailer = require('nodemailer');

module.exports = fig => {
    const transporter = nodemailer.createTransport(fig);

    let self = {};

    self.send = opt => Q.Promise((resolve, reject) => {
        transporter.sendMail(
            opt, (err, info) => err ? reject(err) : resolve(info)
        );
    });

    return self;
};
