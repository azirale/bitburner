// PREP
// Set up a corporation to make huge money
// Work at MegaCorp to unlock faction
// NOW
// This script will keep looping installs of as much NFG as can be bought per corpo cycle

const _ONE_SECOND = 1000
/** @param {NS} ns */
export async function main(ns) {
	ns.tail()
	ns.disableLog("sleep")
	// wait until we get funds -- we know we have it if we pass a billion
	while (ns.getPlayer().money < 1e9) { await ns.sleep(10) }
	// we need to be a permanent member of this first
	ns.singularity.joinFaction("MegaCorp")
	// give them all our money as a donation (we should have hit enough favour before this)
	ns.singularity.donateToFaction("MegaCorp",ns.getPlayer().money)
	// wait for money again
	while (ns.getPlayer().money < 1e9) { await ns.sleep(10) }
	// buy as much nfg as possible
	let bought = 0
	while (ns.singularity.purchaseAugmentation("MegaCorp","NeuroFlux Governor")) bought++
	ns.print(`bought ${bought} nfg`)
	// give it 3 seconds to see what happened
	await ns.sleep(3*_ONE_SECOND)
	// install and go agane
	ns.singularity.installAugmentations("intel/nfgfarm.js")
}