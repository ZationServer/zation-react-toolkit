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
import {useEffect, useRef} from "react";
import {deepEqual} from "queric";
import {useDirectEffect} from "./utils/useDirectEffect";
import {useDataboxTracking} from "./useDataboxTracking";

type ExtractDataboxOptions<DEF> = DEF extends AnyDataboxDef ?
    DataboxOptions<ExtractDataboxDefRemoteOptions<DEF>, ExtractDataboxDefFetchInput<DEF>> : never;

type ExtractDatabox<DEF> = DEF extends AnyDataboxDef ?
    Databox<ExtractDataboxDefContent<DEF>,ExtractDataboxDefMember<DEF>,
        ExtractDataboxDefRemoteOptions<DEF>,ExtractDataboxDefFetchInput<DEF>> : never;

type DataboxHookReturnType<DEF> = DEF extends AnyDataboxDef ? (ExtractDatabox<DEF> &
    {withTracking(): [DeepReadonly<ExtractDataboxDefContent<DEF>> | undefined,ExtractDatabox<DEF>]}) : never;

export function useDatabox<DN extends keyof FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,AnyDataboxDef>>
(identifier: DN,member?: ExtractDataboxDefMember<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>,
 options?: ExtractDataboxOptions<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>):
    DataboxHookReturnType<FilterAPIDefinition<ExtractClientAPIDefinition<typeof client>,DN>>

export function useDatabox<C extends Client,DN extends keyof FilterAPIDefinition<ExtractClientAPIDefinition<C>,AnyDataboxDef>>
    (client: C,identifier: DN,member?: ExtractDataboxDefMember<FilterAPIDefinition<ExtractClientAPIDefinition<C>,DN>>,
     options?: ExtractDataboxOptions<FilterAPIDefinition<ExtractClientAPIDefinition<C>,DN>>):
    DataboxHookReturnType<FilterAPIDefinition<ExtractClientAPIDefinition<C>,DN>>;

export function useDatabox(p1: any,p2?: any,p3?: any,p4?: any): any {
    const dbRef = useRef<Databox | null>(null);
    const prevOptionsRef = useRef<DataboxOptions>({});
    const prevSourceClientRef = useRef<Client | null>(null);

    const cleanDb = () => {
        const db = dbRef.current;
        if(db == null) return;
        db.disconnect({
            clearStorages: true,
            cancelRemoteTasks: true,
            clearLocalTransactions: true
        });
        dbRef.current = null;
    }

    useDirectEffect(() => {
        let sourceClient: Client,
            identifier: string,
            member: any,
            options: DataboxOptions;
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

        const sourceClientChanged = sourceClient !== prevSourceClientRef.current;
        prevSourceClientRef.current = sourceClient;
        const optionsChanged = !deepEqual(options, prevOptionsRef.current);
        prevOptionsRef.current = options;

        let db = dbRef.current;

        if(!sourceClientChanged && !optionsChanged && db && db.identifier === identifier) {
            if(db.member === member) return;
            db.connect(member);
        }

        cleanDb();
        db = sourceClient.databox(identifier,options);
        dbRef.current = db;
        db.connect(member);
    },[p1,p2,p3,p4]);
    useEffect(() => cleanDb,[]);

    dbRef.current.withTracking = () => [useDataboxTracking(dbRef.current),dbRef.current];
    return dbRef.current;
}