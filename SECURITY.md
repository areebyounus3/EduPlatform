# Security notes

- Never commit environment files, AWS credentials, access keys, private keys or passwords.
- GitHub Actions uses OIDC temporary credentials; do not create long-lived IAM user keys.
- Keep the S3 bucket private and grant EC2 read access only to this application's release path.
- Use Systems Manager rather than exposing SSH for routine deployments.
- Restrict inbound HTTP to the people who need the demo.
- The pipeline runs npm audit and Gitleaks as security gates.
