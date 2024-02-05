export const WritebackStatus = {
	"success": "SUCCESS",
	"failure": "FAILURE"
}

/** @param {NS} ns */
export function writeback_success(ns,message) {
	ns.writePort(ns.pid,JSON.stringify({"status":WritebackStatus.success,"message":message}))
}

/** @param {NS} ns */
export function writeback_failure(ns,message) {
	ns.writePort(ns.pid,JSON.stringify({"status":WritebackStatus.failure,"message":message}))
}