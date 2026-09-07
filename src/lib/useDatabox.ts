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

type ExtractDataboxOptions<DEF> = DEF extends AnyDataboxDef ?
    DataboxOptions<ExtractDataboxDefRemoteOptions<DEF>, ExtractDataboxDefFetchInput<DEF>> : never;

type ExtractDatabox<DEF> = DEF extends AnyDataboxDef ?
    Databox<ExtractDataboxDefContent<DEF>,ExtractDataboxDefMember<DEF>,
        ExtractDataboxDefRemoteOptions<DEF>,ExtractDataboxDefFetchInput<DEF>> : never;

interface TrackableDatabox<DEF extends AnyDataboxDef> {
    withTracking(): [DeepReadonly<ExtractDataboxDefContent<DEF>> | undefined,ExtractDatabox<DEF>];
}
type DataboxHookReturnType<DEF> = DEF extends AnyDataboxDef ? (ExtractDatabox<DEF> & TrackableDatabox<DEF>) : never;

export function useDatabox<DN extends keyof FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,AnyDataboxDef>>
(identifier: DN,member?: ExtractDataboxDefMember<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>,
 options?: ExtractDataboxOptions<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>):
    DataboxHookReturnType<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>

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

    const db = useMemo(() => {
        const db = sourceClient.databox(identifier,stableOptions);
        (db as any).withTracking = () => [useDataboxTracking(db),db];
        return db;
    },[sourceClient,identifier,stableOptions]);

    useEffect(() => {
        db.connect(stableMember).catch(() => {});
        return () => {
            db.disconnect().catch(() => {});
        };
    },[db,stableMember]);

    return db;
}
