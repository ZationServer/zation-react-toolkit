/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import { useCallback, useState } from "react";

export function useForceUpdate() {
    const [, setValue] = useState<any>();
    return useCallback(() => setValue({}), []);
}