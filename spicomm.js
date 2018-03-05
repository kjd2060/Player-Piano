// handles the bit-level communication with thw boards, abstracting higher-level "play this note" functions
// Author: Edward Maskelony     exm8563@rit.edu

var rpio = require('rpio');
var db = require('lokijs');

// Pin mapping (physical, not BCOM):
//
// Shift Register (parallel data push)
//  RCLK:  7
//
// SPI
//  MOSI: 19
//  MISO: 21
//  SCLK: 23
//  CE0 : 24    *
//  CE1 : 26    *
// Board Enables:
//  1-  11
//  2-  12
//  3-  13
//  4-  15
//  5-  16
//  6-  18
//
//  7-  22
//  8-  27
//  9-  28
//  10- 29
//  11- 31
//          * Pin 24 & 26 must be set using the spi interface (spiChipSelect(0/1/2)), not standard GPIO
//          ** RCLK is a fairly "special case" signal, so it may be the appropriate use of (otherwise unusable) CE1.
const board_enables = [-1,11,12,13,15,16,18,22,27,28,29,31];  // index this by board address, base 1; address 0 is invalid
const modules_connected = 1;
const shiftreg_rclk = 7;
const module_size = 8;
const module_base = 0; // this is the position of our lowest solenoid
const adc_cmd = {  // includes DAC opcodes in case we need them
    "adcSelectShift":12,
    "dataReset":0xE000,
    "dataCtrlReset":0xF000
};
const solenoid_on_time_limit = 8; // seconds that the solenoid is allowed to be active for

exports.initSpi = function () {
    var initsettings = {
        gpiomem:false,
        mapping:'physical'  // use hardware pin numbering, not BCM
    };
    // enable SPI mode, disable GPIO on those pins
    rpio.init(initsettings);
    rpio.spiBegin();
    // DAC chips are the slowest limit, at 30MHZ; we need to divide our clock down to 25MHz at most (10)
    // Currently operating at 2MHz just to be safe, with plenty of headroom if we need to speed up to meet our req.
    rpio.spiSetClockDivider(1260); //126 for 2MHz; we're slowing down 10x for initial debugging
    // set GPIO output mode on each enable pin used
    for (var x=1; x <= modules_connected; x++){
        rpio.open(board_enables[x], rpio.OUTPUT);
        // active low, initialize to every board off
        rpio.write(board_enables[x], rpio.HIGH);
    }
    // open GPIO pin for RCLK
    rpio.open(shiftreg_rclk,rpio.OUTPUT);
    // rpio.spiChipSelect(0); // we only need this if we return to using SPI CE pins as RCLK, also need to consider setCSPolarity()
};

/**
 * turn off all solenoids, disable SPI mode, set GPIO low on relevant pins
 */
exports.finishSpi = function() {
    setKeyEnables([]);
    for (var x=1; x <= modules_connected; x++){
        rpio.write(board_enables[x], rpio.LOW);
        rpio.close(board_enables[x]);
    }
    rpio.spiEnd();
};

/**
 * Set RCLK 0 to 1, ready for the next rising edge
 */
function rclkRisingEdge() {
    // Set RCLK 0 to 1, pushing data in serial registers to output registers
    //rpio.spiChipSelect(0);
    rpio.write(shiftreg_rclk, rpio.HIGH);
}

/**
 * Set RCLK 1 to 0, pushing data in serial registers to output registers
 */
function rclkFallingEdge() {
    // Set RCLK 1 to 0, pushing data in serial registers to output registers
    //rpio.spiChipSelect(1); // CE0 selected,
    rpio.write(shiftreg_rclk, rpio.LOW);
}

/**
 * Send SPI command to change the DAC voltage
 * @param {int} keyAddress - MIDI number of the key to be updated
 * @param {int} value - 10-bit DAC value to write
 */
exports.setDac = function (keyAddress,value){
    var localKey = keyAddress-module_base;
    if ((localKey > module_size * modules_connected) || (keyAddress < module_base)){
        throw "Error: key ({0}) out of range".format(keyAddress);
    }
    if (value > 1023 || value < 0){
        throw "Error: invalid DAC value";
    }
    // calculate which module this key belongs in
    var moduleAddress = Math.floor(localKey/module_size)+1;// target is our board address
    // pack bits, stuff 'er into a buffer
    var spiCmd = ((localKey % module_size) << adc_cmd.adcSelectShift) | (value << 2);
	var spiCmdBuffer = new Buffer([(spiCmd & 0xff00) >> 8,spiCmd & 0xff]);
	// set enable of target module high, write it, disable
    rpio.write(board_enables[moduleAddress], rpio.LOW);
    rpio.spiWrite(spiCmdBuffer, spiCmdBuffer.length);
    rpio.write(board_enables[moduleAddress], rpio.HIGH);
};
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
            setDac(key.keyNumber,velocityToDac(key));
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
    setKeyEnables(notesToEnable);

}

/**
 * provides an adjustment value for each key to compensate its weight
 * @param {int} size - number of keys
 * @returns {Array[]}
 */
exports.genCalMap = function (size){
    // this function should be edited to calibrate the volumes of keys with different weights
    // procedure for this will likely be plotting velocity/measured loudness in excel and fitting an equation
    if (size === null){
        size = modules_connected*module_size;
    }
    // set this to 1 if even midi-numbered notes will be played with the heavier (extended) plungers
    const evenNotesHeavy = 0;

    var calMap = new Array(size);
    // populate the map with coefficients that will add (or possibly multiply?) the DAC value
    for (var i=0;i< calMap.length;i++){
        if (i%2 !== evenNotesHeavy){
            // equation for heavier, extended solenoid plungers
            calMap[i]= 0;
        }
        else {
            // equation for lighter, top-rail solenoid plungers
            calMap[i]= 0;
        }
    }
    return calMap;
};

/**
 * Performs serial write to shift register(s), turning on the specified solenoids
 * @param {Array} noteArray - array containing the MIDI-numbered keys that will be activated
 */
exports.setKeyEnables = function (noteArray) {
    var i;
    var localKey = 0;   // used for "key - base"

    // allocate 1 byte per module, initialized to zero.
    var enableBitstream = [];  //new Array(modules_connected); enableBitstream.fill(0);
    for (i=0;i<modules_connected;i++) enableBitstream[i]=0;

    // iterate through the notes that need to be on, set bits that will be transmitted
    for (i = 0;i<noteArray.length;i++){
        localKey = noteArray[i] - module_base;
        //console.log(localKey);
        if ((localKey > module_size * modules_connected) || (noteArray[i] < module_base)){
            throw "Error: key ({0}) out of range".format(noteArray[i]);
        }
        // set the bit; our shift register chain receives the highest note first (and we transmit MSB first)
        enableBitstream[modules_connected-1-(Math.floor(localKey/8))] |= 1 << localKey%8; // 8 is just byte size here, no magic.
    }

    // ready the shift register, and Transmit!
    var keyEnableBuffer = new Buffer(enableBitstream);
    rpio.spiWrite(keyEnableBuffer, keyEnableBuffer.length);
    // enables sent, push data to output
    rclkRisingEdge();
    rclkFallingEdge();
};
