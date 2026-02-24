# SSL Certificates

Place your SSL certificate files in this directory before starting the production stack.

## Required Files

| File            | Description                                   |
| --------------- | --------------------------------------------- |
| `fullchain.pem` | Full certificate chain (cert + intermediates) |
| `privkey.pem`   | Your private key                              |

## How to Generate with Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot

# Generate cert (standalone mode — stop Nginx first)
sudo certbot certonly --standalone -d yourdomain.com

# Certs will be placed at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Copy them here:
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ops/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ops/certs/
sudo chmod 644 ./ops/certs/fullchain.pem
sudo chmod 600 ./ops/certs/privkey.pem
```

## Self-Signed Cert (for testing only)

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ops/certs/privkey.pem \
  -out ops/certs/fullchain.pem \
  -subj "/CN=localhost"
```

> ⚠️ These files are excluded from Git via `.gitignore`. Never commit private keys.
