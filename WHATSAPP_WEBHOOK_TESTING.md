# WhatsApp Webhook Testing Guide

## Testing Webhook Endpoints Before Twilio Configuration

### 1. Test Health Endpoint

Before configuring Twilio, verify your webhook endpoints are accessible:

```bash
# Test health check endpoint (GET request)
curl https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "twilio-whatsapp-webhook",
  "timestamp": "2026-01-XX...",
  "endpoints": {
    "inbound": "/api/webhooks/twilio/whatsapp/inbound",
    "status": "/api/webhooks/twilio/whatsapp/status"
  }
}
```

### 2. Test Inbound Webhook (Simulate Twilio Request)

You can simulate a Twilio webhook request using curl:

```bash
curl -X POST https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "To=whatsapp:+14155238886" \
  -d "Body=Hello test" \
  -d "MessageSid=SMtest123" \
  -d "ProfileName=Test User" \
  -d "NumMedia=0"
```

Expected response: `ok` (status 200)

**Note**: For testing, make sure `TWILIO_WEBHOOK_VALIDATE` is NOT set to `"true"` in your environment variables, or set it to `false`. This will skip signature validation. In production with Twilio, set it to `"true"` for security.

### 3. Test Status Callback Webhook

```bash
curl -X POST https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/status \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SMtest123" \
  -d "MessageStatus=sent"
```

Expected response: `ok` (status 200)

### 4. Using Browser/Postman

1. **Health Check (GET)**:
   - URL: `https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/health`
   - Method: GET
   - Should return JSON with status "ok"

2. **Inbound Webhook (POST)**:
   - URL: `https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/inbound`
   - Method: POST
   - Headers: `Content-Type: application/x-www-form-urlencoded`
   - Body (x-www-form-urlencoded):
     - `From`: `whatsapp:+1234567890`
     - `To`: `whatsapp:+14155238886`
     - `Body`: `Hello test`
     - `MessageSid`: `SMtest123`
     - `ProfileName`: `Test User`
     - `NumMedia`: `0`

### 5. Verify Database Records

After testing, check that records were created:

```sql
-- Check webhook events
SELECT * FROM twilio_webhook_events ORDER BY created_at DESC LIMIT 5;

-- Check conversations (if inbound webhook was called)
SELECT id, external_from, external_to, mode, last_inbound_at 
FROM conversations 
WHERE external_channel = 'twilio_whatsapp' 
ORDER BY created_at DESC LIMIT 5;

-- Check messages
SELECT id, direction, provider, provider_sid, status, created_at 
FROM messages 
WHERE provider = 'twilio' 
ORDER BY created_at DESC LIMIT 5;
```

### 6. Common Issues

**Issue**: Endpoint returns 404
- **Solution**: Verify the route is registered in `apps/api/src/index.ts`
- Check Railway logs for route registration errors

**Issue**: Endpoint returns 500
- **Solution**: Check Railway logs for error details
- Verify database connection and Prisma migration was successful
- Verify environment variables are set

**Issue**: Signature validation fails (403)
- **Solution**: Set `TWILIO_WEBHOOK_VALIDATE=false` for testing
- Or implement proper signature validation with raw body

### 7. Testing with ngrok (Local Development)

1. Start local API: `cd apps/api && pnpm dev`
2. Start ngrok: `ngrok http 3000`
3. Use ngrok URL in tests: `https://xxxx.ngrok.io/api/webhooks/twilio/whatsapp/health`
4. Configure Twilio webhooks with ngrok URL for local testing

### 8. Production Checklist

Before configuring Twilio:
- [ ] Health endpoint returns 200 OK
- [ ] Database migration completed successfully
- [ ] Environment variables set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, etc.)
- [ ] API is accessible from internet (not blocked by firewall)
- [ ] Railway logs show no startup errors
- [ ] Test webhook endpoints with curl/Postman

