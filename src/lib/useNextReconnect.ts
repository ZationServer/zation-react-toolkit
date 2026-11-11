/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {client as primaryClient, Client} from "zation-client";
import {ClientEvent, useClientValue} from "./utils/useClientValue";

const events: ClientEvent[] = ['NextReconnectChange'];
const read = (client: Client) => client.nextReconnectAt;

/**
 * Returns when the client (default: the primary client) tries to reconnect,
 * as a Date.now() timestamp, while a reconnect is planned, otherwise null.
 * It renders again when the plan changes, not every second:
 * a countdown renders itself with a timer.
 */
export function useNextReconnect(client?: Client): number | null {
    return useClientValue(client ?? primaryClient,events,read);
}
