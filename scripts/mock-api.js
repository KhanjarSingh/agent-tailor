import { URL } from "node:url";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT || 8080);

const agents = new Map([
    ["demo-agent", { name: "demo-agent", description: "Seeded mock agent" }],
]);

const responses = new Map([
    ["resp_seed", { id: "resp_seed", object: "response", status: "completed", model: "gpt-4.1", output: "hello" }],
]);

let responseCounter = 1;

function json(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
    });
    res.end(body);
}

function notFound(res) {
    json(res, 404, { error: "Not Found" });
}

function unauthorized(res) {
    json(res, 401, { error: "Unauthorized" });
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = "";
        req.on("data", (chunk) => {
            raw += chunk;
        });
        req.on("end", () => {
            if (!raw.trim()) {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            } catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}

function requireAuth(req, res) {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || auth.length <= "Bearer ".length) {
        unauthorized(res);
        return false;
    }
    return true;
}

function paginate(items, searchParams) {
    const limit = Number(searchParams.get("limit") || 20);
    const cursor = searchParams.get("cursor") || null;
    const start = cursor ? Number(cursor) || 0 : 0;
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
    const chunk = items.slice(start, start + safeLimit);
    const next = start + safeLimit < items.length ? String(start + safeLimit) : null;
    return {
        data: chunk,
        pagination: {
            next_cursor: next,
            has_more: Boolean(next),
        },
    };
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const { pathname } = url;

    if (!requireAuth(req, res)) {
        return;
    }

    try {
        if (req.method === "GET" && pathname === "/v1/agents") {
            const list = Array.from(agents.values());
            json(res, 200, paginate(list, url.searchParams));
            return;
        }

        if (req.method === "GET" && pathname.startsWith("/v1/agents/")) {
            const id = decodeURIComponent(pathname.replace("/v1/agents/", ""));
            const item = agents.get(id);
            if (!item) {
                notFound(res);
                return;
            }
            json(res, 200, item);
            return;
        }

        if (req.method === "POST" && pathname === "/v1/agents") {
            const body = (await readBody(req)) || {};
            const id = String(body.name || `agent-${agents.size + 1}`);
            const item = { ...body, name: id };
            agents.set(id, item);
            json(res, 201, item);
            return;
        }

        if (req.method === "PUT" && pathname.startsWith("/v1/agents/")) {
            const id = decodeURIComponent(pathname.replace("/v1/agents/", ""));
            const body = (await readBody(req)) || {};
            const item = { ...body, name: id };
            agents.set(id, item);
            json(res, 200, item);
            return;
        }

        if (req.method === "DELETE" && pathname.startsWith("/v1/agents/")) {
            const id = decodeURIComponent(pathname.replace("/v1/agents/", ""));
            const deleted = agents.delete(id);
            if (!deleted) {
                notFound(res);
                return;
            }
            json(res, 200, { id, deleted: true });
            return;
        }

        if (req.method === "GET" && pathname === "/v1/responses") {
            const list = Array.from(responses.values());
            json(res, 200, paginate(list, url.searchParams));
            return;
        }

        if (req.method === "POST" && pathname === "/v1/responses") {
            const body = (await readBody(req)) || {};
            const id = `resp_${responseCounter}`;
            responseCounter += 1;
            const item = {
                id,
                object: "response",
                status: "completed",
                model: body.model || "gpt-4.1",
                input: body.input || null,
            };
            responses.set(id, item);
            json(res, 200, item);
            return;
        }

        if (req.method === "GET" && pathname.startsWith("/v1/responses/")) {
            const id = decodeURIComponent(pathname.replace("/v1/responses/", ""));
            const item = responses.get(id);
            if (!item) {
                notFound(res);
                return;
            }
            json(res, 200, item);
            return;
        }

        if (req.method === "DELETE" && pathname.startsWith("/v1/responses/")) {
            const id = decodeURIComponent(pathname.replace("/v1/responses/", ""));
            const deleted = responses.delete(id);
            json(res, 200, { id, deleted, object: "response" });
            return;
        }

        notFound(res);
    } catch {
        json(res, 400, { error: "Bad Request" });
    }
});

server.listen(PORT, () => {
    process.stderr.write(`Mock API listening on http://localhost:${PORT}\n`);
});
