# GitHub Actions Workflows

This directory contains automated CI/CD workflows for building, testing, and deploying Tirnue Manager.

## 📋 Available Workflows

### 1. **Build and Publish** (`build-and-publish.yml`)

**Triggers:**
- Push to `main`, `master`, `develop`, or any `claude/**` branch
- Pull requests to `main` or `master`
- Manual trigger via GitHub Actions UI

**What it does:**
- ✅ Builds web and daemon components
- ✅ Runs tests (if available)
- ✅ Creates Docker images (for main/master only)
- ✅ Uploads build artifacts
- ✅ Deploys to staging/production (for main/master only)
- ✅ Sends notifications

**Artifacts Generated:**
- `tirnue-manager-web-{commit}` - Web panel build
- `tirnue-manager-daemon-{commit}` - Daemon build
- `tirnue-manager-full-{commit}` - Complete build

**Retention:** 30 days

---

### 2. **Pull Request Check** (`pr-check.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened
- Targets: `main`, `master`, or `develop` branches

**What it does:**
- ✅ Validates build succeeds
- ✅ Checks code quality
- ✅ Runs security audits
- ✅ Posts summary comment on PR

**Checks Performed:**
- Build compilation
- Frontend linting
- Console.log detection
- TODO comment listing
- npm security audit (all packages)

---

### 3. **Release Build** (`release.yml`)

**Triggers:**
- GitHub release published

**What it does:**
- ✅ Builds production code
- ✅ Downloads required binaries
- ✅ Creates Linux and Windows distributions
- ✅ Uploads release assets

**Outputs:**
- `mcsmanager_linux_release.tar.gz`
- `mcsmanager_windows_release.zip`

---

### 4. **Docker Release** (`docker.yml`)

**Triggers:**
- GitHub release published

**What it does:**
- ✅ Builds multi-platform Docker images (amd64, arm64)
- ✅ Publishes to GitHub Container Registry (ghcr.io)
- ✅ Supports multiple Java versions for daemon (8, 11, 17, 21)

**Images Published:**
- `ghcr.io/{owner}/tirnue-manager-web`
- `ghcr.io/{owner}/tirnue-manager-daemon`
- `ghcr.io/{owner}/tirnue-manager-daemon-jdk{version}`

---

### 5. **CodeQL Analysis** (`codeql.yml`)

**Triggers:**
- Push to default branch
- Pull requests
- Weekly schedule

**What it does:**
- ✅ Scans code for security vulnerabilities
- ✅ Detects common coding errors
- ✅ Analyzes JavaScript/TypeScript code

---

## 🚀 Quick Start

### Manual Build Trigger

1. Go to **Actions** tab in GitHub
2. Select **Build and Publish** workflow
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

### Viewing Build Artifacts

1. Go to **Actions** tab
2. Click on a completed workflow run
3. Scroll to **Artifacts** section
4. Download desired artifact

### Setting Up Deployment

To enable automatic deployment:

1. Create GitHub environments:
   ```bash
   # In repository Settings > Environments
   - staging
   - production
   ```

2. Add deployment secrets (if needed):
   ```bash
   # Settings > Secrets and variables > Actions
   - DEPLOY_SSH_KEY
   - DEPLOY_SERVER_HOST
   - DEPLOY_SERVER_USER
   ```

3. Update `deploy` job in `build-and-publish.yml` with your deployment commands

### Example Deployment Script

```yaml
- name: Deploy to server
  run: |
    # Install SSH key
    mkdir -p ~/.ssh
    echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key

    # Upload build
    scp -i ~/.ssh/deploy_key -r production-code/* \
      ${{ secrets.DEPLOY_SERVER_USER }}@${{ secrets.DEPLOY_SERVER_HOST }}:/opt/tirnue-manager/

    # Restart services
    ssh -i ~/.ssh/deploy_key \
      ${{ secrets.DEPLOY_SERVER_USER }}@${{ secrets.DEPLOY_SERVER_HOST }} \
      "cd /opt/tirnue-manager && pm2 restart all"
```

## 📦 Docker Usage

### Pull Latest Image

```bash
# Web panel
docker pull ghcr.io/{owner}/tirnue-manager-web:latest

# Daemon (Java 21)
docker pull ghcr.io/{owner}/tirnue-manager-daemon:latest

# Daemon (specific Java version)
docker pull ghcr.io/{owner}/tirnue-manager-daemon-jdk17:latest
```

### Run with Docker Compose

```yaml
version: '3.8'

services:
  web:
    image: ghcr.io/{owner}/tirnue-manager-web:latest
    ports:
      - "23333:23333"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  daemon:
    image: ghcr.io/{owner}/tirnue-manager-daemon:latest
    ports:
      - "24444:24444"
    volumes:
      - ./data:/opt/mcsmanager/daemon/data
    restart: unless-stopped
```

## 🔧 Workflow Customization

### Change Build Node Version

Edit `env.NODE_VERSION` in workflow files:

```yaml
env:
  NODE_VERSION: "20.x"  # Change to desired version
```

### Add Notifications

Add notification steps to `notify` job:

```yaml
# Slack notification
- name: Slack notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Build ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

```yaml
# Discord notification
- name: Discord notification
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
```

### Modify Artifact Retention

Change retention days in upload steps:

```yaml
- name: Upload build artifact
  uses: actions/upload-artifact@v4
  with:
    name: my-artifact
    path: ./build
    retention-days: 90  # Change from 30 to 90 days
```

## 🎯 Best Practices

1. **Branch Protection**: Enable branch protection rules for `main`/`master`
2. **Required Checks**: Make PR checks required before merging
3. **Secrets Management**: Store sensitive data in GitHub Secrets
4. **Cache Dependencies**: Workflows use npm cache to speed up builds
5. **Fail Fast**: Use `continue-on-error: true` for non-critical checks
6. **Matrix Builds**: Test multiple Node versions for compatibility

## 🐛 Troubleshooting

### Build Fails on Dependencies

```bash
# Clear npm cache
npm cache clean --force

# Or in workflow:
- name: Clear cache
  run: npm cache clean --force
```

### Permission Denied on Scripts

```bash
# Make scripts executable
chmod a+x ./install-dependents.sh
chmod a+x ./build.sh
```

### Docker Build Issues

```bash
# Check Dockerfile syntax
docker build -f dockerfile/web.dockerfile .

# Enable Docker BuildKit
DOCKER_BUILDKIT=1 docker build ...
```

## 📊 Monitoring

- **Build Status**: Check GitHub Actions tab
- **Artifacts**: Available for 30 days after build
- **Docker Images**: View in Packages section
- **Deployment Logs**: Check workflow run details

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Docker Build Push Action](https://github.com/marketplace/actions/build-and-push-docker-images)
- [Artifact Upload Action](https://github.com/marketplace/actions/upload-a-build-artifact)

## 📝 Notes

- All workflows use Node.js 20.x by default
- Docker images support both AMD64 and ARM64 architectures
- Build artifacts are retained for 30 days
- Security audits run on all npm packages
- PR checks automatically comment on pull requests

---

**Need help?** Check the [GitHub Actions documentation](https://docs.github.com/en/actions) or open an issue.
