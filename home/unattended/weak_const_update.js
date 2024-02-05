import { WEAK_CONSTANT_FILE } from "unattended/lib/my_constants.js"
import { writeback_success, writeback_failure } from "unattended/lib/port_writeback.js"


/** @param {NS} ns */
export async function main(ns) {
    try {
        let weak_security = ns.weakenAnalyze(1)
        let write_data = `${weak_security}`
        ns.write(WEAK_CONSTANT_FILE, write_data, "w")
        writeback_success(ns, JSON.stringify(weak_security))
    }
    catch (e) {
        writeback_failure(ns, e.message)
    }
}

