var spi = require('./spicomm');
var rpio = require('rpio');

function spiTest(){
    // main test loop
    spi.initSpi();
    //var a = new Array(47);
    for(var j=0;j<30000;j++) { // run for about 20s
        // just write velocity (ADC) commands repeatedly, with a zero-write in between to clarify
        var test_velocity = 900; // 0b1110000100 in 10 bits; spans both bytes to verify bit packing/masking
        for (var i = 1; i < 48; i++) { //pretend we're writing to 6 modules
            spi.setDac(i, i * 5);
            //a[i-1]=i;
        }
        spi.setKeyEnables([0,2,4,6,8,10,12,14,16,18,20,47]);
        //setKeyEnables([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,47]);
        //setKeyEnables(a);
    }
    spi.finishSpi();
}

function briefTest(){
    var solenoid_timeout = 0;
    spi.initSpi();
    // enable 4 keys
    spi.setKeyEnables([0,2,4,6]);

    // DAC values, set each one to
    spi.setDac(0, 0);
    spi.setDac(1, 1/4*1023);
    spi.setDac(2, 3/8*1023);
    spi.setDac(3, 1/2*1023);
    spi.setDac(4, 5/8*1023);
    spi.setDac(5, 3/4*1023);
    spi.setDac(6, 7/8*1023);
    spi.setDac(7, 1023);

    // don't leave the solenoids on for more than 7s
    if (solenoid_timeout) {
        rpio.sleep(7);
        // shut them all down
        spi.setKeyEnables([]);
    } else {
        // just hold here until we ctrl-c
        while(1);
    }

    spi.finishSpi();
}

function velocityTest(){
    var solenoid_timeout = 0;
    spi.initSpi();

    // DAC values, set each one  an increasing value
    for (var v=0;v<1024; v+=50){
        spi.setDac(0, v);
        spi.setDac(1, v);

        // alternate tapping the keys, testing 1 velocity per second
        spi.setKeyEnables([0]);
        rpio.msleep(300);
        spi.setKeyEnables([1]);
        rpio.msleep(700);
    }

    spi.finishSpi();
}

function dacEnableTest(){
    // verify that only the target module is enabled when sending dac writes
    spi.initSpi();

    // DAC values, set each one to 2.5V (Vref/2)
    spi.setDac(0, 512);
    spi.setDac(1, 512);
    // write on another module, first values should be retained on module 1
    spi.setDac(8, 1023);
    spi.setDac(9, 1023);

    spi.finishSpi();
}

function enableSpeedTest(){
    // play notes of different durations
    spi.initSpi();

    spi.setDac(0,255);
    spi.setDac(1,255);

    for (var d=1200; d>0;d-=60){
        spi.setKeyEnables([0,1]);
        rpio.msleep(d);
        spi.setKeyEnables([]);
        rpio.msleep(750);
    }

    spi.finishSpi();
}

//spiTest();
briefTest();
//velocityTest();
//dacEnableTest();
//enableSpeedTest();

function spiTest(){
    // main test loop
    initSpi();
    //var a = new Array(47);
    for(var j=29999;j<30000;j++) { // run for about 20s
        // just write velocity (ADC) commands repeatedly, with a zero-write in between to clarify
        var test_velocity = 900; // 0b1110000100 in 10 bits; spans both bytes to verify bit packing/masking
        for (var i = 4; i < 8; i++) { //pretend we're writing to 6 modules
            setDac(i, i * 5);
            //a[i-1]=i;
        }
        //setKeyEnables([0,2,4,5,6,7]);
        setKeyEnables([1]);
        //setKeyEnables([]);
        //setKeyEnables([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,47]);
        //setKeyEnables(a);
    }
    //finishSpi();
}

function briefTest(){
    var solenoid_timeout = 0;
    initSpi();
    // enable 4 keys
    setKeyEnables([0]);
    //setKeyEnables([]);
    //setKeyEnables([5]);

    // DAC values, set each one to
    setDac(0, 0);
    setDac(1, 1/4*1023);
    setDac(2, 3/8*1023);
    setDac(3, 1/2*1023);
    setDac(4, 5/8*1023);
    setDac(5, 3/4*1023);
    setDac(6, 7/8*1023);
    setDac(7, 1023);

    // don't leave the solenoids on for more than 7s
    if (solenoid_timeout) {
        rpio.sleep(7);
        // shut them all down
        setKeyEnables([]);
    } else {
        // just hold here until we ctrl-c
        while(1);
    }

    finishSpi();
}

function velocityTest(){
    var solenoid_timeout = 0;
    initSpi();

    // DAC values, set each one  an increasing value
    for (var v=0;v<1024; v+=50){
        setDac(0, v);
        setDac(1, v);

        // alternate tapping the keys, testing 1 velocity per second
        rpio.msleep(1700);
        setKeyEnables([0]);
        rpio.msleep(1300);
        setKeyEnables([1]);

    }

    finishSpi();
}

function dacEnableTest(){
    // verify that only the target module is enabled when sending dac writes
    initSpi();

    // DAC values, set each one to
    setDac(0, 512);
    setDac(1, 512);
    // write on another module, first values should be retained on module 1
    setDac(8, 1023);
    setDac(9, 1023);

    finishSpi();
}

function enableSpeedTest(){
    // play notes of different durations
    initSpi();

    setDac(0,100);
    setDac(1,100);

    for (var d=1200; d>0;d-=60){
        setKeyEnables([0,1]);
        rpio.msleep(d);
        setKeyEnables([]);
        rpio.msleep(750);
    }

    finishSpi();
}

//spiTest();
//briefTest();
//velocityTest();
//dacEnableTest();
enableSpeedTest();