// JSDOC bits
/**
 * @typedef Hostname
 * @type {String}
 */

// REAL CONSTANTS
import {
    ONE_SECOND
} from "/unattended/lib/real_constants.js"

// BITBURNER
import {
    GROW_SECURITY,
    HACK_SECURITY,
    HUNDO_PERCENT,
    HOME_HOST
} from "/unattended/lib/game_constants.js"

// MY STUFF
import {
    WEAK_RAM,
    GROW_RAM,
    HACK_RAM,
    HACK_SCRIPT,
    GROW_SCRIPT,
    WEAK_SCRIPT,
    AUTOWEAK_SCRIPT,
    WEAK_CONSTANT_FILE
} from "/unattended/lib/my_constants.js"

// avoid cold boot issues
import { HACK_COLD_BOOT } from "/unattended/basics/hack.js"
import { GROW_COLD_BOOT } from "/unattended/basics/grow.js"
import { WEAK_COLD_BOOT } from "/unattended/basics/weak.js"


// LOCAL CONFIGURABLE
const _MAX_SALVO_SIZE = 50000

/**
 * @typedef PortProgram
 * @property {String} id
 * @property {String} name
 * @property {Number} cost
 */
const _PORT_PROGRAMS = [
    { "id": "brutessh", "name": "BruteSSH.exe", "cost": 500e3 },
    { "id": "ftpcrack", "name": "FTPCrack.exe", "cost": 1.5e6 },
    { "id": "relaysmtp", "name": "relaySMTP.exe", "cost": 5e6 },
    { "id": "httpworm", "name": "HTTPWorm.exe", "cost": 30e6 },
    { "id": "sqlinject", "name": "SQLInject.exe", "cost": 250e6 },
]


/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep")
    ns.disableLog("scan")
    ns.disableLog("exec")
    ns.disableLog("kill")
    ns.tail()
    let runner = new HackRunner(ns)
    await runner.begin()
    // ram calculation fix
    if (false) {
        ns.brutessh
        ns.ftpcrack
        ns.relaysmtp
        ns.httpworm
        ns.sqlinject
    }
}


class HackRunner {
    /**
     * @param {NS} ns
     */
    constructor(ns) {
        this.ns = ns
        /** The port to listen to for hack completion */
        this.callback_port = 0
        /** Cached copy of player */
        this.cached_player = ns.getPlayer()
        /** @type {Array<String>} Cached copy of known hostnames */
        this.cached_hostnames = []
        /** @type {Array<Server>} These are copies of servers as we looked at them */
        this.cached_servers = []
        /** @type {Array<Server>} These are customised to minsec and maxmoney */
        this.mock_targets = []
        /** @type {Array<PortProgram>} */
        this.port_programs = []
        /** @type {HackAnalysis} currently active analysis */
        this.analysis = null
    }

    async begin() {
        const ns = this.ns
        while (true) {
            // wake up -- this has to fully complete so that we do not deepen the stack
            await this.on_wake()
            // wait for callback to signal everything is done
            //ns.tprint(`Waiting for callback on ${this.callback_port}`)
            let port = ns.getPortHandle(this.callback_port)
            await port.nextWrite()
            port.clear()
            //ns.tprint(`Received callback on ${this.callback_port}`)
        }
    }

    async on_wake() {
        const ns = this.ns
        // if incoming pause command, acknowledge and wait for release
        await this.port_pause_command()
        // update cached information
        this.update_state()
        // run analysis to determine preferred hack for this round
        this.generate_analysis()
        // run based on analysis
        this.hack_or_prep()
    }

    /** 
     * If process port written to this will writeback, then await another write
     * This acts as PAUSE_COMMAND→PAUSED_STATE→RELEASE_COMMAND→<CLEAR>
     */
    async port_pause_command() {
        const ns = this.ns
        const port = ns.getPortHandle(ns.pid)
        // no pause means we can move on
        if (port.empty()) return
        // signal back that we have paused
        port.write("PAUSED")
        // wait for pause command to release
        await port.nextWrite()
        // clear port of state so we do not automatically pause again
        port.clear()
    }

    update_state() {
        const ns = this.ns
        this.cached_player = ns.getPlayer()
        this.port_programs = (_PORT_PROGRAMS.filter((prog) => ns.fileExists(prog.name, HOME_HOST)))
        this.cached_hostnames = get_hostnames(ns)
        this.update_cached_servers()
        const nukable_servers = this.cached_servers.filter((server) => {
            return (
                !server.hasAdminRights
                && server.numOpenPortsRequired <= this.port_programs.length
                && server.requiredHackingSkill <= this.cached_player.skills.hacking
            )
        })
        for (const nukable_server of nukable_servers) {
            ns.tprint(`NUKING ${nukable_server.hostname}`)
            for (const port_program of this.port_programs) ns[port_program.id](nukable_server.hostname)
            ns.nuke(nukable_server.hostname)
            ns.scp([AUTOWEAK_SCRIPT, WEAK_SCRIPT, GROW_SCRIPT, HACK_SCRIPT], nukable_server.hostname, HOME_HOST)
            const usable_ram = nukable_server.maxRam - nukable_server.ramUsed
            const autoweak_threads = Math.floor(usable_ram / WEAK_RAM)
            if (autoweak_threads > 0) ns.exec(AUTOWEAK_SCRIPT, nukable_server.hostname, autoweak_threads, nukable_server.hostname)
            // also backdoor
            ns.exec("unattended/backdoor.js", HOME_HOST, { "threads": 1, "temporary": true }, nukable_server.hostname)
        }
        // refresh cached servers again now that they may be hacked
        this.update_cached_servers()
        // generate mocks of servers with minimum security and maximum money -- for analysis
        this.mock_targets = (
            this.cached_servers
                // only nuked targets with money
                .filter((server) => server.moneyMax > 0 && server.hasAdminRights)
                // but as a mocked server with ideal security and money
                .map((server) => {
                    const mock_server = { ...server }
                    mock_server.hackDifficulty = mock_server.minDifficulty
                    mock_server.moneyAvailable = mock_server.moneyMax
                    return mock_server
                })
        )
    }

    update_cached_servers() {
        const ns = this.ns
        this.cached_servers = this.cached_hostnames.map((host) => ns.getServer(host))
    }

    generate_analysis() {
        const ns = this.ns
        const source_server = ns.getServer(HOME_HOST)
        let analyses = []
        let best_analysis = null
        let best_income = 0
        for (const mock of this.mock_targets) {
            const analysis = HackAnalysis.generate_new(ns, this.cached_player, mock, source_server)
            analyses.push(analysis)
            analysis.report()
            if (analysis.income_estimate > best_income) {
                best_analysis = analysis
                best_income = analysis.income_estimate
            }
        }
        ns.print("Best analysis...")
        best_analysis.report()
        this.analysis = best_analysis
    }

    hack_or_prep() {
        const ns = this.ns
        // get the REAL server information , not the mock
        const actual_target_server = ns.getServer(this.analysis.target_server.hostname)
        const is_minimum_security = actual_target_server.hackDifficulty == actual_target_server.minDifficulty
        const is_near_maximum_money = actual_target_server.moneyAvailable >= actual_target_server.moneyMax * 0.99
        if (!is_minimum_security) {
            ns.print("Must weaken server to prep it - note this weaken takes longer than analysis time due to security")
            this.run_weaken()
        }
        else if (!is_near_maximum_money) {
            const moneynow = actual_target_server.moneyAvailable
            const moneymax = actual_target_server.moneyMax
            const moneyratio = moneynow / moneymax
            ns.print(`Must grow server to prep it \$${ns.formatNumber(moneynow)} / \$${ns.formatNumber(moneymax)} (${ns.formatPercent(moneyratio)}) `)
            this.run_growth()
        }
        else {
            ns.print("Server has maximum money and minimum security - Hacking server")
            this.run_hacks()
        }
    }

    /** Server not at minsec so weaken it as much as possible */
    run_weaken() {
        const ns = this.ns
        const source_server = ns.getServer(HOME_HOST)
        const target_server = this.analysis.target_server
        const weak_threads = Math.floor((source_server.maxRam - source_server.ramUsed) / WEAK_RAM)
        const callback_pid = ns.exec(WEAK_SCRIPT, HOME_HOST, { "threads": weak_threads, "temporary": true }, target_server.hostname, 0, "true")
        this.callback_port = callback_pid
    }

    /** Server not at max money to grow+weaken as much as possible */
    run_growth() {
        const ns = this.ns
        const target_server = ns.getServer(this.analysis.target_server.hostname)
        const full_growth_factor = this.figure_full_growth_factor()
        const grow_threads = full_growth_factor.grow_threads
        const weak_threads = full_growth_factor.weak_threads
        const moneynow = target_server.moneyAvailable
        const moneymax = target_server.moneyMax
        const moneyratio = moneynow / moneymax
        const growpct = full_growth_factor.grow_pct
        const cycles = Math.ceil(Math.log(1 / moneyratio) / Math.log(growpct))
        const total_time = cycles * full_growth_factor.weak_time * cycles
        ns.print(`Growing by ${ns.formatPercent(growpct - 1, 1)}%→${ns.formatPercent(growpct * moneyratio, 1)} for ${cycles} cycles over ${total_time / ONE_SECOND}s`)
        ns.exec(GROW_SCRIPT, HOME_HOST, { "threads": grow_threads, "temporary": true }, target_server.hostname, 0)
        const callback_pid = ns.exec(WEAK_SCRIPT, HOME_HOST, { "threads": weak_threads, "temporary": true }, target_server.hostname, 0, "true")
        this.callback_port = callback_pid
    }

    figure_full_growth_factor() {
        const ns = this.ns
        const source_server = ns.getServer(HOME_HOST)
        const target_server = ns.getServer(this.analysis.target_server.hostname)
        const player = ns.getPlayer()
        const weak_security = ns.weakenAnalyze(1, source_server.cpuCores)
        const grow_per_weak = weak_security / GROW_SECURITY
        const balanced_ram_per_weak = WEAK_RAM + grow_per_weak * GROW_RAM
        const weak_threads = Math.floor((source_server.maxRam - source_server.ramUsed) / balanced_ram_per_weak)
        const grow_threads = Math.floor(weak_threads * grow_per_weak)
        const grow_pct = ns.formulas.hacking.growPercent(target_server, grow_threads, player, source_server.cpuCores)
        const weak_time = ns.formulas.hacking.weakenTime(target_server, player)
        return {
            "weak_threads": weak_threads,
            "grow_threads": grow_threads,
            "grow_pct": grow_pct,
            "weak_time": weak_time
        }
    }

    run_hacks() {
        const ns = this.ns
        const rounds = this.analysis.salvo_size
        const callback_round = rounds - 1
        const hack_run_options = { "threads": this.analysis.hack_threads, "temporary": true }
        const grow_run_options = { "threads": this.analysis.grow_threads, "temporary": true }
        const weak_run_options = { "threads": this.analysis.weak_threads, "temporary": true }
        const target_hostname = this.analysis.target_server.hostname
        const source_hostname = HOME_HOST
        const hack_time = ns.formulas.hacking.hackTime(this.analysis.target_server, this.cached_player)
        const grow_time = ns.formulas.hacking.growTime(this.analysis.target_server, this.cached_player)
        const weak_time = ns.formulas.hacking.weakenTime(this.analysis.target_server, this.cached_player)
        const hack_delay = weak_time - hack_time
        const grow_delay = weak_time - grow_time
        const weak_delay = weak_time - weak_time
        let callback_flag = "false"
        for (let i = 0; i < rounds; i++) {
            // suspend momentarily after 8k loops
            //if (i%8192==0) await ns.sleep(0)
            if (i == callback_round) callback_flag = "true"
            ns.exec(HACK_SCRIPT, source_hostname, hack_run_options, target_hostname, hack_delay)
            ns.exec(GROW_SCRIPT, source_hostname, grow_run_options, target_hostname, grow_delay)
            let callback_pid = ns.exec(WEAK_SCRIPT, source_hostname, weak_run_options, target_hostname, weak_delay, callback_flag)
            if (i == callback_round) this.callback_port = callback_pid
        }
    }
}



class HackAnalysis {
    /**
     * @param {NS} ns
     * @param {Player} player
     * @param {Server} target_server
     * @param {Server} source_server
     */
    constructor(ns, player, target_server, source_server) {
        this.ns = ns
        this.player = player
        this.target_server = target_server
        this.source_server = source_server
        this.hack_threads = 0
        this.grow_threads = 1
        this.weak_threads = 0
    }

    clone() {
        const ha = new HackAnalysis()
        ha.copy_other(this)
        return ha
    }

    /** @param {HackAnalysis} other */
    copy_other(other) {
        this.ns = other.ns
        this.player = other.player
        this.target_server = other.target_server
        this.source_server = other.source_server
        this.hack_threads = other.hack_threads
        this.grow_threads = other.grow_threads
        this.weak_threads = other.grow_threads
    }

    /** @param {HackAnalysis} other */
    is_same_as(other) {
        return (
            this.hack_threads == other.hack_threads
            && this.grow_threads == other.grow_threads
            && this.weak_threads == other.weak_threads
            && this.target_server.hostname == other.target_server.hostname
        )
    }

    get hack_ram() {
        return this.hack_threads * HACK_RAM
    }

    get hack_security() {
        return this.hack_threads * HACK_SECURITY
    }

    get grow_ram() {
        return this.grow_threads * GROW_RAM
    }

    get grow_security() {
        return this.grow_threads * GROW_SECURITY
    }

    get weak_ram() {
        return this.weak_threads * WEAK_RAM
    }

    get weak_security() {
        return this.ns.weakenAnalyze(this.weak_threads, this.source_server.cpuCores)
    }

    get round_ram() {
        return this.hack_ram + this.grow_ram + this.weak_ram
    }

    get round_security() {
        return this.hack_security + this.grow_security - this.weak_security
    }

    get round_runtime() {
        return this.ns.formulas.hacking.weakenTime(this.target_server, this.player)
    }

    get hack_pct_total() {
        return Math.min(HUNDO_PERCENT, this.hack_pct_ea * this.hack_threads)
    }

    get hack_pct_ea() {
        return this.ns.formulas.hacking.hackPercent(this.target_server, this.player)
    }

    get hack_chance() {
        return this.ns.formulas.hacking.hackChance(this.target_server, this.player)
    }

    get hack_grow_money() {
        const hack_pct = this.hack_pct_total
        // this accounts for hack increasing security
        this.target_server.hackDifficulty += this.hack_threads * HACK_SECURITY
        const grow_pct = this.ns.formulas.hacking.growPercent(this.target_server, this.grow_threads, this.player, this.source_server.cpuCores)
        // grow also adds $1 per thread before multiplying, as a safeguard against servers hitting 0 money
        const grow_add = this.grow_threads / this.target_server.moneyMax
        // set the mock back to minsec for later use
        this.target_server.hackDifficulty = this.target_server.minDifficulty
        const ending_money = (HUNDO_PERCENT - hack_pct + grow_add) * grow_pct
        return ending_money
    }

    get round_ram() {
        return this.hack_ram + this.grow_ram + this.weak_ram
    }

    get salvo_ram() {
        return this.round_ram * this.salvo_size
    }

    get salvo_size() {
        // limited to how many scripts we can reasonably run
        return Math.min(_MAX_SALVO_SIZE, Math.floor((this.source_server.maxRam - this.source_server.ramUsed) / this.round_ram))
    }

    get money_per_round() {
        return this.hack_pct_total * this.target_server.moneyMax
    }

    get round_success_chance() {
        return this.ns.formulas.hacking.hackChance(this.target_server, this.player)
    }

    get income_estimate() {
        return (
            this.money_per_round
            * (this.round_success_chance * this.round_success_chance) // not always 100%, add a bias towards 100%
            * this.salvo_size
            / (this.round_runtime + this.salvo_size / 10000) // add some time to actually fire scripts
            * ONE_SECOND
        )
    }

    // ensures hack will take ever so slightly less money than current grow can put back
    balance_hack_to_grow() {
        while (this.hack_grow_money >= HUNDO_PERCENT && this.hack_pct_total < HUNDO_PERCENT) {
            this.hack_threads++
            if (this.hack_threads > 1e4) { this.fucking_bail(); return }
        }
        while (this.hack_grow_money < HUNDO_PERCENT) {
            this.hack_threads--
            if (this.hack_threads <= 0) { this.fucking_bail(); return }
        }
    }


    // ensures that grow can put back slightly more money than hack takes away
    balance_grow_to_hack() {
        while (this.hack_grow_money >= HUNDO_PERCENT) this.grow_threads--
        while (this.hack_grow_money < HUNDO_PERCENT) this.grow_threads++
    }

    fucking_bail() {
        const ns = this.ns
        ns.print(`infinite loop on ${this.target_server.hostname}?`);
        ns.print(`H=${this.hack_threads} G=${this.grow_threads} H→G=${this.hack_grow_money} H%=${this.hack_pct_total}`)
        //ns.exit()
    }

    // ensures that weak will remove slightly more security that hack+grow will add
    balance_weak() {
        while (this.weak_security > (this.hack_security + this.grow_security)) this.weak_threads--
        while (this.weak_security < (this.hack_security + this.grow_security)) this.weak_threads++
    }

    report() {
        const ns = this.ns
        const text = (
            "HACK ANALYSIS : "
            + `${this.target_server.hostname} → \$${ns.formatNumber(this.income_estimate)}/s`
            + ` → (H=${this.hack_threads} G=${this.grow_threads} W=${this.weak_threads})=\$${ns.formatNumber(this.money_per_round)}:`
            + `*${this.salvo_size}r=${ns.formatNumber(this.money_per_round * this.salvo_size)};`
            + `/${Math.round(this.round_runtime) / ONE_SECOND}s*${ns.formatPercent(this.round_success_chance, 1)}=\$${ns.formatNumber(this.income_estimate)}`
        )
        ns.print(text)
    }

    /**
     * @param {NS} ns
     * @param {Player} player
     * @param {Server} target_server
     * @param {Server} source_server
     */
    static generate_new(ns, player, target_server, source_server) {
        // threadcounts , selected as best , and working copy
        let selected_analysis = new HackAnalysis(ns, player, target_server, source_server)
        // sanity checks before we try optimise it
        if (selected_analysis.hack_pct_ea <= 0 || selected_analysis.hack_chance <= 0) {
            ns.print(`Cannot hack any money out of ${selected_analysis.target_server.hostname}`)
            return selected_analysis
        }
        let working_analysis = selected_analysis.clone()
        let last_analysis = working_analysis.clone()
        const optimisation_rounds = 50
        for (let i = 0; i < optimisation_rounds; i++) {
            // increase hack to take more money than before then increase grow to cover it
            working_analysis.hack_threads++
            working_analysis.balance_grow_to_hack()
            working_analysis.balance_hack_to_grow()
            working_analysis.balance_weak()
            last_analysis = working_analysis
            // override selection if working analysis is better
            if (working_analysis.income_estimate > selected_analysis.income_estimate) {
                selected_analysis = working_analysis
                working_analysis = selected_analysis.clone()
                //selected_analysis.report()
            }
        }
        // report the last working one, to see if we were still improving or significantly backsliding
        last_analysis.report()
        return selected_analysis
    }
}


/** @param {NS} ns */
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

