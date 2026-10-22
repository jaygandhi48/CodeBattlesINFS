# CodeBattles

CodeBattles is a real-time competitive programming application. Two players join a shared battle room, solve the same programming problem and receive live updates about submissions and battle results.

## Requirements

To run CodeBattles locally, install:

- Docker Desktop or Docker Engine
- Docker Compose v2
- A Judge0 CE RapidAPI key

Node.js does not need to be installed when using Docker Compose.

## Obtain a Judge0 API key

1. Create or sign in to a [RapidAPI account](https://rapidapi.com/).

2. Open the [Judge0 CE API page](https://rapidapi.com/judge0-official/api/judge0-ce/playground).

3. Select the Basic plan or another plan suitable for testing. Check the current request allowance and pricing shown by RapidAPI. RapidAPI may require payment card information.

4. Open the Judge0 API page or your RapidAPI application dashboard.

5. Copy the value shown for `X-RapidAPI-Key`.

The application uses these fixed Judge0 settings:

```env
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
```

## Local setup

### 1. Download the project

Download the project from blackboard

### 2. Create the environment file

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` and enter:

```env
JUDGE0_API_KEY=your_rapidapi_key
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com

EXECUTION_SERVICE_URL=http://localhost:3001
EXECUTION_SERVICE_TIMEOUT_MS=120000

POSTGRES_USER=admin
POSTGRES_PASSWORD=local_admin_password
POSTGRES_DB=codebattles

DATABASE_URL=postgresql://admin:local_admin_password@localhost:5433/codebattles?schema=public
REDIS_URL=redis://localhost:6379

CORS_ORIGIN=http://localhost:8080
```

The username and password inside `DATABASE_URL` must match `POSTGRES_USER` and `POSTGRES_PASSWORD`.

The `.env` file is ignored by Git and must not be committed.

### 3. Build and start the application

```bash
docker compose up --build -d
```

Docker Compose starts:

| Service             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `frontend`          | React application served by Nginx         |
| `backend`           | Core REST API and Socket.IO server        |
| `execution-service` | Sends code to Judge0 and collects results |
| `postgres`          | Permanent application data                |
| `redis`             | Socket.IO Pub/Sub communication           |
| `migrate`           | Applies Prisma database migrations        |

The migration service runs automatically before the backend starts.

### 4. Check the containers

```bash
docker compose ps
```

PostgreSQL, Redis, the backend and the execution service should become healthy.

View container logs with:

```bash
docker compose logs -f
```

Press `Ctrl+C` to stop following the logs. The containers will continue running in the background.

### 5. Open the application

Open:

```text
http://localhost:8080
```

The administration problem-creation page is available at:

```text
http://localhost:8080/admin/problems/new
```

A published problem must exist before a player can create a battle.

## Local ports

| Component                       | Address                     |
| ------------------------------- | --------------------------- |
| Frontend                        | `http://localhost:8080`     |
| API through Nginx               | `http://localhost:8080/api` |
| PostgreSQL                      | `localhost:5433`            |
| Redis                           | `localhost:6379`            |
| Backend inside Docker           | `backend:3000`              |
| Execution service inside Docker | `execution-service:3001`    |

The backend and execution service are internal Docker services. Nginx forwards browser API and WebSocket traffic to the backend.

## Stop the application

Stop the containers while preserving the database:

```bash
docker compose down
```

Restart the containers:

```bash
docker compose up -d
```

Delete the containers and all local PostgreSQL and Redis data:

```bash
docker compose down -v
```

The `-v` option permanently removes the local database volumes.

## Project structure

```text
CodeBattlesINFS/
├── frontend/                  React frontend and Nginx
├── execution-service/         Judge0 execution microservice
├── src/                       Core API and Socket.IO server
│   ├── lib/
│   ├── middlewares/
│   ├── realtime/
│   └── routes/
├── prisma/                    Prisma schema and migrations
├── k8s/                       Kubernetes manifests
├── Dockerfile                 Core API image
├── docker-compose.yml         Local multi-container deployment
├── package.json
├── prisma.config.js
└── .env.example
```

## Environment variables

| Variable                       | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `JUDGE0_API_KEY`               | RapidAPI authentication key        |
| `JUDGE0_API_HOST`              | Judge0 RapidAPI hostname           |
| `JUDGE0_API_URL`               | Judge0 API base URL                |
| `POSTGRES_USER`                | PostgreSQL username                |
| `POSTGRES_PASSWORD`            | PostgreSQL password                |
| `POSTGRES_DB`                  | PostgreSQL database name           |
| `DATABASE_URL`                 | Prisma PostgreSQL connection URL   |
| `REDIS_URL`                    | Redis connection URL               |
| `EXECUTION_SERVICE_URL`        | Internal execution-service address |
| `EXECUTION_SERVICE_TIMEOUT_MS` | Execution request timeout          |
| `CORS_ORIGIN`                  | Allowed frontend origin            |
| `PORT`                         | Service listening port             |

# Google Kubernetes Engine deployment

The application can also be deployed to Google Kubernetes Engine.

## Cloud requirements

Install and configure:

- Google Cloud CLI
- Docker
- `kubectl`
- A Google Cloud project with billing enabled

## 1. Configure Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Set the deployment variables so you would be able to reuse it

```bash
export PROJECT_ID="$(gcloud config get-value project)"
export REGION="australia-southeast1"
export ZONE="australia-southeast1-a"
export REPOSITORY="codebattles"
```

Enable the required APIs:

```bash
gcloud services enable \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com
```

## 2. Create the Artifact Registry repository

```bash
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="CodeBattles container images"
```

If the repository already exists, skip this command.

Configure Docker authentication:

```bash
gcloud auth configure-docker "${REGION}-docker.pkg.dev"
```

## 3. Build and push the images

Define the image addresses:

```bash
export BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:v1"
export EXECUTION_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/execution-service:v1"
export FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:v1"
```

Build the images:

```bash
docker build -t "$BACKEND_IMAGE" .
docker build -t "$EXECUTION_IMAGE" ./execution-service
docker build -t "$FRONTEND_IMAGE" ./frontend
```

Push the images:

```bash
docker push "$BACKEND_IMAGE"
docker push "$EXECUTION_IMAGE"
docker push "$FRONTEND_IMAGE"
```

This pushes the images to Artifact Registry that will store the images.

Update the `image:` values in these files with the new image addresses:

- `k8s/backend.yaml`
- `k8s/execution-service.yaml`
- `k8s/frontend.yaml`
- `k8s/migration-job.yaml`

The migration job must use the same backend image because the backend image contains the Prisma migrations.

## 4. Create the GKE cluster

```bash
gcloud container clusters create codebattles-cluster \
  --zone="$ZONE" \
  --num-nodes=2 \
  --machine-type=e2-standard-2 \
  --disk-type=pd-balanced \
  --disk-size=30 \
  --enable-ip-alias \
  --release-channel=regular
```

Connect `kubectl` to the cluster:

```bash
gcloud container clusters get-credentials codebattles-cluster \
  --zone="$ZONE"
```

## 5. Create the Kubernetes namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

## 6. Create Kubernetes secrets

Prepare the PostgreSQL values:

```bash
export POSTGRES_USER="admin"
export POSTGRES_PASSWORD="admin"
export POSTGRES_DB="codebattles"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"
```

Enter the Judge0 API key without displaying it:

```bash
read -s -p "Judge0 RapidAPI key: " JUDGE0_API_KEY
echo
```

Set the Judge0 connection values:

```bash
export JUDGE0_API_HOST="judge0-ce.p.rapidapi.com"
export JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
```

Create the Kubernetes Secret:

```bash
kubectl create secret generic codebattles-secrets \
  --namespace=codebattles \
  --from-literal=POSTGRES_USER="$POSTGRES_USER" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_DB="$POSTGRES_DB" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JUDGE0_API_KEY="$JUDGE0_API_KEY" \
  --from-literal=JUDGE0_API_HOST="$JUDGE0_API_HOST" \
  --from-literal=JUDGE0_API_URL="$JUDGE0_API_URL" \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

## 7. Deploy PostgreSQL and Redis

```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
```

Wait for them to become available:

```bash
kubectl rollout status statefulset/postgres \
  --namespace=codebattles \
  --timeout=300s

kubectl rollout status deployment/redis \
  --namespace=codebattles \
  --timeout=300s
```

## 8. Apply database migrations

```bash
kubectl delete job database-migration-v1 \
  --namespace=codebattles \
  --ignore-not-found

kubectl apply -f k8s/migration-job.yaml

kubectl wait \
  --namespace=codebattles \
  --for=condition=complete \
  job/database-migration-v1 \
  --timeout=300s
```

## 9. Deploy the application

```bash
kubectl apply -f k8s/execution-service.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/backend-hpa.yaml
```

Check the resources:

```bash
kubectl get pods,services,hpa,pvc \
  --namespace=codebattles
```

## 10. Obtain the public IP address

```bash
kubectl get service frontend \
  --namespace=codebattles \
  --watch
```

Wait for an external IP address, then open:

```text
http://EXTERNAL_IP
```

## Kubernetes manifests

| Manifest                 | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `namespace.yaml`         | Creates the `codebattles` namespace                    |
| `postgres.yaml`          | Creates PostgreSQL, its Service and persistent storage |
| `redis.yaml`             | Creates Redis and its internal Service                 |
| `migration-job.yaml`     | Applies Prisma migrations                              |
| `execution-service.yaml` | Deploys the Judge0 execution microservice              |
| `backend.yaml`           | Deploys the Core API and its internal Service          |
| `frontend.yaml`          | Deploys the frontend and external LoadBalancer         |
| `backend-hpa.yaml`       | Scales backend Pods from two to five                   |

## Cloud cleanup

Delete the GKE cluster when it is no longer needed:

```bash
gcloud container clusters delete codebattles-cluster \
  --zone="$ZONE"
```

Artifact Registry images and retained storage can continue producing charges after cluster deletion. Remove them separately if they are no longer required.

## Troubleshooting

### Judge0 authentication error

Confirm that:

- The RapidAPI subscription is active.
- `JUDGE0_API_KEY` contains the `X-RapidAPI-Key` value.
- `JUDGE0_API_HOST` is `judge0-ce.p.rapidapi.com`.
- The selected plan has not exceeded its request limit.

### PostgreSQL port already in use

The local PostgreSQL container uses host port `5433`.

Stop the process using that port or change the host-side port in `docker-compose.yml`. PostgreSQL continues to use port `5432` inside its container.

### No problems appear when creating a battle

Create and publish a problem at:

```text
http://localhost:8080/admin/problems/new
```

Only published problems appear on the battle creation page.

### Kubernetes `ImagePullBackOff`

Confirm that:

- The image was pushed to Artifact Registry.
- The manifest contains the correct image address.
- The image tag exists.
- The GKE node service account can access Artifact Registry.

Inspect the error using:

```bash
kubectl describe pod POD_NAME \
  --namespace=codebattles
```

## Security notes

- Never commit `.env`.
- Never include a real Judge0 key in this README.
- The Judge0 key is only provided to the execution service.
- Judge0 executes submitted code outside the CodeBattles backend.
- Player session tokens are stored in browser session storage.
- The administration page is unauthenticated in this prototype and should be protected before public production use.
