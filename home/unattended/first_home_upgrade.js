import { writeback_success, writeback_failure } from "unattended/lib/port_writeback.js"
import { ONE_SECOND } from "unattended/lib/real_constants.js"
import {
    HASHES_FOR_MONEY_PURCHASE,
    HACKNET_SPEND_FOR_MONEY_NAME,
    HOME_HOST
} from "unattended/lib/game_constants.js"

const _UPGRADE_HOME_RAM_UNTIL_GB = 512

/** @param {NS} ns */
export async function main(ns) {
    try {
        // until we hit our threshold
        while (ns.getServer(HOME_HOST).maxRam < _UPGRADE_HOME_RAM_UNTIL_GB) {
            // convert hashes to money
            while (ns.hacknet.numHashes() >= HASHES_FOR_MONEY_PURCHASE) ns.hacknet.spendHashes(HACKNET_SPEND_FOR_MONEY_NAME)
            // try upgrade -- just returns false if there is not enough money
            ns.singularity.upgradeHomeRam()
            // give it some time
            await ns.sleep(ONE_SECOND)
        }
        writeback_success(ns, "UPGRADED_HOME_RAM")
    }
    catch (err) {
        ns.tail()
        writeback_failure(ns, err.message)
    }
}
