var express = require('express');
var fileUpload = require('express-fileupload');
var mustacheExpress = require('mustache-express');
var MidiConvert = require('midiconvert');
var fs = require('fs');
var bodyParser = require('body-parser');
var SerialPort = require('serialport');

// serial input buffer
var buffer = [];

// init serial port
var port;
var portOpen = false;

// states
var state = 'wait';;

port = new SerialPort('/dev/ttyACM0', {
	baudRate: 9600
});

port.on('open', function() {
  console.log('Connection established to ttyACM0');
  portOpen = true;

  port.on('data', function(data) {

    console.log('Received data...');

    for (var i = 0; i < data.length; i++) {
      if (data[i] == 248) {}
      else if (data[i] == 99) {
        console.log('Received ACK for note');
        buffer.push(data[i]);
      } else if (data[i] == 100) {
        console.log('Received ACK for command header');
      } else if (data[i] == 101) {
        console.log('Received ACK for end of loading');
      } else console.log('Received unknown char: ' + data[i]);
    }

  });

  port.write('L1~');

});


// initialize express
var app = express();

app.use(bodyParser.json());
app.use(fileUpload());
app.use('/js', express.static('js'));
app.use('/bootstrap', express.static('bootstrap'));
app.use('/css', express.static('css'));

// register templating
app.engine('html', mustacheExpress());

app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

app.get('/', function(req, res) {
    // get list of the filenames
    fs.readdir('midifiles/', function(err, files) {
        res.render('list.html', {files : files});
    });
});

app.get('/convert', function(req, res) {

    var filePath = 'midifiles/' + req.query.fn;

    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            var midi = MidiConvert.parse(midiStr);
            res.json(midi);
        } else {
            res.status(500).send(err);
        }
    });
});

app.get('/convertToStream', function(req, res) {
    var filePath = 'midifiles/' + req.query.fn;

    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            var midi = MidiConvert.parse(midiStr);
            // json form of the song is in midi
            // parse through the notes, convert them properly.
            for (var i in midi.tracks) {
                for (var j in midi.tracks[i].notes) {
                    var note = midi.tracks[i].notes[j];
                    convertNote(note.name, note.time, note.duration, note.velocity);
                }
            }

        } else {
            res.status(500).send(err);
        }
    });
});

function convertNote(name, time, intensity, duration) {
    // DANNY HERE IS THE CONVERSION!

    //console.log('convert called with params ' + name + ' ' + time + ' ' + intensity + ' ' + duration);


		var noteConversion = {
			"C":   "00000000",
			"C#":   "00000001",
			"Db":   "00000001",
			"D":   "00000010",
			"D#":   "00000011",
			"Eb":   "00000011",
			"E":   "00000100",
			"F":   "00000101",
			"F#":   "00000110",
			"Gb":   "00000110",
			"G":   "00000111",
			"G#":   "00001000",
			"Ab":   "00001000",
			"A":   "00001001",
			"A#":   "00001010",
			"Bb":   "00001010",
			"B":   "00001011",
		}

		//for the char code
		var noteConversionDec = {
        "C":   0,
        "C#":   1,
        "Db":   1,
        "D":   2,
        "D#":   3,
        "Eb":   3,
        "E":   4,
        "F":   5,
        "F#":   6,
        "Gb":   6,
        "G":   7,
        "G#":   8,
        "Ab":   8,
        "A":   9,
        "A#":   10,
        "Bb":   10,
        "B":   11,
    }

    //Trim off the last character of the note name to remove the octave?
    var noteChar = noteConversion[name.substring(0, name.length - 1)];

		var noteCharCode = noteConversionDec[name.substring(0, name.length - 1)];

    var timeChar = Math.round(Number(time) * 100).toString(2);
    while (timeChar.length < 16) timeChar = '0' + timeChar;

		var timeCharCode = String.fromCharCode(Math.round(Number(time) * 100));

    var durationMili = Math.round(Number(duration) * 1000);

		var durationCharCode = String.fromCharCode(Math.round(Number(duration) * 1000));

    var durationChar = (durationMili >>> 0).toString(2);

    var velocityNorm = Math.round(Number(intensity) * 255);

		var velocityCharCode = String.fromCharCode(velocityNorm);

    var velocityChar = (velocityNorm >>> 0).toString(2);

    var resultStr = noteChar.concat(velocityChar, durationChar, timeChar);

		var resultChars = [noteCharCode, velocityCharCode, durationCharCode, timeCharCode];

    //console.log(resultStr);

    return resultChars;

}

app.get('/testConversion', function(req, res){

    var x = 0.25;
    var midi = {
        "header": {
            "bpm": 90,
            "timeSignature": [
                4,
                4
            ],
            "PPQ": 4
        },
        "tracks": [
            {
                "name": "midi test",
                "instrument": "piano",
                "notes": [
                    {
                        "midi": 72,
                        "time": 1*x,
                        "name": "E4",
                        "velocity": 250,
                        "duration": x
                    },
                    {
                        "midi": 74,
                        "time": 2*x,
                        "name": "D4",
                        "velocity": 250,
                        "duration": x
                    },
                    {
                        "midi": 76,
                        "time": 3*x,
                        "name": "C4",
                        "velocity": 250,
                        "duration": x
                    },
                ]
            }
        ]
    };

    var resultString = '';
		var results = [];

    for (var i in midi.tracks) {
        for (var j in midi.tracks[i].notes) {
            var note = midi.tracks[i].notes[j];
            //resultString += convertNote(note.name, note.time, note.duration, note.velocity);
            results.push(convertNote(note.name, note.time, note.duration, note.velocity));
        }
    }

    // TODO: DANNY FIGURE OUT HOW TO SEND THE RESULT STRING!

    // var results = resultString.split('\n');
    // var charResults = [];
    // for (var i = 0; i < results.length; i++) {
    //   var c = '';
    //   while (c.length < results[i].length / 8) {
    //     //console.log(parseInt(results[i].substring(c.length * 8, c.length * 8 + 8), 2));
    //     c += parseInt(results[i].substring(c.length * 8, c.length * 8 + 8), 2);
    //   }
    //   charResults.push(c);
    // }

		var resStr = '';
		for (var i = 0; i < results.length; i++) {
			for (var j = 0; j < results[i].length; j++) {
				resStr += results[i][j] + ' ';
			}
			resStr += ' | ';
		}

		//console.log(resStr);
    res.send(resStr);
		sendPackets(results);

});


app.get('/display', function(req, res) {

    var filePath = 'midifiles/' + req.query.fn;

    fs.readFile(filePath, 'binary', function(err, midiStr) {
        if (!err) {
            var midi = MidiConvert.parse(midiStr);
            res.render('convert.html', {fn: req.query.fn, midi : JSON.stringify(midi)});
        } else {
            res.status(500).send(err);
        }
    });
});

app.get('/play', function(req, res) {

    var filePath = 'midifiles/' + req.query.fn;

    res.render('playcomplex.html', {fn: req.query.fn});

});

app.get('/sample', function(req, res) {

    res.render('sample.html');

});

app.post('/upload', function(req, res) {
    var sampleFile;

    // TODO: do prelim checking

    sampleFile = req.files.midiFile;
    sampleFile.mv('midifiles/' + sampleFile.name, function(err) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.redirect('/display?fn=' + sampleFile.name);
        }
    });

});

var server = app.listen(process.env.PORT || 3000, function() {
    var serverHostPort = server.address().port;
    console.log('started server on port ' + serverHostPort);
});

function sendPackets(d) {  

  var d = [[0x02, 0xF9, 0x03, 0x00, 0x03]];

  var complete = function() {
    console.log('Complete yoooooo');
  };

  var wait = function(i) {
    setTimeout(function() {

      if (buffer.length > 0) {
        console.log('Read: ' + buffer);
        buffer = [];
        writeNote(i + 1);
      } else wait(i);

    }, 200);
  };

  var writeNote = function(i) {

    // If all notes haves been written
    if (i >= d.length) {
      console.log('Write complete!');
      complete();
    } else if (!d[i] || d[i] == '') {
      console.log('Empty note');
      complete();
    } else {

      // Write the components of the note
      for (var j = 0; j < d[i].length; j++) {  
        port.write(d[i][j]);
        console.log('Sending: ' + d[i][j]);
      }

      // Wait for ACK
      wait();

    }

  };

  writeNote(0);

}
