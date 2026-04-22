import { stderr, stdin } from "node:process";

import readline from "node:readline/promises";
import { setAccessToken } from "../client.js";
import { spawn } from "node:child_process";

const PLACEHOLDER_OAUTH_URL = "https://example.com/oauth/authorize?client_id=agentsuit&response_type=token";

function openBrowser(url) {
    const platform = process.platform;
    let command = null;
    let args = [];

    if (platform === "darwin") {
        command = "open";
        args = [url];
    } else if (platform === "win32") {
        command = "cmd";
        args = ["/c", "start", "", url];
    } else {
        command = "xdg-open";
        args = [url];
    }

    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.unref();
}

export async function handleLogin() {
    stderr.write(`Open this URL in a browser: ${PLACEHOLDER_OAUTH_URL}\n`);

    try {
        openBrowser(PLACEHOLDER_OAUTH_URL);
    } catch {
    }

    const rl = readline.createInterface({ input: stdin, output: stderr });

    try {
        const token = (await rl.question("Paste your access token: ")).trim();
        if (!token) {
            return {
                ok: false,
                error: "client_error",
                message: "No access token provided",
            };
        }

        await setAccessToken(token);
        return {
            ok: true,
            data: {
                auth: "stored",
            },
        };
    } finally {
        rl.close();
    }
}
