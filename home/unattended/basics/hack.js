/** @param {NS} ns */
export async function main(ns) {
	const result = await ns.hack(ns.args[0],{"additionalMsec":ns.args[1]})
	//ns.tprint(`HACK ${ns.pid} @ ${Date.now()} for \$${ns.formatNumber(result)}`)
}

// import this to avoid cold boot issues
export const HACK_COLD_BOOT = 0
