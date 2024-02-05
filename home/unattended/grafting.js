const hacking_aug_order = [
    // remove penalty
    "nickofolas Congruity Implant",
    // enormous hacking for money
    "QLink",
    // big hacking for money
    "Unstable Circadian Modulator",
    // good hack boosts available early , only gen 5 is eventually great
    "Cranial Signal Processors - Gen I",
    "Cranial Signal Processors - Gen II",
    "Cranial Signal Processors - Gen III",
    "Cranial Signal Processors - Gen IV",
    "Cranial Signal Processors - Gen V",
]

const combat_aug_order = [
    // these are our agility/combat upgrades -- agility is prioritised
    "The Blade's Simulacrum", // need this first so we can keep grafting while in bb
    "Bionic Legs",
    "Graphene Bionic Legs Upgrade",
    "SPTN-97 Gene Modification",
    "Bionic Spine",
    "Graphene Bionic Spine Upgrade",
    "CordiARC Fusion Reactor",
    "Synthetic Heart",
    "Photosynthetic Cells",
    "Xanipher",
    "nextSENS Gene Modification",
    "Bionic Arms",
    "Graphene Bionic Arms Upgrade",
    "Graphene Bone Lacings",
    "NEMEAN Subdermal Weave",
    "Neotra",
    "HyperSight Corneal Implant",
    "Hydroflame Left Arm",
    "BrachiBlades",
    "Graphene BrachiBlades Upgrade",
    "Synfibril Muscle",
    "Power Recirculation Core",
    "HemoRecirculator",
    "LuminCloaking-V1 Skin Implant",
    "LuminCloaking-V2 Skin Implant",
    "Augmented Targeting I",
    "Augmented Targeting II",
    "Augmented Targeting III",
    "Combat Rib I",
    "Combat Rib II",
    "Combat Rib III",
    "GOLEM Serum",
    "Blade's Runners",
    "DermaForce Particle Barrier",
    "Nanofiber Weave"
]

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep")
    ns.disableLog("grafting.graftAugmentation")
    ns.clearLog()
    ns.tail()
    while (true) {
        // chill for a bit first -- in case we end loop early
        await ns.sleep(1000)
        // skip if currently busy
        if (ns.singularity.isBusy()) continue
        let target_augs
        if (!have_cleanser(ns)) {
            ns.print("Acquiring Hacking-like Augs")
            target_augs = hacking_aug_order
        }
        else {
            ns.print("Acquiring Combat-like Augs")
            target_augs = combat_aug_order
        }
        target_augs = augs_without_owned(ns, target_augs)
        // if there is nothing in there - just bail
        if (target_augs.length == 0) {
            //target_augs = ns.grafting.getGraftableAugmentations()
            ns.exit()
        }
        // try grafting each aug in priority order
        for (let augname of target_augs) {
            // if it works (prereqs met, enough money) then break from trying to start and wait until not busy
            ns.singularity.travelToCity("New Tokyo")
            let started_grafting = ns.grafting.graftAugmentation(augname, false)
            ns.print(`STARTED GRAFTING ${augname}`)
            if (started_grafting || ns.singularity.isBusy()) break
        }
    }
}

/** @param {NS} ns */
function have_cleanser(ns) {
    const owned_augs = ns.singularity.getOwnedAugmentations(true)
    return owned_augs.includes("nickofolas Congruity Implant")
}

/** @param {NS} ns @param {Array<String>} augs */
function augs_without_owned(ns, augs) {
    const owned_augs = ns.singularity.getOwnedAugmentations(true)
    return augs.filter((a) => !owned_augs.includes(a))
}