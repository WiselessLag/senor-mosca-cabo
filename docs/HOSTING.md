# Hosting the iPhone edition

The browser is only the display. The Python service must run on a machine with enough RAM for the full FlyWire circuit. The Dockerfile prepares the frontend, Python dependencies and pinned v783 upstream tables. The full model has not yet been tested in this image, and its required peak memory and actual hosted trial time remain to be measured. Start with several GiB of RAM; see FLYWIRE.md.

The container refuses to start without `MOSCA_PASSWORD`. The username is `mosca`; provide a strong, unique password through the hosting provider's secret mechanism, never in the image or repository. HTTP Basic authentication requires HTTPS: terminate TLS before exposing the app. The local development server remains open when the variable is absent, so do not expose an unprotected local server to the internet. Use one server worker: the simulation lock is per process and multiple workers may each consume several GiB.

From a machine with Docker and network access, a local-only build/check is:

```sh
docker build -t senor-mosca .
docker run --rm -p 127.0.0.1:8765:8765 -e MOSCA_PASSWORD senor-mosca
```

Export `MOSCA_PASSWORD` in the shell before running the container. Open `http://127.0.0.1:8765/3d/`, sign in, and confirm FlyWire is available. This local test does not provide HTTPS and must not be exposed to the internet. Validate FlyWire with `python -m backend.smoke --mode flywire` in the image and test on an actual iPhone before treating the setup as production-ready. The browser's WebGL 2 support and graphics fallback still need testing.

Cloudflare Containers require a Workers Paid subscription and may incur usage charges. A container image and TLS/authenticated routing must still be configured and verified for the selected host; this Dockerfile alone does not create a hosted service. Limit access and resource usage before publishing. Respect the data's non-commercial license described in FLYWIRE.md.
