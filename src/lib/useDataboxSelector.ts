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
 * Returns a selected part of the databox data and re-renders the component
 * only when the selected part changes, so components that read different parts
 * of the same databox do not re-render each other.
 * The zation client gives every changed part of the data a new object (copy on write along the changed path),
 * every unchanged part keeps its identity; that is why the default comparison by reference is enough
 * for parts of the data. A selector that builds a new array or object (a filter, a map)
 * needs an equality function, for example shallowEqual.
 * @param databox
 * @param selector
 * @param isEqual
 * Compares the last and the new selection; by default Object.is.
 */
export function useDataboxSelector<T extends Databox<any,any,any,any>,S>(databox: T,
    selector: (data: DeepReadonly<ExtractDataboxContent<T>> | undefined) => S,
    isEqual?: (a: S, b: S) => boolean): S
{
    const {subscribe, getSnapshot} = useDataboxSnapshot(databox);
    return useSyncExternalStoreWithSelector<DataboxSnapshot,S>(subscribe,getSnapshot,undefined,
        (snapshot) => selector(snapshot.data),isEqual);
}
