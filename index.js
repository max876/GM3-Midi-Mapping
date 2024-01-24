const midi = require("easymidi");
const osc = require("osc");

const input_name = 'APC mini mk2'
const output_name = 'APC mini mk2'
const localip = '127.0.0.1'
const localport = 8001
const remoteip = '127.0.0.1'
const remoteport = 8000

var page = 0
var faderRange = 100
var brightness = 3

var midi_in = new midi.Input(input_name);
var midi_out = new midi.Output(output_name);
var osc_io = new osc.UDPPort({
    localAdress: localip,
    localPort: localport,
    metadata: true
})

osc_io.on("message", (msg) => {
    let address = msg.address.substring(1, msg.address.length)

    if (address == "Exec") { 
        let exec = msg.args[0].value
        let state = msg.args[1].value // 0 unlinked, 1 linked, 2 active
        if (exec % 100 > 8) return;

        let row = exec % 100 - 1
        let col = Math.floor(exec / 100) - 1
        let color = state == 2 ? 21 : state == 1 ? 96 : 0;
        setPadColor(row + col * 8, brightness, color)
    }
})

osc_io.on("ready", () => {
    console.log(`Listening on : ${localip}:${localport}`)
})


midi_in.on('noteon', (msg) => {
    let note = msg.note;
    
    if (note == 106) return prevPage();
    if (note == 107) return nextPage();

    if (note <= 31) {
        let execrow = Math.floor(note / 8) * 100 + 101;
        let offset = note % 8;
        pushExecutorButton(page, execrow + offset, 1);
    }
})

midi_in.on('noteoff', (msg) => {
    let note = msg.note;
    
    if (note <= 31) {
        let execrow = Math.floor(note / 8) * 100 + 101;
        let offset = note % 8;
        pushExecutorButton(page, execrow + offset, 0);
    }
})

midi_in.on('cc', (msg) => {
    let controller = msg.controller;
    let value = msg.value / 127;
    
    if (48 <= controller && controller <= 55) {
        let fader = controller - 47 + 200;
        moveExecutorFader(page, fader, value);
    } 
    if (controller == 56) return moveGrandMasterFader(1, value);
})


function sendOSC(address, ...args) {
    let osc_args = []
    for (arg of args) {
        let type = ''
        switch (typeof(arg)) {
            case "string":
                type = 's'
                break

            case "number":
                type = 'i'
                break

            default:
                continue
        }
        osc_args.push({ type, value: arg })
    } 

    osc_io.send({ address, args: osc_args }, remoteip, remoteport);
}

function moveExecutorFader(page, executor, value) {
	if (page == 0) return sendOSC(`/Fader${executor}/`, value * faderRange);
	sendOSC(`/Page${page}/Fader${executor}/`, value * faderRange);
}

function pushExecutorButton(page, executor, value) {
	if (page == 0) return sendOSC(`/Key${executor}/`, value);
	sendOSC(`/Page${page}/Key${executor}/`, value);
}

const GrandMaster = {
    "Master": "1",
    "World": "2",
    "Highlight": "3",
    "Lowlight": "4",
    "Solo": "5",
    "Rate": "6",
    "Speed": "7",
    "ProgramTime": "8",
    "ProgramXFade": "9",
    "ExecutorTime": "10",
    "ExecutorXFade": "11",
    "ProgramSpeed": "12",
    "Blind": "13",
    "SoundOut": "14",
    "SoundIn": "15",
    "SoundFade": "16"
}
function moveGrandMasterFader(grandMaster, value) {
    sendOSC("/cmd", `Master 2.${grandMaster} At ${value * 100}`);
	//sendOSC("/13.12.2." + grandMaster, "FaderMaster", 1, value * 100);
}  

function nextPage() { sendCommand("Next Page"); }
function prevPage() { sendCommand("Prev Page"); }
function sendCommand(cmd) { sendOSC("/cmd", cmd); }


const colors = {
    "Black":    0,
    "Red":      5,
    "Orange":   84,
    "Yellow":   96,
    "Green":    21,
    "Cyan":     33,
    "Lavender": 41,
    "Blue":     67,
    "Magenta":  57,
    "Violet":   49,
    "White":    3
}

function setPadColor(pad, brightness, color) { midi_out.send('noteon', { note: pad, channel: brightness, velocity: color }); }
function setButton(button, on) { midi_out.send('noteon', { note: button, channel: 1, velocity: on }); }

function allOff() {
    for (var i = 0; i < 64; i++) { setPadColor(i, 0, 0); }
    for (var i = 100; i < 108; i++) { setButton(i, 0); }
    for (var i = 112; i < 119; i++) { setButton(i, 0); }
    setButton(122, 0);
}

const colorsData = [
    { color: "#000000", velocity: 0 },
    { color: "#1E1E1E", velocity: 1 },
    { color: "#7F7F7F", velocity: 2 },
    { color: "#FFFFFF", velocity: 3 },
    { color: "#FF4C4C", velocity: 4 },
    { color: "#FF0000", velocity: 5 },
    { color: "#590000", velocity: 6 },
    { color: "#190000", velocity: 7 },
    { color: "#FFBD6C", velocity: 8 },
    { color: "#FF5400", velocity: 9 },
    { color: "#591D00", velocity: 10 },
    { color: "#271B00", velocity: 11 },
    { color: "#FFFF4C", velocity: 12 },
    { color: "#FFFF00", velocity: 13 },
    { color: "#595900", velocity: 14 },
    { color: "#191900", velocity: 15 },
    { color: "#88FF4C", velocity: 16 },
    { color: "#54FF00", velocity: 17 },
    { color: "#1D5900", velocity: 18 },
    { color: "#142B00", velocity: 19 },
    { color: "#4CFF4C", velocity: 20 },
    { color: "#001D59", velocity: 42 },
    { color: "#000819", velocity: 43 },
    { color: "#4C4CFF", velocity: 44 },
    { color: "#0000FF", velocity: 45 },
    { color: "#000059", velocity: 46 },
    { color: "#000019", velocity: 47 },
    { color: "#874CFF", velocity: 48 },
    { color: "#5400FF", velocity: 49 },
    { color: "#190064", velocity: 50 },
    { color: "#0F0030", velocity: 51 },
    { color: "#FF4CFF", velocity: 52 },
    { color: "#FF00FF", velocity: 53 },
    { color: "#590059", velocity: 54 },
    { color: "#190019", velocity: 55 },
    { color: "#FF4C87", velocity: 56 },
    { color: "#FF0054", velocity: 57 },
    { color: "#59001D", velocity: 58 },
    { color: "#220013", velocity: 59 },
    { color: "#FF1500", velocity: 60 },
    { color: "#993500", velocity: 61 },
    { color: "#795100", velocity: 62 },
    { color: "#795100", velocity: 62 },
    { color: "#436400", velocity: 63 },
    { color: "#033900", velocity: 64 },
    { color: "#005735", velocity: 65 },
    { color: "#00547F", velocity: 66 },
    { color: "#0000FF", velocity: 67 },
    { color: "#00454F", velocity: 68 },
    { color: "#2500CC", velocity: 69 },
    { color: "#7F7F7F", velocity: 70 },
    { color: "#202020", velocity: 71 },
    { color: "#FF0000", velocity: 72 },
    { color: "#BDFF2D", velocity: 73 },
    { color: "#AFED06", velocity: 74 },
    { color: "#64FF09", velocity: 75 },
    { color: "#108B00", velocity: 76 },
    { color: "#00FF87", velocity: 77 },
    { color: "#00A9FF", velocity: 78 },
    { color: "#002AFF", velocity: 79 },
    { color: "#3F00FF", velocity: 80 },
    { color: "#7A00FF", velocity: 81 },
    { color: "#B21A7D", velocity: 82 },
    { color: "#402100", velocity: 83 },
    { color: "#FF4A00", velocity: 84 },
    { color: "#88E106", velocity: 85 },
    { color: "#72FF15", velocity: 86 },
    { color: "#00FF00", velocity: 87 },
    { color: "#3BFF26", velocity: 88 },
    { color: "#59FF71", velocity: 89 },
    { color: "#38FFCC", velocity: 90 },
    { color: "#5B8AFF", velocity: 91 },
    { color: "#3151C6", velocity: 92 },
    { color: "#877FE9", velocity: 93 },
    { color: "#D31DFF", velocity: 94 },
    { color: "#FF005D", velocity: 95 },
    { color: "#FF7F00", velocity: 96 },
    { color: "#B9B000", velocity: 97 },
    { color: "#90FF00", velocity: 98 },
    { color: "#835D07", velocity: 99 },
    { color: "#392b00", velocity: 100 },
    { color: "#144C10", velocity: 101 },
    { color: "#0D5038", velocity: 102 },
    { color: "#15152A", velocity: 103 },
    { color: "#16205A", velocity: 104 },
    { color: "#693C1C", velocity: 105 },
    { color: "#A8000A", velocity: 106 },
    { color: "#DE513D", velocity: 107 },
    { color: "#D86A1C", velocity: 108 },
    { color: "#FFE126", velocity: 109 },
    { color: "#9EE12F", velocity: 110 },
    { color: "#67B50F", velocity: 111 },
    { color: "#1E1E30", velocity: 112 },
    { color: "#DCFF6B", velocity: 113 },
    { color: "#80FFBD", velocity: 114 },
    { color: "#9A99FF", velocity: 115 },
    { color: "#8E66FF", velocity: 116 },
    { color: "#404040", velocity: 117 },
    { color: "#757575", velocity: 118 },
    { color: "#E0FFFF", velocity: 119 },
    { color: "#A00000", velocity: 120 },
    { color: "#350000", velocity: 121 },
    { color: "#1AD000", velocity: 122 },
    { color: "#074200", velocity: 123 },
    { color: "#B9B000", velocity: 124 },
    { color: "#3F3100", velocity: 125 },
    { color: "#B35F00", velocity: 126 },
    { color: "#4B1502", velocity: 127 },
];

function findClosestVelocity(rgbColor) {
    // Convertir la couleur RGB en format hexadécimal
    const hexColor = rgbToHex(rgbColor);
    
    // Initialiser la distance minimale et la vitesse correspondante
    let minDistance = Infinity;
    let closestVelocity = -1;
    
    // Parcourir la liste des couleurs pour trouver la plus proche
    for (const entry of colorsData) {
        const distance = hexColorDistance(hexColor, entry.color);
        
        // Mettre à jour la vitesse la plus proche si la distance est plus petite
        if (distance < minDistance) {
            minDistance = distance;
            closestVelocity = entry.velocity;
        }
    }
    
    return closestVelocity;
    }
    
    // Fonction pour convertir RGB en format hexadécimal
function rgbToHex(rgbColor) {
    return `#${rgbColor[0].toString(16).padStart(2, '0')}${rgbColor[1].toString(16).padStart(2, '0')}${rgbColor[2].toString(16).padStart(2, '0')}`;
}
    
    // Fonction pour calculer la distance entre deux couleurs hexadécimales
function hexColorDistance(color1, color2) {
    const hexToRgb = (color) => [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    return Math.sqrt(
        Math.pow(rgb2[0] - rgb1[0], 2) +
        Math.pow(rgb2[1] - rgb1[1], 2) +
        Math.pow(rgb2[2] - rgb1[2], 2)
    );
}

allOff()
osc_io.open()