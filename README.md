# Code Battles — Step 1

This folder currently contains only the Judge0 connectivity smoke test.

## Requirements

- Node.js 20.6 or newer
- A Judge0 CE subscription and API key from RapidAPI

## Configure

Create your private environment file:

```bash
cp .env.example .env
```

Open `.env` and replace `replace_with_your_rapidapi_key` with your real key. The `.env` file is ignored by Git.

If your Judge0 RapidAPI subscription uses a different host, update both `JUDGE0_API_HOST` and `JUDGE0_API_URL`.

## Run

```bash
npm run judge0:test
```

The script automatically finds the available Python 3 runtime and runs two submissions:

1. A correct addition solution, which must be accepted.
2. An incorrect subtraction solution, which must receive a wrong-answer verdict.

Successful output ends with:

```text
Judge0 smoke test completed successfully.
```

No packages need to be installed for this step because the script uses Node's built-in `fetch` and environment-file support.
