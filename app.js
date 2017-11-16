var express = require('express');
var fileUpload = require('express-fileupload');
var mustacheExpress = require('mustache-express');
var bodyParser = require('body-parser');
var fs = require('fs');

module.exports = function(piano, midiProcessor) {

// Initialize express
var app = express();

// Set use statements for configuration and static file directories
app.use(bodyParser.json());
app.use(fileUpload());
app.use('/js', express.static('js'));
app.use('/bootstrap', express.static('bootstrap'));
app.use('/css', express.static('css'));

// Register and configure templating engine for front end (mustache)
app.engine('html', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

// Home directory - list out all possible files 
app.get('/', function(req, res) {
    // Get list of file names and pass to front end
    fs.readdir('midifiles/', function(err, files) {
        res.render('list.html', {files: files});
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

// View a song's raw output from processing (for admin usage)
app.get('/view', function(req, res) {
    var filePath = 'midifiles/' + req.query.fn;

    // Read the specified file from the file directory
    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            // convert midi to json
            var midiJSON = midiProcessor.convertToJSON(midiStr);
	    console.log('midi json:');
	    console.log(JSON.stringify(midiJSON));
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
    var filePath = 'midifiles/' + req.query.fn;

    // Read the specified file from the file directory
    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            // convert midi to json
            var midiJSON = midiProcessor.convertToJSON(midiStr);
            var processorResult = midiProcessor.parseMidiJSON(midiJSON);
            var song = processorResult.simpleArray;
            console.log('json processed:');
            console.log(JSON.stringify(midiJSON));
            console.log('song processed:');
            console.log(JSON.stringify(song));
            // load the song on to the piano
            piano.loadSong(song, function() {
                // loading song was successful!
                res.render('playsong.html', {fn: req.query.fn});
                
            });

        } else {
            // Failed to read the .midi file, throw error
            res.status(500).send(err);
        }
    });
});

// Playback controls for song (buttons) via post
app.post('/start', function(req, res) {
    // String.fromCharCode(10)
    var tempo = req.body.tempo;
    if (!tempo) {
	tempo = 10;
    }
    var tempoChar = String.fromCharCode(32 + Number(tempo));
    piano.play(tempoChar, function() {
        res.send('success');
    });
});

app.post('/pause', function(req, res) {
    piano.pause(function() {
        res.send('success');
    });
});

app.post('/stop', function(req, res) {
    piano.stop(function() {
        res.send('success');
    });
});




return app;

};
