import EventEmitter from "events";
import TypedEventEmitter from "../misc/EventsTypes";
import OSCServer from "./OSC";


enum ExecState { Unlinked = 0, Linked = 1, Active = 2 }
interface Executor { state: ExecState, color: { R: number, G: number, B: number }}

enum GrandMaster {
    Master = 1, Word = 2, Highlight = 3, Lowlight = 4, Solo = 5, Rate = 6, Speed = 7, ProgramTime = 8, ProgramXFade = 9,
    ExecutorTime = 10, ExecutorXFade = 11, ProgramSpeed = 12, Blind = 13, SoundOut = 14, SoundIn = 15, SoundFade = 16
}



type Events = {
    ExecutorUpdated: (exec: number, info: Executor) => void
    FaderMoved: (fader: number, value: number) => void
}

class GrandMA3 extends (EventEmitter as new () => TypedEventEmitter<Events>) {
    inputip:    string
    outputip:   string

    private OSC: OSCServer
    wing: number
    faderRange = 100

    execs: Map<number, Executor>
    faders: Map<number, number>

    constructor(input: string, output: string) {
        super()
        this.inputip = input;
        this.outputip = output;

        this.execs = new Map()
        this.faders = new Map()
        this.wing = 0;

        for (let i = 1; i < 86; i++) {
            this.execs.set(100 + i, { state: 0, color: { R: 0, G: 0, B: 0 }});
            this.execs.set(200 + i, { state: 0, color: { R: 0, G: 0, B: 0 }});
            this.execs.set(300 + i, { state: 0, color: { R: 0, G: 0, B: 0 }});
            this.execs.set(400 + i, { state: 0, color: { R: 0, G: 0, B: 0 }});

            this.faders.set(200 + i, 0);
        }

        this.OSC = new OSCServer(input, output);
        this.OSC.on('message', (msg) => {
            if (msg.address == '/Exec') {
                let exec = msg.args[0].value;
                let state = msg.args[1].value;
                let color = { R: msg.args[2].value, G: msg.args[3].value, B: msg.args[4].value };

                if (color.R == 0 && color.G == 0 && color.B == 0) {
                    color.R = 255;
                    color.G = 255;
                    color.B = 255;
                }
                

                this.execs.set(exec, { state, color });
                this.emit('ExecutorUpdated', exec, { state, color })
            } else if (msg.address == '/Fader') {
                let fader = msg.args[0].value;
                let value = msg.args[1].value;

                this.faders.set(fader, value);
                this.emit('FaderMoved', fader, value);
            }
        })
    }

    sendCommand(cmd: string) { this.OSC.sendOSC('/cmd', cmd); }
    
    nextPage() { this.sendCommand('Next Page'); }
    prevPage() { this.sendCommand('Prev Page'); }
    nextStep() { this.sendCommand('Next Step'); }
    prevStep() { this.sendCommand('Prev Step'); }

    set() { this.sendCommand('Set'); }
    clear() { this.sendCommand('clear'); }
    oops() { this.sendCommand('oops'); }
    highlight() { this.sendCommand('Highlight'); }
    full() { this.sendCommand('At Full'); }

    selectGroup(id: number) { this.sendCommand(`Group ${id}`); }

    moveExecutorFader(page: number, exec: number, value: number) {
        this.OSC.sendOSC(`${page != 0 ? '/Page' + page : ''}/Fader${exec}/`, value * this.faderRange);    
    }
    pushExecutorButton(page: number, exec: number, value: number) {
        this.OSC.sendOSC(`${page != 0 ? '/Page' + page : ''}/Key${exec}/`, value);    
    }
    moveGrandMasterFader(grandMaster: GrandMaster, value: number) {
        this.OSC.sendOSC("/cmd", `Master 2.${grandMaster} At ${value * this.faderRange}`);
        //sendOSC("/13.12.2." + grandMaster, "FaderMaster", 1, value * 100);
    }  


    nextWing() { this.wing = this.wing == 11 ? 11 : this.wing + 1; }
    prevWing() { this.wing = this.wing == 0 ? 0 : this.wing - 1; }
}

export { GrandMA3, GrandMaster, ExecState };