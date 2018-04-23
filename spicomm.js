// handles the bit-level SPI communication with the board ICs (shift register and multi-channel DAC)
// Author: Edward Maskelony  |  exm8563@rit.edu

module.exports = {
    initSpi: initSpi,
    finishSpi: finishSpi,
    setDac: setDac,
    setKeyEnables: setKeyEnables
};

var rpio = require('rpio');
var gc = require("./globalConstants");

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
    rpio.spiSetClockDivider(1260); // 2520 => 100kHz
    // set GPIO output mode on each enable pin used
    for (var x=1; x <= modules_connected; x++){
        rpio.open(board_enables[x], rpio.OUTPUT);
        // active low, initialize to every board off
        rpio.write(board_enables[x], rpio.HIGH);
    }
    // Set to falling-edge phase, start with the clock low
    rpio.spiSetDataMode(0);
    rclkFallingEdge();
}

/**
 * turn off all solenoids, disable SPI mode, set GPIO low on relevant pins
 */
function finishSpi() {
    setKeyEnables([]);
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
    rpio.spiChipSelect(0);
    // rpio.write(shiftreg_rclk, rpio.HIGH);
}

/**
 * Set RCLK 1 to 0, ready for the next rising edge
 */
function rclkFallingEdge() {
    rpio.spiChipSelect(1); // CE0 selected,
    // rpio.write(shiftreg_rclk, rpio.LOW);
}

/**
 * Send SPI command to change the DAC voltage
 * @param {int} keyAddress - MIDI number of the key to be updated
 * @param {int} value - 10-bit DAC value to write
 */
function setDac(keyAddress,value){
    var localKey = keyAddress-module_base;
    if ((localKey > module_size * modules_connected) || (keyAddress < module_base)){
        throw "Error: key "+keyAddress+" out of range";
    }
    if (value > gc.maxDacValue){
        console.warn("invalid DAC value, clipping to maximum");
        value = gc.maxDacValue;
    } else if (value < gc.minDacValue){
        console.warn("invalid DAC value, clipping to minimum");
        value = gc.minDacValue;
    }
    // calculate which module this key belongs in
    var moduleAddress = Math.floor(localKey/module_size)+1;// target is our board address
    // pack bits, stuff 'er into a buffer
    var spiCmd = ((localKey % module_size) << adc_cmd.adcSelectShift) | (value << 2);
    var spiCmdBuffer = new Buffer([(spiCmd & 0xff00) >> 8,spiCmd & 0xff]);

    // DAC reads data on clock falling edge
    rpio.spiSetDataMode(1);
    // set enable of target module high, write it, disable
    rpio.write(board_enables[moduleAddress], rpio.LOW);
    rpio.spiWrite(spiCmdBuffer, spiCmdBuffer.length);
    rpio.write(board_enables[moduleAddress], rpio.HIGH);
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
            throw "Error: key "+noteArray[i]+" out of range";
        }
        // set the bit; our shift register chain receives the highest note first (and we transmit MSB first)
        enableBitstream[modules_connected-1-(Math.floor(localKey/8))] |= 1 << localKey%8; // 8 is just byte size here, no magic.
    }

    // shift register reads data on clock rising egde
    rpio.spiSetDataMode(0);
    // ready the shift register, and Transmit!
    var keyEnableBuffer = new Buffer(enableBitstream);
    rpio.spiWrite(keyEnableBuffer, keyEnableBuffer.length);
    // enables sent, push data to output
    rclkRisingEdge();
    rclkFallingEdge();
}
