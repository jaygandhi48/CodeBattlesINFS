const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function createPlayer(displayName) {
  const res = await fetch(`${API_URL}/api/players`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ displayName }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? body.msg ?? "Failed to create player.");
  }
  return body.data;
}

export async function joinBattle(roomCode, sessionToken) {
  const res = await fetch(`${API_URL}/api/battles/${roomCode}/join`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error ?? body.msg ?? "Failed to join battle.");
  }

  return body.data;
}

export async function getBattle(roomCode, sessionToken) {
  const res = await fetch(`${API_URL}/api/battles/${roomCode}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? body.msg ?? "Failed to load battle.");
  }
  return body.data;
}

export async function getProblems() {
  const res = await fetch(`${API_URL}/api/problems`);
  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error ?? body.msg ?? "Failed to load problems.");
  }

  return body.data;
}

export async function createProblem(problem) {
  const res = await fetch(`${API_URL}/api/problems`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(problem),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error ?? body.msg ?? "Failed to create problem.");
  }

  return body.data;
}

export async function createBattle(problemId, sessionToken) {
  const res = await fetch(`${API_URL}/api/battles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ problemId }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error ?? body.msg ?? "Failed to create battle.");
  }

  return body.data;
}

export async function submitSolution(roomCode, sourceCode, sessionToken) {
  const res = await fetch(`${API_URL}/api/battles/${roomCode}/submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ sourceCode }),
  });
  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error ?? body.msg ?? "Failed to submit solution.");
  }

  return body.data;
}
