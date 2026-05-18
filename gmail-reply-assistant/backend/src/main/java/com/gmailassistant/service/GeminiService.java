package com.gmailassistant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Set;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private static final Set<String> ALLOWED_TONES =
            Set.of("Professional", "Friendly", "Concise", "Detailed");
    private static final String DEFAULT_TONE = "Professional";

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String apiKey;
    private final String apiUrl;
    private final long timeoutMs;

    public GeminiService(
            WebClient.Builder webClientBuilder,
            @Value("${gemini.api.key}") String apiKey,
            @Value("${gemini.api.url}") String apiUrl,
            @Value("${gemini.api.timeout-ms:25000}") long timeoutMs
    ) {
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.timeoutMs = timeoutMs;
    }

    public String generateReply(String subject, String body, String tone) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "Gemini API key is not configured. Set the GEMINI_API_KEY environment variable.");
        }

        String safeTone = (tone != null && ALLOWED_TONES.contains(tone)) ? tone : DEFAULT_TONE;
        String safeSubject = subject == null ? "" : subject.trim();
        String safeBody = body == null ? "" : body.trim();

        String prompt = buildPrompt(safeSubject, safeBody, safeTone);
        String requestBody = buildRequestBody(prompt);

        try {
            String response = webClient.post()
                    .uri(apiUrl + "?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse ->
                            clientResponse.bodyToMono(String.class).defaultIfEmpty("").flatMap(errBody -> {
                                log.warn("Gemini error {}: {}", clientResponse.statusCode(), errBody);
                                return Mono.error(new RuntimeException(
                                        "Gemini API returned " + clientResponse.statusCode() + ": " + errBody));
                            })
                    )
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeoutMs))
                    .block();

            return parseReply(response);
        } catch (WebClientResponseException e) {
            log.error("Gemini call failed: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Gemini API error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Gemini call failed", e);
            throw new RuntimeException("Failed to generate reply: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(String subject, String body, String tone) {
        return "Draft a reply to the email below in a " + tone.toLowerCase() + " tone. "
                + "Keep it concise. Return only the reply body, no subject line, "
                + "no greeting placeholders like [Name], no commentary, no markdown.\n\n"
                + "Subject: " + subject + "\n"
                + "Body: " + body;
    }

    private String buildRequestBody(String prompt) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode contents = root.putArray("contents");
            ObjectNode content = contents.addObject();
            ArrayNode parts = content.putArray("parts");
            parts.addObject().put("text", prompt);

            ObjectNode generationConfig = root.putObject("generationConfig");
            generationConfig.put("temperature", 0.7);
            generationConfig.put("maxOutputTokens", 1024);

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new RuntimeException("Failed to build Gemini request: " + e.getMessage(), e);
        }
    }

    private String parseReply(String responseJson) {
        if (responseJson == null || responseJson.isBlank()) {
            throw new RuntimeException("Gemini returned empty response");
        }

        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new RuntimeException("Gemini response missing candidates");
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new RuntimeException("Gemini response missing parts");
            }

            StringBuilder out = new StringBuilder();
            for (JsonNode p : parts) {
                String t = p.path("text").asText("");
                if (!t.isEmpty()) out.append(t);
            }
            String text = out.toString().trim();
            if (text.isEmpty()) {
                throw new RuntimeException("Gemini returned empty text");
            }
            return text;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }
}
