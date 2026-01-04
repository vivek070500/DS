# DS Enterprises - Google Cloud Deployment Guide

This guide will help you deploy the DS Enterprises application to Google Cloud Platform.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud CLI (gcloud)** installed: https://cloud.google.com/sdk/docs/install
3. **Docker Desktop** installed and running
4. **Project ID**: `ds-enterprises-483308`

## Step-by-Step Deployment

### Step 1: Install and Configure Google Cloud CLI

```bash
# Install gcloud (if not already installed)
# macOS:
brew install google-cloud-sdk

# Login to Google Cloud
gcloud auth login

# Set the project
gcloud config set project ds-enterprises-483308
```

### Step 2: Enable Required APIs

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com
```

### Step 3: Create Cloud SQL Database

```bash
# Create PostgreSQL instance (this takes ~10 minutes)
gcloud sql instances create ds-enterprises-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=asia-south1 \
    --storage-type=SSD \
    --storage-size=10GB

# Create database
gcloud sql databases create ds_enterprises --instance=ds-enterprises-db

# Set password for postgres user (replace YOUR_SECURE_PASSWORD)
gcloud sql users set-password postgres \
    --instance=ds-enterprises-db \
    --password=YOUR_SECURE_PASSWORD

# Get the connection name (you'll need this)
gcloud sql instances describe ds-enterprises-db --format="value(connectionName)"
```

**Note the connection name** - it will look like: `ds-enterprises-483308:asia-south1:ds-enterprises-db`

### Step 4: Create Cloud Storage Bucket

```bash
# Create bucket for photo uploads
gsutil mb -p ds-enterprises-483308 -l asia-south1 gs://ds-enterprises-uploads-483308

# Make objects publicly readable
gsutil iam ch allUsers:objectViewer gs://ds-enterprises-uploads-483308
```

### Step 5: Deploy Backend

```bash
cd backend

# Build and push Docker image
gcloud builds submit --tag gcr.io/ds-enterprises-483308/ds-enterprises-backend

# Deploy to Cloud Run
gcloud run deploy ds-enterprises-backend \
    --image gcr.io/ds-enterprises-483308/ds-enterprises-backend \
    --platform managed \
    --region asia-south1 \
    --allow-unauthenticated \
    --set-env-vars "DATABASE_URL=postgres://postgres:YOUR_SECURE_PASSWORD@/ds_enterprises?host=/cloudsql/ds-enterprises-483308:asia-south1:ds-enterprises-db" \
    --set-env-vars "GCS_BUCKET_NAME=ds-enterprises-uploads-483308" \
    --set-env-vars "JWT_SECRET=your-super-secret-jwt-key-change-this" \
    --add-cloudsql-instances ds-enterprises-483308:asia-south1:ds-enterprises-db \
    --memory 512Mi

cd ..
```

**Get the backend URL:**
```bash
gcloud run services describe ds-enterprises-backend --region=asia-south1 --format="value(status.url)"
```

### Step 6: Deploy Frontend

```bash
cd frontend

# Get your Google OAuth Client ID
# Go to: https://console.cloud.google.com/apis/credentials

# Build with environment variables (replace YOUR_BACKEND_URL and YOUR_GOOGLE_CLIENT_ID)
gcloud builds submit \
    --tag gcr.io/ds-enterprises-483308/ds-enterprises-frontend \
    --build-arg NEXT_PUBLIC_API_URL=YOUR_BACKEND_URL \
    --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

# Deploy to Cloud Run
gcloud run deploy ds-enterprises-frontend \
    --image gcr.io/ds-enterprises-483308/ds-enterprises-frontend \
    --platform managed \
    --region asia-south1 \
    --allow-unauthenticated \
    --memory 512Mi

cd ..
```

**Get the frontend URL:**
```bash
gcloud run services describe ds-enterprises-frontend --region=asia-south1 --format="value(status.url)"
```

### Step 7: Update Backend CORS

```bash
# Update backend with frontend URL for CORS
FRONTEND_URL=$(gcloud run services describe ds-enterprises-frontend --region=asia-south1 --format="value(status.url)")

gcloud run services update ds-enterprises-backend \
    --region asia-south1 \
    --set-env-vars "FRONTEND_URL=${FRONTEND_URL}"
```

### Step 8: Update Google OAuth Settings

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins**:
   - Your frontend URL (e.g., `https://ds-enterprises-frontend-xxxxx-uc.a.run.app`)
4. Add to **Authorized redirect URIs**:
   - `https://your-frontend-url/login`

---

## Quick Deploy Script

For convenience, you can use the deployment script:

```bash
# Make script executable
chmod +x deploy.sh

# Deploy everything
./deploy.sh all

# Or deploy individual components
./deploy.sh backend
./deploy.sh frontend
./deploy.sh status
```

---

## Environment Variables Reference

### Backend (Cloud Run)
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@/db?host=/cloudsql/...` |
| `GCS_BUCKET_NAME` | Cloud Storage bucket name | `ds-enterprises-uploads-483308` |
| `JWT_SECRET` | Secret key for JWT tokens | Random 32+ character string |
| `FRONTEND_URL` | Frontend URL for CORS | `https://ds-enterprises-frontend-xxx.run.app` |

### Frontend (Build-time)
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://ds-enterprises-backend-xxx.run.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456789-xxx.apps.googleusercontent.com` |

---

## Estimated Costs

| Service | Free Tier | Estimated Monthly Cost |
|---------|-----------|----------------------|
| Cloud Run (2 services) | 2M requests/month | $0-10 |
| Cloud SQL (db-f1-micro) | None | ~$10-15 |
| Cloud Storage | 5GB free | $0-2 |
| **Total** | - | **~$10-25/month** |

---

## Troubleshooting

### View Logs
```bash
# Backend logs
gcloud run services logs read ds-enterprises-backend --region=asia-south1

# Frontend logs
gcloud run services logs read ds-enterprises-frontend --region=asia-south1
```

### Check Service Status
```bash
gcloud run services list --region=asia-south1
```

### Database Connection Issues
```bash
# Test database connectivity
gcloud sql connect ds-enterprises-db --user=postgres
```

### Redeploy After Changes
```bash
# Backend
cd backend && gcloud builds submit --tag gcr.io/ds-enterprises-483308/ds-enterprises-backend && gcloud run deploy ds-enterprises-backend --image gcr.io/ds-enterprises-483308/ds-enterprises-backend --region asia-south1

# Frontend
cd frontend && gcloud builds submit --tag gcr.io/ds-enterprises-483308/ds-enterprises-frontend && gcloud run deploy ds-enterprises-frontend --image gcr.io/ds-enterprises-483308/ds-enterprises-frontend --region asia-south1
```

---

## Security Recommendations

1. **Use Secret Manager** for sensitive values:
   ```bash
   echo -n "your-secret" | gcloud secrets create JWT_SECRET --data-file=-
   ```

2. **Enable Cloud Armor** for DDoS protection

3. **Set up Cloud IAM** for proper access control

4. **Enable Cloud Audit Logs** for compliance

---

## Need Help?

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Google Cloud Support](https://cloud.google.com/support)

