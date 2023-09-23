# Wichtel-Generator

## Use as Docker

```bash
docker pull ghcr.io/michaelkreil/wichtel-generator:latest
```

There are two environment variables:
- `PORT` - default: `8080`
- `BASEURL` - default: `https://wichtel-generator.michael-kreil.de/`

## Example: Hetzner Cloud
- Start a new Server:
  - Image: Docker CE
  - Type: CAX11 (smallest ARM64)
- Login via SSH

### unencrypted:

```bash
docker pull "ghcr.io/michaelkreil/wichtel-generator:latest"
docker run -itdp "8080:8080" -e BASEURL="https://wichteln.michael-kreil.de/" "ghcr.io/michaelkreil/wichtel-generator:latest"
```

### encrypted:
```bash
docker compose up
```
