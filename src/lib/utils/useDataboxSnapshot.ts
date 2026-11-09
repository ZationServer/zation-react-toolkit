/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {Databox} from "zation-client";
import {useCallback, useRef} from "react";

export interface DataboxSnapshot {
    readonly databox: Databox<any,any,any,any>;
    readonly data: any;
}

//The snapshot wraps the data, so a client that changes its data in place works as well.
export function useDataboxSnapshot(databox: Databox<any,any,any,any>) {
    const snapshotRef = useRef<DataboxSnapshot | null>(null);
    const subscribe = useCallback((onChange: () => void) => {
        const listener = () => {
            snapshotRef.current = null;
            onChange();
        };
        databox.onDataChange(listener);
        return () => databox.offDataChange(listener);
    },[databox]);
    const getSnapshot = useCallback((): DataboxSnapshot => {
        const snapshot = snapshotRef.current;
        if(snapshot !== null && snapshot.databox === databox) return snapshot;
        return snapshotRef.current = {databox, data: databox.data};
    },[databox]);
    return {subscribe, getSnapshot};
}
