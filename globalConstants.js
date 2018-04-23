/* Defines the project-wide properties & specs in one place, subject to change.

recommended usage: import this, and assign the value to a local constant at top of file.
    var gc = require("globalConstants");
    const max_powered_solenoids = gc.max_powered_solenoids;
    // etc...

Author: Edward Maskelony  |  exm8563@rit.edu
*/
module.exports = {
    /*** Project constants & config values ***/
    // Raspberry Pi pin assignments
    // board_enables : [-1,11,12,13,15,16,18,22,27,28,29,31],  // index this by board address, base 1; address 0 is invalid
    // flipped for 6-board layout, based on current wiring
    board_enables : [-1,18,16,15,13,12,11],  // index this by board address, base 1; address 0 is invalid
    shiftreg_rclk : 33,

    // Control PCB Properties
    modules_connected : 6,
    module_size : 8,
    module_base : 37, // this is the position of our lowest solenoid (will be 37 (C#2/Db2) with our 48-key implementation)
    adc_cmd : {  // includes DAC opcodes in case we need them
        "adcSelectShift":12,
        "dataReset":0xE000,
        "dataCtrlReset":0xF000
    },

    // Safety limits for solenoids
    max_powered_solenoids : 20, // maximum number of solenoids that can be active at once
    solenoid_on_time_limit : 8,  // seconds that the solenoid is allowed to be active for
    minimum_cycle_duration_ms : 10,  // the state of the piano can be reliably updated every 10ms

    // range of values for the 10-bit DAC at VREF=3.3V
    minDacValue : 0,    // min value controls the loudest setting
    maxDacValue : 80,   // max value controls the quietest setting

    // DAC value calibrations to compensate for differing key weights
    calMap : genCalMap(null),

    /*** Functions ***/
    genCalMap : genCalMap
};

// http://edge.rit.edu/edge/P18363/public/ElectricalDesignDocuments/pi_pinout.png
//
// Shift Register (parallel data push)
//  RCLK:  7   **
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

/**
 * provides an adjustment value for each key to compensate its weight
 * @param {int} size - number of keys
 * @returns {Array[]}
 */
function genCalMap(size){
    // this function should be edited to calibrate the volumes of keys with different weights
    // procedure for this will likely be plotting velocity/measured loudness in excel and fitting an equation
    if (size === null){
        size = exports.modules_connected*exports.module_size;
    }
    // set this to 1 if even midi-numbered notes will be played with the heavier (extended) plungers
    const evenNotesHeavy = 1;

    var calMap = new Array(size);
    // populate the map with coefficients that will add (or possibly multiply?) the DAC value
    for (var i=0;i< calMap.length;i++){
        if (i%2 !== evenNotesHeavy) {
            // equation for heavier, extended solenoid plungers
            if (i <= 55) {
                calMap[i] = 0;
            } else if (72 >= i > 55) {
                calMap[i] = 20;
            } else {
                calMap[i] = 40
            }
        }
        else {
            // equation for lighter, top-rail solenoid plungers
            if (i<=55){
                calMap[i] = 0;
            } else if (72 >= i > 55){
                calMap[i] = 20;
            } else {
                calMap[i] = 40
            }
        }
    }
    return calMap;
}