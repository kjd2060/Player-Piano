/* Defines the project-wide properties & specs in one place, subject to change.

recommended usage: import this, and assign the value to a local constant at top of file.
    var gc = require("globalConstants");
    const max_powered_solenoids = gc.max_powered_solenoids;
    // etc...

Author: Edward Maskelony  |  exm8563@rit.edu
*/
module.exports = {
    // Raspberry Pi pin assignments
    board_enables : [-1,11,12,13,15,16,18,22,27,28,29,31],  // index this by board address, base 1; address 0 is invalid
    shiftreg_rclk : 7,

    // Control PCB Properties
    modules_connected : 1,
    module_size : 8,
    module_base : 0, // this is the position of our lowest solenoid
    adc_cmd : {  // includes DAC opcodes in case we need them
        "adcSelectShift":12,
        "dataReset":0xE000,
        "dataCtrlReset":0xF000
    },

    // Safety limits for solenoids
    max_powered_solenoids : 20, // maximum number of solenoids that can be active at once
    solenoid_on_time_limit : 8,  // seconds that the solenoid is allowed to be active for
    minimum_cycle_duration_ms : 10  // the state of the piano can be reliably updated every 10ms
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