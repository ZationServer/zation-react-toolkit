/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {client as primaryClient, Client} from "zation-client";
import {DeepReadonly} from "./utils/types";
import {ClientEvent, useClientValue} from "./utils/useClientValue";

type ExtractTokenPayload<C> = C extends Client<any,infer TP> ? TP : any;

const events: ClientEvent[] = ['Authenticate','Deauthenticate'];
const read = (client: Client) => client.authTokenPayload;

/**
 * Returns the token payload of the client (default: the primary client), null without a token,
 * and renders again with each new token.
 */
export function useAuthTokenPayload(): DeepReadonly<Partial<ExtractTokenPayload<typeof primaryClient>>> | null
export function useAuthTokenPayload<C extends Client>(client: C): DeepReadonly<Partial<ExtractTokenPayload<C>>> | null
export function useAuthTokenPayload(client?: Client): any {
    return useClientValue(client ?? primaryClient,events,read);
}
