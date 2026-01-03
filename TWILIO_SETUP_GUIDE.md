# Twilio WhatsApp Setup Guide

## Getting a Valid WhatsApp Sender Number

### Option 1: Twilio Sandbox (For Testing)

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** > **Try it out** > **Send a WhatsApp message**
3. You'll see a sandbox number like `+14155238886`
4. Join the sandbox by sending "join [keyword]" to the sandbox number
5. Use this format in your `.env`:
   ```
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

**Note**: Sandbox numbers can only send messages to verified numbers (numbers that joined the sandbox).

### Option 2: WhatsApp Business API (For Production)

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** > **Settings** > **WhatsApp Senders**
3. Request a WhatsApp Business number (requires business verification)
4. Once approved, use your verified number:
   ```
   TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
   ```

## Common Error: Invalid Sender Number (Error 21212)

**Error Message**: `The 'From' number whatsapp:+8801718066252 is not a valid phone number, shortcode, or alphanumeric sender ID.`

**Cause**: The number in `TWILIO_WHATSAPP_FROM` is not a valid Twilio WhatsApp sender number.

**Solutions**:

1. **For Testing**: Use Twilio sandbox number
   ```
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

2. **For Production**: 
   - Verify your WhatsApp Business number in Twilio Console
   - Make sure the number format is: `whatsapp:+[country code][number]`
   - Example: `whatsapp:+14155238886` (US), `whatsapp:+8613800138000` (China)

3. **Check Your Number**:
   - Go to Twilio Console > Messaging > Settings > WhatsApp Senders
   - Verify the number is listed and approved
   - Copy the exact format shown (should include `whatsapp:` prefix)

## Environment Variables Checklist

```bash
# Required for WhatsApp to work
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # From Twilio Console
TWILIO_AUTH_TOKEN="your_auth_token_here"                 # From Twilio Console
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"            # Valid Twilio WhatsApp number

# Optional
TWILIO_WEBHOOK_VALIDATE="false"                          # Set to false for testing
WECOM_GROUP_BOT_WEBHOOK_URL=""                          # Optional WeCom notifications
```

## Testing Your Setup

1. **Verify sender number is valid**:
   ```bash
   # Check Railway logs - should NOT see error 21212
   ```

2. **Test with curl** (after fixing sender number):
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

3. **Check database**:
   ```sql
   -- Should see conversation created
   SELECT * FROM conversations WHERE external_channel = 'twilio_whatsapp' ORDER BY created_at DESC LIMIT 1;
   
   -- Should see messages
   SELECT * FROM messages WHERE provider = 'twilio' ORDER BY created_at DESC LIMIT 5;
   ```

## Troubleshooting

### Error: "Invalid sender number"
- ✅ Use Twilio sandbox number for testing: `whatsapp:+14155238886`
- ✅ Verify number format includes `whatsapp:` prefix
- ✅ Check Twilio Console to confirm number is approved

### Error: "Webhook signature validation failed"
- ✅ Set `TWILIO_WEBHOOK_VALIDATE=false` for testing
- ✅ Or ensure signature validation is properly configured

### Messages not sending
- ✅ Check Railway logs for detailed error messages
- ✅ Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- ✅ Verify `TWILIO_WHATSAPP_FROM` is a valid Twilio WhatsApp number
- ✅ Check Twilio Console > Monitor > Logs for API errors

