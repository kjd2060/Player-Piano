// ---------------------------------------------------------------
// Main initialization module and server loader
// ---------------------------------------------------------------

var piano = require('./pianoserial');
//var piano;
var midiProcessor = require('./midiprocessor');
var app = require('./app')(piano, midiProcessor);

// Initialize the piano (serial connections)
piano.initialize(function() {
    // successful init; Host the web server (environment out port or 3000)
    var server = app.listen(process.env.PORT || 3000, function() {
        var serverHostPort = server.address().port;
        console.log('started server on port ' + serverHostPort);
    });
});

// Host the web server (environment out port or 3000)
// var server = app.listen(process.env.PORT || 3000, function() {
//     var serverHostPort = server.address().port;
//     console.log('started server on port ' + serverHostPort);
// });


//testEndToEnd();
//testPianoSerial();
//testMidiValidity();

function testPianoSerial() {
    // Setup the serial port connections
    piano.initialize(function() {
        // Port connection has completed, load a song
        var song = [
            4, 249, 1, 0, 1,
            14, 249, 1, 0, 2,
            10, 249, 1, 0, 1,
            12, 249, 1, 0, 2
        ];

        piano.loadSong(song, function() {
            // song loading has completed, execute the timing piece
            // begin the timer!
            piano.play('}', function() {
                console.log('Process should be finished here..');
            });
        });
    });

}

function testMidiValidity() {
    var midiJSON = {
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
                        "time": 0.1,
                        "name": "E3",
                        "velocity": 0.98,
                        "duration": 1
                    },
                    {
                        "midi": 72,
                        "time": 0.05,
                        "name": "D4",
                        "velocity": 0.98,
                        "duration": 1
                    },
                    {
                        "midi": 72,
                        "time": 0.15,
                        "name": "Bb3",
                        "velocity": 0.98,
                        "duration": 1
                    },
                    {
                        "midi": 72,
                        "time": 0.05,
                        "name": "C4",
                        "velocity": 0.98,
                        "duration": 1.5
                    },
                ]
            }
        ]
    };

    var result = midiProcessor.parseMidiJSON(midiJSON);
    console.log(JSON.stringify(result));
}

function testEndToEnd() {
        var midiJSON = {
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
                        "time": 0.3,
                        "name": "C3",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 0.6,
                        "name": "D3",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 0.9,
                        "name": "E3",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 1.2,
                        "name": "F3",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 1.5,
                        "name": "G3",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 1.8,
                        "name": "A3",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 2.1,
                        "name": "B3",
                        "velocity": 0.95,
                        "duration": 2
                    },
                    {
                        "midi": 72,
                        "time": 0.3,
                        "name": "C4",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 0.6,
                        "name": "D4",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 0.9,
                        "name": "E4",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 1.2,
                        "name": "F4",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 1.5,
                        "name": "G4",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 1.8,
                        "name": "A4",
                        "velocity": 0.95,
                        "duration": 2
                    },
		    {
                        "midi": 72,
                        "time": 2.1,
                        "name": "B4",
                        "velocity": 0.95,
                        "duration": 2
                    },
                ]
            }
        ]
    };

    var processorResult = midiProcessor.parseMidiJSON(midiJSON);
    var song = processorResult.simpleArray;

        // Setup the serial port connections
    piano.initialize(function() {
        // Port connection has completed, load a song
        piano.loadSong(song, function() {
            // song loading has completed, execute the timing piece
            // begin the timer!
            piano.play('}', function() {
                console.log('Process should be finished here..');
            });
        });
    });

}