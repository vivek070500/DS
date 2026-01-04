#!/bin/bash

# DS Enterprises - Google Cloud Deployment Script
# Project ID: ds-enterprises-483308

set -e

PROJECT_ID="ds-enterprises-483308"
REGION="asia-south1"  # Mumbai region (closest to India)
BACKEND_SERVICE="ds-enterprises-backend"
FRONTEND_SERVICE="ds-enterprises-frontend"
DB_INSTANCE="ds-enterprises-db"
BUCKET_NAME="ds-enterprises-uploads-${PROJECT_ID}"

echo "🚀 DS Enterprises GCP Deployment Script"
echo "========================================"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Function to check if gcloud is authenticated
check_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 > /dev/null 2>&1; then
        echo "❌ Not authenticated with gcloud. Running gcloud auth login..."
        gcloud auth login
    fi
}

# Function to set project
set_project() {
    echo "📌 Setting project to ${PROJECT_ID}..."
    gcloud config set project ${PROJECT_ID}
}

# Function to enable required APIs
enable_apis() {
    echo "🔧 Enabling required APIs..."
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        sqladmin.googleapis.com \
        storage.googleapis.com \
        secretmanager.googleapis.com \
        artifactregistry.googleapis.com
}

# Function to create Cloud SQL instance
create_database() {
    echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
    
    # Check if instance exists
    if gcloud sql instances describe ${DB_INSTANCE} --project=${PROJECT_ID} > /dev/null 2>&1; then
        echo "Database instance already exists."
    else
        gcloud sql instances create ${DB_INSTANCE} \
            --database-version=POSTGRES_15 \
            --tier=db-f1-micro \
            --region=${REGION} \
            --storage-type=SSD \
            --storage-size=10GB \
            --no-assign-ip \
            --network=default
        
        # Create database
        gcloud sql databases create ds_enterprises --instance=${DB_INSTANCE}
        
        # Set password for postgres user
        echo "⚠️  Please set a strong password for the database:"
        read -s -p "Enter database password: " DB_PASSWORD
        echo ""
        gcloud sql users set-password postgres \
            --instance=${DB_INSTANCE} \
            --password=${DB_PASSWORD}
    fi
}

# Function to create Cloud Storage bucket
create_bucket() {
    echo "📦 Creating Cloud Storage bucket..."
    
    if gsutil ls gs://${BUCKET_NAME} > /dev/null 2>&1; then
        echo "Bucket already exists."
    else
        gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${BUCKET_NAME}
        gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME}
        gsutil cors set cors.json gs://${BUCKET_NAME} 2>/dev/null || true
    fi
}

# Function to deploy backend
deploy_backend() {
    echo "🔧 Deploying Backend to Cloud Run..."
    
    cd backend
    
    # Build and push Docker image
    gcloud builds submit --tag gcr.io/${PROJECT_ID}/${BACKEND_SERVICE}
    
    # Deploy to Cloud Run
    gcloud run deploy ${BACKEND_SERVICE} \
        --image gcr.io/${PROJECT_ID}/${BACKEND_SERVICE} \
        --platform managed \
        --region ${REGION} \
        --allow-unauthenticated \
        --set-env-vars "GCS_BUCKET_NAME=${BUCKET_NAME}" \
        --add-cloudsql-instances ${PROJECT_ID}:${REGION}:${DB_INSTANCE} \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10
    
    # Get the backend URL
    BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region=${REGION} --format="value(status.url)")
    echo "✅ Backend deployed at: ${BACKEND_URL}"
    
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    echo "🎨 Deploying Frontend to Cloud Run..."
    
    # Get backend URL
    BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region=${REGION} --format="value(status.url)")
    
    cd frontend
    
    # Build and push Docker image with environment variables
    gcloud builds submit \
        --tag gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE} \
        --substitutions="_NEXT_PUBLIC_API_URL=${BACKEND_URL},_NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"
    
    # Deploy to Cloud Run
    gcloud run deploy ${FRONTEND_SERVICE} \
        --image gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE} \
        --platform managed \
        --region ${REGION} \
        --allow-unauthenticated \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10
    
    # Get the frontend URL
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region=${REGION} --format="value(status.url)")
    echo "✅ Frontend deployed at: ${FRONTEND_URL}"
    
    cd ..
}

# Function to update backend with frontend URL for CORS
update_backend_cors() {
    echo "🔄 Updating backend CORS settings..."
    
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region=${REGION} --format="value(status.url)")
    
    gcloud run services update ${BACKEND_SERVICE} \
        --region ${REGION} \
        --set-env-vars "FRONTEND_URL=${FRONTEND_URL}"
}

# Function to show status
show_status() {
    echo ""
    echo "========================================"
    echo "🎉 Deployment Complete!"
    echo "========================================"
    
    BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region=${REGION} --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region=${REGION} --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    
    echo ""
    echo "📡 Backend URL:  ${BACKEND_URL}"
    echo "🌐 Frontend URL: ${FRONTEND_URL}"
    echo ""
    echo "⚠️  Don't forget to:"
    echo "   1. Set DATABASE_URL secret in Cloud Run"
    echo "   2. Update Google OAuth redirect URIs with: ${FRONTEND_URL}"
    echo "   3. Set JWT_SECRET in Cloud Run"
    echo ""
}

# Main menu
case "${1:-menu}" in
    "all")
        check_auth
        set_project
        enable_apis
        create_database
        create_bucket
        deploy_backend
        deploy_frontend
        update_backend_cors
        show_status
        ;;
    "backend")
        check_auth
        set_project
        deploy_backend
        ;;
    "frontend")
        check_auth
        set_project
        deploy_frontend
        ;;
    "database")
        check_auth
        set_project
        create_database
        ;;
    "bucket")
        check_auth
        set_project
        create_bucket
        ;;
    "status")
        check_auth
        set_project
        show_status
        ;;
    "menu"|*)
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  all       - Full deployment (database, storage, backend, frontend)"
        echo "  backend   - Deploy only backend"
        echo "  frontend  - Deploy only frontend"
        echo "  database  - Create Cloud SQL database only"
        echo "  bucket    - Create Cloud Storage bucket only"
        echo "  status    - Show deployment status"
        ;;
esac

