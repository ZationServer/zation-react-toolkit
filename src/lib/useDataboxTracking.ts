/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {Databox} from "zation-client";
import {DeepReadonly} from "./utils/types";
import {DataboxSnapshot, useDataboxSnapshot} from "./utils/useDataboxSnapshot";
import {useSyncExternalStore} from "use-sync-external-store/shim";

type ExtractDataboxContent<T extends Databox> = T extends Databox<infer C,any,any,any> ? C : any;

export function useDataboxTracking<T extends Databox<any,any,any,any>>(databox: T): DeepReadonly<ExtractDataboxContent<T>> | undefined {
    const {subscribe, getSnapshot} = useDataboxSnapshot(databox);
    return useSyncExternalStore<DataboxSnapshot>(subscribe, getSnapshot).data;
}
