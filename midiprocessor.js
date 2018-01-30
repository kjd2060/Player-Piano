// ---------------------------------------------------------------
// Processessing piece for the midi layer of the code
// ---------------------------------------------------------------

// Exports when using require
module.exports = {
    convertToJSON : convertToJSON,
    createMidi : createMidi,
    parseMidiJSON : parseMidiJSON,
    parseMidiJSONComplex : parseMidiJSONComplex
};

var midiConvert = require('midiconvert');

var noteCodes = {
    "C3":   0,
    "C#3":   1,
    "Db3":   1,
    "D3":   2,
    "D#3":   3,
    "Eb3":   3,
    "E3":   4,
    "F3":   5,
    "F#3":   6,
    "Gb3":   6,
    "G3":   7,
    "G#3":   8,
    "Ab3":   8,
    "A3":   9,
    "A#3":   10,
    "Bb3":   10,
    "B3":   11,
    "C4":   12,
    "C#4":   13,
    "Db4":   13,
    "D4":   14,
    "D#4":   15,
    "Eb4":   15,
    "E4":   16,
    "F4":   17,
    "F#4":   18,
    "Gb4":   18,
    "G4":   19,
    "G#4":   20,
    "Ab4":   20,
    "A4":   21,
    "A#4":   22,
    "Bb4":   22,
    "B4":   23,
};

function convertToJSON(midi) {
    return midiConvert.parse(midi);
}


// Given an array of notes, creates a basic midi file.
function createMidi(noteArray) {
    var newMidi = midiConvert.create();
    var track = newMidi.track();

    for (var i in noteArray) {
        var note = noteArray[i]
        track.note(note[0], note[3], note[2], note[1]);
    }

    return newMidi.encode();
}

// convert the JSON in to the array of serial commands
// remember to sort the array by timing!
// include a total number of notes in there as well
function parseMidiJSON(midiJSON) {
    var totalNotes = 0;
    var convertedNotes = [];

    for (var i in midiJSON.tracks) {
        for (var j in midiJSON.tracks[i].notes) {
            totalNotes++;
            // get the note and send it to the conversion piece
            var note = midiJSON.tracks[i].notes[j];
            var convertedNote = convertNote(note.name, note.velocity, note.duration, note.time);
            if (convertedNote) {
                convertedNotes.push(convertedNote);
            }
        }
    }

    // Sort the resultant notes by order of ascending time
    convertedNotes.sort(function(a, b) {
        var upperSub = a.timeUpper - b.timeUpper;
        if (upperSub == 0) {
            return a.timeLower - b.timeLower;
        }
        return upperSub;
    });

    // convert the array of objects to a simple array for return type
    var simpleArrayResult = [];
    for (var i in convertedNotes) {
        simpleArrayResult.push(convertedNotes[i].name);
        simpleArrayResult.push(convertedNotes[i].intensity);
        simpleArrayResult.push(convertedNotes[i].duration);
        simpleArrayResult.push(convertedNotes[i].timeUpper);
        simpleArrayResult.push(convertedNotes[i].timeLower);
    }

    // return both array types for useage and size
    return {
        objectArray : convertedNotes,
        simpleArray : simpleArrayResult,
        totalNotes : totalNotes
    };

}

function getEndTime(midiJSON){
    
}

function parseMidiJSONComplex(midiJSON, configuration) {
    // parse it including configuration (missing notes, hands, etc)

}


// Utility functions -------------------------------

function convertNote (name, intensity, duration, time) {
    // Only continue if the note is in the possible range, if not return null
    if (!(name in noteCodes)) {
        return null;
    }
    var noteRes = noteCodes[name];

    //var intensityRes = Math.round(Number(intensity) * 255);
    // For time being, all intensities make 254
    var intensityRes = 254;

    // convert to centi-seconds
    var durationRes = Math.round(duration * 100); 
    // if the duration is too long for the controller to handle...
    if (durationRes > 254) {
        durationRes = 254;
    }

    // convert time to centi-seconds
    var timeCenti = time * 100;

    // Shift right by 8 to get the upper byte for time
    var timeUpperRes = timeCenti >> 8;

    // AND with 255 (0000000011111111) as a mask to get lower byte
    var timeLowerRes = timeCenti & 255;

    if (time == 0) {
        timeUpperRes = 0;
        timeLowerRes = 10;
    }    

    return {
        name : noteRes, 
        intensity : intensityRes, 
        duration: durationRes,
        timeUpper: timeUpperRes,
        timeLower: timeLowerRes
    };
}