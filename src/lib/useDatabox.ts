/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {
    client,
    Client,
    Databox,
    DataboxOptions,
    AnyDataboxDef,
    ExtractClientAPIDefinition,
    ExtractDataboxDefContent,
    ExtractDataboxDefFetchInput,
    ExtractDataboxDefMember,
    ExtractDataboxDefRemoteOptions,
    FilterAPIDefinition
} from "zation-client";
import {DeepReadonly} from "./utils/types";
import {useEffect, useMemo, useRef} from "react";
import {deepEqual} from "queric";
import {useDataboxTracking} from "./useDataboxTracking";
import {useDataboxSelector} from "./useDataboxSelector";
import {acquireSharedDatabox, getSharedDatabox} from "./utils/sharedDatabox";

type ExtractDataboxOptions<DEF> = DEF extends AnyDataboxDef ?
    DataboxOptions<ExtractDataboxDefRemoteOptions<DEF>, ExtractDataboxDefFetchInput<DEF>> : never;

type ExtractDatabox<DEF> = DEF extends AnyDataboxDef ?
    Databox<ExtractDataboxDefContent<DEF>,ExtractDataboxDefMember<DEF>,
        ExtractDataboxDefRemoteOptions<DEF>,ExtractDataboxDefFetchInput<DEF>> : never;

interface TrackableDatabox<DEF extends AnyDataboxDef> {
    withTracking(): [DeepReadonly<ExtractDataboxDefContent<DEF>> | undefined,ExtractDatabox<DEF>];
    withSelector<S>(selector: (data: DeepReadonly<ExtractDataboxDefContent<DEF>> | undefined) => S,
                    isEqual?: (a: S, b: S) => boolean): [S,ExtractDatabox<DEF>];
}
type DataboxHookReturnType<DEF> = DEF extends AnyDataboxDef ? (ExtractDatabox<DEF> & TrackableDatabox<DEF>) : never;

/**
 * Connects the Databox while the component is mounted.
 * Components with the same client, identifier, member and options share one Databox,
 * it disconnects 3 s after the last of them unmounted.
 */
export function useDatabox<DN extends keyof FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,AnyDataboxDef>>
(identifier: DN,member?: ExtractDataboxDefMember<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>,
 options?: ExtractDataboxOptions<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>):
    DataboxHookReturnType<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>

/**
 * Connects the Databox while the component is mounted.
 * Components with the same client, identifier, member and options share one Databox,
 * it disconnects 3 s after the last of them unmounted.
 */
export function useDatabox<C extends Client,DN extends keyof FilterAPIDefinition<ExtractClientAPIDefinition<C>,AnyDataboxDef>>
    (client: C,identifier: DN,member?: ExtractDataboxDefMember<FilterAPIDefinition<ExtractClientAPIDefinition<C>,DN>>,
     options?: ExtractDataboxOptions<FilterAPIDefinition<ExtractClientAPIDefinition<C>,DN>>):
    DataboxHookReturnType<FilterAPIDefinition<ExtractClientAPIDefinition<C>,DN>>;

export function useDatabox(p1: any,p2?: any,p3?: any,p4?: any): any {
    let sourceClient: Client, identifier: string, member: any, options: DataboxOptions;
    if(p1 instanceof Client) {
        sourceClient = p1;
        identifier = p2;
        member = p3;
        options = p4 ?? {};
    }
    else {
        sourceClient = client;
        identifier = p1;
        member = p2;
        options = p3 ?? {};
    }

    //keep the references stable as long as the content is deep equal
    const optionsRef = useRef<DataboxOptions>(options);
    if(!deepEqual(options,optionsRef.current)) optionsRef.current = options;
    const stableOptions = optionsRef.current;

    const memberRef = useRef<any>(member);
    if(!deepEqual(member,memberRef.current)) memberRef.current = member;
    const stableMember = memberRef.current;

    //components with the same databox share one connection
    const shared = useMemo(() => getSharedDatabox(sourceClient,identifier,stableMember,stableOptions,() => {
        const db = sourceClient.databox(identifier,stableOptions);
        (db as any).withTracking = () => [useDataboxTracking(db),db];
        (db as any).withSelector = (selector: (data: any) => any, isEqual?: (a: any, b: any) => boolean) =>
            [useDataboxSelector(db,selector,isEqual),db];
        return db;
    }),[sourceClient,identifier,stableMember,stableOptions]);

    useEffect(() => acquireSharedDatabox(shared),[shared]);

    return shared.databox;
}
