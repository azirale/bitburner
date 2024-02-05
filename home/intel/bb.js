// Automates bladeburner to generate intelligence
// You will need to get absurd base stats first to truly enable this

const Actions = {
    "assassination": { "type": "Operations", "name": "Assassination" },
    "diplomacy": { "type": "General", "name": "Diplomacy" },
    "incite": { "type": "General", "name": "Incite Violence" }
}

const Mode = {
    "build": 1,
    "drain": -1
}
let mode = Mode.drain;

/** @param {NS} ns */
export async function main(ns) {
    ns.tail()
    ns.disableLog('sleep')
    ns.disableLog('bladeburner.upgradeSkill')
    ns.clearLog()
    ns.atExit(() => ns.bladeburner.startAction("General", "Incite Violence"))
    let prev_xp = ns.getPlayer().exp.intelligence

    while (true) {
        await ns.bladeburner.nextUpdate()
        let new_xp = ns.getPlayer().exp.intelligence
        let xp_gain = new_xp - prev_xp
        prev_xp = new_xp
        // always skillup
        do_skillup(ns)
        // report xp gain
        if (xp_gain > 0) ns.print(`Gained ${ns.formatNumber(xp_gain)} xp`)
        // run action logic
        if (mode == Mode.build) build_logic(ns)
        else drain_logic(ns)
    }
}

/** @param {NS} ns */
function build_logic(ns) {
    if (ns.bladeburner.getActionCountRemaining(Actions.assassination.type, Actions.assassination.name) > 1000) mode = Mode.drain
    else start_action_if_not_doing(ns, Actions.incite)
}

/** @param {NS} ns */
function drain_logic(ns) {
    if (ns.bladeburner.getCityChaos(ns.bladeburner.getCity()) > 1) start_action_if_not_doing(ns, Actions.diplomacy)
    else if (ns.bladeburner.getActionCountRemaining(Actions.assassination.type, Actions.assassination.name) <= 0) mode = Mode.build
    else start_action_if_not_doing(ns, Actions.assassination)
}

/** @param {NS} ns @param */
function start_action_if_not_doing(ns, action) {
    const current_action = ns.bladeburner.getCurrentAction()
    if (current_action.name == action.name) return
    ns.print(`Swapping to ${action.type}→${action.name}`)
    ns.bladeburner.startAction(action.type, action.name)
}

/** @param {NS} ns @param */
function do_skillup(ns) {
    let skillpoints = ns.bladeburner.getSkillPoints()
    let single_cost = ns.bladeburner.getSkillUpgradeCost("Hyperdrive", 1)
    // cannot get any -- bail
    if (single_cost > skillpoints) return
    // initial estimate, should be a little over
    let estimate = Math.floor(skillpoints / single_cost)
    // binary search for a good value - stop if the average of lower&upper is equal to either
    let lower_bound = 0
    let upper_bound = estimate * 100
    let steps = 0
    while (steps < 10000) {
        steps++
        let cost = ns.bladeburner.getSkillUpgradeCost("Hyperdrive", estimate)
        if (cost < skillpoints) lower_bound = estimate
        else upper_bound = estimate
        estimate = Math.floor(upper_bound / 2 + lower_bound / 2)
        if (estimate == lower_bound || estimate == upper_bound) break
    }
    if (estimate > 0) {
        ns.print(`Upgrading Hyperdrive ${ns.formatNumber(estimate)} times`)
        ns.print(`Found skillup amount in ${steps} steps`)
        let final_cost = ns.bladeburner.getSkillUpgradeCost("Hyperdrive", estimate)
        let pct = final_cost / skillpoints
        ns.print(`Spending ${ns.formatNumber(final_cost)} / ${ns.formatNumber(skillpoints)} (${ns.formatPercent(pct)})`)
        ns.bladeburner.upgradeSkill("Hyperdrive", estimate)
    }
}