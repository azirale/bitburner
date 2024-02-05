// CODING CONTRACT SOLVER
// Not all contracts solved yet, so this is a WIP file
// Just run in JS locally to figure out solutions given input for now

/** @param {NS} ns */
export async function main(ns) {
    ns.tail()
    ns.print(subarray_with_maximum_sum([-5, 5, 3, -6, 10, 8, -1, 7, -5, -10]))
}


// memoisation values
let get_prime_factors_of__memo = {}

// map names to functions
solution_map = {
    "Largest Prime Factor": largest_prime_factor,
    "Subarray with Maximum Sum": subarray_with_maximum_sum,
    "Total Ways to Sum": total_ways_to_sum,
    "Total Ways to Sum II": total_ways_to_sum_2,
    "Spiralize Matrix": spiralize_matrix,
    "Array Jumping Game": array_jumping_game,
    "Array Jumping Game II": array_jumping_game_2,
    "Merge Overlapping Intervals": merge_overlapping_intervals,
    "Generate IP Addresses": generate_ip_addresses,
    "Algorithmic Stock Trader I": algorithmic_stock_trader_1,
    "Algorithmic Stock Trader II": algorithmic_stock_trader_2,
    "Algorithmic Stock Trader III": algorithmic_stock_trader_3,
    "Algorithmic Stock Trader IV": algorithmic_stock_trader_4,
    "Minimum Path Sum in a Triangle": minimum_path_sum_in_a_triangle,
    "Unique Paths in a Grid I": unique_paths_in_a_grid_1,
    "Unique Paths in a Grid II": unique_paths_in_a_grid_2,

}



// Largest Prime Factor
/** @param {Number} number */
function largest_prime_factor(number) {
    let factors = get_prime_factors(number)
    return factors[factors.length - 1]
}
// timeit("Largest Prime Factor",()=>largest_prime_factor(11123))



// Subarray with Maximum Sum
/** @param {Array<Number>} full_array */
function subarray_with_maximum_sum(full_array) {
    let best_sum = Number.MIN_VALUE
    for (let l = 0; l < full_array.length; l++) {
        for (let r = l; r < full_array.length; r++) {
            let subarray = full_array.slice(l, r)
            let sum = subarray.reduce((prev, current) => prev + current, 0)
            best_sum = Math.max(best_sum, sum)
        }
    }
    return best_sum
}



// Total Ways to Sum
/** @param {Number} target */
function total_ways_to_sum(target) {
    const minimum_additions = 1
    // we track every way we can hit some number all the way up to target
    let ways_to_hit_x = new Array(target + 1).fill(0)
    // exactly one way to get a value of 0, we start from it
    ways_to_hit_x[0] = 1
    // we are going to examine each number we can possibly add with
    // it excludes the target number, because we must have at least one addition in the mix
    for (let n = 1; n <= target - minimum_additions; n++) {
        // using this addable number N we look at every X to see how many new ways we can reach it
        // we can reach X using N if (X-N) can be reached one or more ways
        // and the number of new ways we can reach X, is the number of ways we reached (X-N)
        // because for all those ways, which used numbers less than N, we add N to that combination
        for (let x = n; x <= target; x++) {
            ways_to_hit_x[x] += ways_to_hit_x[x - n]
        }
    }
    // by the end whatever has been put into the target index is how many ways to reach it
    return ways_to_hit_x[target]
}



// Total Ways to Sum II
function total_ways_to_sum_2(data) {
    let [target, numbers] = data
    // tracks every way we found to hit some number X
    let ways_to_hit_x = new Array(target + 1).fill(0)
    // we can hit x=0 in exactly one way -- all numbers used 0 times
    ways_to_hit_x[0] = 1
    // for each number we have, we need to examine how it can get us to each x
    for (let ni = 0; ni < numbers.length; ni++) {
        let n = numbers[ni]
        // for each x, that x has a new way to reach it for every way we can reach (x-n)
        // we start from x=n, or we'd be looking back at negative numbers to add from
        for (let x = n; x <= target; x++) {
            ways_to_hit_x[x] += ways_to_hit_x[x - n]
        }
    }
    return ways_to_hit_x[target]
}


// Spiralize Matrix
/** @param {Array<Array<Number>>} rows */
function spiralize_matrix(rows) {
    // discover proportions
    const num_rows = rows.length
    const num_cols = rows[0].length
    // we start with rows as base arrays, now make columns as base arrays
    const cols = []
    for (let c = 0; c < num_cols; c++) {
        let col = []
        for (let r = 0; r < num_rows; r++) col.push(rows[r][c])
        cols.push(col)
    }
    // with columns as base arrays we can just slice as needed
    const result = []
    const r = "right", d = "down", l = "left", u = "up"
    let dir = r
    while (rows.length > 0 && cols.length > 0) {
        switch (dir) {
            case r: result.push(...rows.shift()); cols.forEach((col) => col.shift()); dir = d; break
            case d: result.push(...cols.pop()); rows.forEach((row) => row.pop()); dir = l; break
            case l: result.push(...rows.pop().reverse()); cols.forEach((col) => col.pop()); dir = u; break
            case u: result.push(...cols.shift().reverse()); rows.forEach((row) => row.shift()); dir = r; break
        }
    }
    return result
}


// Array Jumping Game
/** @param {Array<Number>} jumps */
function array_jumping_game(jumps) {
    let target = jumps.length - 1
    // track everywhere we can jump from
    const landables = new Array(jumps.length).fill(false)
    // starting point
    landables[0] = true
    // examine each position and see if we can jump from it, mark where we can jump to
    for (let i = 0; i < jumps.length; i++) {
        // cannot get to here so cannot jump from here
        if (!landables[i]) continue
        let max_range = i + jumps[i]
        // early exit -- we would mark the target as landable
        if (max_range >= target) return 1
        // mark landables ready for next step
        for (let j = i; j <= max_range; j++) landables[j] = true
    }
    return 0
}
// timeit("Array Jumping Game",()=>array_jumping_game([1,10,0,0,0,5]))


// Array Jumping Game II
/** @param {Array<Number>} ranges */
function array_jumping_game_2(ranges) {
    let min_hops = new Array(ranges.length).fill(Number.MAX_SAFE_INTEGER)
    let last_index = ranges.length - 1
    min_hops[0] = 0
    for (let i = 0; i < min_hops.length; i++) {
        let best_hop_from_here = min_hops[i] + 1
        let max_range = Math.min(i + ranges[i], last_index)
        for (let j = i + 1; j <= max_range; j++) {
            if (min_hops[j] > best_hop_from_here) min_hops[j] = best_hop_from_here
        }
    }
    let min_overall_hops = min_hops[last_index]
    return min_overall_hops
}
//timeit("Array Jumping Game II", () => array_jumping_game_2([2, 0, 1, 1, 7, 4, 2, 6, 1, 4, 1, 5, 2, 0, 1, 3, 5]))


// Merge Overlapping Intervals
/** @param {Array<Array<Number>>} intervals */
function merge_overlapping_intervals(intervals) {
    // state and results
    const result = []
    let current_interval = [Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]
    // sort the incoming intervals by their start
    // this will guarantee that will see the next interval that COULD overlap with current one
    intervals.sort((a, b) => a[0] - b[0])
    for (let interval of intervals) {
        // no overlap → create a new interval based on the current one
        if (interval[0] > current_interval[1]) {
            current_interval = [...interval]
            result.push(current_interval)
        }
        // overlap -- update end if new end bigger than old one
        else if (interval[1] > current_interval[1]) current_interval[1] = interval[1]
    }
    return result
}
//timeit("Merge Overlapping Intevals",()=>merge_overlapping_intervals([[12,18],[1,5],[8,12],[19,20],[14,20],[22,29],[23,24],[12,19],[6,12],[25,33],[24,27],[12,15],[12,16],[12,20],[9,17]] ))


// Generate IP Addresses
/** @param {String} digits */
function generate_ip_addresses(digits) {
    // generate valid ips first for an easy check
    const valid_octets = {}
    for (let i = 0; i < 256; i++) valid_octets[i.toString()] = true
    // we need 4 octets of length 1-3 -- so just go through all of them -- there are only 81
    const results = []
    for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) for (let d = 1; d <= 3; d++) {
        // if the length does not match the digits we cannot generate a valid string
        if (a + b + c + d != digits.length) continue
        // generate octets and skip if they are not valid
        let a_digits = digits.substring(0, a)
        if (a_digits in valid_octets == false) continue
        let b_digits = digits.substring(a, a + b)
        if (b_digits in valid_octets == false) continue
        let c_digits = digits.substring(a + b, a + b + c)
        if (c_digits in valid_octets == false) continue
        let d_digits = digits.substring(a + b + c, a + b + c + d)
        if (d_digits in valid_octets == false) continue
        // must be valid so add to results
        results.push(`${a_digits}.${b_digits}.${c_digits}.${d_digits}`)
    }
    return results
}
//timeit("Generate IP Addresses",()=>generate_ip_addresses("220120134198"))


// Algorithmic Stock Trader I
/** @param {Array<Number>} values */
function algorithmic_stock_trader_1(values) {
    let best_trade = 0
    for (let b = 0; b < values.length - 1; b++) {
        for (let s = b + 1; s < values.length; s++) {
            let p = values[s] - values[b]
            if (p > best_trade) best_trade = p
        }
    }
    return best_trade
}
//timeit("Algorithmic Stock Trader I",()=>algorithmic_stock_trader_1([28,117,19,184,85,69,49,76,10,188,123,150,7,143,173,192,56,34,163,133,198,171,82,96,171,41,174,20,146,148,182,39,163,105]))


// Algorithmic Stock Trader II
/** @param {Array<Number>} values */
function algorithmic_stock_trader_2(values) {
    let profit = 0
    for (let d = 1; d < values.length; d++) {
        let yesterday = values[d - 1]
        let today = values[d]
        if (today > yesterday) profit += today - yesterday
    }
    return profit
}
//timeit("Algorithmic Stock Trader II",()=>algorithmic_stock_trader_2([86,195,111,189,66,60,112,119,129,69,130,146,124,179,16,98,80,55,89,160,186,31,182,160,155,118,17,23,132,36,183,171,196,92,33]))


// Algorithmic Stock Trader III
/** @param {Array<Number>} values */
function algorithmic_stock_trader_3(values) {
    let best_p = 0
    for (let b1 = 0; b1 < values.length; b1++) for (let s1 = b1 + 1; s1 < values.length; s1++) {
        let p1 = values[s1] - values[b1]
        for (let b2 = s1 + 1; b2 < values.length; b2++) for (let s2 = b2 + 1; s2 < values.length; s2++) {
            let p2 = values[s2] - values[b2]
            let tp = p1 + p2
            if (tp > best_p) best_p = tp
        }
    }
    return best_p
}
//timeit("Algorithmic Stock Trader III",()=>algorithmic_stock_trader_3([34,10,80,23,136,9,180,81,120,150,137,100,52,137,13]))


// Algorithmic Stock Trader IV
function algorithmic_stock_trader_4(data) {
    /** @type {Number} */
    let max_transactions = data[0]
    /** @type {Array<Number>} */
    let day_prices = data[1]
    let best_profit = 0
    // this tracks for each day, how much profit we made prior with how many transactions
    // starts out with 0 profit for all days for all transaction quantities
    let ways = []
    for (let d = 0; d <= day_prices.length; d++) ways[d] = new Array(max_transactions + 1).fill(0)
    // go over every transaction we could do, starting with each day to buy on
    for (let b = 0; b < day_prices.length; b++) {
        // carry yesterday's profits if better -- happens when we skip a day
        for (let n = 0; n <= max_transactions; n++) {
            if (b == 0) break
            if (ways[b - 1][n] >= ways[b][n]) ways[b][n] = ways[b - 1][n]
        }
        // now for buying on that day check each day we could sell on
        for (let s = b + 1; s < day_prices.length; s++) {
            // check if transaction would be profitable -- skip along if it is not
            let this_profit = day_prices[s] - day_prices[b]
            if (this_profit <= 0) continue
            // go through all profits we could add to on this day (ie not already maxed)
            for (let n = 0; n < max_transactions; n++) {
                let current_profit = ways[b][n] + this_profit
                // ooo better profit record -- update it
                if (current_profit > best_profit) best_profit = current_profit
                // update the buy date after this sell -- if this would be an improvement
                if (s + 1 == day_prices.length) continue
                if (ways[s + 1][n + 1] < current_profit) ways[s + 1][n + 1] = current_profit
            }
        }
    }
    return best_profit
}
//timeit("Algorithmic Stock Trader IV",() => algorithmic_stock_trader_4([10, [115, 125, 46, 40, 41, 125, 150, 7, 71, 69, 195, 137, 62, 30, 104, 48, 196, 42, 93, 156, 138, 171, 137, 194, 98, 131]]))


// Minimum Path Sum in a Triangle
/** @param {Array<Array<Number>>} */
function minimum_path_sum_in_a_triangle(data) {
    const rows = data
    const num_rows = data.length
    // roll up from bottom
    for (let r = rows.length - 1; r > 0; r--) {
        let lower_row = rows[r]
        let upper_row = rows[r - 1]
        // each 'column' of the next row will pick lowest value below it
        for (let c = 0; c < upper_row.length; c++) {
            upper_row[c] += lower_row[c] < lower_row[c + 1] ? lower_row[c] : lower_row[c + 1]
        }
    }
    return rows[0][0]
}
//timeit("Minimum Path Sum in a Triangle",()=>minimum_path_sum_in_a_triangle([[8],[5,6],[9,9,1],[9,7,7,8],[1,7,8,6,7],[2,1,8,6,8,3],[1,4,8,2,5,3,9],[2,8,8,6,8,4,8,4],[6,8,3,3,9,4,3,7,7]]))


// Unique Paths in a Grid I
/** @param {Array<Number>} data */
function unique_paths_in_a_grid_1(data) {
    let [rows, cols] = data
    let [rowsteps, colsteps] = [rows - 1, cols - 1]
    let steps = rowsteps + colsteps
    let result = choose(steps, rowsteps) // or colsteps, whatever
    return result
}
//timeit("Unique Paths in a Grid I",()=>unique_paths_in_a_grid_1([9,5]))


// Unique Paths in a Grid II
/** @param {Array<Array<Number>>} maze */
function unique_paths_in_a_grid_2(maze) {
    let height = maze.length
    let width = maze[0].length
    let ways = new Array(height)
    for (let r = 0; r < ways.length; r++) ways[r] = new Array(width).fill(0)
    // cannot backtrack so just go across adding all the ways we could come from above or left
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
        // seed value at top-left
        if (r == 0 && c == 0) ways[r][c] = 1
        // if maze blocks this position its ways value is 0 -- cannot get ehre
        else if (maze[r][c] == 1) ways[r][c] = 0
        // top-row passable spot can be reached only from left
        else if (r == 0) ways[r][c] = ways[r][c - 1]
        // left column passable spot only reachable from above
        else if (c == 0) ways[r][c] = ways[r - 1][c]
        // anywhere else it is sum of ways from left or above
        else ways[r][c] = ways[r - 1][c] + ways[r][c - 1]
    }
    // return the last spot
    return ways[height - 1][width - 1]
}
//timeit("Unique Paths in a Grid II",()=>unique_paths_in_a_grid_2([[0,0,0,0,1,0,0,0,1,1,0],[1,0,1,0,0,0,0,0,1,0,0],[0,0,0,0,1,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,1,0,0,0,0,0]]))
//timeit("Unique Paths in a Grid II",()=>unique_paths_in_a_grid_2([[0,0],[1,0],[0,0],[0,0],[0,0],[0,1],[1,0]]))
//timeit("Unique Paths in a Grid II",()=>unique_paths_in_a_grid_2([[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0],[0,0,0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,1,0,0,0,0]]))














// HELPERS
// some logic is difficult to inline and have it make sense
// these will cover mathematical functions and algorithms

/** Implements `N CHOOSE K` functionality. Integer safe for any factorial with count of prime factors under a few million.
 * @param {Number} n Options @param {Number} k Choices
 */
function choose(n, k) {
    if (k > n) return 0
    if (k == n) return 1
    if (k == 0) return 1
    let n_factorial_primefactors = get_factorial_as_prime_factors(n)
    let k_factorial_primefactors = get_factorial_as_prime_factors(k)
    let n_k_factorial_primefactors = get_factorial_as_prime_factors(n - k)
    let denominator_primefactors = [...k_factorial_primefactors, ...n_k_factorial_primefactors]
    let [numerator_factors, denominator_factors] = get_unmatched_values(n_factorial_primefactors, denominator_primefactors)
    let numerator = get_product_over(numerator_factors)
    // we do not need to figure denominator
    // this must provide an integer, therefore denominator must be factor of numerator
    // but we eliminated common factors (above 1), so the denominator must now be 1 exactly
    return numerator
}
//timeit("choose",()=>choose(40,20) )


/** Factorials are a bitch to work with sometimes. Use this to get their prime factors instead.
 * @param {Number} n */
function get_factorial_as_prime_factors(n) {
    if (n < 2) return []
    let factors = []
    for (let i = 2; i <= n; i++) {
        factors.push(...get_prime_factors(i))
    }
    return factors
}
//timeit("factorial as prime factors...",()=>get_factorial_as_prime_factors(10))



/** @param {Number} n */
function get_prime_factors(n) {
    let found = []
    // shortcut if already stored
    if (n in get_prime_factors_of__memo) return get_prime_factors_of__memo[n]
    // build response
    let prime_factors = []
    let d = 2
    while (n > 1) {
        while (n % d == 0) {
            found.push(n)
            prime_factors.push(d)
            n /= d
            // d must be a prime number, since we build up from 2, so add it as well
            if (!(d in get_prime_factors_of__memo)) get_prime_factors_of__memo[d] = [d]
            // if we hit a number we already know factors for, break early
            if (n in get_prime_factors_of__memo) {
                prime_factors.push(...get_prime_factors_of__memo[n])
                n = 1
            }
        }
        d += 1 + (d & 0x1)
    }
    // add each found value to the memo
    for (let f = 0; f < found.length; f++) {
        get_prime_factors_of__memo[found[f]] = prime_factors.slice(f)
    }
    return get_prime_factors_of__memo[found[0]]
}
// timeit("primefactors", () => get_prime_factors(2132130))


/** Will give only unmatched prime factors in each array.
 *  @param {Array<Number>} a @param {Array<Number>} b  */
function get_unmatched_values(a, b) {
    // copy so we do not fuck up originals , and sort so we can compare properly
    a = [...a].sort((x, y) => x - y)
    b = [...b].sort((x, y) => x - y)
    let [ai, bi] = [0, 0]
    while (ai < a.length && bi < b.length) {
        // matching values -- remove as many as we can then loop around
        if (a[ai] == b[bi]) {
            let size = Math.min(a.lastIndexOf(a[ai], ai) - ai + 1, b.lastIndexOf(b[bi], bi) - bi + 1)
            a.splice(ai, size)
            b.splice(bi, size)
        }
        // if unmatched and a higher advance b
        else if (a[ai] > b[bi]) bi++
        // otherwise advance a
        else ai++
    }
    // return both 'uncommon value' arrays 
    return [a, b]
}
//timeit("shared prime factors",()=>get_unmatched_values( [2,2,2,3,3,3,4,4,4,7,9,7] ,[2,2,2,3,3,3,3,4,4,5,7] ))


/** @param {Array<Number>} values The rpoduct of all values in array. Base value is `1`.*/
function get_product_over(values) {
    let result = 1
    for (let i = 0; i < values.length; i++) result *= values[i]
    return result
}
//timeit("get product over",()=>get_product_over([2,3,4,5,6,7,8]))
