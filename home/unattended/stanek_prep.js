/**
 * @typedef FragData
 * @prop {Number} id
 * @prop {Number} x
 * @prop {Number} y
 * @prop {Number} rotation
 */

/** @param {NS} ns @param */
export async function main(ns) {
	try {
		/** @type {Array<FragData>} */
		ns.stanek.acceptGift()
		let target_json = ns.args[0]
		let target_frags = JSON.parse(target_json)
		let current_frags = ns.stanek.activeFragments()
		// since this script forces a particular board, it can also overwrite the charger script
		// this avoids having to pass the frag settings around -- just run the script directly
		write_charger_script(ns, target_frags)
		let message = ""
		if (!settings_match(target_frags, current_frags)) {
			reset_board(ns, target_frags)
			message = `Updated board to ${target_json}`
		}
		else {
			message = "Board already matches target"
		}
		ns.writePort(ns.pid, JSON.stringify({ "status": "SUCCESS", "message": message }))
	} catch (e) {
		ns.writePort(ns.pid, JSON.stringify({ "status": "FAILURE", "message": message }))
	}
}

/**
 * @param {Array<FragData>} a
 * @param {Array<FragData>} b
 */
function settings_match(a, b) {
	if (a.length != b.length) return false;
	a.sort((a, b) => { return frag_sort_value(a) - frag_sort_value(b) })
	b.sort((a, b) => { return frag_sort_value(a) - frag_sort_value(b) })
	for (let i = 0; i < a.length; i++) {
		let a_frag = a[i]
		let b_frag = b[i]
		if (!frags_match(a_frag, b_frag)) {
			return false
		}
	}
	return true
}

/**
 * @param {FragData} frag
 */
function frag_sort_value(frag) {
	return frag.x * 1000 + frag.y
}

/**
 * @param {FragData} a
 * @param {FragData} b
 */
function frags_match(a, b) {
	return (
		a.id == b.id
		&& a.x == b.x
		&& a.y == b.y
		&& a.rotation == b.rotation
	)
}

/**
 * @param {NS} ns
 * @param {Array<FragData>} target_settings
 */
function reset_board(ns, target_settings) {
	ns.stanek.clearGift()
	for (let frag of target_settings) {
		ns.stanek.placeFragment(frag.x, frag.y, frag.rotation, frag.id)
	}
}

/**
 * @param {NS} ns
 * @param {Array<FragData>} frags
 */
function write_charger_script(ns, frags) {
	let path = "/unattended/stanek_charger.js"
	let lines = [
		"// GENERATED FILE -- SEE 'stanek_prep.js'",
		"const frags = " + JSON.stringify(frags, null, 2),
		"",
		"export async function main(ns) {",
		"  while (true) {",
		"    for (let frag of frags) {",
		"      // skip boosters",
		"      if (frag.id >= 100) continue",
		"      ns.print(`Charging ${frag.id}@${frag.x},${frag.y}`)",
		"      await ns.stanek.chargeFragment(frag.x,frag.y)",
		"    }",
		"  }",
		"}",
	]
	let content = ""
	for (let line of lines) {
		content += line + "\n"
	}
	ns.write(path, content, "w")
}