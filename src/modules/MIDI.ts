import easymidi from "easymidi"
import { EventEmitter } from "events"
import TypedEventEmitter from "../misc/EventsTypes"

type Events = {
    noteon: (note: easymidi.Note) => void
    noteoff: (note: easymidi.Note) => void
    cc: (cc: easymidi.ControlChange) => void
}

export default class MIDI extends (EventEmitter as new () => TypedEventEmitter<Events>) {
    input_name:  string
    output_name: string

    input: easymidi.Input
    output: any // easymidi.Output

    constructor(input: string, output: string) {
        super();
        this.input_name = input;
        this.output_name = output;

        this.input = new easymidi.Input(input);
        this.output = new easymidi.Output(output);

        this.input.on("noteon", (note) => this.emit("noteon", note))
        this.input.on("noteoff", (note) => this.emit("noteoff", note))
        this.input.on("cc", (cc) => this.emit("cc", cc))  
    }

    sendNoteOn(channel: number, note: number, velocity: number) {
        this.output.send('noteon', { note, channel, velocity })
    }
    sendNoteOff(channel: number, note: number, velocity: number) {
        this.output.send('noteoff', { note, channel, velocity })
    }
}