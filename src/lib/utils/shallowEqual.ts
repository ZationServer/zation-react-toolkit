/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

/**
 * Compares two values one level deep: the same items of two arrays,
 * or the same values under the same keys of two objects (each by Object.is).
 * Useful as the equality function of a selector that builds a new array or object.
 * @param a
 * @param b
 */
export function shallowEqual(a: any, b: any): boolean {
    if(Object.is(a,b)) return true;
    if(typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if(Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a), keysB = Object.keys(b);
    if(keysA.length !== keysB.length) return false;
    for(let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        if(!Object.prototype.hasOwnProperty.call(b,key) || !Object.is(a[key],b[key])) return false;
    }
    return true;
}
