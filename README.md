# AgentTailor Mark-1 (AgentSuit)

AgentTailor ingests API definitions and emits an agent-ready CLI called `agentsuit`.
This implementation targets the Agents and Responses controllers and provides JSON-only stdout behavior.

## Install

```bash
npm install -g .
```

## Base URL Resolution

Resolution order:

1. `BASE_URL` environment variable
2. `~/.agentsuit/config` file (`baseUrl`)
3. default `http://localhost:8080`

Set and persist base URL:

```bash
agentsuit config set base-url http://localhost:8080
```

## Authentication

API key mode:

```bash
agentsuit auth set-key YOUR_API_KEY
```

Or use env var directly:

```bash
export AGENTSUIT_API_KEY=YOUR_API_KEY
```

Simulated OAuth mode:

```bash
agentsuit auth login
```

## Commands

```bash
agentsuit agents list --limit 20 --cursor abc
agentsuit agents get my-agent
agentsuit agents create --data '{"name":"my-agent"}'
agentsuit agents update my-agent --data '{"name":"my-agent"}'
agentsuit agents delete my-agent

agentsuit responses list --limit 20 --cursor abc
agentsuit responses create --data '{"model":"gpt-4.1","input":"Hello"}'
agentsuit responses get resp_123
agentsuit responses delete resp_123
```

## Endpoint Inference Notes

The tool infers endpoint shapes from non-OpenAPI Kotlin controllers. For `GET /v1/responses` list, the route is inferred for CRUD parity because the referenced controller exposes `POST /responses` and `GET /responses/{id}` but not an explicit list route.

## Output Contract

- Stdout: JSON only
- Stderr: logs/prompt/debug
- Error mapping:
  - 401 -> `auth_required`
  - 404 -> `not_found`
  - 4xx -> `client_error`
  - 5xx -> `api_error`
  - network/timeout -> `unreachable`

## HTTP behavior

- timeout: 10 seconds hard cutoff
- retry: once on network failure only
- timeout response message: `Request timed out after 10s`
