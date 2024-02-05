const cities = ['Sector-12', 'Aevum', 'Volhaven', 'Chongqing', 'New Tokyo', 'Ishima'];

const category = {
    'general': 'General',
    'contracts': 'Contracts',
    'operations': 'Operations',
    'blackops': 'BlackOps'
}

/**
 * @typedef ActivityInfo
 * @property {String} category
 * @property {String} action
 * @property {Number} priority
 */
const activities = {
    'training': { 'category': 'General', 'action': 'Training', 'priority': 99 },
    'field_analysis': { 'category': 'General', 'action': 'Field Analysis', 'priority': 99 },
    'incite_violence': { 'category': 'General', 'action': 'Incite Violence', 'priority': 99 },
    'tracking': { 'category': 'Contracts', 'action': 'Tracking', 'priority': 8 },
    'retirement': { 'category': 'Contracts', 'action': 'Retirement', 'priority': 7 },
    'bounty_hunter': { 'category': 'Contracts', 'action': 'Bounty Hunter', 'priority': 6 },
    'investigation': { 'category': 'Operations', 'action': 'Investigation', 'priority': 5 },
    'undercover': { 'category': 'Operations', 'action': 'Undercover Operation', 'priority': 4 },
    'sting': { 'category': 'Operations', 'action': 'Sting Operation', 'priority': 3 },
    'stealth_retirement': { 'category': 'Operations', 'action': 'Stealth Retirement Operation', 'priority': 2 },
    'assassination': { 'category': 'Operations', 'action': 'Assassination', 'priority': 1 }
}

const blackops = [
    "Operation Typhoon",
    "Operation Zero",
    "Operation X",
    "Operation Titan",
    "Operation Ares",
    "Operation Archangel",
    "Operation Juggernaut",
    "Operation Red Dragon",
    "Operation K",
    "Operation Deckard",
    "Operation Tyrell",
    "Operation Wallace",
    "Operation Shoulder of Orion",
    "Operation Hyron",
    "Operation Morpheus",
    "Operation Ion Storm",
    "Operation Annihilus",
    "Operation Ultron",
    "Operation Centurion",
    "Operation Vindictus",
    "Operation Daedalus"
];

const last_blackop = "WORLD_DAEMON"

// stamina management
const stamina_go = { 'up': 1, 'down': -1 }
let stam_direction = stamina_go.up;
const high_stamina_threshold = 0.65;
const low_stamina_threshold = 0.5;

// script management
const loop_wait_time = 1000;
let current_city = 'none';

// settings for managing what upgrades to get when
const stamina_threshold_for_overclock = 400;
const max_overclock_levels = 90;


/**
 * @param {NS} ns Netscript object
 * 
 * Entry point that will run the full automation for bladeburner progression.
 * The main character will be busy with bladeburner activities, so jobs and training
 * will have to be done by synths, otherwise bladeburner must be turned off.
 **/
export async function main(ns) {
    // quicker reference to bladeburner
    organise_sleeves(ns);
    while (true) {
        // buy skill points to improve our success
        buy_skill_points(ns);
        // decide what to do
        do_some_action(ns);
        // log where we are at
        log_state_change(ns)
        // wait before looping back around
        await ns.sleep(loop_wait_time);
    }
}

let _LAST_SKILL_POINTS = 0
/**
 * @param {NS} ns Netscript module
 * 
 * Buys Bladeburner skills with skill points. First tries to guarantee basic activities
 * so that skills can be gained faster and more reliably. Then shifts to time efficiency
 * by making estimate accuracy actions faster, improving stamina total and regen, then
 * speed for all actions. Finally will target skills specific to blackops.
 */
function buy_skill_points(ns) {
    const bb = ns.bladeburner
    // go find the easiest city (by checking blackop) and go there
    go_to_easiest_city(ns)
    // try guarantee the easiest (stealth) contract
    if (get_action_estimate(ns, activities.tracking).upper < 1) {
        ns.print("Must train for Tracking")
        train_skills(ns, ["Blade's Intuition", "Cloak", "Tracer", "Reaper", "Evasive System"]);
        return;
    }
    // try to guarantee the easiest (combat) contract
    if (get_action_estimate(ns, activities.bounty_hunter).upper < 1) {
        ns.print("Must train for Bounty Hunter")
        train_skills(ns, ["Blade's Intuition", "Short-Circuit", "Tracer", "Reaper", "Evasive System"]);
        return
    }
    // if those contracts can be guaranteed focus on getting assassination to be guaranteed
    if (get_action_estimate(ns, activities.assassination).upper < 1) {
        ns.print("Must train for Assassination")
        train_skills(ns, ["Blade's Intuition", "Cloak", "Short-Circuit", "Digital Observer", "Reaper", "Evasive System"]);
        return
    }
    // if all ops can be guaranteed then start improving ancillary skills - these are non-exclusive
    // datamancer first to waste less time doing field analysis to get guaranteed successes
    const datamancer_limit = 20;
    while (bb.getSkillLevel('Datamancer') < datamancer_limit && bb.getSkillUpgradeCost('Datamancer') <= bb.getSkillPoints()) {
        bb.upgradeSkill('Datamancer');
        ns.print("Upgrading Datamancer");
    }
    // add some extra stamina until we hit 2x the stamina limit for overclock -- make it very likely to never need to regen
    while (bb.getStamina[1] < 4 * stamina_threshold_for_overclock && bb.getSkillUpgradeCost("Cyber's Edge") <= bb.getSkillPoints()) {
        bb.upgradeSkill("Cyber's Edge");
        ns.print("Upgrading Cyber's Edge");
    }
    // next up -- max out overclock
    while (bb.getSkillLevel('Overclock') < 90 && bb.getSkillUpgradeCost('Overclock') <= bb.getSkillPoints()) {
        bb.upgradeSkill('Overclock');
        ns.print("Upgrading Overclock");
    }
    // if all contracts/ops have guaranteed success, we have good datamancer, and good stamina, go for endgame success rates
    train_skills(ns, ["Blade's Intuition", "Digital Observer", "Reaper", "Evasive System"]);
}

/**
 * @param {NS} ns
 * @param {ActivityInfo} activity
 */
function get_action_estimate(ns, activity) {
    const [lower, upper] = ns.bladeburner.getActionEstimatedSuccessChance(activity.type, activity.action)
    return { "lower": lower, "upper": upper }
}

/**
 * @param {NS} ns Netscript module
 * @param {Array<String>} skill_list List of skill names to train, always goes for cheapest first
 * 
 * Provide a list of skills to train, and this will blow all skill points trying to train them as much
 * as possible, getting the cheapest skill each time. Automatically excludes certains kills that are
 * useless after certain thresholds.
 */
function train_skills(ns, skill_list) {
    const bb = ns.bladeburner
    // exclude overclock from the provided list if it is capped out
    if (bb.getSkillLevel('Overclock') >= max_overclock_levels && skill_list.includes('Overclock')) {
        excise_skill(skill_list, 'Overclock');
    }
    // exclude stamina boost from the list once we have good enough stamina
    if (bb.getStamina()[1] > stamina_threshold_for_overclock * 3) {
        excise_skill(skill_list, "Cyber's Edge");
    }
    // sort for the cheapest skill to train right now
    let cheapest_skill = get_cheapest_skill(ns, skill_list);
    while (bb.getSkillUpgradeCost(cheapest_skill) <= bb.getSkillPoints(cheapest_skill)) {
        bb.upgradeSkill(cheapest_skill);
        ns.print(`Upgrading ${cheapest_skill}`);
        cheapest_skill = get_cheapest_skill(ns, skill_list);
    }
}

/**
 * @param {Array<string>} skill_list
 * @param {String} excise
 * 
 * Remove a skill from a provided list of skills. Used to exclude a skill from training.
 **/
function excise_skill(skill_list, excise) {
    if (skill_list.includes(excise)) {
        skill_list.splice(skill_list.indexOf(excise), 1);
    }
}

/**
 * @param {NS} ns Netscript module
 * @param {Bladeburner} bb Bladeburner module
 * @param {Array<String>} skill_list List of skill names to pick from
 * 
 * Finds the cheapest skill to train now and returns it.
 */
function get_cheapest_skill(ns, skill_list) {
    const bb = ns.bladeburner
    skill_list.sort((a, b) => bb.getSkillUpgradeCost(a) - bb.getSkillUpgradeCost(b));
    return skill_list[0];
}

/** @param {NS} ns */
function do_some_action(ns) {
    // first we will check if we need to swap stamina mode
    const stamina_ratio = get_stamina_ratio(ns);
    // if we are over the high cap set stamina to go down
    if (stamina_ratio >= high_stamina_threshold) {
        stam_direction = stamina_go.down;
        ns.print('Swapping to stamina consumption');
    }
    // if we are below the low cap set stamina to go up
    else if (stamina_ratio <= low_stamina_threshold) {
        stam_direction = stamina_go.up;
        ns.print('Swapping to stamina regeneration');
    }
    // now do an action based on stam_direction
    if (stam_direction == stamina_go.up) {
        do_non_stamina_action(ns);
    }
    else {
        do_stamina_action(ns)
    }
}

/** @param {NS} ns */
function get_stamina_ratio(ns) {
    const bb = ns.bladeburner
    const [stamina_now, stamina_max] = bb.getStamina();
    const stamina_ratio = stamina_now / stamina_max;
    return stamina_ratio;
}

/** @param {NS} ns */
function do_non_stamina_action(ns) {
    ns.print("Regenerating stamina - choosing an action that does not consume stamina");
    let estimate = go_to_innaccurate_city(ns)
    // if the "worst" has a non-zero score then do field-analysis
    if (estimate.innaccuracy > 0) set_activity(ns, activities.field_analysis.type, activities.field_analysis.action)
    // otherwise do training to up stats and stamina, so that we can do more contracts
    // we stay wherever we are - it doesn't really matter
    else set_activity(ns, activities.training.type, activities.training.action)
}

/**
 * @param {NS} ns
 * @param {String} action_type
 * @param {String} action_name
 */
function set_activity(ns, action_type, action_name) {
    const current_action = ns.bladeburner.getCurrentAction()
    ns.print(`doing ... ${current_action.name}`)
    ns.print(`want to do ... ${action_name}`)
    if (current_action.name == action_name) {
        ns.print(`Already doing ${action_type}→${action_name}`)
        return
    }
    ns.bladeburner.startAction(action_type, action_name)
    ns.print(`Changed to ${action_type}→${action_name}`)
    //log(`Changed to ${action_type}→${action_name}`)
}








// NEEDS DEV WORK
/**
 * @param {NS} ns
 */
function do_stamina_action(ns) {
    const bb = ns.bladeburner
    // go to the 
    ns.print("Consuming stamina - Choosing best activity to do");
    // check next blackop first in case we can exit the node immediately
    let next_blackop = get_next_blackop(ns)
    ns.print(`Next blackop is ${next_blackop}`)
    if (next_blackop == last_blackop) destroy_world(ns)
    // otherwise go to easiest city and see what we can do
    go_to_easiest_city(ns)
    if (ns.bladeburner.getActionEstimatedSuccessChance(category.blackops, next_blackop)[0] == 1) {
        set_activity(ns, category.blackops, next_blackop)
        ns.print(`Can guarantee ${next_blackop} → will do that`)
        return
    }
    ns.print(`Cannot guarantee ${next_blackop}`)
    // this is the order that we want to do activities in
    const activity_order_preference = [
        // ops
        activities.assassination,
        activities.stealth_retirement,
        activities.sting,
        activities.undercover,
        activities.investigation,
        // contracts
        activities.bounty_hunter,
        activities.retirement,
        activities.tracking
    ];
    // go down the logic in order of activity preference
    for (const activity of activity_order_preference) {
        // if we do not have any available we can just skip
        if (bb.getActionCountRemaining(activity.type, activity.action) <= 0) {
            ns.print(`Skipping ${activity.action} because it has 0 available`);
            continue;
        }
        // check if the low end of estimate is 100%
        if (get_action_estimate(ns, activity).lower < 1) {
            ns.print(`Cannot guarantee ${activity.action}`)
            continue
        }
        // otherwise this activity is guaranteed
        ns.print(`Can guarantee ${activity.action} → will do this now`)
        set_activity(ns, activity.type, activity.action)
        return
    }
    ns.print(`Could not find any stamina drain activity to do`)
    do_non_stamina_action(ns)
}


/**
 * @typedef CityEstimate
 * @property {String} city
 * @property {Number} lower_bound
 * @property {Number} upper_bound
 * @property {Number} middle_bound
 * @property {Number} innaccuracy
 */

class CityEstimate {
    /**
     * @param {String} city
     * @param {Number} lower_bound
       * @param {Number} upper_bound
     */
    constructor(city, lower_bound, upper_bound) {
        this.city = city
        this.lower_bound = lower_bound
        this.upper_bound = upper_bound
    }

    get middle_bound() {
        return (this.upper_bound + this.lower_bound) / 2
    }

    get innaccuracy() {
        return this.upper_bound - this.lower_bound
    }
}

/** @param {NS} ns */
function get_city_estimates(ns) {
    let blackop = get_next_blackop(ns)
    let estimates = cities.map((city) => {
        ns.bladeburner.switchCity(city)
        const [lower, upper] = ns.bladeburner.getActionEstimatedSuccessChance(category.blackops, blackop)
        const estimate = new CityEstimate(city, lower, upper)
        return estimate
    })
    return estimates
}


/** @param {NS} ns */
function get_next_blackop(ns) {
    const bb = ns.bladeburner
    for (let blackop of blackops) {
        let action_available_count = bb.getActionCountRemaining("BlackOps", blackop)
        if (action_available_count > 0) {
            return blackop
        }
    }
    // if we did not find it in the list it should be the last one -- it is not provided by the module
    return last_blackop
}

/**
 * @param {NS} ns
 */
function destroy_world(ns) {
    log(ns, "DESTROY WORLD")
    ns.killall()
    ns.spawn('/destroy.js')
    ns.exit()
}

/**
 * @param {NS} ns
 * Sleeve management for bladeburner
 */
function organise_sleeves(ns) {
    let base_sleeve_actions = [
        { "id": 0, "action": "Training" },
        { "id": 1, "action": "Training" },
        { "id": 2, "action": "Training" },
        { "id": 3, "action": "Training" },
        { "id": 4, "action": "Field Analysis" },
        { "id": 5, "action": "Field Analysis" },
        { "id": 6, "action": "Infiltrate Synthoids" },
        { "id": 7, "action": "Diplomacy" },
    ]
    for (let set_action of base_sleeve_actions) {
        ns.sleeve.setToBladeburnerAction(set_action.id, set_action.action)
    }
}

/** @param {NS} ns */
function go_to_easiest_city(ns) {
    const estimates = get_city_estimates(ns)
    estimates.sort((a, b) => { return b.lower_bound - a.lower_bound })
    ns.bladeburner.switchCity(estimates[0].city)
    return estimates[0]
}

function go_to_innaccurate_city(ns) {
    const estimates = get_city_estimates(ns)
    estimates.sort((a, b) => { return a.innaccuracy - b.innaccuracy })
    ns.bladeburner.switchCity(estimates[0].city)
    return estimates[0]
}


/** @param {NS} ns @param {String} text */
function log(ns, text) {
    const logfile = "/log/bladeburner_auto.txt"
    ns.write(logfile, text + "\n", "a")
}


let _previous_rank = 0
let _previous_action = ''
/** @param {NS} ns */
function log_state_change(ns) {
    let current_rank = Math.floor(ns.bladeburner.getRank())
    let current_action = ns.bladeburner.getCurrentAction().name
    if (current_rank == _previous_rank && current_action == _previous_action) return;
    _previous_action = current_action
    _previous_rank = current_rank
    let next_blackop = get_next_blackop(ns)
    let [low, high] = ns.bladeburner.getActionEstimatedSuccessChance(category.blackops, next_blackop)
    let mid = (low + high) / 2
    log(ns, JSON.stringify({
        "time": Date.now(),
        "rank": current_rank,
        "action": current_action,
        "next_blackop": next_blackop,
        "blackop_chance": mid
    }))
}
