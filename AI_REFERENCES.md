AI interaction 1: Judge0 execution microservice

Prompt

I am building a two-player coding battle application using Node.js. Create the structure for a separate stateless execution microservice that communicates with Judge0 CE through RapidAPI. It must accept Python source code, an array of test cases and a time limit. Retrieve the current Python 3 language identifier instead of hard-coding it. Submit each test case to Judge0, poll the submission token every 750 milliseconds and stop after 30 seconds. Map Judge0 results into ACCEPTED, WRONG_ANSWER, COMPILATION_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED and INTERNAL_ERROR. Return the number of passed tests, total tests, execution time, maximum memory and Judge0 tokens. Explain why polling and the timeout are required.

AI-assisted output

async function judge0Request(path, options = {}) {
if (!apiKey) {
throw new Error("JUDGE0_API_KEY is not configured.");
}

const response = await fetch(`${apiUrl}${path}`, {
...options,
headers: {
"Content-Type": "application/json",
"X-RapidAPI-Key": apiKey,
"X-RapidAPI-Host": apiHost,
...options.headers,
},
});

const body = await response.json().catch(() => null);

if (!response.ok) {
throw new Error(
`Judge0 request failed (${response.status}): ${
        body ? JSON.stringify(body) : response.statusText
      }`,
);
}

return body;
}

let cachedPythonLanguageId;

async function getPythonLanguageId() {
if (cachedPythonLanguageId) {
return cachedPythonLanguageId;
}

const languages = await judge0Request("/languages");

const python = languages.find((language) =>
language.name.startsWith("Python (3"),
);

if (!python) {
throw new Error("Judge0 did not return a Python 3 runtime.");
}

cachedPythonLanguageId = python.id;
return cachedPythonLanguageId;
}

The polling function was implemented as:

async function waitForJudge0Result(token) {
const deadline = Date.now() + 30_000;

while (Date.now() < deadline) {
const query = new URLSearchParams({
base64_encoded: "false",
fields: "stdout,stderr,compile_output,message,status,time,memory",
});

    const result = await judge0Request(
      `/submissions/${token}?${query}`,
    );

    if (result.status?.id > 2) {
      return result;
    }

    await sleep(750);

}

throw new Error("Judge0 timed out while processing the submission.");
}

How the output was used

The code was adapted into the execution-service. Input validation and an Express /execute endpoint were added around the Judge0 client. The service was containerised and deployed separately from the Core API.

Verification

A correct Python solution returned ACCEPTED, while incorrect, compilation-error and runtime-error submissions returned the expected application statuses.

AI interaction 2: Communication between microservices

Prompt

The Core API must no longer communicate with Judge0 directly. Create a client function that sends source code, test cases and a time limit to an internal execution microservice using HTTP POST. Add a configurable timeout and validate the response before returning it. The execution service should be reachable locally through localhost and inside Docker or Kubernetes through its service name.

AI-assisted output

const executionServiceUrl = (
process.env.EXECUTION_SERVICE_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

const executionTimeoutMs = Number.parseInt(
process.env.EXECUTION_SERVICE_TIMEOUT_MS ?? "120000",
10,
);

export async function executeSubmission({
sourceCode,
testCases,
timeLimitMs,
}) {
const response = await fetch(`${executionServiceUrl}/execute`, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
sourceCode,
testCases: testCases.map(({ input, expectedOutput }) => ({
input,
expectedOutput,
})),
timeLimitMs,
}),
signal: AbortSignal.timeout(executionTimeoutMs),
});

const body = await response.json().catch(() => null);

if (!response.ok) {
throw new Error(
`Execution service request failed (${response.status}): ${
        body?.error ?? response.statusText
      }`,
);
}

return body.data;
}

How the output was used

The client was placed in the Core API. Its URL is configured as:

EXECUTION_SERVICE_URL=http://execution-service:3001
EXECUTION_SERVICE_TIMEOUT_MS=120000

Docker Compose and Kubernetes resolve execution-service through their internal service-discovery systems.

Verification

The Core API successfully sent submissions to the execution-service ClusterIP Service. The execution-service then returned the Judge0 result to the Core API.

Prompt

I need Socket.IO to operate across multiple Node.js backend replicas. Explain why Socket.IO rooms are process-local and create a Redis adapter configuration using separate publisher and subscriber clients. Both clients must report connection errors and connect before the adapter is attached. Redis should distribute temporary real-time events but must not become the permanent source of truth.

AI-assisted output

import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

export async function configureRedisAdapter(io) {
const pub = createClient({
url: process.env.REDIS_URL,
});

const sub = pub.duplicate();

pub.on("error", (error) => {
console.error("Socket.IO Redis publisher error:", error);
});

sub.on("error", (error) => {
console.error("Socket.IO Redis subscriber error:", error);
});

await Promise.all([
pub.connect(),
sub.connect(),
]);

io.adapter(createAdapter(pub, sub));

return { pub, sub };
}

How the output was used

The Redis adapter is configured before the HTTP server begins accepting connections. PostgreSQL remains responsible for permanent battle, player and submission data.

Verification

Two players connected to different backend processes received the same real-time events. Redis monitoring displayed PUBLISH operations for the relevant battle room.

AI interaction 8: Nginx proxy configuration

Prompt

Configure Nginx to serve the compiled React application and proxy REST and Socket.IO traffic to the backend Docker or Kubernetes Service. Support React Router refreshes and include the required WebSocket upgrade headers. Explain why the backend hostname is backend instead of localhost.

AI-assisted output

server {
listen 80;
server*name *;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

}

How the output was used

The configuration was included in the production frontend image. The backend hostname is resolved through Docker Compose or the Kubernetes backend Service.

Verification

React routes loaded after browser refreshes, REST requests reached Express, and Socket.IO WebSocket connections upgraded successfully.

AI Interaction 9: Kubernetes deployment
