/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {useEffect, useReducer, useRef, useState} from "react";

export interface RequestState<T> {
    /** The result of the last successful request. */
    data: T | undefined;
    /** The error of the last request, undefined when it succeeded. */
    error: any;
    /** Sends the request again. */
    reload: () => void;
}

/**
 * Sends a request once when the component mounts and again with reload.
 * For answers that no Databox holds and that should not be asked on each render.
 * While isEnabled is false, the request waits and goes out when it becomes true.
 * The data stays until the next request succeeds.
 * @example
 * const {data, error, reload} = useRequest(() => client.request('device/ports'));
 */
export function useRequest<T>(request: () => Promise<T>, isEnabled: boolean = true): RequestState<T> {
    const [state, setState] = useState<{data?: T, error?: any}>({});
    const [count, reload] = useReducer((count: number) => count + 1,0);
    const requestRef = useRef(request);
    requestRef.current = request;

    useEffect(() => {
        if(!isEnabled) return;
        let canceled = false;
        //an answer of an older request or after unmount is dropped
        new Promise<T>(resolve => resolve(requestRef.current())).then(data => {
            if(!canceled) setState({data});
        },error => {
            if(!canceled) setState(state => ({data: state.data, error}));
        });
        return () => {canceled = true;};
    },[count,isEnabled]);

    return {data: state.data, error: state.error, reload};
}
