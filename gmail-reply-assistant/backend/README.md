# Backend

Spring Boot 3 service that calls Gemini and returns a reply.

## Requirements

- Java 17
- Maven 3.8+
- A Gemini API key (https://aistudio.google.com/app/apikey)

## Configuration

Put the key in `.env` at the backend root:

```
GEMINI_API_KEY=your_key_here
```

Other settings live in `src/main/resources/application.properties`:

- `server.port` (default 8080)
- `gemini.api.url` (default uses `gemini-2.5-flash`, switch to `gemini-2.0-flash` if you hit 503s)
- `gemini.api.timeout-ms`
- `app.cors.allowed-origin-patterns`

## Run

```bash
mvn spring-boot:run
```

## Endpoints

`POST /api/generate-reply`

Request:
```json
{ "subject": "Project status", "body": "Can you send an update?", "tone": "Professional" }
```

Response:
```json
{ "reply": "...", "tone": "Professional" }
```

Allowed tones: Professional, Friendly, Concise, Detailed. Anything else falls back to Professional.

`GET /api/health` returns `{"status":"ok"}`.

## Quick test

```bash
curl -X POST http://localhost:8080/api/generate-reply \
  -H "Content-Type: application/json" \
  -d '{"subject":"Hello","body":"Free for lunch?","tone":"Friendly"}'
```
