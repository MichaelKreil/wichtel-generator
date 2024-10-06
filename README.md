# Wichtel-Generator

## Use as Docker

```bash
docker pull ghcr.io/michaelkreil/wichtel-generator:latest
```

There are two environment variables:
- `PORT` - default: `8080`
- `BASEURL` - default: `https://wichteln.michael-kreil.de/`

## Example: Hetzner Cloud

1. Start a new Server:
   - Image: Docker CE
   - Type: CAX11 (smallest ARM64)
2. Ensure DNS points to the correct IP.
3. Login via SSH and run:
```bash
wget "https://github.com/MichaelKreil/wichtel-generator/raw/refs/heads/main/compose.yaml"
docker compose up --detach
```
