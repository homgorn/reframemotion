# Security policy

## Supported version

Security fixes are applied to the latest `main` branch.

## Threat model

ReFrameMotion executes browser and media tooling. Treat templates as trusted code. The HTTP API accepts only registered template IDs and validated variables; it intentionally does not accept arbitrary HTML or shell commands.

Production requirements:

- set a strong `REFRAMOTION_API_KEY`;
- bind the service behind TLS or a private network;
- run the worker as a non-root user;
- keep `templates/`, `data/` and output paths on separate writable volumes;
- do not allow untrusted remote asset URLs without an egress allowlist;
- keep HyperFrames, Chromium, FFmpeg and Remotion patched;
- scan uploaded assets before copying them into a template workspace.

Report vulnerabilities privately through GitHub security advisories. Do not open a public issue with exploit details.
