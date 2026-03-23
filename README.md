# GeoFlow Demo

Missed-call auto-text demo for contractor sales.

## What it does
- Someone calls your Twilio number
- App instantly texts them back:
  - "Hey, this is GeoFlow Demo — sorry we missed your call..."
- It plays a short voice message and hangs up
- If they text back, the app auto-replies once and logs the message

## Run locally
```bash
cd geoflow_demo
node -r dotenv/config server.js
```

## Twilio webhook setup
In your Twilio phone number settings:

- **Voice webhook** → `POST https://YOUR-PUBLIC-URL/voice`
- **Messaging webhook** → `POST https://YOUR-PUBLIC-URL/sms`

## Notes
- If running locally, expose it with ngrok/cloudflared or deploy it.
- De-dupes repeated auto-texts for 10 minutes.
- Auto-replies once per sender.
