var util = require('util');
var express = require('express');
var request = require('request');
var fiziico = require('fiziico-second-factor');

var authConfig = require('./auth');

var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var port = 3080;

app.use('/', express.static('./client'));

app.post('/auth', function(req, res) {
    var akey = 'Length32AnyRandomString123456789';
    var username = req.body.username;

    var auth_req = fiziico.build_request(authConfig.ikey, authConfig.skey, akey, username);

    request.post(
        authConfig.url,
        { json: {
            version: 'v1',
            apiKey: authConfig.ikey,
            auth_req: auth_req } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var reply = fiziico.parse_response(authConfig.ikey, authConfig.skey, akey, body);
                console.log(util.format('auth_res: %s reply %s', reply.username, (reply.agree) ? 'agree' : 'reject'));
                return res.send("success");
            }
            else {
                console.error(body);
                return res.send("failure");
            }
        }
    );
});

app.post('/login', function(req, res) {
    res.send("success");
});

var server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Server listening at http://%s:%s", host, port)
});


