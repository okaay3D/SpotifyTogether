// ########## Requires ##########
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var spotifyCredentials = require('./spotify.json');

// ########## NODE SERVER AND SPOTIFY API SETTINGS ##########

const port = process.env.PORT || 3000;

const client_id = spotifyCredentials.client_id; // Your client id
const client_secret = spotifyCredentials.client_secret; // Your secret
const redirect_uri = spotifyCredentials.redirect_uri; // Your redirect uri

// ########## Create Random String ##########
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';
app.use(express.static(__dirname + '/'))
   .use(cors())
   .use(cookieParser());


// ########## Login Process ##########
app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';

  let newscope = ["user-read-recently-played",
    "user-library-modify",
    "playlist-read-private",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-library-read",
    "playlist-read-collaborative",
    "user-read-playback-state",
    "user-read-private",
    "app-remote-control",
    "user-modify-playback-state",
    "user-follow-read",
    "user-top-read",
    "user-read-currently-playing",
    "streaming"]
  
  scope = newscope.join(" ");

  res.redirect('https://accounts.spotify.com/authorize?' +
    stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    })
  );
});
  

app.get('/callback', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        get(options, function(error, response, body) {
          //console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});
  
app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


// Socket.io Verbindung
// Aufbau Connection und verteilen der eingehenden Nachrichten an alle Clients

io.on('connection', function(socket){
  console.log("user connected!");
  socket.on('send', function(msg){
    console.log(msg);
    io.sockets.in(socket.rooms[0]).emit('receive', msg);
  });

  socket.on('joinroom', function(msg){
    console.log(msg);
    socket.join(msg.data);
    io.sockets.in(socket.rooms[0]).emit('receive', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
