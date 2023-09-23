# Wichtel-Generator

## Use as Docker

```bash
docker pull ghcr.io/michaelkreil/wichtel-generator:latest
```

There are two environment variables:
- `PORT` - default: `8080`
- `BASEURL` - default: `https://wichteln.michael-kreil.de/`

## Example: Hetzner Cloud
- Start a new Server:
  - Image: Docker CE
  - Type: CAX11 (smallest ARM64)
- Login via SSH
- download `compose.yaml`
- run: `docker compose up`
