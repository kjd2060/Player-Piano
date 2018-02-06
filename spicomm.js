// handles the bit-level communication with thw boards, abstracting higher-level "play this note" functions

var rpio = require('rpio');

// Pin mapping (physical, not BCOM):
//
// Shift Register (parallel data push)
//  RCLK:  26   **
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
//          * Pin 24 & 26 must be set using the spi interface (spiChipSelect({0 off, 1 on}) not standard GPIO
//          ** RCLK is a fairly "special case" signal, so it may be the appropriate use of (otherwise unusable) CE1.
const board_enables = [-1,11,12,13,15,16,18,22,27,28,29];  // index this by board address, base 1; address 0 is invalid
const shiftreg_rclk = 26;
const modules_connected = 6;
const module_size = 8;
const module_base = 0; // this is the position of our lowest solenoid
const adc_cmd = {
    "adcSelectShift":12,
    "dataReset":0xE000,
    "dataCtrlReset":0xF000
};

function initSpi() {
    var initsettings = {
        gpiomem:false,
        mapping:'physical'  // use hardware pin numbering, not BCM
    };
    // enable SPI mode, disable GPIO on those pins
    rpio.init(initsettings);
    rpio.spiBegin();
    // DAC chips are the slowest limit, at 30MHZ; we need to divide our clock down to 25MHz at most (10)
    // Currently operating at 2MHz just to be safe, with plenty of headroom if we need to speed up to meet our req.
    rpio.spiSetClockDivider(125);
    // set GPIO output mode on each enable pin used
    for (var x=1; x <= modules_connected; x++){
        rpio.open(board_enables[x], rpio.OUTPUT);
        // active low, initialize to every board off  //TODO: double check this with Jared
        rpio.write(board_enables[x], rpio.HIGH);
    }

	rpio.spiChipSelect(0);

//
}

function setDac(keyAddress,value){
    // keyAddress is midi value of the note
    if ((keyAddress > module_size * modules_connected) || (keyAddress < module_base)){
        throw "Error: key ({0}) out of range".format(keyAddress);
    }
    if (value > 1023 || value < 0){
        throw "Error: invalid DAC value";
    }
    // calculate which module this key belongs in
    var moduleAddress = Math.floor(keyAddress/module_size)+1;// target is our board address
    // pack bits, stuff 'er into a buffer
    var spiCmd = ((keyAddress % module_size) << adc_cmd.adcSelectShift) | (value << 2);
	var spiCmdBuffer = new Buffer([(spiCmd & 0xff00) >> 8,spiCmd & 0xff]);
	// set enable of target module high, write it, disable
    rpio.write(board_enables[moduleAddress], rpio.HIGH);
    rpio.spiWrite(spiCmdBuffer, spiCmdBuffer.length);
    rpio.write(board_enables[moduleAddress], rpio.LOW);
}
//TODO: get this to a not-broken state
function setKeyEnables(note_array){
    // currently expecting an array of notes (midi numbered) that should be enabled on this following cycle.

    // allocate 1 byte per module
    var buf = new Buffer(modules_connected);

    for (i=modules_connected-1;i>=0;i--){

    }
}

function spiTest(){
    // main test loop
    initSpi();
    while(1) {
        // just write velocity (ADC) commands repeatedly, with a zero-write in between to clarify
        var test_velocity = 900; // 0b1110000100 in 10 bits; spans both bytes to verify bit packing/masking
        for (var i = 1; i < 48; i++) { //pretend we're writing to 6 modules
            setDac(i, i * 5);
        }
    }
}
