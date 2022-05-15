/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

export type Default<T,D> = T extends undefined ? D : T;

export type Primitive = undefined | null | boolean | string | number | Function;

export type DeepReadonly<T> =
    T extends Primitive ? T :
        T extends Array<infer U> ? DeepReadonlyArray<U> :
            T extends Map<infer K, infer V> ? DeepReadonlyMap<K, V> : DeepReadonlyObject<T>
interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}
interface DeepReadonlyMap<K, V> extends ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> {}
type DeepReadonlyObject<T> = {
    readonly [K in keyof T]: DeepReadonly<T[K]>
}
