# Kubernetes CKAD Learning Path — LoL Match Tracker

**Goal**: Deploy the LoL Match Tracker stack to a local Kubernetes cluster while learning every concept tested on the CKAD exam.

**Total estimated time**: 3–5 weeks at your own pace.  
**Exam format**: 2 hours, 15–20 scenario-based tasks in a live cluster.

---

## Tools to Install

```bash
brew install minikube k9s
# kubectl is already installed
minikube start --driver=docker --cpus=4 --memory=8g
minikube addons enable ingress
minikube addons enable metrics-server
```

> **minikube vs kind**: Start with minikube — the addon ecosystem (ingress, metrics-server) removes friction. Switch to kind later if you want multi-node practice.

---

## Phase 1 — Core Concepts (Days 1–3)

**Learn before writing any manifests.**

### kubectl imperative commands — learn these cold, exam is time-pressured

```bash
kubectl run nginx --image=nginx                          # create a pod
kubectl create deployment api --image=myimg --replicas=3
kubectl expose deployment api --port=80 --type=ClusterIP
kubectl set image deployment/api api=myimg:v2            # rolling update
kubectl scale deployment api --replicas=5
kubectl delete pod/nginx --force

kubectl get pods -n lol-tracker -o wide
kubectl describe pod <name>
kubectl logs <pod> -f --previous
kubectl exec -it <pod> -- /bin/sh
kubectl port-forward svc/api 8080:8080
```

### Key concepts
- Pod lifecycle: `Pending → Running → Succeeded / Failed / CrashLoopBackOff`
- Namespaces — isolate environments (`lol-tracker`, `monitoring`)
- Labels + selectors — how Services find Pods
- `kubectl explain` — works in the exam: `kubectl explain pod.spec.containers.livenessProbe`

**Exercise**: Run the Go API image as a bare Pod using `kubectl run`. No YAML. Understand what happens.

---

## Phase 2 — Basic Deployment of the App (Days 4–7)

Create `k8s/` directory in the repo. Write each manifest **by hand** — don't copy-paste until you've tried once.

### Manifest order (each builds on the previous)

| # | File | Concept |
|---|------|---------|
| 1 | `k8s/namespace.yaml` | Namespace isolation |
| 2 | `k8s/configmap.yaml` | Non-secret config (DB host, Gin mode, log level) |
| 3 | `k8s/secret.yaml` | Sensitive values (API key, DB password) — base64 encoded |
| 4 | `k8s/postgres-statefulset.yaml` | StatefulSet, PersistentVolumeClaim |
| 5 | `k8s/redis-statefulset.yaml` | Same pattern, simpler |
| 6 | `k8s/api-deployment.yaml` | Deployment referencing ConfigMap + Secret |
| 7 | `k8s/services.yaml` | ClusterIP (internal), NodePort/LoadBalancer (external) |

### Key CKAD concepts covered
- `Deployment` vs `StatefulSet` — when and why
- `PersistentVolumeClaim` — how storage works
- `ConfigMap` + `Secret` — three ways to consume (learn all three):
  1. `env.valueFrom.configMapKeyRef` — single key
  2. `envFrom.configMapRef` — entire ConfigMap as env vars
  3. Volume mount — ConfigMap as files (useful for `prometheus.yml`)

### Tip: generate YAML stubs instead of writing from scratch
```bash
kubectl create deployment api --image=lol-tracker-api --dry-run=client -o yaml > k8s/api-deployment.yaml
kubectl create configmap app-config --from-literal=GIN_MODE=release --dry-run=client -o yaml
kubectl create secret generic db-secret --from-literal=DB_PASSWORD=secret123 --dry-run=client -o yaml
```

---

## Phase 3 — Health Probes, Resources, Init Containers (Days 8–12)

These are the most heavily tested CKAD areas.

### Liveness + Readiness probes

Add to your API Deployment:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 15

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```

- **Readiness**: "ready for traffic" — K8s won't route requests until DB + Redis are up
- **Liveness**: "still alive" — K8s restarts the container if it stops responding

### Resource requests + limits (required in every CKAD scenario)

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"
```

### Init containers — run DB migrations before the API starts

```yaml
initContainers:
  - name: migrate
    image: lol-tracker-api:latest
    command: ["migrate", "-path", "/migrations", "-database", "$(DATABASE_URL)", "up"]
    envFrom:
      - secretRef:
          name: db-secret
```

This is a common CKAD pattern: init containers run to completion before the main container starts.

---

## Phase 4 — Networking + Ingress (Days 13–16)

### Service types — know all four

| Type | Use case |
|------|----------|
| `ClusterIP` | Internal only — postgres, redis, jaeger |
| `NodePort` | External via node IP — good for local dev |
| `LoadBalancer` | Cloud / `minikube tunnel` locally |
| `ExternalName` | DNS alias for external services |

### Ingress

```bash
minikube addons enable ingress
```

`k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lol-tracker
  namespace: lol-tracker
spec:
  rules:
    - host: lol-tracker.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: lol-tracker-api
                port:
                  number: 8080
          - path: /grafana
            pathType: Prefix
            backend:
              service:
                name: grafana
                port:
                  number: 3000
```

Add to `/etc/hosts`:
```
127.0.0.1 lol-tracker.local
```

### NetworkPolicy — heavily tested on CKAD

```yaml
# Allow only the API to reach PostgreSQL on port 5432
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-allow-api
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: lol-tracker-api
      ports:
        - port: 5432
```

---

## Phase 5 — Scaling + Maintenance (Days 17–21)

### HPA (Horizontal Pod Autoscaler)

```bash
kubectl autoscale deployment lol-tracker-api \
  --cpu-percent=70 --min=2 --max=5
```

Run `make loadtest-load` and watch pods scale:
```bash
kubectl get hpa -n lol-tracker -w
k9s  # watch in real time
```

### Rolling updates + rollback

```bash
kubectl set image deployment/lol-tracker-api api=lol-tracker-api:v2
kubectl rollout status deployment/lol-tracker-api
kubectl rollout history deployment/lol-tracker-api
kubectl rollout undo deployment/lol-tracker-api     # revert to previous version
kubectl rollout undo deployment/lol-tracker-api --to-revision=2
```

### CronJob — convert the rank worker into a scheduled K8s job

The background rank-fetch worker is a perfect candidate for a `CronJob`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rank-sync
  namespace: lol-tracker
spec:
  schedule: "*/10 * * * *"   # every 10 minutes
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: rank-sync
              image: lol-tracker-api:latest
              command: ["./rank-sync"]
```

Teaches: `Job` vs `Deployment`, restart policies, `completions`, `parallelism`, `activeDeadlineSeconds`.

### Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: lol-tracker-api
```

Ensures at least 1 replica is always running during node drains and rolling updates.

---

## Phase 6 — Security + Multi-Container Patterns (Days 22–26)

### Security contexts — CKAD always has these

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
```

Apply at both pod level and container level — know the difference.

### Multi-container pod patterns (all CKAD testable)

| Pattern | Description | Example use |
|---------|-------------|-------------|
| **Sidecar** | Helper runs alongside main container | Log shipping, metrics scraper |
| **Init container** | Runs to completion before main starts | DB migration, config download |
| **Ambassador** | Proxy in front of the main container | Auth proxy, rate limiting |
| **Adapter** | Transforms output of main container | Log format converter |

### ServiceAccount + RBAC

```bash
kubectl create serviceaccount lol-tracker-api -n lol-tracker
kubectl create role api-role --verb=get,list --resource=configmaps -n lol-tracker
kubectl create rolebinding api-binding \
  --role=api-role --serviceaccount=lol-tracker:lol-tracker-api -n lol-tracker
```

Bind the ServiceAccount to the API Deployment via `spec.serviceAccountName`.

---

## Phase 7 — CKAD Exam Prep (Final Week)

### Essential kubectl speed aliases (set these first in the exam)

```bash
alias k=kubectl
alias kn='kubectl config set-context --current --namespace'
export do='--dry-run=client -o yaml'   # usage: k create deploy nginx --image=nginx $do
export now='--force --grace-period 0'  # usage: k delete pod nginx $now
```

### Fastest patterns for each resource type

```bash
# Pod
k run nginx --image=nginx --restart=Never $do > pod.yaml

# Deployment
k create deploy api --image=nginx --replicas=3 $do > deploy.yaml

# Service
k expose deploy api --port=80 --target-port=8080 --type=ClusterIP $do

# ConfigMap
k create cm app-config --from-literal=ENV=prod --from-file=config.properties $do

# Secret
k create secret generic db-creds --from-literal=password=s3cr3t $do

# Job
k create job pi --image=perl -- perl -Mbignum=bpi -wle 'print bpi(2000)' $do

# CronJob
k create cronjob hello --image=busybox --schedule="*/1 * * * *" -- echo hello $do
```

### Resources allowed in the exam

- [kubernetes.io/docs](https://kubernetes.io/docs/home/) — official docs only
- [kubernetes.io/blog](https://kubernetes.io/blog/)
- Practice navigating the docs fast — especially:
  - Tasks > Configure Pods > resource limits, liveness probes, security contexts
  - Concepts > Workloads > controllers
  - Concepts > Services, Load Balancing, and Networking

### Practice platforms

| Resource | Notes |
|----------|-------|
| [killer.sh](https://killer.sh) | **Most important** — official CKAD simulator, 2 free sessions with exam purchase. Harder than the real exam on purpose. |
| [k8s.io/docs](https://kubernetes.io/docs) | Practice navigating it fast — it's all you have in the exam |
| `kubectl explain` | Offline reference: `kubectl explain deployment.spec.strategy` |

### Exam tactics

1. **Time management**: skip hard questions, flag them, come back
2. **Verify everything**: always run `kubectl get` + `kubectl describe` after applying
3. **Imperative first**: generate YAML with `--dry-run=client -o yaml`, then edit — much faster than typing from scratch
4. **Check the namespace**: most errors come from being in the wrong namespace. Always `kn <namespace>` first
5. **Use `k9s`** in the exam if you're comfortable with it — faster than typing `kubectl get` repeatedly

---

## Recommended Weekly Schedule

```
Week 1: Phase 1 + 2  → app running in local cluster, basic manifests
Week 2: Phase 3 + 4  → probes, resources, networking, ingress
Week 3: Phase 5 + 6  → scaling, jobs, security contexts, RBAC
Week 4: Phase 7      → killer.sh timed sessions + exam booking
```

---

## CKAD Exam Domain Coverage

| Domain | Weight | Phases covering it |
|--------|--------|--------------------|
| Application Design and Build | 20% | 2, 5, 6 |
| Application Deployment | 20% | 2, 5 |
| Application Observability and Maintenance | 15% | 3, 5 |
| Application Environment, Configuration and Security | 25% | 2, 3, 6 |
| Services and Networking | 20% | 4 |
