import { HOME_HOST } from "unattended/lib/game_constants.js"

/** @param {NS} ns */
export async function main(ns) {
    try {
        await backdoor(ns, ns.args[0])
        //writeback_success(ns)
    } catch (err) {
        ns.tprint(`ERROR:\n===== BACKDOOR FAILED =====\n${err.message}\nargs=${JSON.stringify(ns.args)}`)
        //writeback_failure(ns, `ERROR: ${err.message}`)
    }
}

/**
 * @param {NS} ns
 * @param {String} where_we_are starting host
 * @param {String} where_we_are_going ending host
 * @param {Array} where_we_have_been hosts already visited
 * 
 * This does a recursive search to find the path from one host to another
 */
function trace(ns, where_we_are, where_we_are_going, where_we_have_been = []) {
    // mark this spot on the path
    where_we_have_been.push(where_we_are);
    // if we landed on the target immediately return complete path
    if (where_we_are == where_we_are_going) return where_we_have_been
    // otherwise keep searching through connected hosts
    else {
        let where_we_can_go = ns.scan(where_we_are);
        for (let where_to_go_next of where_we_can_go) {
            // do not backtrack
            if (where_we_have_been.includes(where_to_go_next)) continue;
            // recursively follow this path
            let follow_where_to_go_next = trace(ns, where_to_go_next, where_we_are_going, where_we_have_been);
            // if we found something pass it back up the chain, it will have the path to get to target
            if (follow_where_to_go_next != null) return follow_where_to_go_next
        }
    }
    // we did not find anything from here, so take this location off the path
    where_we_have_been.pop()
    return null;
}

/**
 * @param {NS} ns
 * @param {String} target_host
 */
async function backdoor(ns, target_host) {
    let path = trace(ns, HOME_HOST, target_host)
    for (let step of path) {
        ns.singularity.connect(step)
    }
    ns.tprint(`===== BACKDOOR→${target_host} : STARTED =====`)
    await ns.singularity.installBackdoor()
    ns.singularity.connect(HOME_HOST)
    ns.tprint(`===== BACKDOOR→${target_host} : COMPLETED =====`)
}


/** @param {NS} ns */
function get_hostnames(ns) {
    [].forEach()
    let hosts = ["home"];
    for (let i = 0; i < hosts.length; i++)
        hosts.push(...ns.scan(hosts[i]).filter((host) => !hosts.includes(host)))
    return hosts
}