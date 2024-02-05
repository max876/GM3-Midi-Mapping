import EventEmitter from "events";
import TypedEventEmitter from "../misc/EventsTypes";
import osc from "osc";

interface OSCArg { type: string, value: any }
interface OSCMessage { address: string, args: OSCArg[] }

type Events = {
    message: (message: OSCMessage) => void
    ready: (inputip: string, inputport: string) => void
}

export default class OSCServer extends (EventEmitter as new () => TypedEventEmitter<Events>) {
    InputIP:    string
    InputPort:  string
    OutputIP:   string
    OutputPort: string

    private UDP: any

    constructor(input:string, output:string) {
        super()
        let inarr = input.split(":");
        let outarr = output.split(":")
        
        this.InputIP = inarr[0];
        this.InputPort = inarr[1],
        this.OutputIP = outarr[0];
        this.OutputPort = outarr[1],

        this.UDP = new osc.UDPPort({
            localAdress: this.InputIP,
            localPort: this.InputPort,
            metadata: true
        })

        this.UDP.on("message", (msg: OSCMessage) => this.emit("message", msg))
        this.UDP.on("ready", () => this.emit('ready', this.InputIP, this.InputPort))
        this.UDP.open()
    }


    sendOSC(address: string, ...args: any[]) {
        let osc_args: OSCArg[] = [];

        for (let arg of args) {
            let type = ''
            switch (typeof(arg)) {
                case "string":
                    type = 's'
                    break
    
                case "number":
                    type = 'i'
                    break
                
                case 'boolean':
                    type = arg ? 't' : 'f';
                    break
                
                case 'undefined':
                    type = 'n'
                    break
    
                default:
                    continue
            }
            osc_args.push({ type, value: arg })
        } 
    
        this.UDP.send({ address, args: osc_args }, this.OutputIP, this.OutputPort);
    }
}