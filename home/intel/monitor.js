// reports intelligence xp gain over time

const _ONE_SECOND = 1000

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep")
    ns.tail()
    const measures = []
    while (true) {
        await ns.sleep(1000)
        measures.unshift({ 'xp': ns.getPlayer().exp.intelligence, 't': Date.now() })
        if (measures.length < 60) continue
        let one_min = measures.pop()
        let ten_sec = measures[10]
        let one_sec = measures[1]
        let now = measures[0]
        let one_sec_rate = get_xp_persec(one_sec, now)
        let ten_sec_rate = get_xp_persec(ten_sec, now)
        let one_min_rate = get_xp_persec(one_min, now)
        ns.print(`${ns.formatNumber(one_sec_rate)}xp/s :: ${ns.formatNumber(ten_sec_rate)}xp/s :: ${ns.formatNumber(one_min_rate)}xp/s`)
    }
}


/**
 * @typedef Measure
 * @property {Number} xp
 * @property {Number} t
 */

/**
 * @param {Measure} then
 * @param {Measure} now
 */
function get_xp_persec(then, now) {
    return (now.xp - then.xp) / (now.t - then.t) * _ONE_SECOND
}