const rp = require('request-promise');
const util = require('util'); 
const exec = util.promisify(require('child_process').exec);


const deviceWords = {
	"sonysoundbar": ["sound bar", "soundbar"],
	"tv": ["tv", "television"],
	"sonysoundbar,tv": ["both"]
};

const buttonWords = {
	"KEY_POWER": ["power", "on", "off"],
	"KEY_MEDIA": ["source", "media", "sauce"],
	"KEY_UP": ["up"],
	"KEY_DOWN": ["down"],
	"KEY_OK": ["ok", "select"],
	"KEY_VOLUMEUP": ["volume up"],
	"KEY_VOLUMEDOWN": ["volume down"]
}

const numberWords = {
	1: ["once", "one time", "one times"],
	2: ["twice", "two time", "two times"],
	3: ["three times"],
	4: ["four times"],
	5: ["five times"],
	6: ["six times"],
	7: ["seven times"],
	8: ["eight times"],
	9: ["nine times"]
}


function sleep(i) {
	return new Promise(r => setTimeout(r, i));
}

async function main() {
	let init = true;

	let lastUpdate;

	while (true) {
		try {
			const { last, data } = await rp({ url: 'http://35.189.28.203:3000', json: true });

			console.log(`ping - ${last}`);

			if (!init && last !== lastUpdate && data.text) {
				console.log(`command received - ${data.text}`)

				handleMessage(data.text.toLowerCase().trim());
			}

			init = false;
			lastUpdate = last;
		}
		catch (e) {
			console.error('Failed in update loop', e);
		}

		await sleep(1000);
	}
}

async function handleMessage(text) {
	const parts = text.split("and").map(t => t.trim())

	let lastDevice;
	for (const part of parts) {
		lastDevice = await processCommand(part, lastDevice);
	}
}

async function processCommand(text, lastDevice) {
	let device, button, multiplier;
	
	({ cmd: device = lastDevice, text } = findByTypeWord(deviceWords, text));
	console.log(`Got device="${device}", remaining="${text}"`);

	({ cmd: button, text } = findByTypeWord(buttonWords, text.trim()));
	console.log(`Got button="${button}", remaining="${text}"`);

	({ cmd: multiplier, text } = findByTypeWord(numberWords, text.trim()));
	console.log(`Got multiplier="${multiplier}", remaining="${text}"`);
	

	if (!device || !button) {
		console.log('Could not match device and button');
		return;
	}
	

	if (device && device.split(",").length > 1) {
		for (const d of device.split(",")) {
			await execRemoteCommand(d, button, multiplier);
		}
	}
	else {
		await execRemoteCommand(device, button, multiplier);
		return device;
	}
}

function findByTypeWord(dictionary, sentance) {
	for ([ cmd, words ] of Object.entries(dictionary)) {
		const match = words.find(w => sentance.startsWith(w));

		if (match) {
			return {
				cmd,
				text: sentance.substring(match.length) 
			};
		}
	}

	return { text: sentance };
}

async function execRemoteCommand(device, button, multiplier = 1) {
	for (let i = 0; i < multiplier; i++) {
		try {
			const tries = device === 'sonysoundbar' ? 5 : 1;
			for (let i = 0; i < tries; i++) {
				exec(`irsend SEND_ONCE ${device} ${button}`);
				console.log('exec run')
			}
		}
		catch (e) {
			console.log(`exec error: ${e}`);
		}
		
		await sleep(2000);
	}
}

main();
