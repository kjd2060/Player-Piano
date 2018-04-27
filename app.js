 /// File: app.js
/// Authors: Kevin Davison and Edward Maskelony
/// Description: This is the main file for the player piano webapp.  Handles requests from the web pages and has some helper functions to do that.  Uses several
/// packages to accomplish goals of parsing, request response, and database manipulation / utiliziation

// NOTE: you need to call res.end(); at the end of each request response, unless you call res.render() or something similar to that.  Do not call
// res.end() if you have called res.render()
var express = require('express');
var fileUpload = require('express-fileupload');
var mustacheExpress = require('mustache-express');
var bodyParser = require('body-parser');
var fs = require('fs');
var database = require('./database');

var midi = require("./midicomm");
var loggedIn = false;
var songs = [];
var pianoConnected = false;
module.exports = function(piano, midiProcessor) {

// Initialize express
var app = express();

// Set use statements for configuration and static file directories
app.use(bodyParser.json());
app.use(fileUpload());
app.use('/js', express.static('js'));
app.use('/bootstrap', express.static('bootstrap'));
app.use('/css', express.static('css'));
app.use('/images', express.static('images'));

// Register and configure templating engine for front end (mustache)
app.engine('html', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

/// Home directory - list out all possible files 
/// @params: '/' - the home directory/page, req - the request information, res - the page to render
app.get('/', function(req, res) {
	var copy = [];
	var temp;
    // Get list of file names and pass to front end
    fs.readdir('midifiles/', function(err, files) {
		files.forEach(function(file, index){
		    // preserve intentional hyphens, e.g. 'artist - title'
			temp = file.replace(/[ _]-[ _]/gi, ' ^ '); // hope ya'll know regex - learn it if you don't
			temp = temp.replace(/[-_]/gi, ' ');
			temp = temp.replace(/\^/gi, '-');
			copy.push(temp.replace(/\.mid/i, ''));
			songs.push({SongName: copy[index], FileName: file});
		});
		// delay until strings prettyfied
		files = copy;
        res.render('list.html', {files:files});
    });
    //res.end();
});

/*
app.get('/list', function(req, res){
	if(!loggedIn){
		res.render('login.html');
	}
	var copy = [];
	var temp;
    // Get list of file names and pass to front end
    fs.readdir('midifiles/', function(err, files) {
		files.forEach(function(file, index){
		    // preserve intentional hyphens, e.g. 'artist - title'
			temp = file.replace(/[ _]-[ _]/gi, ' ^ '); // hope ya'll know regex - learn it if you don't
			temp = temp.replace(/[-_]/gi, ' ');
			temp = temp.replace(/\^/gi, '-');
			copy.push(temp.replace(/\.mid/i, ''));
			songs.push({SongName: copy[index], FileName: file});
		});
		// delay until strings prettyfied
		files = copy;
        res.render('list.html', {files:files});
    });
});*/

/// Upload a song
app.post('/upload', function(req, res) {
    var newFile;

    // TODO: conduct prelim. error checking (filetype)

    newFile = req.files.midiFile;
    newFile.mv('midifiles/' + newFile.name, function(err) {
        if (err) {
            res.status(500).send(err);
        } else {
            // Successful upload: redirect to play page
            res.redirect('/song?fn=' + newFile.name);
        }
    });

});

/// Creating songs from MIDI (for admin usage)
app.get('/create', function(req, res) {
    res.render('create.html');
});

app.post('/create', function(req, res) {
    // Retreive the notes array from the request
    var notes = JSON.parse(req.body.song);
    var fileName = req.body.fileName;
    var encodedMidi = midiProcessor.createMidi(notes);

    fs.writeFileSync('midifiles/' + fileName + '.mid', encodedMidi, "binary");

    res.redirect('/song?fn=' + fileName + '.mid');

});

var dur;
/// View a song's raw output from processing (for admin usage)
app.get('/view', function(req, res) {
    var filePath = 'midifiles/' + req.query.fn;
	
	var result = songs.filter(function( obj ) {
		return obj.SongName === req.query.fn;
	});
	
	//console.log(result);
	
    // Read the specified file from the file directory
    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            // convert midi to json
            var midiJSON = midiProcessor.convertToJSON(midiStr);
            var processorResult = midiProcessor.parseMidiJSON(midiJSON);
            var song = processorResult.simpleArray;


            res.send(JSON.stringify(song));

        } else {
            // Failed to read the .midi file, throw error
            res.status(500).send(err);
        }
    });
    //res.end();
});

/// Get a specified song, display UI controls for song after loading it in to piano
app.get('/song', function(req, res) {
	// setup the filename and stuff to identify the midi file that we 
	// want to get.
	var filePrefix = 'midifiles/';
    var filePath = filePrefix + req.query.fn;

	var result = songs.filter(function( obj ) {
		return obj.SongName === req.query.fn;
	});
	var filename = result[0].FileName;
	filePath = filePrefix + filename;
	
	// since duplicates would mean duplicate filenames and we'll assume they want the first one
	temp = result[0];
	
    // Read the specified file from the file directory
    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            // convert midi to json
            var midiJSON = midiProcessor.convertToJSON(midiStr);
            var processorResult = midiProcessor.parseMidiJSON(midiJSON);
            var song = processorResult.simpleArray;
            dur = midiJSON.duration;

            // add the song to the database
            database.addSong(result[0].SongName, midiJSON);
            database.printSong(result[0].SongName);

            var dbTracks = database.getTrackView();

            //console.log("dbTracks.length: " + dbTracks.length);
            var obj = [];
            // sets up the information for checking / unchecking tracks on the webpage which controls what tracks are played
            // iterate through the tracks in the database and if they have notes, add it to the potential checkable tracks.  otherwise ignore it.
            for(var i = 0; i < dbTracks.length; i++){
                var track = dbTracks[i];
                if(!(track.song === result[0].SongName) || track.length <= 0){ //!track.name && !track.instrument)  || !(track.song === result[0].SongName)){
                    // do nothing
                }
                else if(!track.name && !track.instrument){
                	track.name = "untitled track";
                	track.instrument = "upright piano";
                	if(!track.instrumentFamily)
                		track.instrumentFamily = "piano";
                    obj.push({trackName: track.name, checked:track.checked, noteCount:track.length});
                }
                else if(!track.name){
                	obj.push({trackName: track.instrument, checked:track.checked, noteCount:track.length});
                }
                else{
                    obj.push({trackName: track.name, checked:track.checked, noteCount:track.length});
                }
                var controls = database.getControlsView();
            }

			if(pianoConnected){ // case is likely depricated, probably ignorable
				console.log("piano connected");
				// load the song on to the piano
				piano.loadSong(song, function() {
					// loading song was successful!
					res.render('playsong.html', {fn: req.query.fn, fileName: filePath, tracks:obj});
					
				});
			}
			else{
				var durStr = ""+(Math.floor(dur/60)) + ":" + ((dur % 60).toFixed(0)); // calculation for converting the song duration to a displayable string
				// render the song page with the expected information using mustache (see playsong.html for more)
				res.render('playsong.html', {
				    fn:req.query.fn,
                    fileName: filePath,
                    songEnd: durStr,
                    baseBPM:database.getCurrentSongBPM(),
                    tracks:obj,
                    songEndSeconds:Math.floor(dur)
                });
			}

        } else {
            // Failed to read the .midi file, throw error
            res.status(500).send(err);
        }
    });
    //res.end();
});

/// Called when the user presses the 'play' button.  Plays the song that has been selected
/// 
app.post('/start', function(req, res) {
    // pass the config from the webpage into the play function
    var tempo = parseInt(req.body.tempo);
    var startTime = parseInt(req.body.startTime);
    var fn = req.body.fn;
    if (!tempo) {
        tempo = 120;
    }
    midi.playSong(database.getPianoState(), tempo, startTime, fn);
    // end our POST so the browser won't wait or resend the request
    res.end();
});

/// Called when the user presses the 'stop' button.  Stop playback
app.post('/stop', function(req, res) {
    // trigger the midicomm stopEvent
    midi.stopPlaying();
    // end our POST so the browser won't wait or resend the request
    res.end()
});

/// Called when the user checks or unchecks a track to filter the it up
app.post('/updateTracks', function(req, res){
    var checkedBoxes = req.body;
    // we know we're only getting data when the checkbox is checked.  figure out a way to filter out the tracks!
    var trackView = database.getTrackView();
    // {request_data : trackName }
    for(var i = 0; i < trackView.length; i++){
        var t = trackView[i];
        // console.log('name ' + t.name + ', instrument' + t.instrument);
        if((t.name === req.body.request_data) || (t.instrument === req.body.request_data)){
        	console.log(t.name, t.instrument);
            if(t.checked == true){
            	t.checked = false;
            }
            else if(t.checked == false){
            	t.checked = true;
            }
        }
    }
    // end our POST so the browser won't wait or resend the request
    res.end();
});

/*
app.post('/login', function(req, res){
	var expectedUName = "admin";
	var expectedPW = "narwhal1337";
	if(req.body.username === expectedUName && req.body.password === expectedPW){
		console.log("allow login");
		var copy = [];
		var temp;
	    // Get list of file names and pass to front end
	    fs.readdir('midifiles/', function(err, files) {
			files.forEach(function(file, index){
			    // preserve intentional hyphens, e.g. 'artist - title'
				temp = file.replace(/[ _]-[ _]/gi, ' ^ '); // hope ya'll know regex - learn it if you don't
				temp = temp.replace(/[-_]/gi, ' ');
				temp = temp.replace(/\^/gi, '-');
				copy.push(temp.replace(/\.mid/i, ''));
				songs.push({SongName: copy[index], FileName: file});
			});
			// delay until strings prettyfied
			files = copy;
	        res.render('list.html', {files:files});
    	});
	}
	else{
		console.log("Invalid login");
		res.end();
	}
});*/
var timer = setInterval(workWithTimer, 1000);

function workWithTimer(){

}

return app;

};
