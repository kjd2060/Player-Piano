module.exports = {

	addSong : addSong,
	printSong : printSong,
	removeSong : removeSong,
	getDB: getDB

};

var loki = require('lokijs');
var gc = require("./globalConstants");

const midiStart = gc.module_base; // lowest midi value that our piano can play
const numSupportedKeys = gc.modules_connected*gc.module_size;

var db = new loki("loki.json");
var songs = db.addCollection("songs");
var notes = db.addCollection("notes");
var tracks = db.addCollection("tracks");
var pianoState = db.addCollection("pianoState");
var views = [];

/*
 * EXPORTED FUNCTIONS
*/

/**
 * make the database instance accessible to other functions
 */
function getDB(){
    return db;
}

function addSong(songName, parsedMidi){
	if(parsedMidi.isPercussion)
	{
		return;
	}

	var header = parsedMidi.header;
	var tempTracks = parsedMidi.tracks;
	for(var i in tempTracks){
		tracks.insert({song:songName, id : tempTracks[i].id, name : tempTracks[i].name, instrumentNumber : tempTracks[i].instrumentNumber, 
						instrumentFamily : tempTracks[i].instrumentFamily, instrument : tempTracks[i].instrument });

		for(var j in tempTracks[i].notes){
			notes.insert({trackID : tempTracks[i].id, midi : tempTracks[i].notes[j].midi, time : tempTracks[i].notes[j].time, note : tempTracks[i].notes[j].note, 
						velocity : tempTracks[i].notes[j].velocity, duration : tempTracks[i].notes[j].duration });
		}
	}


	songs.insert({name:songName, bpm : header.bpm, timeSignature : header.timeSignature, PPQ : header.PPQ, 
					startTime :  parsedMidi.startTime, duration : parsedMidi.duration });


	var songView = songs.addDynamicView("songView");
	var tracksView = songs.addDynamicView("tracksView");
	var notesView = songs.addDynamicView("notesView");
	views["songView"] = songView;
	views["tracksView"] = tracksView;
	views["notesView"] = notesView;
	console.log(tracks);
	console.log(notes);
}

function printSong(songName){
	views["songView"].applyFind({'name': songName});
	console.log(views["songView"].data());
}

function removeSong(songName){

}

/**
 * sets up the conditions of the piano hardware state
 * @param {loki} db
 */
function initPianoState(db) {
    var pianoState = db.getCollection("pianoState");
    var activeKeysView = pianoState.addDynamicView("activeKeys");
    // var calMap = genCalMap();
    for (var i=midiStart;i<numSupportedKeys;i++){
        pianoState.insert({
            keyNumber:i,
            velocityValue:100,
            velocityPrevious:-1,
            noteOn:false,
            weightCal:0 //calMap[i]
        });
    }
    activeKeysView.applyFind({"noteOn":true});
}
