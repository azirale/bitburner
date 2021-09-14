import * as t from './types';


/** Returns the amount by which the target's current security exceeds its minimum security. */
export function excess_security_on_target(ns: t.Netscript, target: string) {
	return ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
}

/** Returns the amount of free memory on the host. */
export function memory_available_on_host(ns: t.Netscript, hostname: string) {
	return ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
}

/** Returns the total growth percentage for a given growth per thread and number of threads */
export function total_growth_for_threads(growth_per_thread: number, threads: number):number {
	return Math.pow(growth_per_thread, threads);
}

/** Returns growth factor per thread against a target. eg +25% growth is 1.25 */
export function growth_per_thread(ns:t.Netscript,target:string):number {
	const sample_growth = 2;
	const sample_threads = ns.growthAnalyze(target, sample_growth);
	return Math.pow(sample_growth, 1 / sample_threads);
}

/** Returns the total percent of current money that will be hacked based on per-thread % and total threads. Decimal form with range 0-1 */
export function total_hack_for_threads(hack_per_thread:number,threads:number): number {
	const total = hack_per_thread * threads;
	return Math.min(total,1);
}
