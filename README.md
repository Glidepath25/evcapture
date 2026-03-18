# EVcapture

Mobile-first site survey capture app for Glidepath Solutions. Surveyors open a public URL, complete a structured site survey, attach photos, and submit the record. The backend stores the submission, generates a CSV and PDF, emails both files automatically, and issues a reference number.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- SQLite via `better-sqlite3`
- Local disk storage with a swappable storage service layer
- PDF generation with `pdfkit`
- CSV generation with `csv-stringify`
- Email delivery via Resend or SMTP

## Features

- Public form with no login
- Mobile-first layout with card rows on phones and table layout on larger screens
- Editable project dropdown backed by [`data/projects.json`](./data/projects.json)
- Fixed survey template backed by [`data/survey-template.ts`](./data/survey-template.ts)
- Multiple photo upload with mobile camera support and desktop drag/drop
- Hidden honeypot, upload constraints, sanitised filenames, and IP-based rate limiting
- Submission reference number and PDF download link on success
- Submission, line-item, photo, log, and rate-limit tables stored in SQLite
- Read-only password-protected admin area at `/admin`

## Local Run

1. Copy `.env.example` to `.env`.
2. Set at least `ADMIN_PASSWORD`, `DESTINATION_EMAIL`, `EMAIL_FROM`, and either `RESEND_API_KEY` or the SMTP variables.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Environment Variables

Use [`.env.example`](./.env.example) as the base.

Important production values for the DigitalOcean deployment:

```env
APP_BASE_URL=https://evcapture.glidepathsolutions.co.uk
PORT=3000
ADMIN_PASSWORD=choose-a-strong-shared-password
DATABASE_FILE=/var/www/evcapture/shared/app.db
UPLOAD_ROOT=/var/www/evcapture/shared/uploads
GENERATED_ROOT=/var/www/evcapture/shared/generated
DESTINATION_EMAIL=office@example.com
CC_EMAIL=
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=Glidepath Surveys <surveys@yourdomain.com>
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_SUBMISSIONS=5
MAX_UPLOAD_MB=8
MAX_UPLOAD_COUNT=8
```

## Changing the Project Dropdown

Edit [`data/projects.json`](./data/projects.json). Each entry needs:

```json
{
  "id": "unique-project-id",
  "name": "Project Display Name"
}
```

No admin UI is required in v1; the app reads the JSON file directly.

## Admin Area

The app includes a simple shared-password admin area for internal use:

- URL: `/admin`
- Access model: one shared password stored in `ADMIN_PASSWORD`
- Session model: successful login sets an `HttpOnly` cookie scoped to `/admin`
- Scope: read-only submission list, detail view, protected photo viewing, and protected PDF/CSV downloads

To enable it:

1. Set `ADMIN_PASSWORD` in `.env` or the server environment.
2. Redeploy or restart the app.
3. Open `https://evcapture.glidepathsolutions.co.uk/admin`.

This is intentionally lightweight for v1. It is not a multi-user auth system and should only be used behind a strong shared password.

## Deployment to a DigitalOcean Droplet

Recommended target:

- Ubuntu 24.04 Droplet
- 2 GB RAM / 1 vCPU minimum
- Nginx reverse proxy
- PM2 for process management
- Local disk for SQLite and uploaded/generated files

Suggested server layout:

```text
/var/www/evcapture/
  current/   -> deployed app release
  shared/
    app.db
    uploads/
    generated/
```

### 1. Point the subdomain

Create an `A` record for `evcapture.glidepathsolutions.co.uk` pointing to the Droplet IP.

### 2. Base server setup

SSH to the Droplet and install system packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx sqlite3 build-essential
```

Install Node 22 LTS with `nvm` under your deploy user:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22
nvm use 22
npm install -g pm2
```

### 3. Create app directories

```bash
sudo mkdir -p /var/www/evcapture/shared/uploads
sudo mkdir -p /var/www/evcapture/shared/generated
sudo mkdir -p /var/www/evcapture/current
sudo chown -R $USER:$USER /var/www/evcapture
```

### 4. Copy the app to the server

Upload the repository contents to `/var/www/evcapture/current`, then:

```bash
cd /var/www/evcapture/current
cp .env.example .env
npm ci
npm run build
```

Update `.env` for production using the values above.

### 5. Start with PM2

Use the supplied PM2 config at [`deploy/ecosystem.config.cjs`](./deploy/ecosystem.config.cjs).

```bash
cd /var/www/evcapture/current
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

### 6. Configure Nginx

Copy [`deploy/evcapture.nginx.conf`](./deploy/evcapture.nginx.conf) to `/etc/nginx/sites-available/evcapture`, then enable it:

```bash
sudo ln -s /etc/nginx/sites-available/evcapture /etc/nginx/sites-enabled/evcapture
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Enable HTTPS

Install Certbot and request the certificate:

```bash
sudo snap install core && sudo snap refresh core
sudo apt remove certbot -y || true
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d evcapture.glidepathsolutions.co.uk
sudo certbot renew --dry-run
```

### 8. Updating the app

```bash
cd /var/www/evcapture/current
git pull
npm ci
npm run build
pm2 reload evcapture
```

## Build Output for Production

`next.config.ts` is set to `output: "standalone"` so the app can be self-hosted cleanly behind Nginx on the Droplet.

## File Storage Recommendation if Photo Volume Grows

The current storage layer writes to local disk. That is fine for MVP on a single Droplet.

Recommended next step if photo volume grows:

- Move photo and generated-file storage to DigitalOcean Spaces or another S3-compatible object store.
- Keep SQLite only for metadata in the short term, or move metadata to Postgres later.
- Retain the current `lib/storage.ts` boundary so the swap is isolated.

## Cheapest Reliable Hosting Recommendation

For this specific app, the cheapest reliable fit is usually a single DigitalOcean Basic Droplet with persistent local disk because:

- The app needs durable local file storage for uploads and generated PDFs/CSVs.
- SQLite is simple and cheap for MVP.
- The app has modest traffic expectations and no login complexity.

Practical starting point:

- 2 GB / 1 vCPU Ubuntu 24.04 Droplet
- Daily backups enabled if the submissions matter operationally

If usage grows materially, move to:

- DigitalOcean Managed PostgreSQL
- DigitalOcean Spaces for file storage
- Either keep the Droplet for the app or containerise it later

## Email Provider Recommendation

Recommended order:

1. Resend for the MVP. It is simple to integrate, works well for transactional email, and suits this app’s attachment-based workflow.
2. SMTP if Glidepath already has a managed mailbox or relay service available.

For Resend:

- Verify the sending domain used by `EMAIL_FROM`.
- Add `RESEND_API_KEY`.
- Set `EMAIL_PROVIDER=resend`.

For SMTP:

- Set `EMAIL_PROVIDER=smtp`.
- Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD`.

## Notes

- Email failure does not block the public success screen. The submission still saves, and the failure is written to the `submission_logs` table plus the submission record.
- The database bootstraps itself on first run; no separate migration step is required for v1.
- Uploaded files are stored outside `public/`, so they are not anonymously browsable.
- Public survey submission remains unauthenticated in v1, but `/admin` is password-protected and serves photos/files only after the admin cookie is present.
