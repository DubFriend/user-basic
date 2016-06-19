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

const model = userBasic.model({
    dataModel: dataModel,
    tokenSecret: 'secret',
    loginExpirationSeconds: 60 * 60,
    passwordResetExpirationSeconds: 60 * 5,
    confirmationExpirationSeconds: 60 * 60 * 24
});
```

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

#### findByUsername

```javascript
dataModel.findByUsername('bob')
.then(userData => {});
```
