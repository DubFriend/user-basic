'use strict';

function ValidationError (code, fig) {
    fig = fig || {};
    this.message = fig.message || 'A server error occured';
    this.code = code;
    this.stack = Error().stack;
    this.errors = fig.errors || {};
}
ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.name = 'ValidationError';
ValidationError.prototype.toJSON = function () {
    return {
        code: this.code,
        message: this.message,
        errors: this.errors
    };
};

module.exports = ValidationError;
