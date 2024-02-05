// this is going to be always running, so it needs some quirks to how it runs
// we want to minimise RAM use in *THIS* program because it is *ALWAYS* on
// so anything that is run-once is delegate out to a child process
// the child process must return some writeback on its port
// and this will catch that writeback before moving on, to ensure things go in order
// the writeback can also indicate a failure, so that everything can bail if required

// REAL CONSTANTS
import { ONE_SECOND } from "/unattended/lib/real_constants.js"

// GAME CONSTANTS
import { HOME_HOST } from "unattended/lib/game_constants.js"

// MY STUFF
import {
    STANEK_CHARGE_RAM,
    HACKING_PREP_SCRIPT,
    STANEK_PREP_SCRIPT,
    WEAK_CONST_UPDATE_SCRIPT,
    BLADEBURNER_PREP_SCRIPT,
    BLADEBURNER_JOIN_SCRIPT,
    WEAK_SCRIPT,
    WEAK_RAM
} from "/unattended/lib/my_constants.js"

import { WritebackStatus } from "/unattended/lib/port_writeback.js"

// MY CONFIGURABLES
/** child process are generally 1 thread and temporary -- this script will re-run after a load*/
const _DEFAULT_RUN_OPTIONS = { 'threads': 1, 'temporary': true }


/** All skills, faster HGW, stronger growth, more rep, cheaper hacknet, better bladeburner */
/*
const _STANEK_LAYOUT_ALLSTATS = [
  {"id":0,"x":0,"y":2,"rotation":3},
  {"id":5,"x":0,"y":4,"rotation":3},
  {"id":16,"x":1,"y":5,"rotation":2},
  {"id":18,"x":3,"y":5,"rotation":2},
  {"id":7,"x":5,"y":4,"rotation":3},
  {"id":1,"x":0,"y":1,"rotation":0},
  {"id":25,"x":0,"y":0,"rotation":2},
  {"id":21,"x":2,"y":3,"rotation":1},
  {"id":12,"x":4,"y":0,"rotation":0},
  {"id":14,"x":3,"y":0,"rotation":2},
  {"id":10,"x":3,"y":2,"rotation":0},
  {"id":30,"x":4,"y":3,"rotation":0}
]*/
const _STANEK_LAYOUT_ALLSTATS = [
    { "id": 0, "x": 4, "y": 0, "rotation": 0 },
    { "id": 1, "x": 5, "y": 1, "rotation": 3 },
    { "id": 5, "x": 2, "y": 1, "rotation": 2 },
    { "id": 12, "x": 2, "y": 0, "rotation": 2 },
    { "id": 7, "x": 5, "y": 3, "rotation": 3 },
    { "id": 16, "x": 3, "y": 4, "rotation": 2 },
    { "id": 10, "x": 2, "y": 3, "rotation": 0 },
    { "id": 6, "x": 0, "y": 0, "rotation": 3 },
    { "id": 20, "x": 1, "y": 0, "rotation": 3 },
    { "id": 14, "x": 0, "y": 4, "rotation": 0 }
]

// STATE INFORMATION
let _BLADEBURNER_PID = 0
let _HACKING_PID = 0
let _HACKING_PORT = null
let _PROG_ID = 0


/** @param {NS} ns */
export async function main(ns) {
    // auto-tail to see wtf is going on after start
    ns.tail()
    ns.disableLog('sleep')
    ns.disableLog('singularity.upgradeHomeRam')
    // clean out this host of other scripts so that we definitely have ram available
    kill_all_other_scripts(ns)
    // will update the power of weaken() for hacking calculations -- written to importable script
    await update_weaken_constant(ns)
    // a round of weaken on noodles for a boost of exp -- always executes
    await noodles(ns)
    // will ensure stanek board exists and is configured correctly -- leaves it alone if no change required
    await prepare_stanek(ns)
    // get hacking stat up to a decent starting value first -- also charges stanek
    await prepare_hacking_stat(ns)
    // prepare bladeburner -- also charges stanek
    await prepare_bladeburner_stats(ns)
    // join the bladeburner division -- if going for BB victory
    await join_bladeburner(ns)
    // upping home ram is a big boost and we can get it from our starting hacknet server
    // await first_home_upgrade(ns) // DISABLED -- takes a while
    // SET SLEEVES TO INFILTRATE

    const prog_pid = ns.run("unattended/hacking_program_progression.js")
    _HACKING_PID = ns.run("hackrunner.js")
    _HACKING_PORT = ns.getPortHandle(_HACKING_PID)

    while (true) {
        // snoozle while waiting for state change	
        await ns.sleep(ONE_SECOND)
        // MOAR RAM → MOAR STANEK
        const upgraded_ram = ns.singularity.upgradeHomeRam()
        if (upgraded_ram) {
            ns.tprint("<<< UPGRADED HOME RAM >>>")
            // pause hacker when it is between salvos
            ns.tprint("<<< PAUSING HACKER >>>")
            _HACKING_PORT.write("PAUSE")
            await _HACKING_PORT.nextWrite()
            // hack is paused - charge stanek for a minute
            let charge_process = create_stanek_charger(ns)
            ns.tprint("<<< CHARGING STANEK >>>")
            charge_process.start()
            await ns.sleep(60 * ONE_SECOND)
            // charged for a minute, tell hacker to continue
            charge_process.stop()
            ns.tprint("<<< RESTARTING HACKER >>>")
            _HACKING_PORT.write("CONTINUE")
        }
        // join factions!

        //ns.singularity.installBackdoor 2.0GB
        //ns.scan 0.2GB
        //ns.singularity.connect 2.0GB
        //ns.singularity.purchaseProgram() 2.0GB
        //ns.singularity.upgradeHomeRam 3.0GB
        // ns.singularity.getUpgradeHomeRamCost 1.5GB

    }

}


/**
 * @param {NS} ns
 * Cleans out other scripts to get back to clean slate
 */
function kill_all_other_scripts(ns) {
    for (let process_info of ns.ps()) {
        let process_id = process_info.pid
        if (process_id == ns.pid) continue
        ns.kill(process_id)
    }
}


/**
 * @param {NS} ns
 * This is to burst hacking skill for later installs when ram is high.
 */
async function noodles(ns) {
    // 
    ns.singularity.universityCourse("Rothman University", "Algorithms", false)
    await ns.sleep(5 * ONE_SECOND)
    const source_server = ns.getServer(HOME_HOST)
    const wthreads = Math.floor((source_server.maxRam - source_server.ramUsed) / WEAK_RAM)
    ns.nuke("n00dles")
    const wpid = ns.run(WEAK_SCRIPT, { "threads": wthreads, "temporary": true }, "n00dles", 0, "true")
    const port = ns.getPortHandle(wpid)
    await port.nextWrite()
    port.clear()

}

/** @param {NS} ns */
async function update_weaken_constant(ns) {
    let process = new CallbackScript(ns, WEAK_CONST_UPDATE_SCRIPT)
    process.start()
    let result = await process.result()
    if (result.status != WritebackStatus.success) throw new Error(`update_weaken_constant FAILED`)
}

/** @param {NS} ns */
async function prepare_stanek(ns) {
    let process = new CallbackScript(ns, STANEK_PREP_SCRIPT, JSON.stringify(_STANEK_LAYOUT_ALLSTATS))
    process.start()
    let result = await process.result()
    if (result.status != WritebackStatus.success) throw new Error(`prep_stanek FAILED`)
}

async function prepare_hacking_stat(ns) {
    // get hacking to a good starting level + charge while waiting
    let process = new CallbackScript(ns, HACKING_PREP_SCRIPT)
    process.start()
    let charger = create_stanek_charger(ns).start()
    let hackprep_result = await process.result()
    charger.stop()
    if (hackprep_result.status != WritebackStatus.success) throw new Error(`prepare_hacking_stat FAILED`)
}

async function prepare_bladeburner_stats(ns) {
    let stats_process = new CallbackScript(ns, BLADEBURNER_PREP_SCRIPT)
    stats_process.start()
    let charge_process = create_stanek_charger(ns)
    charge_process.start()
    // wait for stats to be ready
    let stats_result = await stats_process.result()
    charge_process.stop()
    if (stats_result.status != WritebackStatus.success) throw new Error(`prepare_bladeburner_stats FAILED\n${stats_result.message}`)
}

async function join_bladeburner(ns) {
    let process = new CallbackScript(ns, BLADEBURNER_JOIN_SCRIPT)
    process.start()
    let result = await process.result()
    if (result.status != WritebackStatus.success) throw new Error(`join_bladerunner FAILED\n${stats_result.message}`)
}

async function first_home_upgrade(ns) {
    let process = new CallbackScript(ns, "unattended/first_home_upgrade.js")
    process.start()
    let result = await process.result()
    if (result.status != WritebackStatus.success) throw new Error(`first_home_upgrade FAILED\n${stats_result.message}`)
}


function create_stanek_charger(ns) {
    let source_server = ns.getServer()
    let available_ram = source_server.maxRam - source_server.ramUsed
    let charge_threads = Math.floor(available_ram / STANEK_CHARGE_RAM)
    let process = new IndependentScript(ns, "/unattended/stanek_charger.js", charge_threads)
    return process
}



/** A script execution that ends and returns some data */
class CallbackScript {
    /**
     * @param {NS} ns
     * @param {String} script_path
     */
    constructor(ns, script_path, ...passthrough_args) {
        this.ns = ns
        this.script_path = script_path
        this.passthrough_args = passthrough_args
        this.proc_id = 0
    }

    start() {
        let ns = this.ns
        this.proc_id = ns.run(this.script_path, _DEFAULT_RUN_OPTIONS, ...this.passthrough_args)
        return this
    }

    async result() {
        let ns = this.ns
        let port = ns.getPortHandle(this.proc_id)
        await port.nextWrite()
        let value = port.read()
        port.clear()
        ns.print(`CALLBACK : ${this.script_path}`)
        ns.print(value)
        let parsed_value = JSON.parse(value)
        return parsed_value
    }
}

/** A script  */
class IndependentScript {
    /**
     * @param {NS} ns
     * @param {String} script_path
     */
    constructor(ns, script_path, threads, ...passthrough_args) {
        this.ns = ns
        this.script_path = script_path
        this.threads = threads ?? 1
        this.passthrough_args = passthrough_args
        this.proc_id = 0
    }

    start() {
        let ns = this.ns
        let proc_id = ns.run(this.script_path, { "threads": this.threads, "temporary": true }, ...this.passthrough_args)
        this.proc_id = proc_id
        return this
    }

    stop() {
        let ns = this.ns
        let killed = ns.kill(this.proc_id)
        return killed
    }
}

/**
 * @param {NS} ns
 */


/**
 * @param {NS} ns
 * @returns {Array<Hostname>} hostnames
 */
function get_hostnames(ns) {
    // initialise with home
    let hosts = [HOME_HOST];
    // loop over all known hostnames , for each connection found add it if it has not been found already
    for (let i = 0; i < hosts.length; i++) {
        let host = hosts[i];
        let connected_hosts = ns.scan(host);
        for (let connected_host of connected_hosts) {
            if (hosts.includes(connected_host)) continue
            hosts.push(connected_host);
        }
    }
    return hosts;
}


