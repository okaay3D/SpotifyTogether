import io from "socket.io-client";
import Spotify from 'spotify-web-api-js';

// ########## SOCKET IO ADRESSE ##########
const SOCKETIO_ADDR = "http://localhost:3000"


// ########## Spotify Connect ##########
var socket = io(SOCKETIO_ADDR);
var spotifyApi = new Spotify();

let access_token = window.location.hash.split('=')[1];
let refresh_token = window.location.hash.split('=')[2];

console.log("access: " + access_token);
console.log("room: " + room);

spotifyApi.setAccessToken(access_token);

function getFormattedDate(): string {
  var date = new Date();
  var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  return str;
}

function getTrackInfo(spotifyId: string): void {
  if (spotifyId.lastIndexOf("spotify:track:", 0) === 0) {
    spotifyId = spotifyId.substring(14);
  }

  spotifyApi.getTrack(spotifyId).then((result) => {
    document.getElementById('album-cover').setAttribute("src", result.album.images[0].url);
    document.getElementById('track-info').innerHTML = result.artists.map(o => o.name).join(', ') + " &ndash; " + result.name;
  });
}

function playTrack(uri: string): void {
  socket.emit('send', { action: "play", data: uri});
}

socket.emit('send', 
  { 
    action: "test",
    data: getFormattedDate() 
  }
);

socket.emit('joinroom', 
  { 
    action: "id",
    data: getFormattedDate() 
  }
);

socket.on('receive', function(msg) {
    console.log("[DEBUG]", msg);

    if (msg.action == "test") {
        console.log(msg.data);
    }

    if (msg.action == "songsync") {
      spotifyApi.play({
        uris: [msg.data1],
        position_ms: msg.data2
      });

      getTrackInfo(msg.data1);
    }

    if (msg.action == "skip") {
      spotifyApi.skipToNext();
    }

    if (msg.action == "prev") {
      spotifyApi.skipToPrevious();
    }

    if (msg.action == "pause") {
      spotifyApi.pause();
    }

    if (msg.action == "resume") {
      spotifyApi.play();
    }

    if (msg.action == "play") {
      spotifyApi.play({
        uris: [msg.data],
        position_ms: 0
      });
    
      getTrackInfo(msg.data);
    }

    if (msg.action == "playplaylist") {
      spotifyApi.play({
        context_uri: msg.data,
        offset: {
          position: 0
        },
        position_ms: 0
      });
    }

    if (msg.action == "volume") {
      spotifyApi.setVolume(msg.data);
    }

});

function copy(str: string) {
  var clippy: HTMLInputElement = document.getElementById("clippy") as HTMLInputElement;
  clippy.value = str;
  clippy.select();
  document.execCommand("copy");
}

document.getElementById("skip").onclick = function() {
  spotifyApi.skipToNext();
}

document.getElementById("prev").onclick = function() {
  spotifyApi.skipToPrevious();
}

document.getElementById("pause").onclick = function() {
  spotifyApi.pause();
}

document.getElementById("resume").onclick = function() {
  spotifyApi.play();
}

document.getElementById("play").onclick = function() {
  socket.emit('send', { action: "playplaylist", data: "spotify:track:6hjck7ERXicpsW51UkdHCA"});
}

document.getElementById("playplaylist").onclick = function() {
  socket.emit('send', { action: "playplaylist", data: "spotify:playlist:6vZQdEvLJ87qeAva5b5OxA"});
}

document.getElementById("syncsong").onclick = function() {
  spotifyApi.getMyCurrentPlayingTrack().then((result) => {
    socket.emit('send', { action: "songsync", data1: result.item.uri, data2: result.progress_ms });
  });
}

document.getElementById("play_field").onclick = function() {
  let uri = (document.getElementById("play_field_field") as HTMLInputElement).value;
  socket.emit('send', { action: "play", data: uri});
}

document.getElementById("playplaylist_field").onclick = function() {
  let uri = (document.getElementById("playplaylist_field_field") as HTMLInputElement).value;
  socket.emit('send', { action: "playplaylist", data: uri});
}

document.getElementById("search_btn").onclick = function() {
  var results_div = document.getElementById("search-results");
  var query_string = (document.getElementById("search_input") as HTMLInputElement).value;

  results_div.innerHTML = "";
  spotifyApi.searchTracks(query_string).then((result) => {
    result.tracks.items.forEach(element => {
      var anchorElement = document.createElement("a");
      var listElement = document.createElement("li");
      anchorElement.href = "#";
      anchorElement.setAttribute("spotify-uri", element.uri);
      anchorElement.innerHTML = element.artists.map(o => o.name).join(', ') + " &ndash; " + element.name;

      anchorElement.onclick = () => playTrack(element.uri);

      results_div.appendChild(listElement);
      listElement.appendChild(anchorElement);
    });
  });
}

document.getElementById("search_hide_btn").onclick = function() {
  document.getElementById("search-results").innerHTML = "";
}

document.getElementById("refresh").onclick = function() {
  refreshToken();
}

function refreshToken() {
  let req = new XMLHttpRequest();
  
  req.onreadystatechange = () => {
    if (req.readyState === 4 && req.status === 200) {
      console.log(req.response);
    }
  }

  req.open("GET", "/refresh_token?refresh_token=" + refresh_token);
  req.send();
}
// http://jsfiddle.net/JMPerez/62wafrm7/
// https://developer.spotify.com/documentation/web-api/libraries/
// https://github.com/JMPerez/spotify-web-api-js
// https://github.com/spotify/web-api-auth-examples/blob/master/authorization_code/public/index.html
