import { mkdir, readFile, writeFile } from "node:fs/promises";

import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".agentsuit");
const CONFIG_PATH = path.join(CONFIG_DIR, "config");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials");
const DEFAULT_BASE_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 10_000;

async function ensureConfigDir() {
    await mkdir(CONFIG_DIR, { recursive: true });
}

async function readJsonFile(filePath) {
    try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw);
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return {};
        }
        return {};
    }
}

async function writeJsonFile(filePath, data) {
    await ensureConfigDir();
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function getConfig() {
    return readJsonFile(CONFIG_PATH);
}

export async function setBaseUrl(baseUrl) {
    const current = await getConfig();
    const next = { ...current, baseUrl };
    await writeJsonFile(CONFIG_PATH, next);
    return next;
}

export async function getCredentials() {
    return readJsonFile(CREDENTIALS_PATH);
}

export async function setApiKey(apiKey) {
    const current = await getCredentials();
    const next = { ...current, apiKey };
    await writeJsonFile(CREDENTIALS_PATH, next);
    return next;
}

export async function setAccessToken(accessToken) {
    const current = await getCredentials();
    const next = { ...current, accessToken };
    await writeJsonFile(CREDENTIALS_PATH, next);
    return next;
}

export function resolveBaseUrl(config = {}) {
    return process.env.BASE_URL || config.baseUrl || DEFAULT_BASE_URL;
}

export function resolveBearerToken(credentials = {}) {
    if (process.env.AGENTSUIT_API_KEY) {
        return process.env.AGENTSUIT_API_KEY;
    }

    if (credentials.apiKey) {
        return credentials.apiKey;
    }

    if (credentials.accessToken) {
        return credentials.accessToken;
    }

    return null;
}

function parseResponseBody(rawText) {
    if (!rawText || !rawText.trim()) {
        return null;
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
}

function mapHttpError(status, statusText) {
    if (status === 401) {
        return {
            error: "auth_required",
            message: "Run: agentsuit auth login",
        };
    }

    if (status === 404) {
        return {
            error: "not_found",
            message: "Resource does not exist",
        };
    }

    if (status >= 400 && status < 500) {
        return {
            error: "client_error",
            message: statusText || "Client error",
        };
    }

    return {
        error: "api_error",
        message: statusText || "API error",
    };
}

function isRetryableNetworkError(error) {
    if (!error) {
        return false;
    }

    if (error.name === "AbortError") {
        return false;
    }

    return error instanceof TypeError;
}

function buildUrl(baseUrl, route, query = {}) {
    const url = new URL(route, baseUrl);
    Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }
        url.searchParams.set(key, String(value));
    });
    return url;
}

export function createHttpClient({ baseUrl, getToken }) {
    async function sendRequest({ method, route, query, body, requiresAuth = true }) {
        const url = buildUrl(baseUrl, route, query);
        const headers = { "content-type": "application/json" };

        if (requiresAuth) {
            const token = await getToken();
            if (token) {
                headers.authorization = `Bearer ${token}`;
            }
        }

        let attempts = 0;
        while (attempts < 2) {
            attempts += 1;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            try {
                const response = await fetch(url, {
                    method,
                    headers,
                    body: body === undefined ? undefined : JSON.stringify(body),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                const rawText = await response.text();
                const parsed = parseResponseBody(rawText);

                if (!response.ok) {
                    const mapped = mapHttpError(response.status, response.statusText);
                    return {
                        ok: false,
                        error: mapped.error,
                        message: mapped.message,
                    };
                }

                return {
                    ok: true,
                    data: parsed,
                };
            } catch (error) {
                clearTimeout(timeoutId);

                if (error && error.name === "AbortError") {
                    return {
                        ok: false,
                        error: "unreachable",
                        message: "Request timed out after 10s",
                    };
                }

                if (attempts < 2 && isRetryableNetworkError(error)) {
                    continue;
                }

                return {
                    ok: false,
                    error: "unreachable",
                    message: error && error.message ? error.message : "Network failure",
                };
            }
        }

        return {
            ok: false,
            error: "unreachable",
            message: "Network failure",
        };
    }

    return {
        request: sendRequest,
        timeoutMs: REQUEST_TIMEOUT_MS,
    };
}
