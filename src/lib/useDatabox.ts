/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {APIDefinition, client, Client, Databox, DataboxOptions, ExtractClientAPIDefinition} from "zation-client";
import {DeepReadonly, Default} from "./utils/types";
import {useEffect, useRef} from "react";
import {deepEqual} from "queric";
import {useDirectEffect} from "./utils/useDirectEffect";
import {useDataboxTracking} from "./useDataboxTracking";

type ExtractDatabox<T extends APIDefinition,DN extends keyof T['databoxes']> =
    Databox<T['databoxes'][DN]['content'], Default<T['databoxes'][DN]['member'],string>,
        T['databoxes'][DN]['options'], T['databoxes'][DN]['fetchInput']>;

type DataboxHookReturnType<T extends APIDefinition,DN extends keyof T['databoxes']> = ExtractDatabox<T,DN> &
    {withTracking(): [DeepReadonly<T['databoxes'][DN]['content']> | undefined,ExtractDatabox<T,DN>]};

export function useDatabox<DN extends keyof ExtractClientAPIDefinition<typeof client>['databoxes']>
(identifier: DN,member?: Default<ExtractClientAPIDefinition<typeof client>['databoxes'][DN]['member'],string>,
 options?: DataboxOptions<ExtractClientAPIDefinition<typeof client>['databoxes'][DN]['options']>):
    DataboxHookReturnType<ExtractClientAPIDefinition<typeof client>,DN>
export function useDatabox<C extends Client,DN extends keyof ExtractClientAPIDefinition<C>['databoxes']>
    (client: C,identifier: DN,member?: Default<ExtractClientAPIDefinition<C>['databoxes'][DN]['member'],string>,
     options?: DataboxOptions<ExtractClientAPIDefinition<C>['databoxes'][DN]['options']>):
    DataboxHookReturnType<ExtractClientAPIDefinition<ExtractClientAPIDefinition<C>>,DN>;

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