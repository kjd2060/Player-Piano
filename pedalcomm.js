/*
Provides the commands to control linear actuator pedals in a nodejs wrapper for the python driver

Author: Edward Maskelony  |  exm8563@rit.edu
 */

// This is certainly not the best way...
var pedals ={
    sustain: {
        name: "sustain",
        pedalHeld: false
    },
    sostenuto: {
        name: "sostenuto",
        pedalHeld: false
    },
    soft: {
        name: "soft",
        pedalHeld: false
    }
};

module.exports = {
    actuatorMove: actuatorMove,
    //actuatorUp: actuatorUp,
    //actuatorDown: actuatorDown,
    pedalHold: pedalHold,
    pedalRelease: pedalRelease,
    pedals: pedals
};

var PythonShell = require('python-shell');
const driverPath = './linear_actuator_driver.py';
/*
   "up" & "down" are with respect to the actuator itself; the actuator points upward inside the piano,
   so the "up" command is analogous to the pianist pressing down the pedal. To mitigate confusion, use
   "hold" and "release" in the code instead.
 */
function actuatorUp(pedal){
    actuatorMove(pedal, "up");
}

function actuatorDown(pedal){
    actuatorMove(pedal, "down");
}

function pedalHold(pedal){
    actuatorMove(pedal, "up");
}

function pedalRelease(pedal){
    actuatorMove(pedal, "down");
}

function actuatorMove(pedal, direction){
    if ( // do not attempt to move if it is already in position
        (!(pedal.pedalHeld) && direction==="down") ||
        (pedal.pedalHeld && direction==="up")
    ){
        console.warn("Error: "+pedal.name+" pedal already in "+direction+" position");
    } else {
        var opts = {args: [pedal.name, direction]};
        PythonShell.run(driverPath, opts, function (err, results) {
            if (err) throw err;
            // results is an array consisting of messages collected during execution
            //console.log('results: %j', results);
        });
        pedal.pedalHeld = !pedal.pedalHeld;
    }
}