// ---------------------------------------------------------------
// Main initialization module and server loader
// ---------------------------------------------------------------

var midiProcessor = require('./midiprocessor');
var app = require('./app')(null, midiProcessor);

// Initialize the piano (serial connections)
// successful init; Host the web server (environment out port or 3000)
var server = app.listen(process.env.PORT || 3000, function() {
    var serverHostPort = server.address().port;
    console.log('started server on port ' + serverHostPort);
});
