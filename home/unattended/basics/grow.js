/** @param {NS} ns */
export async function main(ns) {
	let result = await ns.grow(ns.args[0],{"additionalMsec":ns.args[1]})
	//ns.tprint(`GROW ${ns.pid} @ ${Date.now()} for ${result}x`)
}

// import this to avoid cold boot issues
export const GROW_COLD_BOOT = 0
