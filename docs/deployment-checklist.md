# EAI Schema Toolkit Deployment Checklist

## Pre-deployment Preparation

### [ ] 1. Repository Setup
- [ ] Fork or clone the repository
- [ ] Update placeholder values in configuration files:
  - [ ] `package.json` - Update repository URL and author information
  - [ ] `app.json` - Update repository URL
  - [ ] `README.md` - Update placeholder URLs and usernames
  - [ ] Environment files - Update with actual values

### [ ] 2. GitHub Configuration
- [ ] Enable GitHub Pages in repository settings
- [ ] Set GitHub Pages source to `main` branch, `/(root)` folder
- [ ] Verify custom domain configuration (if applicable)
- [ ] Set up GitHub Secrets for deployment:
  - [ ] `HEROKU_API_KEY`
  - [ ] `HEROKU_APP_NAME`
  - [ ] `HEROKU_EMAIL`

### [ ] 3. Heroku Account Setup
- [ ] Create Heroku account (if not already done)
- [ ] Install Heroku CLI: `npm install -g heroku`
- [ ] Login to Heroku CLI: `heroku login`

### [ ] 4. Environment Variables
- [ ] Set up environment variables in `.env` file for local development:
  ```
  PORT=3001
  NODE_ENV=development
  FRONTEND_URL=https://[your-username].github.io
  LOG_LEVEL=info
  UPLOAD_PATH=./temp
  FILE_EXPIRY_HOURS=24
  ```

## Deployment Process

### [ ] 5. Local Testing
- [ ] Install dependencies: `npm install`
- [ ] Run tests: `npm test`
- [ ] Build application: `npm run build`
- [ ] Start server locally: `npm start`
- [ ] Verify application is running on `http://localhost:3001`

### [ ] 6. GitHub Actions Configuration
- [ ] Verify `.github/workflows/` contains all workflow files:
  - [ ] `ci.yml` - Continuous Integration
  - [ ] `deploy.yml` - Deployment to GitHub Pages and Heroku
  - [ ] `release.yml` - Semantic Release Management
- [ ] Ensure workflows have correct permissions

### [ ] 7. Initial Commit and Push
- [ ] Commit all changes: `git add . && git commit -m "Prepare for deployment"`
- [ ] Push to main branch: `git push origin main`

### [ ] 8. Monitor GitHub Actions
- [ ] Go to repository "Actions" tab
- [ ] Watch for workflow runs triggered by the push
- [ ] Verify all jobs complete successfully:
  - [ ] CI (Continuous Integration)
  - [ ] Deploy (GitHub Pages and Heroku)
  - [ ] Release (Semantic Release)

## Post-deployment Verification

### [ ] 9. Frontend Verification
- [ ] Visit GitHub Pages URL: `https://[your-username].github.io/eai-schema/`
- [ ] Verify web interface loads correctly
- [ ] Test file upload functionality
- [ ] Test URL import functionality
- [ ] Test message mapping functionality

### [ ] 10. Backend API Verification
- [ ] Visit backend health endpoint: `https://[heroku-app-name].herokuapp.com/api/health`
- [ ] Verify response shows `{ "status": "OK" }`
- [ ] Test API endpoints:
  - [ ] File upload: `POST /api/upload/file`
  - [ ] URL import: `POST /api/upload/url`
  - [ ] Message mapping: `POST /api/message-mapping/generate`
  - [ ] Schema validation: `POST /api/schema-validation/validate`

### [ ] 11. MCP Integration Verification
- [ ] Visit MCP provider endpoint: `https://[heroku-app-name].herouapp.com/api/mcp/provider`
- [ ] Verify response shows provider information
- [ ] Test MCP process endpoint: `https://[heroku-app-name].herokuapp.com/api/mcp/process`

### [ ] 12. Performance Monitoring Verification
- [ ] Visit metrics endpoint: `https://[heroku-app-name].herokuapp.com/api/performance/metrics`
- [ ] Verify Prometheus metrics are returned
- [ ] Set up Prometheus scraping (optional)
- [ ] Set up Grafana dashboard (optional)

### [ ] 13. Collaboration Features Verification
- [ ] Test WebSocket connection
- [ ] Verify real-time collaboration functionality
- [ ] Test multi-user scenarios

## Security & Monitoring Setup

### [ ] 14. Security Configuration
- [ ] Verify CORS settings are properly configured
- [ ] Check rate limiting is working
- [ ] Verify SSL/TLS encryption (provided by Heroku and GitHub Pages)
- [ ] Set up additional security measures if needed

### [ ] 15. Monitoring & Alerting
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up performance monitoring (Prometheus + Grafana)
- [ ] Configure log aggregation if needed

## Documentation & Support

### [ ] 16. Documentation Update
- [ ] Update README.md with actual deployment URLs
- [ ] Update API documentation with actual endpoints
- [ ] Create user guides if needed
- [ ] Set up issue templates in GitHub

### [ ] 17. Support Channels
- [ ] Set up GitHub Discussions for community support
- [ ] Configure issue templates and labels
- [ ] Set up contact email or support channel

## Ongoing Maintenance

### [ ] 18. Maintenance Procedures
- [ ] Set up automated backups if using persistent storage
- [ ] Configure log rotation and cleanup
- [ ] Set up security update notifications
- [ ] Schedule regular dependency updates

### [ ] 19. Scaling Considerations
- [ ] Monitor resource usage
- [ ] Plan for horizontal scaling if needed
- [ ] Consider database integration for persistent storage
- [ ] Plan for CDN integration if needed

## Success Criteria

### [ ] 20. Deployment Success Verification
- [ ] All checklist items completed
- [ ] Frontend accessible at GitHub Pages URL
- [ ] Backend API responsive at Heroku URL
- [ ] All core features working correctly
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Documentation updated

---

## Notes

1. **GitHub Pages Deployment**: Automatically handled by GitHub Actions on push to `main` branch
2. **Heroku Deployment**: Automatically handled by GitHub Actions on push to `main` branch
3. **Environment Variables**: Set in Heroku dashboard under "Settings" → "Reveal Config Vars"
4. **Custom Domains**: Configure in respective platform dashboards
5. **SSL Certificates**: Automatically provided by GitHub Pages and Heroku

## Troubleshooting

If deployment fails:
1. Check GitHub Actions logs in the "Actions" tab
2. Verify all required secrets are set in GitHub repository settings
3. Check Heroku logs: `heroku logs --tail --app [your-app-name]`
4. Verify environment variables are correctly set
5. Ensure all placeholder values have been replaced with actual values