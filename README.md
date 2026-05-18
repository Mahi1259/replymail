# Reply Assistant for Gmail

Replying to emails is tedious. So I built a Chrome extension that does the first draft for me.

Open an email in Gmail, hit the Quick Reply button (it sits right next to the normal Reply / Forward buttons), and a draft appears in the compose box. Pick a tone in the pop-up: Professional, Friendly, Concise, or Detailed, and that's the whole feature.

Behind the scenes, it's just a tiny Spring Boot service that forwards the email's subject and body to Gemini and hands the response back. 

## Trying it out

You'll need to load the extension manually (it's not on the Chrome Web Store):

1. Clone this repo.
2. Go to `chrome://extensions`, flip on Developer mode, click Load unpacked, pick the `gmail-reply-assistant/extension/` folder.
3. Click the extension icon, paste the Backend URL, pick a tone, and save.
4. Open Gmail, open any email, and click Quick Reply.


## Running the backend yourself

If you'd rather not depend on my Render instance, the backend is easy to run locally. You need Java 17 and a Gemini API key (free, from https://aistudio.google.com/app/apikey).

```bash
cd gmail-reply-assistant/backend
cp .env.example .env
# paste your key into .env as GEMINI_API_KEY=...
mvn spring-boot:run
```

It comes up on port 8080. Point the extension at `http://localhost:8080`, and you're set.

## Deploying your own copy

Deployed to Render because it's free, and didn't want to think about it. There's a `Dockerfile` and `render.yaml` in `gmail-reply-assistant/backend/` the whole thing is:

1. Fork the repo.
2. On Render: New - Web Service - connect your fork.
3. Set the Root Directory to `gmail-reply-assistant/backend`, runtime Docker.
4. Add `GEMINI_API_KEY` as an environment variable.
5. Deploy.

About 3-5 minutes for the first build. After it's live, edit `application.properties` to put your own Chrome extension ID in `app.cors.allowed-origin-patterns` so random sites can't hit your backend.

## API

There's basically one endpoint:

```
POST /api/generate-reply
{ "subject": "...", "body": "...", "tone": "Professional" }
```

Returns `{ "reply": "...", "tone": "..." }`. Tones other than the four listed above fall back to Professional. There's also `GET /api/health` if you want to check it's alive.


## Stack

Chrome Manifest V3 extension (no build step, just vanilla JS), Spring Boot 3 on Java 17, Gemini 2.5 Flash, hosted on Render in a Docker container.
