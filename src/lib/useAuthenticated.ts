/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {client as primaryClient, Client} from "zation-client";
import {ClientEvent, useClientValue} from "./utils/useClientValue";

const events: ClientEvent[] = ['Authenticate','Deauthenticate'];
const read = (client: Client) => client.authenticated;

/**
 * Returns if the client (default: the primary client) is authenticated
 * and renders again when that changes.
 */
export function useAuthenticated(client?: Client): boolean {
    return useClientValue(client ?? primaryClient,events,read);
}
