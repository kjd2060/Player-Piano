// ---------------------------------------------------------------
// Serial Communication
// ---------------------------------------------------------------

// TODO: Configure the total number of notes part
// Exports when using require
module.exports = {
	initialize : initialize, 
	loadSong : loadSong, 
	play : play,
	pause : pause,
	stop : stop
};

var SerialPort = require('serialport');

// Ports will be assigned after ID is obtained
var portLeft, portRight, port430;

// Buffers for each of the serial ports
var bufferLeft = [];
var bufferRight = [];
var buffer430 = [];

// // EXAMPLE USAGE THROUGH MODULE EXPORTS (for testing only)
// // Setup the serial port connections
// initialize(function() {
// 	// Port connection has completed, load a song
// 	var song = [
// 		4, 249, 1, 0, 1,
// 		14, 249, 1, 0, 2,
// 		10, 249, 1, 0, 1,
// 		12, 249, 1, 0, 2
// 	];

// 	loadSong(song, function() {
// 		// song loading has completed, execute the timing piece
// 		// begin the timer!
// 		play('}', function() {
// 			console.log('Process should be finished here..');
// 		});
// 	});
// });


// Initialization ---------------------------------------

function initialize(callback) {

	console.log('\nOpening serial ports...\n');
	try{
	var createPort = function(id) {
		var p = new SerialPort('/dev/ttyACM'+ id, {
			baudRate: 9600
		});
		p.on('open', function() {

			console.log('Port to ttyACM' + id + ' is open');
			console.log('Ŕequesting ID from ttyACM' + id + '...');

			p.on('data', function(data) {

				// Ignore this handler if serial connection is already established
				if (portLeft && portRight) {
					return;
				}

				var idString = '';

				for (var i = 0; i < data.length; i++) {
					if (data[i] == 248) {}
					else if (data[i] == 48) idString = 'timer';
					else if (data[i] == 49) idString = 'left';
					else if (data[i] == 50) idString = 'right';	
					
					console.log('recieved data from port identify - ' + data[i]);
				}

				if (idString == '') console.log('ttyACM' + id + ' could not be identified');
				else {
					console.log('ttyACM' + id + ' is ' + idString + ' controller');
					if (idString == 'left') portLeft = p;
					else if (idString == 'right') portRight = p;
					else if (idString == 'timer') {
						port430 = p;
						// on arrival of timer, create the other controllers
						createPort(1);
						createPort(3);
					}
				}

			});

			// Request the ID from the MSP on this port
			p.write('?');

		});
	};

	// Invoke the above function for each microcontroller
	// NOTE: Each microcontroller adds TWO ttyACM* to /dev/
	// Connect to the lower of the pair (i.e. 0 for first, 2 for second...)
	//for (var i = 0; i < 5; i++)
	//	createPort(i);
	
	createPort(0);

	// Now wait for all the ports to be recognized
	onPortsReady(callback);
	}
	catch(err){
		// something went wrong, launch the callback anyways though
		// this should log whatever error and then start the server anyways.  This is for testing
		// running the server w/o breaking when there is no uc
		console.log(err);
		callback();
	}

}

function onPortsReady(callback) {
	
	// This function fires when serial connections to all
	// microcontrollers have been established
	var complete = function() {

		console.log('\nÄll serial ports ready\n');

		// Assign callback handlers
		portLeft.on('data', onPortDataLeft);
		portLeft.on('error', onPortErrLeft);
		portRight.on('data', onPortDataRight);
		portRight.on('error', onPortErrRight);
		port430.on('data', onPortData430);
		port430.on('error', onPortErr430);

		// Function has completed mounting callback handlers - execute callback
		callback();

		//portLeft.write('L1');
		//portLeft.write([0, 0, 249, 0, 3], function() {
		//	console.log('Ńote sent');
		//});
		//port430.write('T*~', function() {
		//	console.log('Timestep sent');
		//});
		
	};

	var wait = function() {
		setTimeout(function() {
			if (portLeft && portRight) complete();
			else wait();
		}, 10);
	};

	wait();

}

// Reading ----------------------------------------------

function pushToBuffer(buffer, data) {

	for (var i = 0; i < data.length; i++) {

		// Buffer header
		if (data[i] == 248) {}

		// Character 'c' for ACKing notes
		else if (data[i] == 99) {
			//console.log('Received ACK for note');
			buffer.push(data[i]);
		}

		// Character 'd' for ACKing command headers
		else if (data[i] == 100) {
			console.log('Received ACK for command header');
			buffer.push(data[i]);
		}

		// Character 'e' for ACKing completion of song loading
		else if (data[i] == 101) {
			console.log('Received ACK for end of loading');
			buffer.push(data[i]);
		}

		// If received an unknown command
		else console.log('Received unknown char: ' + data[i]);
	}
}

// Writing ----------------------------------------------

function loadSong(song, callback) {

	console.log('Testing load song\n');

	// Separate the song for each microcontroller
	var left = [];
	var right = [];
	for (var i = 0; i < song.length; i += 5) {
		var a = song[i] < 12 ? left : right;
		a.push(song[i] % 12);
		a.push(song[i + 1]);
		a.push(song[i + 2]);
		a.push(song[i + 3]);
		a.push(song[i + 4]);
	}

	// Find the total number of characters to encode on each side
	//var leftBeginString = 'L' + String.fromCharCode(48 + (left.length / 5)) + '~';
	//var rightBeginString = 'L' + String.fromCharCode(48 + (right.length / 5)) + '~';	
        var leftBeginString = 'L' + (left.length / 5) + '~';
        var rightBeginString = 'L' + (right.length / 5) + '~';

	// This function all the notes from a song piece to the specified port
	var loadToMCU = function(song, port, buffer, i, callback) {

		// Get the correct port and note
		var note = song[i * 5] % 12;
		var intensity = song[i * 5 + 1];
		var duration = song[i * 5 + 2];
		var start1 = song[i * 5 + 3];
		var start2 = song[i * 5 + 4];

		//console.log('Śending note ' + (i + 1) + ' to ' + getPortName(port) + ' MSP:');
		//console.log(note + ', ' + intensity + ', ' + duration + ', ' + start1 + ', ' + start2);

		// Write to the port
		port.write([note, intensity, duration, start1, start2]);

		// Wait for final acknowledge if end of song
		if ((i + 1) * 5 == song.length)
			waitForAck(buffer, 99, function() { waitForAck(buffer, 101, callback); });
		
		// Wait for acknowledgement before sending next note
		else waitForAck(buffer, 99, function() { loadToMCU(song, port, buffer, i + 1, callback); });

	};

	// Send the load command to the left MSP, followed by the applicable notes
	var writeLeft = function(onWriteComplete) {
		portLeft.write(leftBeginString, function() {
			waitForAck(bufferLeft, 100, function() {
				waitForAck(bufferLeft, 100, function() {
	
					console.log('Load command sent to left MSP');
					console.log('Sending notes to left MSP...');
		
					loadToMCU(left, portLeft, bufferLeft, 0, function() {
						console.log('All notes loaded to left MSP\n');
						onWriteComplete();
					});
				});
			});
		});
	};

	// Send the load command to the right MSP, followed by the applicable  notes
	var writeRight = function(onWriteComplete) {
		portRight.write(rightBeginString, function() {
			waitForAck(bufferRight, 100, function() {
				waitForAck(bufferRight, 100, function() {
					
					console.log('Load command sent to right MSP');
					console.log('Sending notes to right MSP...');

					loadToMCU(right, portRight, bufferRight, 0, function() {
						console.log('All notes loaded to right MSP\n');
						onWriteComplete();
					});
				});
			});
		});

	};

	// Beginning the writing sequence, one MSP at a time
	writeLeft(function() {
		writeRight(function() {
			console.log('Song load complete!');
			// Execute callback function
			callback();
		});
	});

}

function waitForAck(buffer, ack, callback) {
	
	var wait = function() {
		setTimeout(function() {
			if (buffer.length > 0 && buffer[0] == ack) {
				buffer.shift();
				callback();
			} else wait();
		}, 10);
	};

	wait();		

}

// Executing Playback ----------------------------------

// Begins playback of the loaded song at the given "speed"
function play(timing, callback) {

	var writeString = 'T' + timing + '~';

	port430.write(writeString, function(err) {
		console.log('timer executed!');
		callback();
	});
}

// pauses propogation of the loaded song until restarted with play
function pause(callback) {

	port430.write('T~', function(err) {
		console.log('timer paused!');
		callback();
	});
}

// Stops playback of the song and places the counter at the beginning
function stop(callback) {
	
	var stopWrite = 'R' + String.fromCharCode(0) + '~';
	port430.write('T~', function(err) {
		portLeft.write(stopWrite, function(err) {
			portRight.write(stopWrite, function(err) {
				console.log('All reset');
				callback();
			});
		});
	});
}




// Utility + Helpers -----------------------------------


function getPortName(port) {
	if (port == portLeft) return 'left';
	if (port == portRight) return 'right';
	return 'timer';
}

function getPort(note) {
	return note < 12 ? portLeft : portRight;
}

function getBuffer(note) {
	return note < 12 ? bufferLeft : bufferRight;
}

// Left port handlers -----------------------------------

function onPortDataLeft(data) {
	//console.log('Received from left: ' + data);
	pushToBuffer(bufferLeft, data);
}

function onPortErrLeft(err) {
	console.log('Serial port error: ' + err);
}

// Right port handlers ----------------------------------

function onPortDataRight(data) {
	//console.log('Received from right: ' + data);
	pushToBuffer(bufferRight, data);
}

function onPortErrRight(err) {
	console.log('Serial port error: ' + err);
}

// Timing port handlers ---------------------------------

function onPortData430(data) {
	console.log('Received from timer: ' + data);
	pushToBuffer(buffer430, data);
}

function onPortErr430() {
	console.log('Serial port error: ' + err);
}