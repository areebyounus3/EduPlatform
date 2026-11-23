# Searchable Study Platform — CI/CD Demonstration

A small, working Node.js web application built to demonstrate the assignment's complete delivery path:

**Code change → GitHub push → unit tests → security checks → build ZIP → private S3 → EC2 deployment → live health check.**

The app contains a small sample library of study notes. Users can search the notes by title, course, description or tag. The sample dataset is in memory and is intended for a CI/CD demonstration; it is not the full PDF upload/OCR/PostgreSQL system described in the earlier architecture proposal.

## Run locally

Requirements: Node.js 22 or later and npm.

```bash
npm ci
npm test
npm run check
npm start
```

Open http://localhost:3000. The health endpoint is /health and the search API is /api/documents?q=aws.

There are no third-party runtime or test dependencies. Tests use Node's built-in test runner. The pipeline includes npm audit and Gitleaks secret scanning.

## GitHub Actions

The workflow is at `.github/workflows/cicd.yml`. It runs syntax checks, unit tests, dependency auditing and secret scanning on pushes and pull requests. On pushes to main it packages the application, uploads an immutable ZIP to S3 using GitHub OIDC, deploys that exact artifact to EC2 through Systems Manager, and verifies the public health endpoint.

## GitHub repository variables

In **Settings → Secrets and variables → Actions → Variables**, create:

| Variable | Example / value |
|---|---|
| `AWS_REGION` | `ap-south-1` (Mumbai) |
| `S3_BUCKET` | Your globally unique private S3 bucket name |
| `AWS_ROLE_TO_ASSUME` | Full ARN of the GitHub deployment IAM role |
| `EC2_INSTANCE_ID` | Your EC2 instance ID |
| `APP_URL` | `http://YOUR_EC2_PUBLIC_IP` (no trailing slash) |

The workflow uses GitHub OIDC for temporary credentials. Do not create long-lived AWS access keys for this project.

## AWS resources

Use one region consistently. The examples use `ap-south-1` (Mumbai).

### S3

Create a private bucket. Keep Block Public Access enabled and enable versioning. Releases are stored under `releases/<commit-sha>/release.zip`; `latest/release.zip` is updated only after a successful deployment.

### EC2

Launch Ubuntu Server 24.04 LTS x86_64. Attach an instance profile with:
1. `AmazonSSMManagedInstanceCore`.
2. An inline policy granting `s3:GetObject` only on `arn:aws:s3:::YOUR_BUCKET/releases/*`.

Run `ops/bootstrap-ec2-ubuntu.sh` once using an SSM session or another secure administrative method:

```bash
sudo bash ops/bootstrap-ec2-ubuntu.sh
```

The script installs Node.js 24, AWS CLI, Nginx and SSM Agent if needed; creates the `studyapp` service account; and configures systemd and Nginx. It does not create AWS resources or attach IAM roles.

For the EC2 security group, allow inbound TCP port 80 only from the audience that needs to view the demo. Do not open port 22 for this SSM-based deployment. The app listens on localhost port 3000 behind Nginx.

### GitHub OIDC identity provider

In AWS IAM, create an OpenID Connect provider:
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### GitHub deployment role

Create an IAM role trusted by that provider. GitHub repositories created after 15 July 2026 use repository and owner IDs in the default OIDC subject. Use the trust-policy template in `ops/github-oidc-trust-policy-template.json` and replace all placeholders with the actual AWS account ID, owner ID, repository ID and repository name.

The owner ID for this GitHub account is `360334793`. The current repository ID is `1469024510`. Verify both values in GitHub before configuring AWS.

Attach the permissions in `ops/github-deployment-permissions-template.json`, replacing the bucket, region, AWS account and instance placeholders. Attach `ops/ec2-instance-s3-read-policy-template.json` to the EC2 instance role.

## Demonstrate a visible code change

Edit the tracked `VERSION` file from `v1.0.0` to `v1.0.1`, then commit and push:

```bash
git add VERSION
git commit -m "Release v1.0.1 for CI/CD demonstration"
git push origin main
```

The page shows the release badge and footer version. The `/health` endpoint also reports the deployed version and commit SHA.

## Pipeline behavior

1. Pushes and pull requests run syntax checks, automated tests, `npm audit` and Gitleaks.
2. A push to main builds a ZIP and uploads the immutable release to S3 using OIDC.
3. The deploy job instructs EC2 to download that exact commit's ZIP from S3 using Systems Manager Run Command.
4. EC2 installs the release, switches the current symlink, restarts systemd and runs a local health check.
5. Only after EC2 succeeds does GitHub update the S3 latest pointer and verify the public `/health` endpoint.

A failed test or security gate prevents the artifact and deployment jobs from running.

## Submission evidence

For the two-minute demo, capture:
- Edit VERSION from v1.0.0 to v1.0.1.
- Commit and push to main.
- GitHub Actions showing passing tests, dependency audit and Gitleaks.
- S3 showing the commit-specific release ZIP and latest pointer.
- Deployment job showing successful Systems Manager execution.
- The live site showing v1.0.1 and the /health JSON.

## Scope and limitations

This is a working CI/CD demonstration app with a searchable in-memory sample notes catalogue. It is not the fully featured PDF upload, OCR, SQS, Lambda and PostgreSQL system in the architecture proposal. Those components can be developed later; this demo focuses on the assignment's code-to-S3-to-EC2 delivery chain.

The repository workflow does not create or pay for AWS infrastructure automatically. AWS resource creation, IAM trust and permissions, region/bucket settings and the first EC2 bootstrap require the AWS account owner's actions. Check AWS pricing and stop or delete demo resources after grading.
