const rp = require('request-promise');
const util = require('util'); 
const exec = util.promisify(require('child_process').exec);


const deviceWords = {
	"sonysoundbar": ["sound bar", "soundbar"],
	"tv": ["tv", "television"]
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

function sleep(i) {
	return new Promise(r => setTimeout(r, i));
}

async function main() {
	let init = true;

	let lastUpdate;

	while (1) {
		const { last, data } = await rp({ url: 'http://35.189.28.203:3000', json: true });

		console.log(`ping - ${last}`);

		if (!init && last !== lastUpdate && data.text) {
			console.log(`command received - ${data.text}`)

			handleMessage(data.text.toLowerCase().trim());
		}

		init = false;
		lastUpdate = last;

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
	const { cmd: device = lastDevice, remainingText } = findByTypeWord(deviceWords, text);
	console.log(`Got device="${device}", remaining="${remainingText}"`);

	const { cmd: button, remainingText2 } = findByTypeWord(buttonWords, remainingText.trim());
	console.log(`Got button="${button}", remaining="${remainingText2}"`);

	if (!device || !button) {
		console.log('Could not match device and button');
		return;
	}

	await execRemoteCommand(device, button);

	return device;
}

function findByTypeWord(dictionary, sentance) {
	for ([ cmd, words ] of Object.entries(dictionary)) {
		const match = words.find(w => sentance.startsWith(w));

		if (match) {
			return {
				cmd,
				remainingText: sentance.substring(match.length) 
			};
		}
	}

	return { remainingText: sentance };
}

async function execRemoteCommand(device, button) {
	try {
		const { stdout, stderr } = await exec(`irsend SEND_ONCE ${device} ${button}`);
		console.log({stdout, stderr})
		await sleep(2000);
	}
	catch (e) {
		console.log(`exec error: ${e}`);
		await sleep(2000);
	}
}

main();
