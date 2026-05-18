package com.gmailassistant.model;

public class ReplyResponse {

    private String reply;
    private String tone;

    public ReplyResponse() {}

    public ReplyResponse(String reply, String tone) {
        this.reply = reply;
        this.tone = tone;
    }

    public static ReplyResponse of(String reply, String tone) {
        return new ReplyResponse(reply, tone);
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }

    public String getTone() {
        return tone;
    }

    public void setTone(String tone) {
        this.tone = tone;
    }
}
