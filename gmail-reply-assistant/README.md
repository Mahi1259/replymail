# Reply Assistant for Gmail

A Chrome extension that adds a Quick Reply button to Gmail. Click it on an open email and it drafts a response using a small Spring Boot service that talks to Gemini.

## Layout

```
gmail-reply-assistant/
  extension/        Chrome extension (no build step)
  backend/          Spring Boot 3, Java 17
```

## Backend setup

Java 17 and Maven are required.

1. Get a Gemini API key from https://aistudio.google.com/app/apikey
2. Put it in `backend/.env`:

   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Run it:

   ```bash
   cd backend
   mvn spring-boot:run
   ```

The server listens on `http://localhost:8080`. Health check: `curl http://localhost:8080/api/health`.

More details in [backend/README.md](backend/README.md).

## Extension setup

1. Open `chrome://extensions` (or `edge://extensions`)
2. Toggle Developer mode on
3. Click Load unpacked, pick the `extension/` folder
4. Click the extension icon in the toolbar to open settings:
   - Backend URL: `http://localhost:8080`
   - Tone: Professional, Friendly, Concise, or Detailed
5. Save

## Usage

Open any email in Gmail. The Quick Reply button shows up next to the standard Reply / Forward buttons. Click it, the reply box opens with a draft already filled in. Edit and send normally.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Toast: "Backend error: Failed to fetch" | Backend is not running, or backend URL in popup is wrong |
| Toast: "Gemini API key is not configured" | Set `GEMINI_API_KEY` in `backend/.env` and restart |
| Quick Reply button missing | Hard refresh Gmail (Cmd+Shift+R), reload the extension at `chrome://extensions` |
| 503 from Gemini | Model is overloaded, retry, or switch to `gemini-2.0-flash` in `application.properties` |

## Locking down CORS

After loading the extension, copy its ID from `chrome://extensions` and tighten `app.cors.allowed-origin-patterns` in `backend/src/main/resources/application.properties`:

```
app.cors.allowed-origin-patterns=chrome-extension://<your-id>,https://mail.google.com
```
