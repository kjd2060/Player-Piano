/*

 */
module.exports = {
    velocityToDac: velocityToDac,
    transmitState: transmitState,
    playSong: playSong,
    stopPlaying: stopPlaying
};
var spi = require("./spicomm");
var pedal = require("./pedalcomm");
var Loki = require("lokijs");
var database = require("./database");
var gc = require("./globalConstants");
var events = require('events');

var eventEmitter = new events.EventEmitter();

var playing = false; // playback status variable

const solenoid_on_time_limit = gc.solenoid_on_time_limit; // seconds the solenoid is allowed to be active for
const minimum_cycle_duration = gc.minimum_cycle_duration_ms;

/** maps the velocity value from MIDI to a 10-bit value we write to the DAC
 * @param noteObj -
 */
function velocityToDac(noteObj){
    const dacMin = gc.minDacValue;
    const dacMax = gc.maxDacValue;
    // const velocityMin = 0;
    // const velocityMax = 1;
    // map velocity to DAC, taking into account that key's weight calibration value
    return dacMax - (dacMin + ((dacMax - dacMin)*noteObj.velocityValue) + noteObj.weightCal); // simplified, premature optimization :^)
    //return dacMin + ((dacMax - dacMin)/(velocityMax- velocityMin))*(noteObj.velocity_value - velocityMin) + noteObj.weightCal; // proper way if velocity scale changes

}

/**
 * Communicates the state of the piano keys (on/off, velocity) to the hardware
 * @param {Loki} pianoState - database containing the relation of the piano hardware state
 * @param {number} currentTime
 */
function transmitState(pianoState, currentTime){
    // Obtain the keys that should be on
    var pianoActiveState = pianoState.find({noteOn:true});
    var notesToEnable = [];
    var key = null;
    for (var k in pianoActiveState){ // for each key on the piano:
        key = pianoActiveState[k];
        // if the note's velocity changed, write to the DAC
        if (key.velocityValue !== key.velocityPrevious){
            spi.setDac(key.keyNumber,velocityToDac(key));
            key.velocityPrevious = key.velocityValue;
        }
        // activate key, only if has not been on for longer than the time limit
        if (key.onTime + solenoid_on_time_limit > currentTime){
            notesToEnable.push(key.keyNumber);
        }
        // clear the key here. if the key should remain on, the update function will set it again next cycle.
        // On the upper level, we explicity send "which keys should be on now"; this reset allows us to
        //   assume that the notes we don't specify are implicitly powered off.
        key.noteOn = false;
    }
    // write to the shift register chain
    spi.setKeyEnables(notesToEnable);

}

function playSong(pianoState, userBPM, startTime){
    // only play if we're not already playing
    var l = eventEmitter.listeners('stopEvent');
    if (l.length > 0){
        return;
    }

    // get the song we want to play
    var currentSong = database.getSongView();
    var currentSongData = currentSong[currentSong.length-1]; // THIS IS DUCT TAPE
    spi.initSpi();
    var bpmCorrection = 0.90;

    // If altered BPM is not provided, use the file's value for playback
    if (userBPM===null){
        userBPM = currentSongData.bpm;
    }

    // determine our timing resolution based on smallest time unit in the track (pulse)
    //   query this amount of time in the midi data (in seconds):
    var midiInterval = 60 / (currentSongData.bpm * currentSongData.PPQ);
    //   this is the real time duration of a pulse (in milliseconds):
    var timerInterval = midiInterval * currentSongData.bpm / userBPM * 1000 * bpmCorrection;

    // if we try to update faster than our spec allows, slow it down by half
    while (timerInterval < minimum_cycle_duration){
        midiInterval *= 2;
        timerInterval *= 2;
    }
    // track progress in the song,
    var songTime = startTime;

    var currentNotes,key,note,currentPedalEvents,pedalToActuate;
    var songNotes = database.getSongNotes(currentSongData.name);
    var pedalEvents = database.getSongControls(currentSongData.name);

    var playLoop = setInterval(function(){
        // find all notes that should be on
        currentNotes = songNotes.copy().find({ // operate on a copy;
                                               // operating on the original Resultset clears it!
            $and:[
                {time: {$lte: songTime}},
                {end:{$gt:songTime}}
        ]}).data();
        for (var n in currentNotes){
            note = currentNotes[n];
            key = pianoState.findOne({keyNumber:note.midi});
            // update key status
            if (key !== null) {  // protect against out-of-range notes w/ no corresponding key
                key.noteOn = true;
                key.onTime = songTime; //TODO: this doesn't work as expected, it's set to the latest time regardless
                key.velocityValue = note.velocity;
                // ensure the changes are reflected in the state db
                pianoState.update(key);
            }
        }
        // state is updated, now sync the hardware to it
        transmitState(pianoState,songTime);

        // check for pedal events

        currentPedalEvents = pedalEvents.copy().find({ // copy that floppy
            time: {$between: [songTime+gc.pedalLookAheadTime, songTime+gc.pedalLookAheadTime+midiInterval]},
            number: {$in:[64,66,67]}
        }).data();
        for (var e in currentPedalEvents){
            switch (currentPedalEvents[e].number){
                case 64:
                    pedalToActuate = pedal.pedals.sustain;
                    break;
/*          ***pedals not available in our system***
                case 66:
                    pedalToActuate = pedal.pedals.soft;
                    break;
                case 67:
                    pedalToActuate = pedal.pedals.sostenuto;
                    break;
 */
                default:
                    // don't try to press a pedal we don't have
                    continue;
            }
            // determine direction, and activate
            if (currentPedalEvents[e].value){
                pedal.pedalHold(pedalToActuate);
            } else {
                pedal.pedalRelease(pedalToActuate);
            }
        }

        // increment timer to the next pulse
        songTime += midiInterval;

        if(songTime > currentSongData.duration){
            // song is over, turn off keys and quit looping
            eventEmitter.emit("stopEvent")
        }
    }, timerInterval);

    // turn off keys and quit looping, triggered by stop buttons or end-of-song
    function stopEvent(){
        spi.setKeyEnables([]);
        clearInterval(playLoop);
        spi.finishSpi();
        pedal.pedalRelease(pedal.pedals.sustain);
        // pedal.pedalRelease(pedal.pedals.sostenuto);
        // pedal.pedalRelease(pedal.pedals.soft);
        // we have stopped playing, stop listening until playSong is called again
        eventEmitter.removeListener("stopEvent",stopEvent);
    }
    eventEmitter.addListener('stopEvent',stopEvent);
}

function stopPlaying(){
    eventEmitter.emit("stopEvent");
}
