// StreamAudioPlayer
// Supports only mp3s and wavs, future support for other formats may be implemented later

const file = require("../../file.js")
const portAudio = require("naudiodon")
const lame = require("lame")
const fs = require("fs")

file.addonInit("StreamAudioPlayer")

let config = file.readStoredConfig()
const devices = portAudio.getDevices()

let isPlaying = false
let currentPlaying;
let currentPlayingStream;
let aio;

if (config.deviceId === -2) { // auto detect
	const vbAudioDevice = devices.find((r) => r.name === "CABLE Input (VB-Audio Virtual Cable)")
	if (vbAudioDevice == null) {
		console.log("[StreamAudioPlayer] VB Virtual Cable device not found, you must set your own Device ID in the settings.")
	}
	config.deviceId = vbAudioDevice.id
}

// dummy 48k samplerate AIO to fix bug
new portAudio.AudioIO({outOptions: {channelCount: 2, sampleFormat: portAudio.SampleFormat16Bit, sampleRate: 48000, deviceId: config.deviceId, closeOnError: true}})

let songList;

if (!fs.existsSync("./songs")) {
	fs.mkdirSync("./addons")
}

let songFiles = fs.readdirSync(__dirname + "/songs")
songFiles = songFiles.map(f => {return __dirname + "/songs/" + f})
songList = songFiles.filter(f => {return f.endsWith(".mp3") || f.endsWith(".wav")})
if (songList.length === 0) {
	console.log("[StreamAudioPlayer] WARNING: No supported songs were loaded in. Supported formats are MP3 files and WAV files.")
} else {
	console.log("[StreamAudioPlayer] Loaded " + songList.length + " songs.")
}

let loopVal = -1;
function queueNext() {
	if (loopVal >= songList.length - 1) {
		loopVal = 0
	} else {
		loopVal++
	}
	return songList[loopVal]
}
function queuePrevious() {
	if (loopVal <= 0) {
		loopVal = songList.length - 1
	} else {
		loopVal--
	}
	return songList[loopVal]
}

function togglePlay() {
	if (isPlaying === false) {
		if (currentPlaying == null) { // newly playing
			function next() {
				aio = new portAudio.AudioIO({outOptions: {channelCount: 2, sampleFormat: portAudio.SampleFormat16Bit, sampleRate: config.sampleRate, deviceId: config.deviceId, closeOnError: false}})
				currentPlaying = queueNext()
				let stream = fs.createReadStream(currentPlaying)
				if (currentPlaying.endsWith(".mp3")) {
					let decoder = new lame.Decoder({channels: 2, bitDepth: 16, sampleRate: config.sampleRate})
					stream.pipe(decoder)
					currentPlayingStream = decoder
				} else {
					currentPlayingStream = stream
				}
				currentPlayingStream.on("finish", () => {
					if (isPlaying === true) {
						currentPlayingStream.unpipe(aio)
						aio.abort()
						next()
					}
				})

				let a = currentPlaying.split("\\")
				a = a[a.length - 1]
				a = a.split("/")
				a = a[a.length - 1]

				console.log("[StreamAudioPlayer] Now playing " + a)
				currentPlayingStream.pipe(aio)
				aio.start()
			}
			next()
			isPlaying = true
		} else { // unpausing
			currentPlayingStream.pipe(aio)
			currentPlayingStream.resume()
			isPlaying = true
		}
	} else { // pausing
		currentPlayingStream.unpipe(aio)
		currentPlayingStream.pause()
		isPlaying = false
	}
	return true
}

const commands = [
	{
		name: "SAP_toggle",
		friendlyName: "Play/Pause",
		description: "Play or pause the current song.",
		function: togglePlay
	}
]

module.exports = {commands}