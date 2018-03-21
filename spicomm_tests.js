var spi = require('./spicomm');
var rpio = require('rpio');

function spiTest(){
    // main test loop
    spi.initSpi();
    //var a = new Array(47);
    for(var j=0;j<30000;j++) { // run for about 20s
        // just write velocity (ADC) commands repeatedly, with a zero-write in between to clarify
        var testVelocity = 900; // 0b1110000100 in 10 bits; spans both bytes to verify bit packing/masking
        for (var i = 1; i < 48; i++) { //pretend we're writing to 6 modules
            spi.setDac(i,testVelocity);
            //spi.setDac(i, i * 5);
            //a[i-1]=i;
        }
        spi.setKeyEnables([0,2,4,6,8,10,12,14,16,18,20,47]);
        //setKeyEnables([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,47]);
        //setKeyEnables(a);
    }
    spi.finishSpi();
}

function briefTest(){
    var solenoid_timeout = 1;
    spi.initSpi();
    // enable 4 keys
    spi.setKeyEnables([0,2,4,6]);

    // DAC values, set each one to a fraction of V_ref
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

function velocityTest2(){
    spi.initSpi();

    // DAC values, set each one  an increasing value
    for (var v=60;v<240; v+=8){
        spi.setDac(5, v);
        spi.setDac(1, v);

        // alternate tapping the keys, testing 1 velocity per second
        rpio.msleep(200);
        spi.setKeyEnables([1]);
        rpio.msleep(100);
        spi.setKeyEnables([2]);
        rpio.msleep(100);
        spi.setKeyEnables([3]);
        rpio.msleep(100);
        spi.setKeyEnables([4]);
        rpio.msleep(100);
        spi.setKeyEnables([5]);
        rpio.msleep(100);
        spi.setKeyEnables([6]);

    }
    spi.setDac(4, 120);
    spi.setDac(1, 120);
    spi.setDac(6, 120);
    rpio.msleep(750);
    spi.setKeyEnables([1]);
    rpio.msleep(400);
    spi.setKeyEnables([1,2]);
    rpio.msleep(400);
    spi.setKeyEnables([1,5]);
    rpio.msleep(400);
    spi.setKeyEnables([1,6]);
    rpio.msleep(800);
    spi.setKeyEnables([]);

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

function enableSpeedTest0(){
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


function velocityTest3(){
    spi.initSpi();
    spi.setDac(6, 0);
    spi.setDac(1, 0);
    spi.setDac(4, 0);
    spi.setKeyEnables([1]);
    rpio.msleep(1000);
    spi.setKeyEnables([]);
    rpio.msleep(100);
    spi.setKeyEnables([1,4]);
    rpio.msleep(1300);
    spi.setKeyEnables([1,6,5]);
    spi.finishSpi();

}

function enableSpeedTest(){
    // play notes of different durations
    spi.initSpi();
    //setKeyEnables([7,6,4,3]);
    spi.setKeyEnables([]);
    //setKeyEnables([2,1,0]);
    spi.setDac(5,150);
    spi.setDac(1,500);
    spi.setKeyEnables([0,1,7,6]);
    for (var d=1000; d>0;d-=180){
        //setKeyEnables([]);

        spi.setKeyEnables([5]);
        rpio.msleep(d);

        spi.setKeyEnables([]);
        rpio.msleep(750);
    }
    spi.setKeyEnables([]);
    finishSpi();
}

function multipleKeyTest() {
    spi.initSpi();
    var testVal = 250;
    spi.setDac(1, testVal);
    spi.setDac(2, testVal);
    spi.setDac(3, testVal);
    spi.setKeyEnables([1, 2, 3]);
    rpio.msleep(3000);
    spi.setKeyEnables([]);
    spi.finishSpi();
}

function scanKeysTest() {
    spi.initSpi();

    var testVal = 40;
    spi.setDac(1, testVal);
    spi.setDac(2, testVal);
    spi.setDac(3, testVal);
    spi.setDac(4, testVal);
    spi.setDac(5, testVal);
    spi.setDac(6, testVal);

    for (var delayTime = 1000; delayTime >= 1000; delayTime -= 50) {
        spi.setKeyEnables([1]);
        rpio.msleep(delayTime);
        for (var k=2; k<=6; k++) {
            spi.setKeyEnables([k-1, k]);
            rpio.msleep(delayTime);
        }
        spi.setKeyEnables([6]);
        rpio.msleep(delayTime);

    }

    spi.setKeyEnables([]);
    spi.finishSpi();
}

function oneNote(note, onTime, pauseTime) {
    spi.setKeyEnables([note]);
    rpio.msleep(onTime);
    spi.setKeyEnables([]);
    rpio.msleep(pauseTime);
}

function maryTest() {
    spi.initSpi();

    for (var testVal = 100; testVal >= 0; testVal -= 25) {
        spi.setDac(1, testVal);
        spi.setDac(2, testVal);
        spi.setDac(3, testVal);
        spi.setDac(4, testVal);
        spi.setDac(5, testVal);
        spi.setDac(6, testVal);

        for (var delayTime = 250; delayTime >= 100; delayTime -= 50) {
            var inBetweenTime = delayTime/2;
            oneNote(5, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(3, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(5, delayTime, inBetweenTime);
            oneNote(5, delayTime, inBetweenTime);
            oneNote(5, delayTime*2, inBetweenTime);

            oneNote(4, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(4, delayTime*2, inBetweenTime);
            oneNote(5, delayTime, inBetweenTime);
            oneNote(6, delayTime, inBetweenTime);
            oneNote(6, delayTime*2, inBetweenTime);

            oneNote(5, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(3, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(5, delayTime, inBetweenTime);
            oneNote(5, delayTime, inBetweenTime);
            oneNote(5, delayTime, inBetweenTime);

            oneNote(5, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(5, delayTime, inBetweenTime);
            oneNote(4, delayTime, inBetweenTime);
            oneNote(3, delayTime*2, inBetweenTime);
        }

    }
    rpio.msleep(1000);
    spi.setKeyEnables([3, 5, 6]);
    rpio.msleep(2000);
    spi.setKeyEnables([]);
    spi.finishSpi();
}


//spiTest();
//briefTest();
//velocityTest();
//velocityTest2();
//velocityTest3();
//dacEnableTest();
//enableSpeedTest();
//multipleKeyTest();
//scanKeysTest();
maryTest();
