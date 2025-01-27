# MNT

Cashu mint with admin dashboard

## Supported Lightning backends

* [x] NWC
* [x] LND

## How to run

### Production

```
docker build -t '[backend-image-name]' -f Dockerfile .
docker build -t '[frontend-image-name]' -f Dockerfile.frontend .
docker run -p 3003:3003 -e PORT=3003 -e JWT_SECRET=[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] -e FRONTEND_URL=[https://my.frontend.url] -v ./data:/app/data [backend-image-name]
docker run -p 3000:3000 -e PUBLIC_MINT_API=[https://my.backend.url] -e PUBLIC_MINT_WS=wss://[my.backend.url]/admin/ws [frontend-image-name]
```