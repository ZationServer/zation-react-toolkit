/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {Client} from "zation-client";
import {useCallback} from "react";
import {useSyncExternalStore} from "use-sync-external-store/shim";

export type ClientEvent = 'Connect' | 'Disconnect' | 'Authenticate' | 'Deauthenticate';

/**
 * Reads a value of the client and renders again when one of the events changes it.
 * The events must stay the same.
 */
export function useClientValue<T>(client: Client, events: readonly ClientEvent[], read: (client: Client) => T): T {
    const subscribe = useCallback((onChange: () => void) => {
        const listener = () => onChange();
        for(let i = 0; i < events.length; i++) client['on' + events[i]](listener);
        return () => {
            for(let i = 0; i < events.length; i++) client['off' + events[i]](listener);
        };
    },[client]);
    return useSyncExternalStore(subscribe,() => read(client));
}
