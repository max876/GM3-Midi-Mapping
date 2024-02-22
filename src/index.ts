import { APCMiniMk2, Brightness, Buttons, States } from "./modules/APCMiniMk2";
import { GrandMA3, GrandMaster, ExecState } from "./modules/GrandMA3";
import MTC from "./modules/MTC";

const GM3 = new GrandMA3('127.0.0.1:8001', '127.0.0.1:8000')
const APC = new APCMiniMk2('APC mini mk2', 'APC mini mk2')
const TC = new MTC('GM3 Midi')

interface Command { command: string, args: string[], left: number, button: Buttons }
enum Mode { Show, Prog }
enum Pools { Group, Preset }
var mode = Mode.Show
var pool = Pools.Group
var syncCommand: Command = null;

function resetSyncCommand() { APC.setButtonState(syncCommand.button, States.Off); syncCommand = null; }
function runSyncCommand(cmd: string, argnb: number, button: Buttons) {
    if (syncCommand != null && syncCommand.command == cmd) return resetSyncCommand();
    
    if (syncCommand != null) APC.setButtonState(syncCommand.button, States.Off);
    APC.setButtonState(button, States.Blink);
    syncCommand = { command: cmd, args: [], left: argnb, button }
}

function updateAPC() {
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 8; x++) {
            let exec = GM3.execs.get(101 + y * 100 + x + GM3.wing * 8);

            if (exec.state == ExecState.Unlinked) {
                APC.setPadOff(x, y);
            } else {
                APC.setPadColor(x, y, exec.state == ExecState.Active ? Brightness.Const100 : Brightness.Const25, exec.color);
            }
        }
    }
}


APC.on('buttonon', (button) => {
    switch (button) {
        case Buttons.TC1: 
            if (TC.isPlaying()) {
                APC.setButtonState(Buttons.TC1, States.Off)
                TC.pause(); 
            } else {
                APC.setButtonState(Buttons.TC1, States.Blink)
                TC.play(); 
            }
            return;

        case Buttons.TC2: return TC.rewind(10000); 
        case Buttons.TC3: return TC.rewind(-10000);
        case Buttons.TC4: return TC.setTime(0);

        case Buttons.UP:    GM3.nextWing(); updateAPC(); return;
        case Buttons.DOWN:  GM3.prevWing(); updateAPC(); return;
        case Buttons.LEFT:  return GM3.prevPage();
        case Buttons.RIGHT: return GM3.nextPage();

        case Buttons.M1: if (pool == Pools.Group) pool = Pools.Preset; else pool = Pools.Group; return;
        case Buttons.M2: if (mode == Mode.Prog) GM3.full(); else runSyncCommand('Go+', 1, button); return;
        case Buttons.M3: if (mode == Mode.Prog) GM3.set(); else runSyncCommand('Go-', 1, button); return;
        case Buttons.M4: if (mode == Mode.Prog) GM3.highlight(); else runSyncCommand('Toggle', 1, button); return;
        case Buttons.M5: if (mode == Mode.Prog) runSyncCommand('Move', 2, button); else runSyncCommand('On', 1, button); return;
        case Buttons.M6: if (mode == Mode.Prog) GM3.nextStep(); else runSyncCommand('Off', 1, button); return;
        case Buttons.M7: if (mode == Mode.Prog) return GM3.oops(); 
        case Buttons.M8: if (mode == Mode.Prog) return GM3.clear();
        case Buttons.SHIFT:
            if (mode == Mode.Show) {
                mode = Mode.Prog;
                APC.setButtonState(Buttons.UP, States.Off);
                APC.setButtonState(Buttons.DOWN, States.On);
            } else {
                mode = Mode.Show;
                APC.setButtonState(Buttons.UP, States.On);
                APC.setButtonState(Buttons.DOWN, States.Off);
            }
            return;
    }
})

APC.on('padon', (x, y) => {
    if (syncCommand == null) {
        if (y <= 3) return GM3.pushExecutorButton(0, 101 + x + y * 100 + GM3.wing * 8, 1);
        if (pool == Pools.Group) return GM3.selectGroup(x + (7 - y) * 8 + 1);

        return;
    }

    if (y > 3) {
        if (syncCommand.command != "Move") resetSyncCommand();
        if (pool == Pools.Group) {
            syncCommand.args.push(`${syncCommand.left == 2 ? 'Group': ''} ${x + (7 - y) * 8 + 1}`);
            syncCommand.left--;
        }
        
    } else {
        if (syncCommand.command == "Move") resetSyncCommand();
        syncCommand.args.push(`Executor ${101 + x + y * 100 + GM3.wing * 8}`);
        syncCommand.left--;
    }

    if (syncCommand.left == 0) {
        GM3.sendCommand(`${syncCommand.command} ${syncCommand.args.join(' ')}`);
        resetSyncCommand();
    }
})

APC.on('padoff', (x, y) => {
    if (y <= 3) return GM3.pushExecutorButton(0, 101 + x + y * 100 + GM3.wing * 8, 0);
})

APC.on('fadermoved', (fader, value) => {
    if (fader == 8) return GM3.moveGrandMasterFader(GrandMaster.Master, value / 127);
    GM3.moveExecutorFader(0, 201 + fader + GM3.wing * 8, value / 127);
})


GM3.on('ExecutorUpdated', (exec, info) => {
    let wing = Math.floor((exec % 100 - 1) / 8);
    if (wing != GM3.wing) return;

    exec -= GM3.wing * 8;
    let row = exec % 100 - 1;
    let col = Math.floor(exec / 100) - 1;
    if (info.state == ExecState.Unlinked) return APC.setPadOff(row, col);
    APC.setPadColor(row, col, info.state == ExecState.Active ? Brightness.Const100 : Brightness.Const25, info.color);
})