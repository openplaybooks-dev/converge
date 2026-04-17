# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue

Please **do not** open a public GitHub issue if the bug is a security vulnerability.

### 2. Report Privately

Instead, please report security vulnerabilities via:

- **GitHub Security Advisories**: Use the [Security tab](https://github.com/converge-framework/converge/security/advisories/new) to report vulnerabilities privately
- **Email**: [Add your security email here]

### 3. What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### 4. Response Timeline

- We will acknowledge your report within **48 hours**
- We will provide a detailed response within **7 days** indicating the next steps
- We will work with you to understand and resolve the issue
- We will notify you when the issue is fixed
- We will publicly disclose the issue after a patch is released

## Security Best Practices

When using crew in production:

- Keep dependencies up to date
- Use the latest version of crew
- Review generated code before execution
- Use environment variables for sensitive data
- Follow the principle of least privilege for AI agents
- Monitor and log agent activities

## Security Measures

crew implements several security measures:

- **Input Validation**: All inputs are validated before processing
- **Sandboxing**: Agent execution can be sandboxed
- **Code Review**: All code changes undergo review
- **Dependency Scanning**: Automated dependency vulnerability scanning
- **Static Analysis**: CodeQL and other static analysis tools

## Credits

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in our security advisories (unless they prefer to remain anonymous).
