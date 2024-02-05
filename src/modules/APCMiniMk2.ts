import EventEmitter from "events";
import TypedEventEmitter from "../misc/EventsTypes";
import MIDI from "./MIDI";

function inRange(val: number, min: number, max: number) {
    return val >= min && val <= max;
}

enum Brightness {
    Const10 = 0, Const25 = 1, Const50 = 2, Const65 = 3, Const75 = 4, Const90 = 5, Const100 = 6,
    Pulse16 = 7, Pulse8 = 8, Pulse4 = 9, Pulse2 = 10, Blink24 = 11, Blink16 = 12, Blink8 = 13, Blink4 = 14, Blink2 = 15
}
enum States { Off = 0, On = 1, Blink = 2 }
enum Buttons {
    TC1 = 100, TC2 = 101, TC3 = 102, TC4 = 103, UP = 104, DOWN = 105, LEFT = 106, RIGHT = 107,
    M1 = 112, M2 = 113, M3 = 114, M4 = 115, M5 = 116, M6 = 117, M7 = 118, M8 = 119, SHIFT = 122
}

type Events = {
    padon: (x: number, y: number) => void
    padoff: (x: number, y: number) => void
    buttonon: (button: Buttons) => void
    buttonoff: (button: Buttons) => void
    fadermoved: (id: number, value: number) => void
}

function noteToButton(note: number) {
    switch (note) {
        case 100: return Buttons.TC1
        case 101: return Buttons.TC2
        case 102: return Buttons.TC3
        case 103: return Buttons.TC4
        case 104: return Buttons.UP
        case 105: return Buttons.DOWN
        case 106: return Buttons.LEFT
        case 107: return Buttons.RIGHT
        case 112: return Buttons.M1
        case 113: return Buttons.M2
        case 114: return Buttons.M3
        case 115: return Buttons.M4
        case 116: return Buttons.M5
        case 117: return Buttons.M6
        case 118: return Buttons.M7
        case 119: return Buttons.M8
        case 122: return Buttons.SHIFT
    }
}

class APCMiniMk2 extends (EventEmitter as new () => TypedEventEmitter<Events>) {
    input:  string
    output: string

    private midi: MIDI

    constructor(input: string, output: string) {
        super()
        this.input = input;
        this.output = output;

        this.midi = new MIDI(input, output)
        this.midi.on('noteon', (info) => {
            let note = info.note
            if (note < 64) {
                let x = note % 8;
                let y = Math.floor(note / 8);

                this.emit('padon', x, y);
            } else if (inRange(note, 100, 107) || inRange(note, 112, 119) || note == 122) {
                this.emit('buttonon', noteToButton(note))
            }
        })
        this.midi.on('noteoff', (info) => {
            let note = info.note
            if (note < 64) {
                let x = note % 8;
                let y = Math.floor(note / 8);

                this.emit('padoff', x, y);
            } else if (inRange(note, 100, 107) || inRange(note, 112, 119) || note == 122) {
                this.emit('buttonoff', noteToButton(note))
            }
        })
        this.midi.on('cc', (cc) => {
            let id = cc.controller
            if (inRange(id, 48, 56)) this.emit('fadermoved', id - 48, cc.value);
        })
        this.allOff();
    }

    allOff() {
        for (var i = 0; i < 64; i++) { this.setPadOff(i % 8, Math.floor(i / 8)); }

        // for (var i = 100; i < 108; i++) { setButtonState(i, 0); }
        // for (var i = 112; i < 119; i++) { setButtonState(i, 0); }
        this.setButtonState(Buttons.SHIFT, States.Off);
    }

    setPadOff(x: number, y: number) { this.midi.sendNoteOn(0, x + y * 8, 0); }
    setPadColor(x: number, y: number, brightness: Brightness,  color: { R: number, G: number, B: number }) {
        this.midi.sendNoteOn(brightness, x + y * 8, findClosestVelocity(color));
    }

    setButtonState(button: Buttons, state: States) {
        this.midi.sendNoteOn(0, button, state);
    }
}

function findClosestVelocity(rgbColor: { R: number, G: number, B: number }) {
    const hexColor = rgbToHex(rgbColor);

    let minDistance = Infinity;
    let closestVelocity = -1;
    
    for (const entry of colorsData) {
        let distance = hexColorDistance(hexColor, entry.color);

        if (distance < minDistance) {
            minDistance = distance;
            closestVelocity = entry.velocity;
        }
    }
    
    return closestVelocity;
}

function rgbToHex(color: { R: number, G: number, B: number }) {
    return `#${color.R.toString(16).padStart(2, '0')}${color.G.toString(16).padStart(2, '0')}${color.B.toString(16).padStart(2, '0')}`;
}

function hexColorDistance(color1: string, color2: string) {
    const hexToRgb = (color) => [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    return Math.sqrt(
        Math.pow(rgb2[0] - rgb1[0], 2) +
        Math.pow(rgb2[1] - rgb1[1], 2) +
        Math.pow(rgb2[2] - rgb1[2], 2)
    );
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

export { APCMiniMk2, Buttons, Brightness, States };