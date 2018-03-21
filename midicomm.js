/*

 */
module.exports = {
    velocityToDac: velocityToDac,
    transmitState: transmitState
};
var spi = require("./spicomm");
var pedal = require("./pedalcomm");
var loki = require("lokijs");

const solenoid_on_time_limit = 8; // seconds that the solenoid is allowed to be active for

/** maps the velocity value from MIDI to a 10-bit value we write to the DAC
 * @param noteObj -
 */
function velocityToDac(noteObj){
    const dacMin = 0;
    const dacMax = 1023;
    const velocityMin = 0;
    const velocityMax = 1;
    // map velocity to DAC, taking into account that key's weight calibration value
    return dacMin + ((dacMax - dacMin)*noteObj.velocity_value) + noteObj.weightCal; // simplified, premature optimization :^)
    //return dacMin + ((dacMax - dacMin)/(velocityMax- velocityMin))*(noteObj.velocity_value - velocityMin) + noteObj.weightCal; // proper way if velocity scale changes

}

/**
 * Communicates the state of the piano keys (on/off, velocity) to the hardware
 * @param {Loki} stateDB - database containing the relation of the piano hardware state
 * @param {float} currentTime
 */
function transmitState(stateDB, currentTime){
    // TODO: Work with Kevin & get the names right
    //Obtain the keys that should be on
    var pianoState = stateDB.getCollection("pianostate").getDynamicView("activeKeys").data();
    var notesToEnable = [];
    var key = null;
    for (var i = 0;i<pianoState.length;i++){ // for each key on the piano:
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