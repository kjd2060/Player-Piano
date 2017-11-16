var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());

// Basic post to ensure the endpoint is functional
app.post('/', function(req, res) {
    res.json({success: true});
});

// Validate request structure
app.post('/validatestructure', function(req, res) {
    // Parse through request contents and ensure structure is correct
    res.json({success: true});
});

// Validate structure of a specific song
app.post('/validatesong', function(req, res) {
    // Have a template file or variable (in this file) that holds the correct structure for a given song
    // Validate that the computed (sent) structure logically matches teh template
    res.json({success: true});
});



var server = app.listen(process.env.PORT || 3001, function() {
    var port = server.address().port;
    console.log('started endpoint server on port ' + port);
});