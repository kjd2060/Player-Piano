/*

 */
module.exports = {
    velocityToDac: velocityToDac,
    transmitState: transmitState,
    playSong: playSong
};
var spi = require("./spicomm");
var pedal = require("./pedalcomm");
var Loki = require("lokijs");
var gc = require("./globalConstants");

const solenoid_on_time_limit = gc.solenoid_on_time_limit; // seconds the solenoid is allowed to be active for
const minimum_cycle_duration = gc.minimum_cycle_duration_ms;

/** maps the velocity value from MIDI to a 10-bit value we write to the DAC
 * @param noteObj -
 */
function velocityToDac(noteObj){
    const dacMin = 0;
    const dacMax = 1023;
    const velocityMin = 0;
    const velocityMax = 1;
    // map velocity to DAC, taking into account that key's weight calibration value
    return dacMin + ((dacMax - dacMin)*noteObj.velocityValue) + noteObj.weightCal; // simplified, premature optimization :^)
    //return dacMin + ((dacMax - dacMin)/(velocityMax- velocityMin))*(noteObj.velocity_value - velocityMin) + noteObj.weightCal; // proper way if velocity scale changes

}

/**
 * Communicates the state of the piano keys (on/off, velocity) to the hardware
 * @param {Loki} db - database containing the relation of the piano hardware state
 * @param {number} currentTime
 */
function transmitState(db, currentTime){
    //Obtain the keys that should be on
    var pianoState = db.getCollection("pianoState").getDynamicView("activeKeys").data();
    var notesToEnable = [];
    var key = null;
    for (var i = 0;i<pianoState.keys().length;i++){ // for each key on the piano:
        key = pianoState[i];
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

function playSong(db, userBPM, startTime){
    var currentSong = db.getCollection("songs").getDynamicView("songView").branchResultset();
    var pianoState = db.getCollection("pianoState");
    const baseBPM = currentSong.bpm;
    // determine our timing resolution based on smallest time unit in the track (pulse)
    //   query this amount of time in the midi data (in seconds):
    var midiInterval = currentSong.bpm * currentSong.PPQ / 60;
    //   this is the real time duration of a pulse (in milliseconds):
    var timerInterval = midiInterval * currentSong.bpm / userBPM * 1000;

    // if we try to update faster than our spec allows, slow it down by half
    while (timerInterval < minimum_cycle_duration){
        midiInterval *= 2;
        timerInterval *= 2;
    }
    // track progress in the song,
    var songTime = 0;

    var currentNotes,key,note;

    var playLoop = setInterval(function(){
        // find all notes that should be on
        currentNotes = currentSong.find({ $and:[
                {time:{$lte:songTime}},
                {time:{$gt:songTime+"this.duration"}} //TODO: this is sketchy; perhaps we store endTime instead of duration?
            ]}).data();
        for (note in currentNotes){
            key = pianoState.find({midi:note.keyNumber});
            key.onTime = songTime;
            key.noteOn = true;
            key.velocityValue = note.velocity;
        }
        // state is updated, now sync the hardware to it
        transmitState(db,songTime);

        // increment timer to the next pulse
        songTime += midiInterval;

        if(songTime > currentSong.duration){
            // song is over, turn off keys and quit looping
            spi.setKeyEnables([]);
            clearInterval(playLoop);
        }
    }, timerInterval);
    //TODO: integrate pedal control in this loop
}
