import { setBaseUrl } from "../client.js";

function isValidUrl(value) {
    try {
        const parsed = new URL(value);
        return Boolean(parsed.protocol && parsed.host);
    } catch {
        return false;
    }
}

export async function handleConfig(args) {
    const [action, key, value] = args;

    if (action !== "set" || key !== "base-url" || !value) {
        return {
            ok: false,
            error: "client_error",
            message: "Usage: agentsuit config set base-url <url>",
        };
    }

    if (!isValidUrl(value)) {
        return {
            ok: false,
            error: "client_error",
            message: "Invalid URL",
        };
    }

    await setBaseUrl(value);
    return {
        ok: true,
        data: {
            base_url: value,
            stored: true,
        },
    };
}
