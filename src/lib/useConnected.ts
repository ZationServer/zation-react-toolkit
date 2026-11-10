/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {client as primaryClient, Client} from "zation-client";
import {ClientEvent, useClientValue} from "./utils/useClientValue";

const events: ClientEvent[] = ['Connect','Disconnect'];
const read = (client: Client) => client.connected;

/**
 * Returns if the client (default: the primary client) is connected
 * and renders again when it connects or disconnects.
 */
export function useConnected(client?: Client): boolean {
    return useClientValue(client ?? primaryClient,events,read);
}
