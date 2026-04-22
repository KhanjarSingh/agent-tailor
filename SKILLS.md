# SKILLS

## 1. What this tool does

1. Run AgentSuit commands to list, fetch, create, update, and delete agents and responses.
2. Read JSON output and branch only on output fields.

## 2. Installation

```bash
npm install -g .
agentsuit config set base-url http://localhost:8080
```

## 3. Authentication

1. Run: agentsuit auth set-key $KEY
2. Run: agentsuit agents list --limit 1
3. If output.error is auth_required, run: agentsuit auth login
4. Paste token when prompted
5. Continue only after output equals: {"ok":true,"data":{"auth":"stored"}}

## 4. JSON parsing instructions

1. Check output.ok
2. Use output.data for results
3. Use output.pagination for iteration
4. Use output.error and output.message for failure handling

## 5. Command reference

1. Run: agentsuit config set base-url <url>
2. Expect: {"ok":true,"data":{"base_url":"http://localhost:8080","stored":true}}

3. Run: agentsuit auth set-key <key>
4. Expect: {"ok":true,"data":{"auth":"stored","mode":"api_key"}}

5. Run: agentsuit auth login
6. Expect: {"ok":true,"data":{"auth":"stored"}}

7. Run: agentsuit agents list --limit <n> --cursor <cursor>
8. Expect: {"ok":true,"data":[{"name":"alpha"}],"pagination":{"next_cursor":"abc123","has_more":true}}

9. Run: agentsuit agents get <id>
10. Expect: {"ok":true,"data":{"name":"alpha"}}

11. Run: agentsuit agents create --data '{"name":"alpha"}'
12. Expect: {"ok":true,"data":{"name":"alpha"}}

13. Run: agentsuit agents update <id> --data '{"name":"alpha"}'
14. Expect: {"ok":true,"data":{"name":"alpha"}}

15. Run: agentsuit agents delete <id>
16. Expect: {"ok":true,"data":{"id":"alpha","deleted":true}}

17. Run: agentsuit responses list --limit <n> --cursor <cursor>
18. Expect: {"ok":true,"data":[{"id":"resp_1"}],"pagination":{"next_cursor":null,"has_more":false}}

19. Run: agentsuit responses create --data '{"model":"gpt-4.1","input":"hello"}'
20. Expect: {"ok":true,"data":{"id":"resp_1","status":"completed"}}

21. Run: agentsuit responses get <id>
22. Expect: {"ok":true,"data":{"id":"resp_1"}}

23. Run: agentsuit responses delete <id>
24. Expect: {"ok":true,"data":{"id":"resp_1","deleted":true,"object":"response"}}

## 6. Pagination loop pattern

Agents:

1. Set cursor = null
2. Run: agentsuit agents list --limit 20
3. Process output.data
4. If output.pagination.has_more is false, stop
5. Set cursor = output.pagination.next_cursor
6. If cursor is null, stop
7. Run: agentsuit agents list --limit 20 --cursor <cursor>
8. Repeat from step 3

Responses:

1. Set cursor = null
2. Run: agentsuit responses list --limit 20
3. Process output.data
4. If output.pagination.has_more is false, stop
5. Set cursor = output.pagination.next_cursor
6. If cursor is null, stop
7. Run: agentsuit responses list --limit 20 --cursor <cursor>
8. Repeat from step 3

## 7. Command chaining pattern

1. Run: agentsuit agents list --limit 1
2. Extract id from output.data[0]
3. Run: agentsuit agents get <id>
4. Use output to decide next action

## 8. Error handling

1. If output.error is auth_required, run: agentsuit auth login
2. If output.error is not_found, stop branch
3. If output.error is client_error, fix input
4. If output.error is api_error, retry later
5. If output.error is unreachable, check base URL
