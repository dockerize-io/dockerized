import delay from "delay"
import Consul from "consul";
import { ConsulItemResponse } from "./consulTypes";
import consul from "./consulInstance"


export default async function safePatch(key: string, patch: (oldValue: any) => any, defaultStringValue = '{}',): Promise<void> {
    for (let i = 0; i < 1000; i++) {
        try {
            const beforeModification = await consul.kv.get<ConsulItemResponse>(key) || {
                Value: defaultStringValue,
                ModifyIndex: undefined
            }

            const value = JSON.stringify(
                await patch(
                    JSON.parse(beforeModification.Value)
                ), null, 2
            )

            if (value === JSON.stringify(null)) return

            const setParam: Consul.Kv.SetOptions = { key, value }

            if (typeof beforeModification.ModifyIndex !== "undefined") {
                setParam.cas = String(beforeModification.ModifyIndex)
            }

            const setResult = await consul.kv.set(setParam)
            if (setResult === true) {
                return
            }
            await delay(Math.round(Math.random() * 10) + i * 10) // i*10 + 5 on avg
        } catch (e) {
            if (e?.statusCode === 429) {
                await delay(Math.round(Math.random() * 1000)) // 500 ms on average
            } else {
                throw e
            }
        }
    }
    throw 'Could not patch in 1000 iterations';
}