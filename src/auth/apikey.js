import { setApiKey } from "../client.js";

export async function handleSetKey(args) {
    const key = args[0];
    if (!key) {
        return {
            ok: false,
            error: "client_error",
            message: "Usage: agentsuit auth set-key <key>",
        };
    }

    await setApiKey(key);
    return {
        ok: true,
        data: {
            auth: "stored",
            mode: "api_key",
        },
    };
}
