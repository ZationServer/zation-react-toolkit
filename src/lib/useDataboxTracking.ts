/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {Databox} from "zation-client";
import {DeepReadonly} from "./utils/types";
import {useForceUpdate} from "./utils/useForceUpdate";
import {useRef, useEffect} from "react";

type ExtractDataboxContent<T extends Databox> = T extends Databox<infer C,any,any,any> ? C : any;

export function useDataboxTracking<T extends Databox<any,any,any,any>>(databox: T): DeepReadonly<ExtractDataboxContent<T>> | undefined {
    const forceUpdate = useForceUpdate();
    const dbChangeHandlerRef = useRef<() => void>(() => forceUpdate());

    useEffect(() => {
        databox.onDataChange(dbChangeHandlerRef.current);
        return () => databox.offDataChange(dbChangeHandlerRef.current);
    },[databox]);

    return databox.data;
}