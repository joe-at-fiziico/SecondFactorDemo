var util = require('util');
var express = require('express');
var request = require('request');
var fiziico = require('fiziico-second-factor');

var authConfig = require('./auth');
var listAccount = require('./account');

var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var port = 3080;

app.use('/', express.static('./client'));

function ruby2FA(username, callback) {
    var zkey = 'Length32AnyRandomString123456789';
    var auth_req = fiziico.build_request(authConfig.ikey, authConfig.skey, zkey, username);

    request.post(
        authConfig.url,
        {
            json: {
                version: 'v1',
                apiKey: authConfig.ikey,
                auth_req: auth_req
            }
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var reply = fiziico.parse_response(authConfig.ikey, authConfig.skey, zkey, body);
                console.log(util.format('auth_res: %s reply %s', reply.username, (reply.agree) ? 'agree' : 'reject'));
                return callback(null, reply)
            }
            else {
                console.error("2FA failed", body);
                return callback("2FA failed", body);
            }
        }
    );
}

app.post('/login', function (req, res) {
    var uEmail = req.body.email;
    var uPassword = req.body.password;

    //1. check email & password
    if (!(uEmail && uEmail.includes('@') && uPassword)) {
        return res.status(500).send({ error: { "message": "email & password are required" } });
    }

    var account = listAccount.find(v => v.email === uEmail && v.password === uPassword);
    if (!account) {
        return res.status(500).send({ error: { "message": "wrong email/password" } });
    }

    //2. Ruby 2FA for username
    var username = uEmail.substring(0, uEmail.indexOf('@'));
    console.log(username);
    console.log(account);
    ruby2FA(username, function (err, data) {
        if (err) {
            return res.status(500).send({ error: data.error || { "message": "2FA failed" } });
        }
        else {
            console.log(data)
            if (!data.agree) {
                return res.status(500).send({ error: { "message": "2FA rejected" } });
            }
            //return account login info, e.g. id, token
            return res.send({ uid: account.id });
        }
    });
});

var server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Server listening at http://%s:%s", host, port)
});


