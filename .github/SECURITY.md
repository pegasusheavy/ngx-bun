# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue
- Discuss the vulnerability publicly before it's fixed
- Exploit the vulnerability

### Do

1. **Email us directly** at pegasusheavyindustries@gmail.com with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (optional)

2. **Allow time for response**
   - We aim to acknowledge reports within 48 hours
   - We'll work with you to understand and resolve the issue
   - We'll keep you informed of our progress

3. **Coordinate disclosure**
   - We'll work with you on timing for public disclosure
   - We'll credit you in the security advisory (unless you prefer anonymity)

## Security Best Practices

When using `@pegasusheavy/ngx-bun`:

### Server Configuration

```typescript
// Always use HTTPS in production
createBunServer({
  engine,
  tls: {
    cert: process.env.SSL_CERT,
    key: process.env.SSL_KEY,
  },
});
```

### Environment Variables

- Never commit secrets to version control
- Use environment variables for sensitive configuration
- Rotate credentials regularly

### Dependencies

- Keep dependencies updated
- Review security advisories regularly
- Use `npm audit` or `bun audit` to check for vulnerabilities

## Security Features

This package includes several security-conscious features:

- **Path traversal prevention** in static file serving
- **Secure defaults** for cache headers
- **No eval or dynamic code execution**
- **TypeScript strict mode** for type safety

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report valid security issues will be acknowledged here (with permission).
