import { ONE_SECOND } from "unattended/lib/real_constants.js"
import { writeback_success, writeback_failure } from "unattended/lib/port_writeback.js"

// CONFIGURABLE
const _GYM_TO_USE = "Powerhouse Gym"
const _TRAINING_SKILLS = [ // in training order
    { "code": "agi", "name": "agility", "threshold": 100 },
    { "code": "dex", "name": "dexterity", "threshold": 100 },
    { "code": "def", "name": "defense", "threshold": 100 },
    { "code": "str", "name": "strength", "threshold": 100 },
]


/** @param {NS} ns */
export async function main(ns) {
    try {
        ns.atExit(() => { ns.singularity.stopAction() })
        // while stanek is charging up we will be training the required combat stats
        for (const skill of _TRAINING_SKILLS) {
            // already have enough of this stat
            if (ns.getPlayer().skills[skill.name] >= skill.threshold) continue
            // train it and wait for it to get high enough
            ns.singularity.gymWorkout(_GYM_TO_USE, skill.code, false)
            while (ns.getPlayer().skills[skill.name] < skill.threshold) { await ns.sleep(ONE_SECOND) }
            ns.print(`Done training ${skill.name} @ ${Date.now()}`)
        }
        writeback_success(ns)
    } catch (err) {
        ns.tail()
        writeback_failure(ns, err.message)
    }
}
