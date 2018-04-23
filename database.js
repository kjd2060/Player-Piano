module.exports = {

	addSong : addSong,
	printSong : printSong,
	removeSong : removeSong,
	getSongView : getSongView,
	getTrackView : getTrackView,
	getNotesView : getNotesView,
	getDB: getDB,
    getCurrentSongBPM: getCurrentSongBPM,
    getSongNotes: getSongNotes
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
initPianoState();
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
	results = songs.find({"name" : {'$eq' : songName}});
	if(!results === undefined || !results.length == 0){
		console.log(songName + " exists");
		return;
	}
	if(parsedMidi.isPercussion)
	{
		return;
	}

	var header = parsedMidi.header;
	var tempTracks = parsedMidi.tracks;
	for(var i in tempTracks){
		tracks.insert({
			song:songName,
			id : tempTracks[i].id,
			name : tempTracks[i].name,
			checked : false,
			instrumentNumber : tempTracks[i].instrumentNumber,
			instrumentFamily : tempTracks[i].instrumentFamily,
			instrument : tempTracks[i].instrument });

		for(var j in tempTracks[i].notes){
			notes.insert({
				song:songName,
				trackID : tempTracks[i].id,
				midi : tempTracks[i].notes[j].midi,
				time : tempTracks[i].notes[j].time,
				note : tempTracks[i].notes[j].note,
				velocity : tempTracks[i].notes[j].velocity,
				duration : tempTracks[i].notes[j].duration,
				end : tempTracks[i].notes[j].time + tempTracks[i].notes[j].duration });
		}
	}

	songs.insert({
		name:songName,
		bpm : header.bpm,
		timeSignature : header.timeSignature,
		PPQ : header.PPQ,
		startTime :  parsedMidi.startTime,
		duration : parsedMidi.duration });

	var songView = songs.addDynamicView("songView");
	var tracksView = tracks.addDynamicView("tracksView");
	var songNotes = notes.addDynamicView("songNotes");
	views["songView"] = songView;
	views["tracksView"] = tracksView;
	views["songNotes"] = songNotes;
}

function printSong(songName){
	views["songView"].applyFind({'name': songName}, "printSongFind");
	// console.log(views["songView"].data());
	views["songView"].removeFilter("printSongFind");
}

function getSongView(){
	return views["songView"].data();
}

function getTrackView(){
	return views["tracksView"].data();
}

function getNotesView(){
	return views["songNotes"].data();
}
/*
 * INTERNAL FUNCTIONS
*/

// ct has songName and trackIdentifier
function getSongNotes(songName) {
	// Obtain the tracks we care about, harvest their ID numbers
	var allTracks = tracks.find({"song":songName, "checked":true});
	var idArray = [];
	for(var t in allTracks){
		idArray.push(allTracks[t].id);
	}

	// grab notes that are in our selected tracks
	return notes.chain().find({ // returns a Resultset for further queries
		song: songName,
		trackID:{$in : idArray}
	});
}

function getCurrentSongBPM(){
    var currentSong = db.getCollection("songs").getDynamicView("songView").branchResultset();
    return Math.round(currentSong.data()[0].bpm);
}

function removeSong(songName){

}

/**
 * sets up the conditions of the piano hardware state
 */
function initPianoState() {
    var pianoState = db.getCollection("pianoState");
    var activeKeysView = pianoState.addDynamicView("activeKeys");
    var calMap = gc.calMap;
    for (var i=midiStart;i<numSupportedKeys+midiStart;i++){
        pianoState.insert({
            keyNumber:i,
            velocityValue:1,
            velocityPrevious:-1,
            noteOn:false,
            weightCal:calMap[i]
        });
    }
    activeKeysView.applyFind({"noteOn":true});
}