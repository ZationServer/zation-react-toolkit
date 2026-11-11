/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {Client, Databox, DataboxOptions} from "zation-client";
import {deepEqual} from "queric";

/**
 * How long a Databox stays connected after the last component let go of it.
 * A route change or the strict mode of React mounts it again right away,
 * then it keeps its connection and data.
 */
export const DATABOX_RELEASE_DELAY = 3000;

/**
 * The current error listener of a component (a ref, so it may change with each render).
 */
export interface ErrorListenerRef {
    readonly current: ((error: Error) => void) | undefined;
}

export interface SharedDatabox {
    readonly client: Client;
    readonly identifier: string;
    readonly member: any;
    readonly options: DataboxOptions;
    readonly databox: Databox<any,any,any,any>;
    users: number;
    connected: boolean;
    releaseTimeout?: ReturnType<typeof setTimeout>;
    /**
     * The error listeners of the components that hold the Databox.
     */
    readonly errorListeners: ErrorListenerRef[];
}

const sharedDataboxes = new WeakMap<Client,SharedDatabox[]>();

function listOf(client: Client): SharedDatabox[] {
    let list = sharedDataboxes.get(client);
    if(list === undefined) sharedDataboxes.set(client,list = []);
    return list;
}

function scheduleRelease(shared: SharedDatabox) {
    shared.releaseTimeout = setTimeout(() => {
        shared.releaseTimeout = undefined;
        if(shared.users > 0) return;
        const list = listOf(shared.client), index = list.indexOf(shared);
        if(index !== -1) list.splice(index,1);
        if(shared.connected) {
            shared.connected = false;
            shared.databox.disconnect().catch(() => {});
        }
    },DATABOX_RELEASE_DELAY);
}

/**
 * Returns the Databox that all components with the same client, identifier,
 * member and options share. A new one goes again after the release delay
 * unless a component acquires it (a render that React discards).
 */
export function getSharedDatabox(client: Client, identifier: string, member: any, options: DataboxOptions,
    create: () => Databox<any,any,any,any>): SharedDatabox
{
    const list = listOf(client);
    for(let i = 0; i < list.length; i++) {
        const shared = list[i];
        if(shared.identifier === identifier && deepEqual(shared.member,member) &&
            deepEqual(shared.options,options)) return shared;
    }
    const shared: SharedDatabox = {client,identifier,member,options,databox: create(),users: 0,connected: false,
        errorListeners: []};
    list.push(shared);
    scheduleRelease(shared);
    return shared;
}

/**
 * Tells a failed connect to the error listeners of the components that hold the Databox,
 * without one to console.error. The Databox stays active and connects when the connection comes back.
 */
function reportConnectError(shared: SharedDatabox, error: Error) {
    let reported = false;
    for(const listener of shared.errorListeners.slice()) {
        if(listener.current === undefined) continue;
        reported = true;
        listener.current(error);
    }
    if(!reported) console.error(`The Databox ${shared.identifier} did not connect.`,error);
}

/**
 * Connects the Databox for a component and returns the release.
 * The last release disconnects it after the release delay.
 * A failed connect goes to the error listener of each component that holds it.
 */
export function acquireSharedDatabox(shared: SharedDatabox, errorListener?: ErrorListenerRef): () => void {
    if(shared.releaseTimeout !== undefined) {
        clearTimeout(shared.releaseTimeout);
        shared.releaseTimeout = undefined;
    }
    //a release that came first took it out
    const list = listOf(shared.client);
    if(list.indexOf(shared) === -1) list.push(shared);
    shared.users++;
    if(errorListener) shared.errorListeners.push(errorListener);
    if(!shared.connected) {
        shared.connected = true;
        shared.databox.connect(shared.member).catch(error => reportConnectError(shared,error));
    }
    let released = false;
    return () => {
        if(released) return;
        released = true;
        if(errorListener) shared.errorListeners.splice(shared.errorListeners.indexOf(errorListener),1);
        if(--shared.users === 0) scheduleRelease(shared);
    };
}
