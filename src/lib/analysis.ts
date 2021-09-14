import * as t from './types';
import * as consts from './constants';
import * as calc from './calcs'

export class Analysis {
    /** Cached ns so we do not have to pass it around */
    readonly ns:t.Netscript;
    /** The targeted server */
    readonly target: string
    /** Max money on the targeted server */
    readonly max_money: number
    /** Ram available to this analysis */
    readonly ram_available: number
    /** Ram used per thread for the grow script */
    readonly grow_ram: number
    /** Ram used per thread for the hack script */
    readonly hack_ram: number
    /** Ram used per thread for the weak script */
    readonly weak_ram: number
    /** Decimal percentage of money taken per hack thread */
    readonly hack_pct_ea: number
    /** Decimal percentage of money grown per grow thread */
    readonly grow_pct_ea: number
    /** How long it takes for grow to complete (in seconds) */
    readonly grow_time: number
    /** How long it takes for hack to complete (in seconds) */
    readonly hack_time: number
    /** How long it takes for weak to complete (in seconds) */
    readonly weak_time: number
    /** How many grow threads this analysis came to */
    public get grow_threads() { return this._grow_threads; }
    private _grow_threads: number
    /** How many hack threads this analysis came to */
    public get hack_threads() { return this._hack_threads; }
    private _hack_threads: number
    /** How many weak threads this analysis came to */
    public get weak_threads() { return this._weak_threads; }
    private _weak_threads: number
    /** Last known good state that will be checkpointed during optimisation */
    private readonly checkpoint = {
        grow_threads: 0,
        hack_threads: 0,
        weak_threads: 0
    }
    /** Most efficient thread state found */
    private readonly most_efficient = {
        grow_threads: 0,
        hack_threads: 0,
        weak_threads: 0,
        efficiency: 0
    }
    /** Highest income thread state found */
    private readonly highest_income = {
        grow_threads: 0,
        hack_threads: 0,
        weak_threads: 0
    }
    /** Optimisation end case */
    public get end_condition() { return this._end_condition; }
    private _end_condition = 'none yet';
    /** Weaken rate is multiplied by this as a safety factor to help ensure minimum security */
    private readonly weak_sec_safety_bias = 0.9;
    /** The maximum percent of cash we are willing to take before considering it a bad investment */
    private readonly max_hack_pct = 0.95; // if we can take 95% that is enough, not worth squeezing out more
    /** Create a new analysis against a target server with a set amount of ram available */
    constructor(ns: t.Netscript, target: string, ram_available: number) {
        this.ns = ns;
        this.target = target;
        this.ram_available = ram_available;
        this.max_money = ns.getServerMaxMoney(target);
        this.grow_ram = ns.getScriptRam(consts.grow_script, consts.home_host);
        this.hack_ram = ns.getScriptRam(consts.hack_script, consts.home_host);
        this.weak_ram = ns.getScriptRam(consts.weak_script, consts.home_host);
        this.hack_pct_ea = ns.hackAnalyzePercent(target) / 100; // convert percentage form to decimal form
        this.grow_pct_ea = calc.growth_per_thread(ns, this.target);
        this.grow_time = ns.getGrowTime(target);
        this.hack_time = ns.getHackTime(target);
        this.weak_time = ns.getWeakenTime(target);
        // initialise threads to 1
        this._hack_threads = 1;
        this._grow_threads = 1;
        this._weak_threads = 1;
        // call optimise to get best thread counts
        this.optimise();
    }

    /** The actual amount of ram required for this analysis */
    get ram_required(): number {
        return (
            this.grow_ram * this.grow_threads
            + this.hack_ram * this.hack_threads
            + this.weak_ram * this.weak_threads
        );
    }
    get exceeds_available_ram(): boolean { return this.ram_required > this.ram_available; }
    get hack_pct_total() { return calc.total_hack_for_threads(this.hack_pct_ea, this.hack_threads); }
    get grow_pct_total() { return calc.total_growth_for_threads(this.grow_pct_ea, this.grow_threads); }
    get hack_sec_rate() { return this.hack_threads / this.hack_time * consts.hack_security; }
    get grow_sec_rate() { return this.grow_threads / this.grow_time * consts.grow_security; }
    get weak_sec_rate() { return this.weak_threads / this.weak_time * consts.weak_security * this.weak_sec_safety_bias; }
    get net_sec_rate() { return this.hack_sec_rate + this.grow_sec_rate - this.weak_sec_rate; }
    get hacks_per_grow() { return this.grow_time / this.hack_time; }
    get hack_avg_remain_pct() { return Math.pow(1 - this.hack_pct_total, this.hacks_per_grow); }
    get max_hacks_per_grow() { return Math.ceil(this.hacks_per_grow); }
    get hack_min_remain_pct() { return Math.pow(1 - this.hack_pct_total, this.max_hacks_per_grow); }
    get needs_more_grow() { return this.hack_min_remain_pct * this.grow_pct_total < 1; }
    get hack_absurdly_high() { return this.hack_min_remain_pct < (1 - this.max_hack_pct); }
    get needs_more_weaken() { return this.net_sec_rate > 0; }

    /** When optimiser is in good state set checkpoint to return to if hitting a bad state */
    set_checkpoint() {
        this.checkpoint.grow_threads = this.grow_threads;
        this.checkpoint.hack_threads = this.hack_threads;
        this.checkpoint.weak_threads = this.weak_threads;
    }

    /** Restores the stored checkpoint of good state */
    restore_checkpoint() {
        this._grow_threads = this.checkpoint.grow_threads;
        this._hack_threads = this.checkpoint.hack_threads;
        this._weak_threads = this.checkpoint.weak_threads;
    }

    /** Rough estimate on how much money will be earned per second */
    get income() { return this.max_money * (1 - this.hack_avg_remain_pct) / this.grow_time; }
    /** Ratio of income to ram requirements */
    get income_per_ram() { return this.income / this.ram_required; }

    /** This optimises the analysis according to its input settings */
    optimise() {
        let loops = 0;
        optimisation_loop: while (true) {
            // emergency break
            loops++;
            if (loops > 1e7) {
                this._end_condition = 'infinite loop';
                break optimisation_loop;
            }
            // last known good state
            this.set_checkpoint();
            // try up hacks - potentially pushing into bad state
            this._hack_threads++;
            // if we exceeded ram we are capped out so bail
            if (this.exceeds_available_ram) {
                this.restore_checkpoint();
                this._end_condition = 'ram limit - hack';
                break optimisation_loop;
            }
            // if we exceeded money limit then bail
            if (this.hack_absurdly_high) {
                this.restore_checkpoint();
                this._end_condition = 'money limit';
                break optimisation_loop;
            }
            // if our growth is too low then up our growth until we are back into a good growth state
            growth_loop: while (this.needs_more_grow) {
                this._grow_threads++;
                // if we exceed ram then bail
                if (this.exceeds_available_ram) {
                    this.restore_checkpoint();
                    this._end_condition = 'ram limit - grow';
                    break optimisation_loop;
                }
            }
            // after increasing hack and grow also increase weaken until we are back into a good security state
            weak_loop: while (this.needs_more_weaken) {
                this._weak_threads++;
                // if we exceed ram then bail
                if (this.exceeds_available_ram) {
                    this.restore_checkpoint();
                    this._end_condition = 'ram limit - weaken';
                    break optimisation_loop;
                }
            }
            // if we get to here then we are in a good state
            this.set_checkpoint();
            // we can also track our most *efficient* point if we want to recover it later
            const efficiency = this.income / this.ram_required;
            if (efficiency > this.most_efficient.efficiency) {
                this.most_efficient.efficiency = efficiency;
                this.most_efficient.grow_threads = this.grow_threads;
                this.most_efficient.hack_threads = this.hack_threads;
                this.most_efficient.weak_threads = this.weak_threads;
            }
        }
        // since the optimiser goes for highest income we can track that now that optimiser is finished
        this.highest_income.grow_threads = this.grow_threads;
        this.highest_income.hack_threads = this.hack_threads;
        this.highest_income.weak_threads = this.weak_threads;
    }

    /** This will set the object state to reflect the most efficient state found -- most income per memory used */
    set_to_efficiency_results() {
        this._grow_threads = this.most_efficient.grow_threads;
        this._hack_threads = this.most_efficient.hack_threads;
        this._weak_threads = this.most_efficient.weak_threads;
    }

    /** This will set the object state to reflect the highest income state found -- most money per second (DEFAULT) */
    set_to_income_results() {
        this._grow_threads = this.highest_income.grow_threads;
        this._hack_threads = this.highest_income.hack_threads;
        this._weak_threads = this.highest_income.weak_threads;
    }

    /** Prints details of this analysis to the terminal */
    self_report() {
        const ns = this.ns;
        ns.tprint(`Finished optimisation against [ ${this.target} ] with ${ns.nFormat(this.ram_available,'0.000a')} GB max ram`);
        ns.tprint(`Using ${ns.nFormat(this.ram_required,'0.000a')}GB for H=${this.hack_threads} G=${this.grow_threads} W=${this.weak_threads}`);
        ns.tprint(`Optimisation finished due to [[[ ${this.end_condition} ]]]`);
        ns.tprint(`Hack will take ${ns.nFormat(this.hack_pct_total*100,'0.00')}% per run, running up to ${this.max_hacks_per_grow} times per grow`);
        ns.tprint(`Hack leaves behind ${ns.nFormat(this.hack_min_remain_pct*100,'0.00')}% in worst case`);
        ns.tprint(`Grow increases by ${ns.nFormat(this.grow_pct_total*100-100,'0.00')}%, reaching ${ns.nFormat(this.hack_min_remain_pct*this.grow_pct_total*100,'0.00')}% money in worst case`);
        ns.tprint(`Security rate is ${this.net_sec_rate}`);
        ns.tprint(`Income rate is ${this.income}`);
    }

}
