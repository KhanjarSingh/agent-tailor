function parseNumber(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function parseJsonDataFlag(args) {
    const idx = args.indexOf("--data");
    if (idx === -1 || !args[idx + 1]) {
        return { error: "Usage requires --data '<json>'" };
    }

    try {
        return { value: JSON.parse(args[idx + 1]) };
    } catch {
        return { error: "Invalid JSON passed to --data" };
    }
}

function normalizeListPayload(payload, limit, responseHeaders) {
    const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
            ? payload.data
            : [];

    const nextCursor =
        payload?.pagination?.next_cursor ||
        payload?.next_cursor ||
        responseHeaders?.["x-next-cursor"] ||
        null;

    const hasMore =
        typeof payload?.pagination?.has_more === "boolean"
            ? payload.pagination.has_more
            : Boolean(nextCursor) || (Array.isArray(data) && data.length >= limit);

    return {
        ok: true,
        data,
        pagination: {
            next_cursor: nextCursor,
            has_more: hasMore,
        },
    };
}

export async function handleAgents(args, { client }) {
    const [action, ...rest] = args;

    if (action === "list") {
        const limitFlagIndex = rest.indexOf("--limit");
        const cursorFlagIndex = rest.indexOf("--cursor");

        const limit = parseNumber(
            limitFlagIndex >= 0 ? rest[limitFlagIndex + 1] : undefined,
            20,
        );
        if (limit === null) {
            return { ok: false, error: "client_error", message: "--limit must be a positive integer" };
        }

        const cursor = cursorFlagIndex >= 0 ? rest[cursorFlagIndex + 1] : undefined;

        const result = await client.request({
            method: "GET",
            route: "/v1/agents",
            query: { limit, cursor },
        });

        if (!result.ok) {
            return result;
        }

        return normalizeListPayload(result.data, limit, result.headers);
    }

    if (action === "get") {
        const id = rest[0];
        if (!id) {
            return { ok: false, error: "client_error", message: "Usage: agentsuit agents get <id>" };
        }

        const result = await client.request({
            method: "GET",
            route: `/v1/agents/${encodeURIComponent(id)}`,
        });

        if (!result.ok) {
            return result;
        }

        return {
            ok: true,
            data: result.data,
        };
    }

    if (action === "create") {
        const parsed = parseJsonDataFlag(rest);
        if (parsed.error) {
            return { ok: false, error: "client_error", message: parsed.error };
        }

        const result = await client.request({
            method: "POST",
            route: "/v1/agents",
            body: parsed.value,
        });

        if (!result.ok) {
            return result;
        }

        return {
            ok: true,
            data: result.data || { created: true },
        };
    }

    if (action === "update") {
        const id = rest[0];
        if (!id) {
            return { ok: false, error: "client_error", message: "Usage: agentsuit agents update <id> --data '<json>'" };
        }

        const parsed = parseJsonDataFlag(rest.slice(1));
        if (parsed.error) {
            return { ok: false, error: "client_error", message: parsed.error };
        }

        const result = await client.request({
            method: "PUT",
            route: `/v1/agents/${encodeURIComponent(id)}`,
            body: parsed.value,
        });

        if (!result.ok) {
            return result;
        }

        return {
            ok: true,
            data: result.data || { updated: true, id },
        };
    }

    if (action === "delete") {
        const id = rest[0];
        if (!id) {
            return { ok: false, error: "client_error", message: "Usage: agentsuit agents delete <id>" };
        }

        const result = await client.request({
            method: "DELETE",
            route: `/v1/agents/${encodeURIComponent(id)}`,
        });

        if (!result.ok) {
            return result;
        }

        return {
            ok: true,
            data: result.data || { id, deleted: true },
        };
    }

    return {
        ok: false,
        error: "client_error",
        message: "Usage: agentsuit agents <list|get|create|update|delete>",
    };
}
