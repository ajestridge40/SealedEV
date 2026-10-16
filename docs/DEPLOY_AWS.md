# Deploying SealedEV on AWS

```
            GitHub (push)                                  EventBridge Scheduler (daily 21:30 UTC)
                 │                                                        │
                 ▼                                                        ▼
   ┌──────────────────────────┐                           ┌──────────────────────────┐
   │ AWS Amplify Hosting      │  web app (Next.js SSR)     │ AWS CodeBuild            │  jobs: price refresh,
   │ builds, runs migrations, │                            │ project "sealedev-jobs"  │  seed, create admin
   │ serves https://…         │                            │ (buildspec.jobs.yml)     │
   └────────────┬─────────────┘                           └────────────┬─────────────┘
                │                                                        │   ▲ tcgcsv.com (prices)
                └──────────────►  Amazon RDS for PostgreSQL  ◄───────────┘
```

| Service | Role | Rough cost* |
| --- | --- | --- |
| **Amplify Hosting** | Builds from GitHub on every push, HTTPS, CDN, server-side rendering | Pennies at personal-use traffic |
| **RDS for PostgreSQL** (db.t4g.micro, 20 GB) | Database | ~$15–20/mo (less with free-tier credits) |
| **CodeBuild** | Runs the daily price refresh and one-off jobs. No Docker or local machine needed. | Within the free 100 build-min/mo |
| **EventBridge Scheduler** | Starts the refresh daily | Free at this volume |
| **Systems Manager Parameter Store** | Stores the database URL and admin password for CodeBuild | Free (standard parameters) |

\*Estimates. Check the AWS pricing pages and set a budget alert (step 8).

Use **one region** for everything, e.g. `us-east-1`, selected in the console's top-right region picker.

---

## 0. Before you start

1. The code must be on a GitHub branch Amplify can build. Merge `claude/sealedev-tcg-tracker-lr7bqw` into `main`, or deploy that branch directly.
2. Generate two random secrets, each 32+ characters (`openssl rand -base64 32` or a password manager):
   - `AUTH_SECRET`: signs login sessions.
   - `CRON_SECRET`: optional on AWS; only used by the HTTP cron endpoint.
3. Choose your admin email and a strong admin password (12+ characters).

## 1. Create the database (Amazon RDS)

1. Open **RDS → Databases → Create database**.
2. Fill in:
   - **Standard create**, engine **PostgreSQL**, version **16** or **17**.
   - Template: **Free tier** if offered, otherwise **Dev/Test**.
   - DB instance identifier: `sealedev`.
   - Master username: `sealedev_admin`. Set a password using only letters, digits, `-` and `_` (this avoids URL-encoding problems). Save it.
   - Instance class: **db.t4g.micro**. Storage: **gp3, 20 GiB**.
   - Connectivity:
     - **Don't connect to an EC2 compute resource**, default VPC.
     - **Public access: Yes**.
     - VPC security group: **Create new**, name `sealedev-db`.
   - **Additional configuration → Initial database name: `sealedev`**. Keep automated backups at 7 days and tick **Enable deletion protection**.
3. Click **Create database** and wait about 5–10 minutes until the status is *Available*.
4. Open the database and click the `sealedev-db` security group. Under **Inbound rules → Edit**, add **PostgreSQL (5432)** with source **0.0.0.0/0**.

   > **Why public?** Amplify and CodeBuild don't have fixed IP addresses. The database is still protected by its password, and RDS PostgreSQL 15+ enforces SSL by default (`rds.force_ssl=1`). For a fully private database, see "Hardened alternative" at the end.

5. Copy the **Endpoint** (e.g. `sealedev.abc123.us-east-1.rds.amazonaws.com`) and build your connection string:

   ```
   postgresql://sealedev_admin:YOUR_PASSWORD@YOUR_ENDPOINT:5432/sealedev?schema=public&sslmode=require&connection_limit=5
   ```

   `connection_limit=5` keeps the serverless web app from exhausting the small instance's connections. Use the same string for both `DATABASE_URL` and `DIRECT_URL`.

## 2. Store secrets for the jobs runner (Parameter Store)

Open **Systems Manager → Parameter Store → Create parameter** and create these, each of type **SecureString**:

| Name | Value |
| --- | --- |
| `/CodeBuild/sealedev/DATABASE_URL` | the connection string from step 1 |
| `/CodeBuild/sealedev/ADMIN_PASSWORD` | your admin password |

The `/CodeBuild/` prefix matters: the default CodeBuild service role may read parameters under it.

## 3. Deploy the web app (AWS Amplify Hosting)

1. Open **AWS Amplify → Create new app → GitHub → Next**. Authorize GitHub and pick the **SealedEV** repo and your branch.
2. On **App settings**:
   - Amplify detects **Next.js – SSR** and uses `amplify.yml` from the repo. Don't change the build commands.
   - Open **Advanced settings → Environment variables** and add:

     | Key | Value |
     | --- | --- |
     | `DATABASE_URL` | connection string from step 1 |
     | `DIRECT_URL` | same connection string |
     | `AUTH_SECRET` | your generated secret |
     | `ADMIN_EMAILS` | your admin email |
     | `ENABLE_TCGCSV` | `1` |
     | `ENABLE_SCRYFALL` | `1` |
     | `CRON_SECRET` | (optional) your generated secret |

   - Service role: **Create and use a new service role**. Amplify needs it for server-rendering logs.
3. Click **Save and deploy**. The build (about 4–6 minutes) installs dependencies, **applies the database migrations** (`prisma migrate deploy`) and builds the app.
4. When it's green, open the `https://<branch>.<id>.amplifyapp.com` URL. The site loads but has no products yet; step 5 seeds them.

**Custom domain (optional):** Amplify → your app → **Hosting → Custom domains → Add domain**. With Route 53 it's one click. With another registrar, add the CNAME records Amplify shows. The SSL certificate is free and automatic.

From now on, **every push to the branch redeploys**, and any new migrations are applied during the build.

## 4. Create the jobs runner (AWS CodeBuild)

1. Open **CodeBuild → Build projects → Create build project**.
2. Fill in:
   - Project name: `sealedev-jobs`.
   - **Source:** GitHub. Connect with the GitHub App or OAuth, then pick the repo and branch.
     - Under webhook events, leave **Rebuild every time a code change is pushed** **unchecked**.
   - **Environment:**
     - On-demand, **Managed image**, OS **Amazon Linux**, runtime **Standard**.
     - Image **aws/codebuild/amazonlinux-x86_64-standard:5.0** (latest revision), compute **3 GB / 2 vCPUs**.
     - Service role: **New service role**.
   - **Additional configuration → Environment variables:**

     | Name | Value | Type |
     | --- | --- | --- |
     | `DATABASE_URL` | `/CodeBuild/sealedev/DATABASE_URL` | Parameter |
     | `DIRECT_URL` | `/CodeBuild/sealedev/DATABASE_URL` | Parameter |
     | `ADMIN_EMAILS` | your admin email | Plaintext |
     | `ENABLE_TCGCSV` | `1` | Plaintext |
     | `ENABLE_SCRYFALL` | `1` | Plaintext |

   - **Buildspec:** *Use a buildspec file*, name `buildspec.jobs.yml`.
   - **Logs:** CloudWatch logs on (default).
   - Optionally set the timeout to 30 minutes.
3. Click **Create build project**.

> **If a build fails reading a parameter** (AccessDenied for `ssm:GetParameters`): open the project's service role in **IAM** and attach an inline policy allowing `ssm:GetParameters` on `arn:aws:ssm:<region>:<account-id>:parameter/CodeBuild/sealedev/*`.
>
> **If the build says Node 22 isn't supported** by the image: change `nodejs: 22` to `nodejs: 20` in `buildspec.jobs.yml`. The app supports Node 20.9+.

## 5. Seed data and create your admin login

Run each of these from **CodeBuild → sealedev-jobs → Start build with overrides**. In each one, open **Environment variables override** and add the variables listed. Wait for each build to succeed before starting the next.

1. **Seed the products**
   - `JOB_SCRIPT` = `db:seed` (Plaintext).
2. **Create your admin login**
   - `JOB_SCRIPT` = `user:create-admin` (Plaintext).
   - `ADMIN_EMAIL` = your admin email (Plaintext).
   - `ADMIN_PASSWORD` = `/CodeBuild/sealedev/ADMIN_PASSWORD` (Parameter).

   > Admin accounts can't be registered through the public sign-up form. Emails aren't verified, so this stops anyone else from claiming your admin address.
3. **First price refresh**
   - `JOB_SCRIPT` = `prices:refresh` (or just **Start build**, since it's the default).
   - When it finishes, open **Build logs**. The JSON report at the end shows which sets, products and cards were linked to TCGplayer, what was priced, and an `unmatched` list of anything that needs a manual ID or tier fix.

Sign in on the site with your admin email. Products now show TCGCSV prices, images and up-to-date EVs. For anything listed as unmatched, open the product page → **Data quality → TCGplayer product id**, or fix the tier's sync rarities. The next refresh picks it up.

## 6. Schedule the daily refresh (EventBridge Scheduler)

1. Open **Amazon EventBridge → Scheduler → Schedules → Create schedule**.
2. Fill in:
   - Name: `sealedev-daily-prices`.
   - **Recurring schedule → Cron-based:** `30 21 * * ? *`, time zone **UTC**. That's 21:30 UTC, after TCGCSV's daily update at about 20:00 UTC. Flexible time window: **Off**.
   - **Target:** **AWS CodeBuild – StartBuild** (under *Templated targets*). Pick project `sealedev-jobs`.
     - If you only see *All APIs*, choose **CodeBuild → StartBuild** and use the input `{"ProjectName": "sealedev-jobs"}`.
   - **Permissions:** *Create new role for this schedule*.
3. Click **Create schedule**.

Each day the job refreshes prices, records the price and EV history, and fires watchlist alerts.

## 7. Check everything works

- [ ] `https://<your-domain>/api/health` returns `{"ok":true}`.
- [ ] You can sign in as admin and the **Admin** page shows data health.
- [ ] Product pages show **Fresh** prices from `TCGCSV` after the first refresh.
- [ ] A regular account can sign up, watch a product and set an alert.
- [ ] The next day, CodeBuild history shows a successful scheduled build.

> The **Refresh prices now** button on the Admin page runs the job inside a web request. That's fine for small catalogues, but on Amplify long runs can hit the request time limit. CodeBuild is the dependable path for the full job.

## 8. Recommended extras

- **Budget alert:** Billing → **Budgets → Create budget**, monthly cost budget of e.g. $25, with an email alert.
- **Failed-refresh email:**
  1. Create an SNS topic with an email subscription.
  2. Create an **EventBridge rule** on the event pattern `{"source":["aws.codebuild"],"detail-type":["CodeBuild Build State Change"],"detail":{"build-status":["FAILED"],"project-name":["sealedev-jobs"]}}`, with the SNS topic as its target.
- **Login rate limiting:** enable **AWS WAF** on the Amplify app (Amplify → Hosting → Firewall). Add a rate-based rule, e.g. 100 requests per 5 minutes per IP, to slow password guessing.
- **Backups:** RDS automated backups are on (7 days). Take a manual snapshot before big changes.

## Updating

- **App changes:** push to the branch and Amplify rebuilds and migrates automatically. The jobs project always runs the latest code from the branch.
- **New env var:** add it in Amplify (**Hosting → Environment variables**) and redeploy. If it's a new server-side variable, also add its name to the `grep` list in `amplify.yml`. Amplify only passes variables to the running server through that file.
- **Re-seeding** is safe and never overwrites refreshed prices: run the `db:seed` job again.

## Hardened alternative (private database, containers)

For stricter setups, keep RDS **private** (Public access: No) and run the app as a container inside the same VPC:

1. Build the included `Dockerfile` and push it to **Amazon ECR**. Use `docker build` + `docker push`, or a CodeBuild project with privileged mode. The image pulls Node from the public ECR mirror, so there are no Docker Hub rate limits.
2. Deploy it with **Amazon ECS Express Mode**. It creates the Fargate service, load balancer and HTTPS endpoint. Use container port `3000`, health check path `/api/health`, and the same environment variables as above, ideally from Secrets Manager.
3. Run the daily refresh by placing the CodeBuild jobs project in the same VPC (private subnets with a NAT gateway so it can reach tcgcsv.com). Alternatively, point a scheduler at `POST /api/cron/refresh-prices` with header `Authorization: Bearer <CRON_SECRET>`; a long-running container has no serverless request timeout.

**AWS App Runner stopped accepting new customers on 30 April 2026**, so it isn't covered here.
