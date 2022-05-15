/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {useEffect, useRef} from "react";

function shouldRunDirectEffect(deps: any[] | undefined,prevDeps: any[] | undefined,first?: boolean) {
    if(deps == null || prevDeps == null || first || deps.length !== prevDeps.length) return true;
    for(let i = 0; i < deps.length; i++) if(deps[i] !== prevDeps[i]) return true;
    return false;
}

export function useDirectEffect(effect: (init: boolean) => (void | (() => void)), deps?: any[]) {
    const initRef = useRef(true);
    const depsRef = useRef(deps);
    const prevCleanupRef = useRef<null | (() => void)>(null);

    const init = initRef.current;
    initRef.current = false;

    if(shouldRunDirectEffect(deps,depsRef.current,init)) {
        if(prevCleanupRef.current) prevCleanupRef.current();
        prevCleanupRef.current = effect(init) || null;
    }
    depsRef.current = deps;

    useEffect(() => () => {
        if(prevCleanupRef.current) {
            prevCleanupRef.current();
            prevCleanupRef.current = null;
        }
    },[])
}