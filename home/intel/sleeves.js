// Make the sleeves push bladeburner operations count
// they rotate so that idle sleeves will generate boost cycles

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep")
    ns.tail()
    // infiltrate work does not do next completion so we have to monitor directly
    const num_sleeves = 8
    let active = 0
    for (let i = 0; i < num_sleeves; i++) ns.sleeve.setToIdle(i)
    while (true) {
        ns.sleeve.setToBladeburnerAction(active, "Infiltrate Synthoids")
        ns.print(`Set ${active} to infiltrate`)
        await ns.sleep(60100) // wait time is usual action duration plus a small buffer
        ns.sleeve.setToIdle(active)
        active = (active + 1) % num_sleeves

    }
}