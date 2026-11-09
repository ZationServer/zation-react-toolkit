/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {Databox} from "zation-client";
import {DeepReadonly} from "./utils/types";
import {DataboxSnapshot, useDataboxSnapshot} from "./utils/useDataboxSnapshot";
import {useSyncExternalStoreWithSelector} from "use-sync-external-store/shim/with-selector";

type ExtractDataboxContent<T extends Databox> = T extends Databox<infer C,any,any,any> ? C : any;

/**
 * Re-renders only when the selected part changes (by default compared with Object.is).
 * A selector that builds a new array or object needs an isEqual, for example shallowEqual.
 */
export function useDataboxSelector<T extends Databox<any,any,any,any>,S>(databox: T,
    selector: (data: DeepReadonly<ExtractDataboxContent<T>> | undefined) => S,
    isEqual?: (a: S, b: S) => boolean): S
{
    const {subscribe, getSnapshot} = useDataboxSnapshot(databox);
    return useSyncExternalStoreWithSelector<DataboxSnapshot,S>(subscribe,getSnapshot,undefined,
        (snapshot) => selector(snapshot.data),isEqual);
}
