let ns;
let one_second = 1000;
let one_minute = 60 * one_second;
let loop_time = one_second;
let home_hostname = 'home';
let darkweb_hostname = 'darkweb';
let port_programs = [
	'BruteSSH.exe',
	'FTPCrack.exe',
	'relaySMTP.exe',
	'HTTPWorm.exe',
	'SQLInject.exe'
];
let tor_money = 200000; // 200K
let program_costs = {
	'BruteSSH.exe':     500000, //     500K
	'FTPCrack.exe':    1500000, //   1.5M
	'relaySMTP.exe':   5000000, //   5M
	'HTTPWorm.exe':   30000000, //  30M
	'SQLInject.exe': 250000000  // 250M
};
let weaken_security = 0.05;
let grow_security = 0.004;
let hack_security = 0.002;
let server_limit = 25;
let percentage_money_to_hack = 90; // eg 25 for 25%

// player specific
let server_prefix = 'jace';
let crush_file = 'crush.js';
let crush_repeat_limit = 3; 
let barrage_file = 'stablehack.js';
let simple_file = 'weaken.js';
let singularity_level = 1;

// cached values -- reset on aug
let backdoored_servers;
let already_cracked;
let already_crushed;
let have_tor;
let have_all_programs;

function reset_cached_values() {
	have_tor = false;
	have_all_programs = false;
	already_cracked = [];
	already_crushed = [];
	backdoored_servers = [];
}


export async function main(netscript) {
	// copy the netscript value so we do not have to pass it effing everywhere
	ns = netscript;
	// dear god this would be spammy AF and we have actually useful log messages to get
	ns.disableLog('ALL');
	// we have to reset global caches on rerun in case of augmentation
	reset_cached_values();

	// on bit4 we also add manual hacking
	for (let proc of ns.ps(home_hostname)) {
		if (proc.filename == 'crimes.js') {
			ns.kill(proc.pid);
		}
	}
	ns.run('crimes.js',1,'traffick arms');

	// do the initial money init before anything else -- make sure we get dat cash
	await do_money_init();



	// start the loop
	while (true) {
		ns.clearLog();
		let d = new Date();
		ns.print(`@ ${d.toISOString()}`);
		// basic netscript functions
		await do_basic_work();
		// singularity specific code
		if (singularity_level >= 1) {
			await do_singularity_work();
		}
		await ns.sleep(loop_time);
	}
}

// TODO -- use this approach intead of barrage proposal later
async function do_money_init() {
	// set up the target -- we can always crack this right off the bat so guarantee it
	let target = 'n00dles';
	let hostname = home_hostname;
	ns.nuke(target);
	// now kill any such programs running locally -- we will replace them
	let procs = ns.ps(hostname);
	for (let proc of procs) {
		if (['weaken.js','hack.js','grow.js'].includes(proc.filename)) {
			ns.kill(proc.pid);
		}
	}
	// start configuring the optimisation object
	let nood = {}
	nood.ram_available = get_memory_available(hostname);
	// get ram needed
	nood.grow_ram = ns.getScriptRam('grow.js',hostname);
	nood.hack_ram = ns.getScriptRam('hack.js',hostname);
	nood.weak_ram = ns.getScriptRam('weaken.js',hostname);
	// figure grow/hack per thread
	nood.hack_pct_ea = ns.hackAnalyzePercent(target)/100; // convert percentage form to decimal form
	let sample_growth = 2;
    let sample_threads = ns.growthAnalyze(target, sample_growth);
    nood.grow_pct_ea = Math.pow(sample_growth, 1 / sample_threads);
	// figure grow/hack time
	nood.grow_time = ns.getGrowTime(target);
    nood.hack_time = ns.getHackTime(target);
    nood.weak_time = ns.getWeakenTime(target);
	// starting mode
	nood.hack_threads = 1;
	nood.grow_threads = 1;
	nood.weak_threads = 1;
	// set functions on the object
	nood.ram_required = function() {
		return (
			this.grow_ram*this.grow_threads
			+this.hack_ram*this.hack_threads
			+this.weak_ram*this.weak_threads
		);
	}
	nood.exceeds_available_ram = function() { return this.ram_required() > this.ram_available; }
	nood.hack_pct_total = function() { return this.hack_pct_ea * this.hack_threads; }
	nood.grow_pct_total = function() { return Math.pow(this.grow_pct_ea,this.grow_threads); }
	nood.hack_sec_rate = function() { return this.hack_threads / this.hack_time * hack_security; }
	nood.grow_sec_rate = function() { return this.grow_threads / this.grow_time * grow_security; }
	nood.weak_sec_rate = function() { return this.weak_threads / this.weak_time * weaken_security * 0.9 ; } // final factor is a bias to guarantee weaken is better
	nood.net_sec_rate = function() { return this.hack_sec_rate() + this.grow_sec_rate() - this.weak_sec_rate(); }
	nood.hack_repeats = function() { return Math.ceil(this.grow_time / this.hack_time); }
	nood.hack_remain_pct = function() { return Math.pow(1-this.hack_pct_total(),this.hack_repeats()); }
	nood.needs_more_grow = function() { return this.hack_remain_pct() * this.grow_pct_total() < 1; }
	nood.hack_absurdly_high = function() { return this.hack_remain_pct() < 0.01; }
	nood.needs_more_weaken = function() { return this.net_sec_rate() > 0; }
	nood.set_checkpoint = function() {
		// TODO -- reuse this object if it exists
		this.checkpoint = {}
		this.checkpoint.weak_threads = this.weak_threads;
		this.checkpoint.grow_threads = this.grow_threads;
		this.checkpoint.hack_threads = this.hack_threads;
	}
	nood.restore_checkpoint = function() {
		this.weak_threads = this.checkpoint.weak_threads;
		this.grow_threads = this.checkpoint.grow_threads;
		this.hack_threads = this.checkpoint.hack_threads;
	}
	// optimise the object
	// if not enough ram for 1:1:1 forget it
	if (nood.exceeds_available_ram()) { return; }
	nood.break_case = 'none yet';
	var loops = 0;
	while (true) {
		// emergency break
		loops++;
		if (loops > 1000000) {
			nood.break_case = 'infinite loop?';
			break;
		}
		// set checkpoint to restore in case we cannot optimise and need to break
		nood.set_checkpoint();
		// try up hacks
		nood.hack_threads++;
		// if we exceeded ram we are capped out so bail
		if ( nood.exceeds_available_ram() ) { 
			nood.restore_checkpoint();
			nood.break_case='Hack exceeded ram';
			break;
		}
		// if our hack is getting almost all the money we can then bail
		if (nood.hack_absurdly_high()) {
			nood.restore_checkpoint();
			nood.break_case='Hack hit money cap';
			break;
		}
		// if our security rate is no good try up weaken as well
		if (nood.needs_more_weaken()) { 
			nood.weak_threads++;
			// if that exceeded ram then bail
			if (nood.exceeds_available_ram()) {
				nood.restore_checkpoint();
				nood.break_case = 'Hack>Weaken exceeded ram';
				break;
			}
		}
		// if we cannot regrow from this hack then try up growth
		if (nood.needs_more_grow()) {
			nood.grow_threads++;
			// if that exceeded memory then bail
			if ( nood.exceeds_available_ram() ) {
				nood.restore_checkpoint();
				nood.break_case = 'Grow exceeded ram';
				break;
			}
			// if it exceeded weaken rate try up that
			if ( nood.needs_more_weaken() ) {
				nood.weak_threads++;
				// if *that* exceeded memory then bail
				if ( nood.exceeds_available_ram()) {
					nood.restore_checkpoint();
					nood.break_case = 'Grow>Weaken exceeded ram';
					break;
				}
			}
		}
	}
	ns.tprint(`Finished optimisation with H=${nood.hack_threads} G=${nood.grow_threads} W=${nood.weak_threads}`);
	ns.tprint(`Optimisation finished due to [[[ ${nood.break_case} ]]]`);
	ns.tprint(`Hack will take ${ns.nFormat(nood.hack_pct_total()*100,'0.00')}% per run, running up to ${nood.hack_repeats()} times per grow`);
	ns.tprint(`Hack leaves behind ${ns.nFormat(nood.hack_remain_pct()*100,'0.00')}% in worst case`);
	ns.tprint(`Grow increases by ${ns.nFormat(nood.grow_pct_total()*100-100,'0.00')}%, reaching ${ns.nFormat(nood.hack_remain_pct()*nood.grow_pct_total()*100,'0.00')}% money in worst case`);
	ns.tprint(`Security rate is ${nood.net_sec_rate()}`);
	// run the programs
	ns.run('weaken.js',nood.weak_threads,target);
	ns.run('grow.js',nood.grow_threads,target);
	ns.run('hack.js',nood.hack_threads,target);
}



async function do_singularity_work() {
	// SINGULARITY 1
	// do backdoor -- and break existing work if necessary
	await do_backdoor();
	// purchase TOR and programs if we can afford them
	await buy_programs();
}


async function do_backdoor() {
	let backdoor_servers = [
		'CSEC', // cybersec faction join requirement
		'avmnite-02h', // nitesec faction join requirement
		'I.I.I.I', // blackhand faction join requirement
		'run4theh111z', // bitrunners faction join requirement
		'w0r1d_d43m0n' // available after redpill augment - break this bitnode
	];
	for (let target of backdoor_servers) {
		// skip if we do not have root
		if (!ns.hasRootAccess(target)) { continue; }
		// skip if we know we already backdoored
		if (backdoored_servers.includes(target)) { continue; }
		// get the connect chain from home to target
		let connect_path = trace(home_hostname, target);
		// connect through to target (we can always connect home)
		for (let hostname of connect_path) {
			ns.connect(hostname);
		}
		// do the backdoor
		await ns.installBackdoor();
		// now return home so we do not have to do it manually
		ns.connect('home');
		// and add to backdoored servers
		backdoored_servers.push(target);
	}
}

function trace(start, end, visited = []) {
	// mark this spot as visited
	visited.push(start);
	// if we land on the server return end of path
	if (start == end) {
		return [start];
	}
	// otherwise go through connected instances
	else {
		var next = ns.scan(start);
		for (let target of next) {
			// skip if already visited -- already gone down this path
			if (visited.includes(target)) {
				continue;
			}
			// chase down this path
			let check = trace(target, end, visited);
			// if the result is not null then we hit the target so prepend this node
			if (check != null) {
				check.unshift(start)
				return check;
			}
		}
		// if the loop does not return a success then return a null
		return null;
	}
}


async function buy_programs() {
	// we can bypass this entirely if we have all the programs
	if (have_tor && have_all_programs) { return; }
	// bypass tor check if we remember that we had it already
	if (!have_tor) {
		// always check first in case we have reloaded and are working off init state
		have_tor = ns.scan(home_hostname).includes(darkweb_hostname);
		// if it really turns out we do not have it then try get it
		if (!have_tor && ns.getPlayer().money >= tor_money) {
			have_tor = ns.purchaseTor();
		}
		// if we have tor now report to terminal as a permanent state change
		if (have_tor) {
			ns.tprint(`HAVE TOR -> DARKWEB ACCESS`);
		}
	}
	// if we have a tor now then we should try get whatever programs we are missing
	if (have_tor) {
		for (let program_name of port_programs) {
			let program_cost = program_costs[program_name];
			// if we do NOT have the program and we CAN afford -- buy it
			if (!ns.fileExists(program_name, home_hostname) && ns.getPlayer().money >= program_cost) {
				ns.tprint(`BUYING PROGRAM [[[ ${program_name} ]]]`);
				ns.purchaseProgram(program_name);
			}
		}
		// once we have made our purchases check if we own all the files so we may bypass this later
		have_all_programs = true;
		for (let program_name of port_programs) {
			if (!ns.fileExists(program_name, home_hostname)) {
				have_all_programs = false;
				break;
			}
		}
		// if we ended up having all programs report it to terminal as a permanent state change
		if (have_all_programs) {
			ns.tprint("ALL PORT OPENERS ACQUIRED");
		}
		
	}
	// all done -- this will get us tor and then all port programs automatically
}

async function do_basic_work() {
	// try to crack servers first
	await crack_servers();
	// try to crush servers with too much security
	await crush_servers();
	// then try to set up barrages
	await autobarrage();
}


async function crack_servers() {
	let targets = get_target_hostnames();
	let needs_more_hacking = [];
	let needs_more_ports = [];
	let cracked_now = []
	// check which ones CANNOT be cracked now
	for (let target of targets) {
		// skip if already cracked
		if (already_cracked.includes(target)) {
			continue;
		}
		// somehow this server rooted but not marked as such -- mark it now , probably a rerun of script
		if (ns.hasRootAccess(target)) {
			already_cracked.push(target);
			consume_target_ram(target);
			continue;
		}
		// check if hacking is enough
		if (ns.getPlayer().hacking_skill < ns.getServerRequiredHackingLevel(target)) {
			needs_more_hacking.push(target);
			continue;
		}
		// check if openable ports are enough
		if (get_ports_openable() < ns.getServerNumPortsRequired(target)) {
			needs_more_ports.push(target);
			continue;
		}
		// otherwise we must be able to hack it
		ns.tprint(`CRACKING [[[ ${target} ]]]`);
		if (ns.fileExists("BruteSSH.exe", home_hostname)) { ns.brutessh(target); }
		if (ns.fileExists("FTPCrack.exe", home_hostname)) { ns.ftpcrack(target); }
		if (ns.fileExists("relaySMTP.exe", home_hostname)) { ns.relaysmtp(target); }
		if (ns.fileExists("HTTPWorm.exe", home_hostname)) { ns.httpworm(target); }
		if (ns.fileExists("SQLInject.exe", home_hostname)) { ns.sqlinject(target); }
		ns.nuke(target);
		cracked_now.push(target);
		consume_target_ram(target);
	}
	// print a report to the log to summarise
	ns.print(`AlreadyCracked=${already_cracked.length}, LowHacking=${needs_more_hacking.length}, LowPorts=${needs_more_ports.length}, CrackedNow=${cracked_now.length}`)
}

function consume_target_ram(target) {
	let simple_target = target;
	ns.killall(target);
	ns.scp(simple_file,home_hostname,target);
	let num_threads = Math.floor(get_memory_available(target)/ns.getScriptRam(simple_file,target));
	// some servers have no ram available
	if (num_threads >= 1) {
		ns.exec(simple_file,target,num_threads,simple_target,ns.getServerMaxMoney(simple_target));
	}
}



async function crush_servers() {
	let skipped_crush = [];
	let crushing_now = []
	// update the list of servers we are crushing now for reference
	for (let process of ns.ps(home_hostname)) {
		if (process.filename != crush_file) { continue; }
		crushing_now.push(process.args[0]);
	}
	// we can reuse the already cracked server list for our crush targets
	let targets = already_cracked;
	for (let target of targets) {
		// can skip this server if we already know that we have crushed it
		if (already_crushed.includes(target)) { continue; }
		// skip if it is being crushed now
		if (crushing_now.includes(target)) { continue; }
		// skip if it is being barraged (we only barrage crushed servers) -- and remember for next time
		if (get_already_barraging(target)) {
			already_crushed.push(target);
			continue;
		}
		// skip if the security is at minimum (probably a manual or previous crush)
		if (get_excess_security(target) <= 0) {
			already_crushed.push(target);
			continue;
		}
		// otherwise crush now if we can
		let ram_available = get_memory_available(home_hostname);
		let crush_ram = ns.getScriptRam(crush_file,home_hostname);
		let available_threads = Math.floor(ram_available/crush_ram);
		let required_threads = Math.ceil(get_excess_security(target)/weaken_security);
		// see how many times crush would have to repeat if it fit within available threads
		let repeats = Math.ceil(required_threads / available_threads);
		// if it is beyond the crush repeat limit then give up -- will take too long
		if (repeats > crush_repeat_limit) {
			skipped_crush.push(target);
		}
		// otherwise adjust threads to repeats and try to run the crush
		required_threads = Math.floor(required_threads/repeats);
		if (required_threads > 0 && !skipped_crush.includes(target)) {
			let pid = ns.run(crush_file,required_threads,target);
			if (pid != 0) {
				ns.tprint(`CRUSHING [[[ ${target} ]]]`);
				crushing_now.push(target);
			}
			else {
				skipped_crush.push(target);
			}
		}
	}
	// report crush stats
	ns.print(`AlreadyCracked=${already_cracked.length}, AlreadyCrushed=${already_crushed.length}, Crushing=${crushing_now.length}, Skipped=${skipped_crush.length}`);
}


function get_excess_security(target) {
	return ns.getServerSecurityLevel(target)-ns.getServerMinSecurityLevel(target);
}

function get_memory_available(hostname) {
	return ns.getServerMaxRam(hostname)-ns.getServerUsedRam(hostname);
}

function get_already_barraging(target) {
	let hostnames = get_server_hostnames();
	for (let hostname of hostnames) {
		for (let process of ns.ps(hostname)) {
			if (!process.filename == barrage_file) { continue; }
			if (process.args[0].target == target) { return true; }
		}
	}
	return false;
}

function get_barraged_servers() {
	let barraged_servers = [];
	let hostnames = get_server_hostnames();
	for (let hostname of hostnames) {
		for (let process of ns.ps(hostname)) {
			if (process.filename != barrage_file) { continue; }
			barraged_servers.push(process.args[0].target)
		}
	}
	return barraged_servers;
}


// TODO this needs an optimisation
// we should get ALL proposals for all servers -- even if already barraging
// loop NEEDS barraging trying to use spare memory
// once memory runs out buy biggest server we can as long as we can do a barrage
// loop NEEDS barraging using spare memory
// if we hit max servers -- try to consolidate
// we stop once we run out of money or run out of needs barraging
// consolidation uses the new proposal -- would use less memory, be more optimised
async function autobarrage() {
	// our targets are the already crushed servers
	let targets = already_crushed;
	// we should check which servers are being barraged already
	let already_barraged = get_barraged_servers();
	// now get the things that NEED barraging
	let needs_barraging = [];
	for (let target of targets) {
		// ignore anything already barraged
		if (already_barraged.includes(target)) { continue; }
		// also always ignore n00dles -- we hit that one manually from home server
		if (target == 'n00dles') { continue; }
		// otherwise add to needs barraging
		needs_barraging.push(target);
	}
	// if we have maxed our servers we need to do a consolidation
	if (get_server_hostnames().length == server_limit) {
		await consolidate_servers();
		return;
	}
	// otherwise we do single barrages
	// get all our proposals
	let proposals = [];
	for (let target of needs_barraging) {
		let proposal = get_barrage_proposal(target);
		if (proposal != null) {
			proposals.push(proposal);
		}
	}
	// sort proposals by value
    proposals.sort(proposal_descending_value);
	let cannot_afford = [];
    for (let proposal of proposals) {
        // skip if we do not have the cash
        if (proposal.server_cost > ns.getPlayer().money) {
            cannot_afford.push(proposal.target);
            continue;
        }
        // bail if we capped out our servers (we will do a consolidation on the next round)
        if (get_server_hostnames().length == server_limit) {
            break;
        }
        // report proposal
        ns.tprint(
            "Barraging Value=" + ns.nFormat(proposal.final_value * 1e6, "0,0") +
            " Host " + proposal.host +
            " " + ns.nFormat(proposal.required_memory, "0,0") + "GB" +
            " for " + ns.nFormat(proposal.server_cost, "$0.0a") +
            " targets " + proposal.target +
            " for " + ns.nFormat(proposal.estimated_income, "0.0a") + "/s " +
            "(g=" + proposal.growth_threads + "/h=" + proposal.hack_threads + "/w=" + proposal.weaken_threads + ")"
        );
        await initiate_barrage(proposal);
    }
	// report stats
	ns.print(`AlreadyBarraging=${already_barraged.length}, PotentialTargets=${needs_barraging.length}, CannotAfford=${cannot_afford.length}`)
	ns.print(`AlreadyBarraging=${already_barraged}`);
	ns.print(`PotentialTargets=${needs_barraging}`);
	if (proposals.length > 0) {
		ns.print(`NextTarget=${proposals[0].target} for ${ns.nFormat(proposals[0].server_cost, "$0.0a")}`);
	}
}

async function initiate_barrage(proposal) {
    // buy the server and do the kickoff
    if (!ns.serverExists(proposal.host)) {
        ns.tprint("Buying server [" + proposal.host + "] -> [" + proposal.target + "] (" + ns.nFormat(proposal.server_cost, "$0.0a") + ")");
        ns.purchaseServer(proposal.host, proposal.required_memory);
    }
    else {
        ns.tprint("Using existing server [" + proposal.host + "] -> [" + proposal.target + "]");
    }
    // server should already be fully weakened
    // stablehack should automatically grow to full before hacking
    ns.scp('stablehack.js', 'home', proposal.host);
    ns.scp('weaken.js', 'home', proposal.host);
    // startup stablehack with the proposal for info
    ns.print("Executing stablehack on " + proposal.host + " (g=" + proposal.growth_threads + " h=" + proposal.hack_threads + ")");
    if (proposal.stable_threads <= 0 || proposal.weaken_threads <=0) {
        ns.tprint(`Autobarrage got weird threads for ${proposal.target} (gh=${proposal.stable_threads} w=${proposal.weaken_threads})`);
    }
    else {
        ns.exec('stablehack.js', proposal.host, proposal.stable_threads, proposal, proposal.target);
        ns.exec('weaken.js', proposal.host, proposal.weaken_threads, proposal.target);
    }
}

function get_barrage_proposal(target) {
	// first guard against servers that do not exist (weird game state issue with darkweb on first init)
	if (!ns.serverExists(target)) { return null; }
	// first guard against servers with no money -- no proposals for them
	if (ns.getServerMaxMoney(target) == 0) { return null; }
	if (ns.getServerMoneyAvailable(target) == 0) { return null; }
	// no proposal for servers that are not cracked
	if (!ns.hasRootAccess(target)) { return null; }
	// otherwise make a proposal
    let proposal = {};
    proposal.target = target;
    proposal.host = `${server_prefix}-${target}`;
    // get threads for growth and hack
    proposal.growth_threads = Math.ceil(ns.growthAnalyze(target, 100/(100-percentage_money_to_hack) ));
    proposal.hack_threads = Math.floor(percentage_money_to_hack / ns.hackAnalyzePercent(target));
    proposal.stable_threads = Math.max(proposal.growth_threads, proposal.hack_threads);
    // get runtime for hacks
    proposal.growth_time = ns.getGrowTime(target);
    proposal.hack_time = ns.getHackTime(target);
    proposal.weaken_time = ns.getWeakenTime(target);
    // security for each thread level over total running time, compared to weaken over time per thread , then bumped up to next multiple of 4
    // grow fortify scales with STABLE threads because we just up our grow threads to the max available
    var total_fortify_per_time = (((proposal.stable_threads * grow_security) + (proposal.hack_threads * hack_security)) / (proposal.growth_time + proposal.hack_time));
    proposal.weaken_threads = Math.ceil((total_fortify_per_time * proposal.weaken_time) / weaken_security);
    // figure out the required memory
    var raw_ram_needed = (ns.getScriptRam('weaken.js', 'home') * proposal.weaken_threads) + (ns.getScriptRam('stablehack.js', 'home') * proposal.stable_threads);
    proposal.required_memory = Math.pow(2, Math.ceil(Math.log2(raw_ram_needed)));
    // readjust weaken threads to fill memory , mostly for the skill and also for safety of ensuring server stays weak
    while (raw_ram_needed + ns.getScriptRam('weaken.js', 'home') <= proposal.required_memory) {
        raw_ram_needed += ns.getScriptRam('weaken.js', 'home');
        proposal.weaken_threads++;
		// infinite loop guard
		if (proposal.weaken_threads > 1e7) {
			ns.tprint("Insane weaken threads -- something fucked up?");
			ns.tprint(proposal)
			ns.exit();
			return;
		}
    }
    // figure the server cost
    proposal.server_cost = ns.getPurchasedServerCost(proposal.required_memory);
    // calculate expected value
    proposal.hack_chance = ns.hackChance(target);
    proposal.max_money = ns.getServerMaxMoney(target);
    proposal.min_security = ns.getServerMinSecurityLevel(target);
    proposal.estimated_income = (proposal.max_money / 10) / (proposal.growth_time + proposal.hack_time) * proposal.hack_chance;
    proposal.final_value = proposal.estimated_income / proposal.server_cost;
    return proposal;
}

function proposal_descending_value(a, b) {
    return b.final_value - a.final_value;
}

function hostname_ascending_ram(a, b) {
    return ns.getServerMaxRam(a) - ns.getServerMaxRam(b);
}

// to be called when we are at 25 servers and need more -- consolidate as many as possible
async function consolidate_servers() {
    // figure out how much memory I can afford
    var consolidated_ram = 1;
    // bail immediately if we cannot afford a server at all
    if (ns.getPurchasedServerCost(consolidated_ram) > ns.getServerMoneyAvailable('home')) {
        ns.print("Need to consolidate servers but cannot afford anything");
        return;
    }
    // keep increasing ram while the next tier is affordable and possible
    while (ns.getPurchasedServerCost(consolidated_ram * 2) <= ns.getServerMoneyAvailable('home') && consolidated_ram * 2 <= ns.getPurchasedServerMaxRam()) {
        consolidated_ram *= 2;
    }
    ns.tprint("Trying to consolidate barrage servers up to " + ns.nFormat(consolidated_ram, "0.000a") + "GB for "+ns.nFormat(ns.getPurchasedServerCost(consolidated_ram),"$0.000a"));
    // get my existing servers and their ram , up to what I can afford
    // not necessarily the most I can consolidate but close enough
    var my_servers = get_server_hostnames();
    my_servers.sort(hostname_ascending_ram);
    var required_memory = 0;
    var consolidating_servers = [];
    for (var server of my_servers) {
        if (required_memory + ns.getServerMaxRam(server) > consolidated_ram) { break; }
        consolidating_servers.push(server);
        required_memory += ns.getServerMaxRam(server)
    }
    // bail if we are not actually consolidating
    if (consolidating_servers.length < 2) {
        return;
    }
    // now that we know the list of servers to consolidate we can get their active barrage params
    var barrages = [];
    for (let server of consolidating_servers) {
        for (var process of ns.ps(server)) {
            if (process.filename == barrage_file) {
                let barrage = process.args[0];
                barrages.push(barrage);
            }
        }
    }
    // delete those servers
    ns.tprint("CONSOLIDATING BARRAGE SERVERS");
    for (let server of consolidating_servers) {
        ns.tprint(" - " + server);
        ns.killall(server);
        ns.deleteServer(server);
    }
    // now buy the new consolidated server
    var new_server_name = ns.purchaseServer(`${server_prefix}-${Date.now()}`, consolidated_ram);
    // did not work ?
    if (new_server_name == '') { return; }
    // run the barrages
    for (let barrage of barrages) {
        // adjust the host to the new host name -- the rest can stay the same, no need to hyper optimize this
        barrage.host = new_server_name;
        await initiate_barrage(barrage);
    }
    // now throw in an extra weaken just for the xp
    await ns.sleep(1000)
    var remaining_ram = ns.getServerMaxRam(new_server_name) - ns.getServerUsedRam(new_server_name);
    var bonus_weaken_threads = Math.floor(remaining_ram/ns.getScriptRam('weaken.js','home'));
    var bonus_target = 'n00dles'; // they are all much of a muchness , but this one is crackable right away and decent , add extra arg to not look like duplicate
    if (bonus_weaken_threads >= 0) {
        var bonus_pid = ns.exec('weaken.js',new_server_name,bonus_weaken_threads,bonus_target,'bonus');
    }
    ns.tprint("Barrage consolidation done");
}




function get_all_hostnames() {
	// initialise with home
	var hostnames = [home_hostname];
	// loop over all known hostnames , for each connection found add it if it has not been found already
	for (var i = 0; i < hostnames.length; i++) {
		var hostname = hostnames[i];
		var new_hostnames = ns.scan(hostname);
		for (var new_hostname of new_hostnames) {
			if (!hostnames.includes(new_hostname)) {
				hostnames.push(new_hostname);
			}
		}
	}
	return hostnames;
}

function get_target_hostnames() {
	let all_hostnames = get_all_hostnames();
	let target_hostnames = []
	for (let hostname of all_hostnames) {
		if (hostname == home_hostname) { continue; }
		if (hostname.startsWith(server_prefix)) { continue; }
		target_hostnames.push(hostname);
	}
	return target_hostnames;
}

function get_server_hostnames() {
	let all_hostnames = get_all_hostnames();
	let server_hostnames = [];
	for (let hostname of all_hostnames) {
		if (hostname == home_hostname) { continue; }
		if (!hostname.startsWith(server_prefix)) { continue; }
		server_hostnames.push(hostname);
	}
	return server_hostnames;
}

function get_ports_openable() {
	// if we have set all programs as bought we can shortcut this
	if (have_all_programs) { return port_programs.length; }
	// otherwise check which ones we have
	let num_ports_openable = 0;
	for (let program_name of port_programs) {
		if (ns.fileExists(program_name, home_hostname)) {
			num_ports_openable++;
		}
	}
	// if all ports are openable we can remember that we have all programs
	if (num_ports_openable == port_programs.length) {
		have_all_programs = true;
	}
	// then we can return the value
	return num_ports_openable;
}
