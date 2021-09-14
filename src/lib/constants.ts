// these might change with different versions of the game but probably not
/** Hostname of the home server */
export const home_host = 'home';
/** Hostname of the darkweb -- can use this to check if TOR has already been purchased */
export const darkweb_host = 'darkweb';
/** Object of port opening program names and their pertinent details */
export const port_programs = {
	'BruteSSH.exe':  { 'cost':    500000 }, //     500K
	'FTPCrack.exe':  { 'cost':   1500000 }, //   1.5M
	'relaySMTP.exe': { 'cost':   5000000 }, //   5M
	'HTTPWorm.exe':  { 'cost':  30000000 }, //  30M
	'SQLInject.exe': { 'cost': 250000000 }  // 250M
}
/** The cost to buy TOR router */
export const tor_cost = 200000; // 200K

// these might be rebalanced or change between bitnodes
/** Amount by which weaken() will LOWER security per thread */
export const weak_security = 0.05;
/** Amount by which grow() will RAISE security per thread */
export const grow_security = 0.04;
/** Amount by which hack() will RAISE security per thread */
export const hack_security = 0.02;
/** Maximum number of servers we can have */
export const server_limit = 25;

// real world constants
/** One second in milliseconds -- makes sleep/wait times more sensible to read */
export const one_second = 1000;
/** One minute in milliseconds -- makes sleep/wait times more sensible to read */
export const one_minute = 60*one_second;

// my personal constant values
/** All my servers are prefixed with this string so it is easy to detect which are mine or not */
export const my_server_prefix = 'jace';
/** Name of the basic looped grow script */
export const grow_script = 'grow.js';
/** Name of the basic looped hack script */
export const hack_script = 'hack.js';
/** Name of the basic looped weaken script */
export const weak_script = 'weaken.js';
