// FindAudioID

const portAudio = require("naudiodon")

const devices = portAudio.getDevices()

for (i of devices) {
	console.log("ID #" + i.id + ": " + i.name)
}
