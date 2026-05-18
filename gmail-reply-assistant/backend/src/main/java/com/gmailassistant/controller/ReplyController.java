package com.gmailassistant.controller;

import com.gmailassistant.model.EmailRequest;
import com.gmailassistant.model.ReplyResponse;
import com.gmailassistant.service.GeminiService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReplyController {

    private static final Logger log = LoggerFactory.getLogger(ReplyController.class);

    private final GeminiService geminiService;

    public ReplyController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/generate-reply")
    public ResponseEntity<?> generateReply(@Valid @RequestBody EmailRequest request) {
        try {
            String tone = (request.getTone() == null || request.getTone().isBlank())
                    ? "Professional"
                    : request.getTone();

            String reply = geminiService.generateReply(
                    request.getSubject(),
                    request.getBody(),
                    tone
            );

            return ResponseEntity.ok(ReplyResponse.of(reply, tone));
        } catch (IllegalStateException e) {
            log.error("Configuration error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to generate reply", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate reply: " + e.getMessage()));
        }
    }
}
