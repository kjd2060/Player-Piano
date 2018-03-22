// handles the bit-level SPI communication with the board ICs (shift register and multi-channel DAC)
// Author: Edward Maskelony  |  exm8563@rit.edu

module.exports = {
    initSpi: initSpi,
    finishSpi: finishSpi,
    setDac: setDac,
    setKeyEnables: setKeyEnables,
    genCalMap: genCalMap
};

var rpio = require('rpio');
var gc = require("globalConstants");

const board_enables = gc.board_enables;  // index this by board address, base 1; address 0 is invalid
const modules_connected = gc.modules_connected;
const shiftreg_rclk = gc.shiftreg_rclk;
const module_size = gc.module_size;
const module_base = gc.module_base; // this is the position of our lowest solenoid
const adc_cmd = gc.adc_cmd;

function initSpi() {
    var initsettings = {
        gpiomem:false,
        mapping:'physical'  // use hardware pin numbering, not BCM
    };
    // enable SPI mode, disable GPIO on those pins
    rpio.init(initsettings);
    rpio.spiBegin();
    // DAC chips are the slowest limit, at 30MHZ; we need to divide our clock down to 25MHz at most (10)
    // Operate at 2MHz (126) just to be safe, with plenty of headroom if we need to speed up to meet our req.
    rpio.spiSetClockDivider(2520); // 2520 => 100kHz
    // set GPIO output mode on each enable pin used
    for (var x=1; x <= modules_connected; x++){
        rpio.open(board_enables[x], rpio.OUTPUT);
        // active low, initialize to every board off
        rpio.write(board_enables[x], rpio.HIGH);
    }
    // open GPIO pin for RCLK
    rpio.open(shiftreg_rclk,rpio.OUTPUT);
    // rpio.spiChipSelect(0); // we only need this if we return to using SPI CE pins as RCLK, also need to consider setCSPolarity()
}

/**
 * turn off all solenoids, disable SPI mode, set GPIO low on relevant pins
 */
function finishSpi() {
    exports.setKeyEnables([]);
    for (var x=1; x <= modules_connected; x++){
        rpio.write(board_enables[x], rpio.LOW);
        rpio.close(board_enables[x]);
    }
    rpio.spiEnd();
}

/**
 * Set RCLK 0 to 1, pushing data in serial registers to output registers
 */
function rclkRisingEdge() {
    //rpio.spiChipSelect(0);
    rpio.write(shiftreg_rclk, rpio.HIGH);
}

/**
 * Set RCLK 1 to 0, ready for the next rising edge
 */
function rclkFallingEdge() {
    //rpio.spiChipSelect(1); // CE0 selected,
    rpio.write(shiftreg_rclk, rpio.LOW);
}

/**
 * Send SPI command to change the DAC voltage
 * @param {int} keyAddress - MIDI number of the key to be updated
 * @param {int} value - 10-bit DAC value to write
 */
function setDac(keyAddress,value){
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
}

/**
 * provides an adjustment value for each key to compensate its weight
 * @param {int} size - number of keys
 * @returns {Array[]}
 */
function genCalMap(size){
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
}

/**
 * Performs serial write to shift register(s), turning on the specified solenoids
 * @param {Array} noteArray - array containing the MIDI-numbered keys that will be activated
 */
function setKeyEnables(noteArray) {
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
}
