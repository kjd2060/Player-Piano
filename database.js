module.exports = {

	addSong : addSong,
	printSong : printSong,
	removeSong : removeSong,
	getSongView : getSongView,
	getTrackView : getTrackView,
	getNotesView : getNotesView

};

var loki = require('lokijs');

var db = new loki("loki.json");
var songs = db.addCollection("songs");
var notes = db.addCollection("notes");
var tracks = db.addCollection("tracks");
var views = [];

/*
 * EXPORTED FUNCTIONS
*/
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
			notes.insert({song:songName, trackID : tempTracks[i].id, midi : tempTracks[i].notes[j].midi, time : tempTracks[i].notes[j].time, note : tempTracks[i].notes[j].note, 
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