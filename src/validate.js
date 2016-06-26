'use strict';

const _ = require('underscore');
const Q = require('q');
const Validator = require('the_validator');
const ValidationError = require('./error');

module.exports = (rules, data) => {
    let errors = new Validator(rules, { strict: false }).test(data);
    return _.isEmpty(errors) ?
        Q() : Q.reject(new ValidationError(400, {
            message: 'A validation error occurred',
            errors: errors
        }));
};
