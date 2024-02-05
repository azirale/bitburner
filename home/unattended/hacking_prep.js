import { ONE_SECOND } from "unattended/lib/real_constants.js"
import { writeback_success, writeback_failure } from "unattended/lib/port_writeback.js"

// CONFIGURABLE
const _HACKING_TO_REACH = 150

/** @param {NS} ns */
export async function main(ns) {
    try {
        ns.singularity.universityCourse("Rothman University", "Algorithms", false)
        ns.atExit(() => { ns.singularity.stopAction() })
        while (ns.getPlayer().skills.hacking < _HACKING_TO_REACH) await ns.sleep(ONE_SECOND)
        writeback_success(ns)
    } catch (err) {
        writeback_failure(ns, err.message)
    }
}
