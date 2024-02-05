const _ONE_SECOND = 1000
const _HOME_HOST = "home"
const _DARKWEB_HOST = "darkweb"
const _TOR_COST = 400e3
const _PORT_PROGRAMS = [
    { "id": "ssh", "name": "BruteSSH.exe", "cost": 500e3 },
    { "id": "ftp", "name": "FTPCrack.exe", "cost": 1.5e6 },
    { "id": "relay", "name": "relaySMTP.exe", "cost": 5e6 },
    { "id": "http", "name": "HTTPWorm.exe", "cost": 30e6 },
    { "id": "sql", "name": "SQLInject.exe", "cost": 250e6 }
]

/** @param {NS} ns */
export async function main(ns) {
    // do we already have tor?
    let have_tor = ns.scan(_HOME_HOST).findIndex((host) => { host == _DARKWEB_HOST }) > -1
    // if not keep checking if we can buy it, then update
    while (!have_tor) {
        await ns.sleep(_ONE_SECOND)
        let got_tor = ns.singularity.purchaseTor()
        if (got_tor) {
            have_tor = true
            ns.tprint(`===== BOUGHT TOR =====`)
        }
    }
    // guarantee programs
    let need_any_program = true
    while (need_any_program) {
        await ns.sleep(_ONE_SECOND)
        // invert this and set back to true if needed -- will automatically end loop once all purchased
        need_any_program = false
        for (let program of _PORT_PROGRAMS) {
            let need_this_program = !ns.fileExists(program.name, _HOME_HOST)
            if (need_this_program) {
                let got_program = ns.singularity.purchaseProgram(program.name)
                if (got_program) {
                    ns.tprint(`===== BOUGHT ${program.name} =====`)
                }
                else {
                    need_any_program = true
                }
            }
        }
    }
    ns.tprint(`===== ALL PORT OPENERS ACQUIRED =====`)
}
