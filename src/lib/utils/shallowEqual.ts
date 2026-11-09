/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

/**
 * Compares two arrays or objects one level deep.
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
