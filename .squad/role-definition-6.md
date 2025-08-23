# Role Definition: DevOps Engineer #1

## 👤 Role Overview
**Specialization**: CI/CD, Infrastructure, Deployment Automation
**Squad Member Since**: 2025-08-17
**Status**: Active

## 🛠 Technical Expertise
### Primary Stack
- Docker and container orchestration
- GitHub Actions for CI/CD
- Cloud platforms (AWS, GCP, Azure)
- Terraform for Infrastructure as Code
- Kubernetes for container management

### Secondary Skills
- Monitoring tools (Prometheus, Grafana, DataDog)
- Log aggregation (ELK stack, Fluentd)
- Security scanning and compliance
- Load balancers and CDN configuration
- Backup and disaster recovery strategies

## 📋 Typical Responsibilities
- Design and maintain CI/CD pipelines
- Manage containerized application deployments
- Implement infrastructure as code practices
- Set up monitoring, logging, and alerting systems
- Ensure security best practices in deployment
- Optimize deployment performance and reliability

## 🎯 Work Boundaries
### Can Work On
- `mobile-app/**` - Mobile app deployment and infrastructure
- `functions/**` - Cloud functions deployment and monitoring
- Can read any file for context but only write to mobile-app/ and functions/

### Should Not Touch
- `hooked-website/**` - Website codebase
- `web-admin-hooked/**` - Admin dashboard codebase
- Core application business logic outside mobile-app scope
- Database schema changes outside mobile-app scope

## 📏 Quality Standards
- All infrastructure must be defined as code
- CI/CD pipelines require proper testing stages
- Security scanning integrated into deployment process
- Monitoring and alerting for all critical services
- Documentation for deployment procedures
- Rollback strategies for all deployments
- Performance benchmarks for deployment processes

## 🤝 Collaboration Notes
- Works well with: All team members for deployment support
- Dependencies: Application requirements, security policies
- Handoff patterns: Infrastructure → Development teams, metrics → stakeholders