// GENERATED FILE -- SEE 'stanek_prep.js'
const frags = [
    {
        "id": 0,
        "x": 4,
        "y": 0,
        "rotation": 0
    },
    {
        "id": 1,
        "x": 5,
        "y": 1,
        "rotation": 3
    },
    {
        "id": 5,
        "x": 2,
        "y": 1,
        "rotation": 2
    },
    {
        "id": 12,
        "x": 2,
        "y": 0,
        "rotation": 2
    },
    {
        "id": 7,
        "x": 5,
        "y": 3,
        "rotation": 3
    },
    {
        "id": 16,
        "x": 3,
        "y": 4,
        "rotation": 2
    },
    {
        "id": 10,
        "x": 2,
        "y": 3,
        "rotation": 0
    },
    {
        "id": 6,
        "x": 0,
        "y": 0,
        "rotation": 3
    },
    {
        "id": 20,
        "x": 1,
        "y": 0,
        "rotation": 3
    },
    {
        "id": 14,
        "x": 0,
        "y": 4,
        "rotation": 0
    }
]

export async function main(ns) {
    while (true) {
        for (let frag of frags) {
            // skip boosters
            if (frag.id >= 100) continue
            ns.print(`Charging ${frag.id}@${frag.x},${frag.y}`)
            await ns.stanek.chargeFragment(frag.x, frag.y)
        }
    }
}
