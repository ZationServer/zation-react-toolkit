/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {client} from "zation-client";

export function useClient(): typeof client {
    return client;
}