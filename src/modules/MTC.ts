import easymidi from "easymidi"


class MTC {
    output_name: string

    private output: easymidi.Output

    private start_time:   number
    private offset:       number
    private paused_frame: number
    private interval_id:  NodeJS.Timeout

    constructor(output: string) {
        this.output_name = output;

        this.output = new easymidi.Output(output);
        this.start_time = 0;
        this.offset = 0;
        this.paused_frame = 0;
        this.interval_id = null;
    }

    private sendTimecode(frame: number, sec: number, min: number, hour: number) {
        this.output.send('mtc', { type: 0, value: frame & 0x0F });
        this.output.send('mtc', { type: 1, value: (frame & 0xF0) >> 4 });
        this.output.send('mtc', { type: 2, value: sec & 0x0F });
        this.output.send('mtc', { type: 3, value: (sec & 0xF0) >> 4 });
        this.output.send('mtc', { type: 4, value: min & 0x0F });
        this.output.send('mtc', { type: 5, value: (min & 0xF0) >> 4 });
        this.output.send('mtc', { type: 6, value: hour & 0x0F });
        this.output.send('mtc', { type: 7, value: (hour & 0xF0) >> 4 });
    }

    private handleTimecode() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.start_time + this.offset;
    
        const frame = Math.floor((elapsedTime * 24) / 1000) % 24;
        const second = Math.floor(elapsedTime / 1000) % 60;
        const minute = Math.floor(elapsedTime / (60 * 1000)) % 60;
        const hour = Math.floor(elapsedTime / (60 * 60 * 1000)) % 24;
    
        this.sendTimecode(frame, second, minute, hour);
    } 
    
    pause() {
        if (!this.isPlaying()) return;
        clearInterval(this.interval_id);
        this.interval_id = null;
        this.paused_frame = Math.floor((Date.now() - this.start_time) * 24 / 1000) % 24;
        this.offset += (Date.now() - this.start_time)
    }
    
    play() {
        if (this.isPlaying()) return;
        this.start_time = Date.now() - (this.paused_frame * 1000 / 24);
        this.interval_id = setInterval(() => this.handleTimecode(), 1000 / 24);
    }

    setTime(time: number) {
        this.start_time = Date.now();
        this.offset = time;
    }

    rewind(time: number) { this.offset -= time; }

    isPlaying() { return this.interval_id != null; }
}

export default MTC;