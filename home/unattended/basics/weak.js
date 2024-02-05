/** @param {NS} ns */
export async function main(ns) {
	let result = await ns.weaken(ns.args[0],{"additionalMsec":ns.args[1]})
	//ns.tprint(`WEAK ${ns.pid} @ ${Date.now()} for ${ns.formatNumber(result)}`)
	if (ns.args[2] == "true") {
		//ns.tprint(`CALLBACK ON ${ns.pid}`)
		const port = ns.getPortHandle(ns.pid)
		ns.atExit(()=>{
			port.write("DONE")
		})
	}
}

// import this to avoid cold boot issues
export const WEAK_COLD_BOOT = 0
