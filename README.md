# user-basic

Basic User Functionality. Register, Login, Password Reset, Email Confirmation, etc.

## Instantiation

```javascript
const mysql      = require('mysql');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'me',
  password: 'secret',
  database: 'my_db'
});

const userBasic = require('user-basic');

const dataModel = userBasic.dataModelMysql({
    table: 'user',
    connection: connection
});

const confirmationModel = userBasic.confirmationModelEMail({
    from: 'noreply@app.com',
    smtp: {
        host: 'mail.foo.com',
        port: 587,
        auth: {
            user: 'foo@mail.com',
            pass: 'secret'
        }
    },
    getToField: fig => Q(fig.user.email),
    bodyTemplate: fig => Q('<h1>Hello</h1><pre>' + JSON.stringify(fig, null , 2) + '</pre>'),
    subjectTemplate: fig => Q('Please Confirm your Email: ' + fig.user.firstName)
});

const model = userBasic.model({
    dataModel: dataModel,
    // confirmationModel is optional
    confirmationModel: confirmationModel,
    tokenSecret: 'secret',
    loginExpirationSeconds: 60 * 60,
    passwordResetExpirationSeconds: 60 * 5,
    confirmationExpirationSeconds: 60 * 60 * 24,
    // emailField is optional
    emailField: 'email'
});
```

**!Note** The emailField is optional. If you do not set an emailField, the model
logic will assume there is no email. You can also set the emailField to "username",
to give the username field the added responsibility of the user's email.

**!Note** If a confirmationModel is not supplied the **sendConfirmation** method will not work

--------------------------------

## API

#### Register

```javascript
model.register({
    username: 'bob',
    password: 'secret'
})
.then(() => {});
```

#### Login

```javascript
model.login({
    username: 'bob',
    password: 'secret'
})
.then(token => {});
```

#### Validate Login Token

```javascript
model.validateLoginToken('eyjad...')
.then(decodedToken => {
    console.log(decodedToken.username);
});
```

#### Find by Username

```javascript
model.findByUsername('bob')
.then(user => {});
```

#### Confirm with Token

Takes a confirmation token, and sets the user's account to confirmed.

```javascript
model.confirmWithToken('abcde')
.then(() => {});
```

------------------------------

## Data Model

A Data Model is dependency injected, to allow the library to be implemented against different storage mechanisms.

The library comes with a mysql data model, but you can implement your own (if you wanted to use some other database to store your users for example).

Your data model must implement the following methods:

#### insert

```javascript
dataModel.insert({
    username: 'bob',
    password: 'abcdef'
})
.then(() => {});
```

#### findByField

Should handle the **username** field and the **email** field if it has been set
during the model instantiation.

```javascript
dataModel.findByField('username', 'bob')
.then(userData => {});
```

#### setConfirmedByUsername

```javascript
dataModel.setConfirmedByUsername({
    username: 'bob',
    isConfirmed: true
})
.then(() => {});
```

------------------------

## Confirmation Model

The confirmation model is dependency injected, and you can supply your own confirmation model (for example to send confirmation by text message)

An email confirmation model is allready supplied (see "instantiation" in these docs)

If you with to implement your own confirmation model you must implement the following interface

## send

Send the user a message to confirm their account.

```javascript
confirmationModel.send = fig => {
    // supplied token can be used by the "model.confirmWithToken" method
    console.log(fig.token);
    // the full user details are also supplied
    console.log(fig.user);
    // method should return a promise (reject promise is send is unsuccessful)
    return new Promise();
};
```
