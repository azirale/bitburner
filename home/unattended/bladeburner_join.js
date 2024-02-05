import { ONE_SECOND } from "unattended/lib/real_constants.js"
import {
    BLADEBURNER_RANK_FOR_FACTION,
    HASHES_FOR_BLADEBURNER_RANK_PURCHASE
} from "unattended/lib/game_constants.js"
import { writeback_success, writeback_failure } from "unattended/lib/port_writeback.js"


/** @param {NS} ns */
export async function main(ns) {
    try {
        // should be able to join immediately -- caller should ensure stats are ok
        ns.bladeburner.joinBladeburnerDivision()
        // if we have enough rank already we can just join and bail
        if (ns.bladeburner.getRank() >= BLADEBURNER_RANK_FOR_FACTION) attempt_to_join(ns)
        // if not we need to buy rank with hacknet -- REQUIRES BITNODE STARTING HACKNET
        while (ns.hacknet.numHashes() < HASHES_FOR_BLADEBURNER_RANK_PURCHASE) await ns.sleep(ONE_SECOND)
        ns.hacknet.spendHashes("Exchange for Bladeburner Rank")
        // this gives 100 rank, which immediately pushes us past the threshold
        attempt_to_join(ns)
    } catch (err) {
        ns.tail()
        writeback_failure(ns, err.message)
    }
}

function attempt_to_join(ns) {
    let succeeded = ns.bladeburner.joinBladeburnerFaction()
    if (succeeded) writeback_success(ns)
    else writeback_failure(ns, "<<<JOIN FAILED SOMEHOW>>>")
    ns.exit()
}