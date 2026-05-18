package com.gmailassistant.model;

import jakarta.validation.constraints.NotBlank;

public class EmailRequest {

    private String subject;

    @NotBlank(message = "body must not be blank")
    private String body;

    private String tone;

    public EmailRequest() {}

    public EmailRequest(String subject, String body, String tone) {
        this.subject = subject;
        this.body = body;
        this.tone = tone;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public String getTone() {
        return tone;
    }

    public void setTone(String tone) {
        this.tone = tone;
    }
}
