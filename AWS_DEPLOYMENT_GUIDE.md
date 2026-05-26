# StyleSynk — AWS Deployment Guide

> Complete guide for deploying StyleSynk Salon Management System to AWS with production-ready configuration.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Option 1: AWS Elastic Beanstalk (Recommended for MVP)](#option-1-aws-elastic-beanstalk)
5. [Option 2: AWS ECS with Fargate](#option-2-aws-ecs-with-fargate)
6. [Option 3: EC2 with Docker](#option-3-ec2-with-docker)
7. [Database Setup (RDS PostgreSQL)](#database-setup-rds-postgresql)
8. [Environment Configuration](#environment-configuration)
9. [SSL/TLS Certificate Setup](#ssltls-certificate-setup)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Monitoring & Logging](#monitoring--logging)
12. [Cost Optimization](#cost-optimization)
13. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                            │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Route 53   │──────│     ALB      │                    │
│  │     DNS      │      │ Load Balancer│                    │
│  └──────────────┘      └──────┬───────┘                    │
│                               │                             │
│                    ┌──────────┴──────────┐                 │
│                    │                     │                 │
│         ┌──────────▼─────────┐  ┌───────▼────────┐        │
│         │   ECS/EB/EC2       │  │   S3 Bucket    │        │
│         │   (API Server)     │  │  (Static Files)│        │
│         │   + Socket.IO      │  └────────────────┘        │
│         └──────────┬─────────┘                            │
│                    │                                       │
│         ┌──────────▼─────────┐                            │
│         │   RDS PostgreSQL   │                            │
│         │   (Multi-AZ)       │                            │
│         └────────────────────┘                            │
│                                                            │
│  ┌──────────────┐      ┌──────────────┐                  │
│  │  CloudWatch  │      │   Secrets    │                  │
│  │   Logs       │      │   Manager    │                  │
│  └──────────────┘      └──────────────┘                  │
└────────────────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

### Required AWS Services
- AWS Account with billing enabled
- AWS CLI installed and configured
- IAM user with appropriate permissions

### Local Requirements
- Node.js 18+ installed
- Docker installed (for containerized deployments)
- Git installed

### Domain & SSL
- Domain name (optional but recommended)
- AWS Certificate Manager (ACM) certificate

---

## 🚀 Deployment Options

### Comparison Matrix

| Feature | Elastic Beanstalk | ECS Fargate | EC2 + Docker |
|---------|-------------------|-------------|--------------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Cost (Small)** | $20-40/mo | $30-50/mo | $15-30/mo |
| **Scalability** | Auto | Auto | Manual |
| **Control** | Medium | High | Full |
| **Best For** | MVP/Hackathon | Production | Custom needs |

---

## Option 1: AWS Elastic Beanstalk

**Recommended for**: Quick deployment, MVP, hackathons

### Step 1: Install EB CLI

```bash
pip install awsebcli --upgrade --user
```

### Step 2: Initialize Elastic Beanstalk

```bash
cd StyleSynk
eb init

# Select:
# - Region: us-east-1 (or your preferred region)
# - Application name: stylesynk
# - Platform: Docker
# - SSH: Yes (for debugging)
```

### Step 3: Create Environment Configuration

Create `.ebextensions/01_environment.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 5000
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: client/dist
```

### Step 4: Create Dockerrun.aws.json

```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "stylesynk-api",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": 5000,
      "HostPort": 5000
    }
  ],
  "Volumes": [],
  "Logging": "/var/log/stylesynk"
}
```

### Step 5: Deploy

```bash
# Create environment
eb create stylesynk-prod \
  --instance-type t3.small \
  --database.engine postgres \
  --database.size 20 \
  --envvars \
    JWT_SECRET=your_secret_here,\
    GROQ_API_KEY=your_groq_key_here

# Deploy updates
eb deploy

# Open in browser
eb open
```

### Step 6: Configure Database

```bash
# Get RDS endpoint
eb printenv

# Run migrations
eb ssh
cd /var/app/current
psql -h <RDS_ENDPOINT> -U ebroot -d ebdb -f server/src/database/schema.sql
psql -h <RDS_ENDPOINT> -U ebroot -d ebdb -f server/src/database/seed.sql
```

---

## Option 2: AWS ECS with Fargate

**Recommended for**: Production deployments, better control

### Step 1: Create ECR Repository

```bash
# Create repository
aws ecr create-repository --repository-name stylesynk-api

# Get login command
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Step 2: Build and Push Docker Image

```bash
# Build image
cd server
docker build -t stylesynk-api:latest .

# Tag for ECR
docker tag stylesynk-api:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/stylesynk-api:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/stylesynk-api:latest
```

### Step 3: Create ECS Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "stylesynk-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "stylesynk-api",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/stylesynk-api:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "5000"}
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:stylesynk/db-password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:stylesynk/jwt-secret"
        },
        {
          "name": "GROQ_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:stylesynk/groq-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/stylesynk-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 4: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name stylesynk-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster stylesynk-cluster \
  --service-name stylesynk-api-service \
  --task-definition stylesynk-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 5: Configure Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name stylesynk-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name stylesynk-targets \
  --protocol HTTP \
  --port 5000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /api/health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>
```

---

## Option 3: EC2 with Docker

**Recommended for**: Maximum control, custom configurations

### Step 1: Launch EC2 Instance

```bash
# Launch Ubuntu 22.04 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxx \
  --subnet-id subnet-xxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=stylesynk-server}]'
```

### Step 2: Connect and Setup

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<instance-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone <your-repo-url> /home/ubuntu/stylesynk
cd /home/ubuntu/stylesynk

# Create .env file
cp server/.env.example server/.env
nano server/.env  # Edit with production values

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Step 4: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/stylesynk
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/stylesynk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🗄️ Database Setup (RDS PostgreSQL)

### Step 1: Create RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier stylesynk-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username stylesynk_admin \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --multi-az \
  --publicly-accessible false \
  --storage-encrypted
```

### Step 2: Configure Security Group

```bash
# Allow PostgreSQL access from application security group
aws ec2 authorize-security-group-ingress \
  --group-id <db-security-group> \
  --protocol tcp \
  --port 5432 \
  --source-group <app-security-group>
```

### Step 3: Run Database Migrations

```bash
# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier stylesynk-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# Connect and run migrations
psql -h <rds-endpoint> -U stylesynk_admin -d postgres

# Create database
CREATE DATABASE stylesynk;
\c stylesynk

# Run schema
\i /path/to/schema.sql
\i /path/to/seed.sql
```

### Step 4: Enable Automated Backups

```bash
aws rds modify-db-instance \
  --db-instance-identifier stylesynk-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

---

## 🔐 Environment Configuration

### Using AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name stylesynk/db-password \
  --secret-string "your-db-password"

aws secretsmanager create-secret \
  --name stylesynk/jwt-secret \
  --secret-string "your-jwt-secret-min-32-chars"

aws secretsmanager create-secret \
  --name stylesynk/groq-key \
  --secret-string "your-groq-api-key"

# Retrieve secrets in application
aws secretsmanager get-secret-value \
  --secret-id stylesynk/db-password \
  --query SecretString \
  --output text
```

### Environment Variables Checklist

```bash
# Required
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com

# Database
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=stylesynk
DB_USER=stylesynk_admin
DB_PASSWORD=<from-secrets-manager>

# Auth
JWT_SECRET=<from-secrets-manager>
JWT_EXPIRES_IN=7d

# AI
GROQ_API_KEY=<from-secrets-manager>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 🔒 SSL/TLS Certificate Setup

### Using AWS Certificate Manager (ACM)

```bash
# Request certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names www.your-domain.com \
  --validation-method DNS

# Get validation records
aws acm describe-certificate \
  --certificate-arn <cert-arn>

# Add CNAME records to Route 53 or your DNS provider
```

### Configure HTTPS Listener

```bash
# Add HTTPS listener to ALB
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>

# Redirect HTTP to HTTPS
aws elbv2 modify-listener \
  --listener-arn <http-listener-arn> \
  --default-actions Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: stylesynk-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd server
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster stylesynk-cluster \
            --service stylesynk-api-service \
            --force-new-deployment
```

---

## 📊 Monitoring & Logging

### CloudWatch Setup

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/stylesynk/api

# Create metric alarms
aws cloudwatch put-metric-alarm \
  --alarm-name stylesynk-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Database monitoring
aws cloudwatch put-metric-alarm \
  --alarm-name stylesynk-db-connections \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### Application Monitoring

Add to `server/src/app.js`:

```javascript
// CloudWatch metrics
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    cloudwatch.putMetricData({
      Namespace: 'StyleSynk',
      MetricData: [{
        MetricName: 'ResponseTime',
        Value: duration,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      }]
    });
  });
  next();
});
```

---

## 💰 Cost Optimization

### Estimated Monthly Costs

| Service | Configuration | Cost |
|---------|--------------|------|
| **EC2/ECS** | t3.small (2 instances) | $30 |
| **RDS** | db.t3.micro (Multi-AZ) | $30 |
| **ALB** | Standard | $20 |
| **Data Transfer** | 100GB | $9 |
| **CloudWatch** | Logs + Metrics | $5 |
| **S3** | 10GB storage | $1 |
| **Total** | | **~$95/month** |

### Cost Reduction Tips

1. **Use Reserved Instances** - Save 30-60% on EC2/RDS
2. **Enable Auto-Scaling** - Scale down during off-hours
3. **Use S3 Intelligent-Tiering** - Automatic cost optimization
4. **Implement Caching** - Reduce database queries
5. **Optimize Images** - Use CloudFront CDN
6. **Monitor Unused Resources** - Use AWS Cost Explorer

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Timeout

```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id>

# Test connection
telnet <rds-endpoint> 5432

# Check RDS status
aws rds describe-db-instances --db-instance-identifier stylesynk-db
```

#### 2. Socket.IO Not Working

- Ensure ALB has sticky sessions enabled
- Check WebSocket support in ALB target group
- Verify CORS settings in `server/src/app.js`

```bash
# Enable sticky sessions
aws elbv2 modify-target-group-attributes \
  --target-group-arn <arn> \
  --attributes Key=stickiness.enabled,Value=true
```

#### 3. High Memory Usage

```bash
# Check container metrics
aws ecs describe-tasks --cluster stylesynk-cluster --tasks <task-id>

# Increase memory allocation in task definition
# Update cpu: "1024", memory: "2048"
```

#### 4. SSL Certificate Issues

```bash
# Verify certificate status
aws acm describe-certificate --certificate-arn <cert-arn>

# Check DNS validation
dig CNAME _validation.your-domain.com
```

---

## 📚 Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS PostgreSQL Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Socket.IO on AWS](https://socket.io/docs/v4/using-multiple-nodes/)

---

## ✅ Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] SSL certificate installed and verified
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Auto-scaling configured
- [ ] Security groups reviewed
- [ ] Cost alerts set up
- [ ] Documentation updated

---

**Need Help?** Open an issue or contact the development team.

**Last Updated**: 2026-05-26