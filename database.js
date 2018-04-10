module.exports = {

	addSong : addSong,
	printSong : printSong,
	removeSong : removeSong,
<<<<<<< HEAD
	getSongView : getSongView,
	getTrackView : getTrackView,
	getNotesView : getNotesView

};

var loki = require('lokijs');
=======
	getDB: getDB,
    initPianoState: initPianoState,
    getSongNotes: getSongNotes
};

var loki = require('lokijs');
var gc = require("./globalConstants");

const midiStart = gc.module_base; // lowest midi value that our piano can play
const numSupportedKeys = gc.modules_connected*gc.module_size;
>>>>>>> master

var db = new loki("loki.json");
var songs = db.addCollection("songs");
var notes = db.addCollection("notes");
var tracks = db.addCollection("tracks");
<<<<<<< HEAD
=======
var pianoState = db.addCollection("pianoState");
>>>>>>> master
var views = [];

/*
 * EXPORTED FUNCTIONS
*/
<<<<<<< HEAD
=======

/**
 * make the database instance accessible to other functions
 */
function getDB(){
    return db;
}

>>>>>>> master
function addSong(songName, parsedMidi){
	if(parsedMidi.isPercussion)
	{
		return;
	}

	var header = parsedMidi.header;
	var tempTracks = parsedMidi.tracks;
	for(var i in tempTracks){
<<<<<<< HEAD
		tracks.insert({song:songName, id : tempTracks[i].id, name : tempTracks[i].name, instrumentNumber : tempTracks[i].instrumentNumber, 
						instrumentFamily : tempTracks[i].instrumentFamily, instrument : tempTracks[i].instrument });

		for(var j in tempTracks[i].notes){
			notes.insert({song:songName, trackID : tempTracks[i].id, midi : tempTracks[i].notes[j].midi, time : tempTracks[i].notes[j].time, note : tempTracks[i].notes[j].note, 
						velocity : tempTracks[i].notes[j].velocity, duration : tempTracks[i].notes[j].duration });
=======
		tracks.insert({
			song:songName,
			id : tempTracks[i].id,
			name : tempTracks[i].name,
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
>>>>>>> master
		}
	}


<<<<<<< HEAD
	songs.insert({name:songName, bpm : header.bpm, timeSignature : header.timeSignature, PPQ : header.PPQ, 
					startTime :  parsedMidi.startTime, duration : parsedMidi.duration });


	var songView = songs.addDynamicView("songView");
	var tracksView = songs.addDynamicView("tracksView");
	var notesView = songs.addDynamicView("notesView");
	views["songView"] = songView;
	views["tracksView"] = tracksView;
	views["notesView"] = notesView;
=======
	songs.insert({
		name:songName,
		bpm : header.bpm,
		timeSignature : header.timeSignature,
		PPQ : header.PPQ,
		startTime :  parsedMidi.startTime,
		duration : parsedMidi.duration });

	var songView = songs.addDynamicView("songView");
	var tracksView = songs.addDynamicView("tracksView");
	var songNotes = notes.addDynamicView("songNotes");
	views["songView"] = songView;
	views["tracksView"] = tracksView;
	views["songNotes"] = songNotes;
>>>>>>> master
	console.log(tracks);
	console.log(notes);
}

function printSong(songName){
<<<<<<< HEAD
	views["songView"].applyFind({'name': songName});
	console.log(views["songView"].data());
}

function removeSong(songName){

}


function getSongView(){
	return views["songView"];
}

function getTrackView(){
	return views["trackView"];
}

function getNotesView(){
	return views["notesVIew"];
}
/*
 * INTERNAL FUNCTIONS
*/

/*
module.exports = function(){
	var db = new loki('loki.json');

	 var doctors = db.addCollection('doctors');

	 doctors.insert({name:'David Tennent', doctorNumber: 10});
	 doctors.insert({name:'Matt Smith', doctorNumber:11});

	 doctors.insert({name:'Paul McGann', doctorNumber:8});
	 doctors.insert({name:'Peter Capaldi', doctorNumber:12});
	 
	 // console.log(doctors.data);

	 var view = doctors.addDynamicView("newerDoctors");
	 view.applyWhere(function(obj) { return obj.doctorNumber > 8});
	 view.applySimpleSort('doctorNumber', true); // 'true' marks an optional parameter for sorting in descending order; defaults to false.

	 console.log(view.data());

};*/
=======
	views["songView"].applyFind({'name': songName}, "songName");	// we only want one filter at a time,
																// give it a static ID so it will be replaced
	views["songNotes"].applyFind({name: songName}, "songName");	// we only want one filter at a time,
																// give it a static ID so it will be replaced
	console.log(views["songView"].data());
}

function getSongNotes(songName) {
	// Obtain the tracks we care about, harvest their ID numbers
	// TODO: update this to only select the tracks we want
	var allTracks = tracks.find({"song":songName});
	var idArray = [];
	for (var t in allTracks){
		idArray.push(allTracks[t].id);
	}

	// grab notes that are in our selected tracks
	return notes.chain().find({ // returns a Resultset for further queries
		song: songName,
		trackID:{$in : idArray}
	});
}

function removeSong(songName){

}

/**
 * sets up the conditions of the piano hardware state
 */
function initPianoState() {
    var pianoState = db.getCollection("pianoState");
    var activeKeysView = pianoState.addDynamicView("activeKeys");
    // var calMap = genCalMap();
    for (var i=midiStart;i<numSupportedKeys+midiStart;i++){
        pianoState.insert({
            keyNumber:i,
            velocityValue:1,
            velocityPrevious:-1,
            noteOn:false,
            weightCal:0 //calMap[i]
        });
    }
    activeKeysView.applyFind({"noteOn":true});
}
>>>>>>> master
