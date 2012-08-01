/*
*	Code crafted by Joe Roth
*	Consign compliments or complaints to
*	jtroth@gmail.com
*/

//if dev mode, we send ajax requests through local proxy
var dev_mode = true;

//height of expanded window
var expanded_height = 800;

//has jplayer been initialized?  this is hack to account for bug in jplayer.....event.ready is fired twice for some reason
var initialized = 0;

//array of stations
var stations = new Object(); //associative array of station info, station nick is key
var station_nicks = new Array(); //array of nicks (used simply to retain order of stations)

//currently selected station/history (history[0] is currently playing song)
var selectedStation = new String();
var history = new Array();

//view state
//	0 - normal
//	1 - showing stations
//	2 - showing history
var view_state = 0;

//current station
var current_station;

//current song number
var current_song_number;

//number of our timer object
var timer;

function init_player(){
	if(!initialized){
		initialized = 1;
		console.log('init_player called');
		//save our window height for later
		height = window.outerHeight;	
		
		//add listeners
		document.getElementById('mute_button').addEventListener('click', mute, false);
		document.getElementById('show_stations').addEventListener('click', showStations, false);	
		document.getElementById('show_history').addEventListener('click', showHistory, false);
		
		//load stations
		getStations();

		//play the one we asked for
		if(window.location.href.match(/\?(.*)$/)){
			selectedStation = RegExp.$1;
		}
		console.log('init is calling play on '+selectedStation);
		playStation(selectedStation);
	}
}

function test(){
	document.getElementById('station_name').innerHTML="Poptron";
}

//populates our stations hash
function getStations(){
	//get our channels xml file
	console.log('getting stations...');
	var channel_url = "http://somafm.com/channels.xml";
	if (dev_mode) {
	  channel_url = "http://localhost/soma_proxy/channels.xml";
	}
	$.ajax({
		url: channel_url,
		async: false,
		success: function( xml ) {
			$('channel',xml).each(function(i) {
				//create station object
				var station = new Object();
				station.title = $(this).find("title").text();
				station.description = $(this).find("description").text();
				station.image = $(this).find("image").text();
				
				//save appropriate pls file
				var streams = $(this).find("fastpls");
				for(var i=0; i<streams.length; i++){
					var format = $(streams[i]).attr("format");
					if(format.match(/mp3/)){
						station.pls = $(streams[i]).text();
						if (dev_mode) {
						  station.pls = station.pls.replace("somafm.com", "localhost/soma_proxy"); 
						};
					}	
				}
					
				//save our station in stations object
				station.nick = $(this).attr("id");
				stations[station.nick] = station;
				station_nicks.push(station.nick);
			});

			console.log('getStations has completed');
		}
	});
}

//we pass the stream to our jplayer object
//stream comes in form http://streamer-dtc-aa05.somafm.com:80/stream/1021
//in order to play the stream, we must add the ";stream.mp3" string
function playStation(_nick){
	current_song_number = -1;
	if(timer){
		clearInterval(timer);
	}

	//get the actual stream
	if(stations[_nick].stream === undefined){
		getStreamFromPls(_nick);
	}
	
	//change controls to reflect our playing
	makePlayState();
	
	//update our displayed information	
	document.getElementById('station_art').src = stations[_nick].image;
	document.getElementById('station_name').innerHTML = stations[_nick].title;
	
	
	//play it
	$("#jquery_jplayer_1").jPlayer("stop");
	$("#jquery_jplayer_1").jPlayer( "setMedia", {
		mp3: stations[_nick].stream + "/;stream.mp3"
	}).jPlayer("play");
	current_station = _nick;
	console.log('tried to play '+stations[_nick].stream + '/;stream.mp3');

	//this will initialize our song history, and start our timer
	getSongNumber(_nick);
	
	
	timer = setInterval(function(){ getSongNumber(current_station); }, 20 * 1000);
	
}

function getSongNumber(_nick){
	console.log('getting the song number for '+_nick);
	var songNumUrl = "http://somafm.com/recent/"+_nick+".test.html";
	if (dev_mode) {
	  songNumUrl = "http://localhost/soma_proxy/recent/"+_nick+".test.html";
	};
	$.ajax({
		url: songNumUrl,
		dataType: "text",
		async: false,
		success: function( data ) {
				//data is the current song number on the stream, if it cahnges, we need to update our currenty playing song
				if(data != current_song_number){
					console.log('song number changed');
					current_song_number = data;
					updateSongInfo(_nick);
				}	
			}
	});	
}

//update the history array and the currently playing info
function updateSongInfo(_nick){
	console.log('getting the song info for '+_nick);
	var songInfoUrl = "http://somafm.com/songs/"+_nick+".xml";
	if (dev_mode) {
	  songInfoUrl = "http://localhost/soma_proxy/songs/"+_nick+".xml";
	};
	$.ajax({
		url: songInfoUrl,
		success: function( xml ) {
			history = [];
			$('song',xml).each(function(i) {
				//build history					
				var song = new Object();				
				song.title = $(this).find("title").text();
				song.artist = $(this).find("artist").text();
				song.album = $(this).find("album").text();				
				song.date = $(this).find("date").text();
				history.push(song);
			});			
			document.getElementById('song_title').innerHTML = history[0].title;
			document.getElementById('song_artist').innerHTML = history[0].artist; 
			document.getElementById('song_album').innerHTML = history[0].album;
			console.log('song info has been gotten');
		}
	});	
}

// nick passed, we parse the pls and add the stream to the station's hash
function getStreamFromPls(_nick){
	var pls = stations[_nick].pls;
	console.log('attempting to get stream location from the pls: '+pls);
	$.ajax({
		url: pls,
		dataType: "text",
		async: false,
		success: function( data ) {
			//store the File1 stream
			var lines = data.split("\n");
			for(var i=0; i<lines.length; i++){
				if(lines[i].match(/^File1=(http:\/\/.*)$/)){
					stations[_nick].stream = RegExp.$1;
					break;
				}
			}
			console.log('stream has been parsed out of pls file');
		}
	});	
}


// this function alters controls to 'station is playing' state
function makePlayState(){	

	console.log('makePlayState called');
	//make play button green
	$("#play_button").removeClass('play_grey').addClass('play_green');
	var play_button = document.getElementById('play_button');
	
	//play button has no listeners
	play_button.removeEventListener('click', resumeStation, false);
	play_button.style.cursor = "default";
	
	//change pause button and give it listeners
	var pause_button = document.getElementById('pause_button');
	$("#pause_button").removeClass('pause_green').addClass('pause_grey');
	pause_button.addEventListener('click', pauseStation, false);
	pause_button.style.cursor = "pointer";
}

// this function alters controls for station is paused
function makePauseState(){	
	//make pause button green
	$("#pause_button").removeClass('pause_grey').addClass('pause_green');
	var pause_button = document.getElementById('pause_button');
	
	//pause button has no listeners
	pause_button.removeEventListener('click', pauseStation, false);
	pause_button.style.cursor = "default";
	
	//change pause button and give it listeners
	var play_button = document.getElementById('play_button');
	$("#play_button").removeClass('play_green').addClass('play_grey');
	play_button.addEventListener('click', resumeStation, false);
	play_button.style.cursor = "pointer";
}

function pauseStation(){
	//pause the station
	$("#jquery_jplayer_1").jPlayer("pause");	
	makePauseState();
}

// called when station is un-paused
function resumeStation(){
	//resume station
	$("#jquery_jplayer_1").jPlayer("play");	
	makePlayState();
}

function mute(){
	//mute the station
	$("#jquery_jplayer_1").jPlayer("mute");
	
	//change icon to mute
	var mute_button = document.getElementById('mute_button');
	$("#mute_button").removeClass('unmute').addClass('mute');
	
	//add unmute listener
	mute_button.removeEventListener('click', mute, false);
	mute_button.addEventListener('click', unmute, false);
}

function unmute(){
	//unmute station
	$("#jquery_jplayer_1").jPlayer("unmute");
	
	//change button style
	var mute_button = document.getElementById('mute_button');
	$("#mute_button").removeClass('mute').addClass('unmute');
	
	//add mute listener
	mute_button.removeEventListener('click', unmute, false);
	mute_button.addEventListener('click', mute, false);
}

function showHistory(){
	if(view_state == 1){
		hideStations();
	}
	view_state = 2;

	//make sure we have history
	if(history.length == 0){
		alert("Haven't received history on this station yet.  Try again.");
		return;
	}

	//resize our window
	window.resizeTo(410, expanded_height);
	
	//change show stations to hide stations
	var show_hist_button = document.getElementById('show_history');
	show_hist_button.removeEventListener('click', showHistory, false);
	show_hist_button.value = "Hide History";
	show_hist_button.addEventListener('click', hideHistory, false);
	
	//build dom
	var history_wrapper = document.createElement('div');
	history_wrapper.setAttribute('id', 'history_wrapper');
	
	var history_table = document.createElement('table');
	history_table.setAttribute('id', 'history_table');
	var history_tbody = document.createElement('tbody');
	var header_row = document.createElement('tr');
	var time_header = document.createElement('th');
	time_header.innerHTML = "Time";
	header_row.appendChild(time_header);
	var artist_header = document.createElement('th');
	artist_header.className = "artist_col";
	artist_header.innerHTML = "Artist";
	header_row.appendChild(artist_header);
	var song_header = document.createElement('th');
	song_header.innerHTML = "Song";
	header_row.appendChild(song_header);
	
	history_tbody.appendChild(header_row);
	
	for(var i=0; i<history.length; i++){
		var history_song = document.createElement('tr');
		var history_time = document.createElement('td');
		//parse the correct time string from unix time
		var time = new Date(history[i].date * 1000);
		var seconds = time.getSeconds();
		if(String(seconds).length < 2){
			seconds = String("0" + seconds);
		}
		var minutes = time.getMinutes();
		if(String(minutes).length < 2){
			minutes = String("0" + minutes);
		}
		var time_string = time.getHours() + ":" + minutes + ":" + seconds;
		history_time.innerHTML = time_string; 
		history_song.appendChild(history_time);
		var history_artist = document.createElement('td');
		history_artist.className = "artist_col history_artist"
		history_artist.innerHTML = history[i].artist;
		history_song.appendChild(history_artist);
		var history_title = document.createElement('td');
		history_title.innerHTML = history[i].title;
		history_song.appendChild(history_title);		
		history_tbody.appendChild(history_song);
	}	
	
	
	history_table.appendChild(history_tbody);
	history_wrapper.appendChild(history_table);
	document.getElementById('wrapper').appendChild(history_wrapper);
	
		
}

function hideHistory(){
	view_state = 0;
	window.resizeTo(410, height);
	
	//remove our history elements from the dom
	var history_holder = document.getElementById("history_wrapper");
	history_holder.parentNode.removeChild(history_holder);
	
	//change hide stations to show stations
	var show_hist_button = document.getElementById('show_history');
	show_hist_button.removeEventListener('click', hideHistory, false);
	show_hist_button.value = "Show History";
	show_hist_button.addEventListener('click', showHistory, false);
}

function showStations(){
	if(view_state == 2){
		hideHistory();
	}
	view_state = 1;	

	//resize our window
	window.resizeTo(410, expanded_height);
	
	//change show stations to hide stations
	var show_stations_button = document.getElementById('show_stations');
	show_stations_button.removeEventListener('click', showStations, false);
	show_stations_button.value = "Hide Stations";
	show_stations_button.addEventListener('click', hideStations, false);
	
	//build dom
	var stations_holder = document.createElement('div');
	stations_holder.setAttribute('id', 'stations_holder');
	document.getElementById('wrapper').appendChild(stations_holder);
	
	for(var i=0; i<station_nicks.length; i++){
		/* Don't include currently playing station in "show stations" list
		Removed because it prohibits changing station and then changing back to original
		if(station_nicks[i] == current_station){
			continue;
		}
		*/
		
		//create the station div
		var station1 = document.createElement('div');
		station1.className = "station";
		station1.setAttribute('onclick', "playStation('"+station_nicks[i]+"')");
		
		//create the station art div
		var show_station_art = document.createElement('img');
		show_station_art.setAttribute('class', 'show_station_art');
		show_station_art.src = stations[station_nicks[i]].image;
		
		//create the station information div
		var show_station_info = document.createElement('div');
		show_station_info.setAttribute('class', 'show_station_info');
		show_station_info.innerHTML = stations[station_nicks[i]].title;		
		
		//create the station description div and put it in station information
		var show_station_description = document.createElement('div');
		show_station_description.setAttribute('class', 'show_station_description');
		show_station_description.innerHTML = stations[station_nicks[i]].description;
		show_station_info.appendChild(show_station_description);		
		
		//add click event listener to play station
		
		
		station1.appendChild(show_station_art);
		station1.appendChild(show_station_info);
		stations_holder.appendChild(station1);
	}
}

function hideStations(){
	view_state = 0;
	window.resizeTo(410, height);
	
	//remove our station elements from the dom
	var holder = document.getElementById("stations_holder");
	holder.parentNode.removeChild(holder);
	
	
	//change hide stations to show stations
	var show_button = document.getElementById('show_stations');
	show_button.removeEventListener('click', hideStations, false);
	show_button.value = "Show Stations";
	show_button.addEventListener('click', showStations, false);
}

