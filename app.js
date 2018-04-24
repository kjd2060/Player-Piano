var express = require('express');
var fileUpload = require('express-fileupload');
var mustacheExpress = require('mustache-express');
var bodyParser = require('body-parser');
var fs = require('fs');
var database = require('./database');

var midi = require("./midicomm");

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

// Home directory - list out all possible files 
app.get('/', function(req, res) {
	var copy = [];
	var temp;
    // Get list of file names and pass to front end
    fs.readdir('midifiles/', function(err, files) {
		files.forEach(function(file, index){
		    // preserve intentional hyphens, e.g. 'artist - title'
			temp = file.replace(/[ _]-[ _]/gi, ' ^ ');
			temp = temp.replace(/[-_]/gi, ' ');
			temp = temp.replace(/\^/gi, '-');
			copy.push(temp.replace(/\.mid/i, ''));
			songs.push({SongName: copy[index], FileName: file});
			//console.log(copy[index], file);
		});
		// delay until strings prettyfied
		files = copy;
        res.render('list.html', {files:files});
    });
});

// Upload a song
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

// Creating songs from MIDI (for admin usage)
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
// View a song's raw output from processing (for admin usage)
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
	   // console.log('midi json:');
	   // console.log(JSON.stringify(midiJSON));
            var processorResult = midiProcessor.parseMidiJSON(midiJSON);
            var song = processorResult.simpleArray;


            res.send(JSON.stringify(song));

        } else {
            // Failed to read the .midi file, throw error
            res.status(500).send(err);
        }
    });
});

// Get a specified song, display UI controls for song after loading it in to piano
app.get('/song', function(req, res) {
	var filePrefix = 'midifiles/';
    var filePath = filePrefix + req.query.fn;

	var result = songs.filter(function( obj ) {
		return obj.SongName === req.query.fn;
	});
	var filename = result[0].FileName;
	filePath = filePrefix + filename;
	
	// debugging stuff in case of weirdness
	//console.log(result);
	//console.log(result[0]); // the above returns an array so we need to get the 0'th element, 
	// since duplicates would mean duplicate filenames and we'll assume they want the first one
	temp = result[0];
	//console.log(temp.SongName);
	//console.log(temp.FileName);
	
    // Read the specified file from the file directory
    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            // convert midi to json
            var midiJSON = midiProcessor.convertToJSON(midiStr);
            var processorResult = midiProcessor.parseMidiJSON(midiJSON);
            var song = processorResult.simpleArray;
            dur = midiJSON.duration;
            //var songName = result[0].SongName;

            database.addSong(result[0].SongName, midiJSON);
            database.printSong(result[0].SongName);

            var dbTracks = database.getTrackView();

            var obj = []
            for(var i = 0; i < dbTracks.length; i++){
                var track = dbTracks[i];
                //console.log(result[0].SongName);
                // || !(track.song.equals(results[0].SongName))
                if((!track.name && !track.instrument)  || !(track.song === result[0].SongName)){
                    // do nothing
                }
                else if(!track.name){
                    obj.push({trackName: track.instrument});
                }
                else{
                    obj.push({trackName: track.name});
                }
            }

			if(pianoConnected){
				console.log("piano connected");
				// load the song on to the piano
				piano.loadSong(song, function() {
					// loading song was successful!
					res.render('playsong.html', {fn: req.query.fn, fileName: filePath, tracks:obj});
					
				});
			}
			else{
				var durStr = ""+(Math.floor(dur/60)) + ":" + ((dur % 1)*60).toFixed(0);
				res.render('playsong.html', {
				    fn:req.query.fn,
                    fileName: filePath,
                    songEnd: durStr,
                    baseBPM:database.getCurrentSongBPM(),
                    tracks:obj,
                    songEndSeconds:Math.ceil(dur)
                });
                console.log("dur: " + Math.ceil(dur));
			}

            /*
            for(var track in dbTracks){
                console.log("Track loop track: " + track + "\n");
                if(!track.name){
                    obj.tracks.push({trackName: track.instrumentFamily});
                    console.log("No track name");
                }
                else{
                    obj.tracks.push({trackName: track.name});
                }

                console.log("trackName: " + track.name + "\n");
                console.log("instrumentFamily: " + track.instrumentFamily + "\n");
            }
            */
            //var json = JSON.stringify(obj);
            //console.log("Constructed JSON for checkboxes:\n" + json);

        } else {
            // Failed to read the .midi file, throw error
            res.status(500).send(err);
        }
    });
});

// Playback controls for song (buttons) via post
app.post('/start', function(req, res) {
    if (!midi.isPlaying()) {
        var tempo = parseInt(req.body.tempo);
        var startTime = parseInt(req.body.startTime);
        if (!tempo) {
            tempo = 120;
        }
        midi.startPlaying();
        midi.playSong(database.getDB(), tempo, startTime);
    }
});

app.post('/stop', function(req, res) {
    midi.stopPlaying();
});

app.post('/updateTracks', function(req, res){
    var checkedBoxes = req.body;
    // we know we're only getting data when the checkbox is checked.  figure out a way to filter out the tracks!
    var trackView = database.getTrackView();
    // {request_data : trackName }
    for(var i = 0; i < trackView.length; i++){
        var t = trackView[i];
        if((t.name === req.body.request_data) || (t.instrument === req.body.request_data)){
            t.checked = true;
        }
    }
})

var timer = setInterval(workWithTimer, 1000);

function workWithTimer(){

}
return app;

};
