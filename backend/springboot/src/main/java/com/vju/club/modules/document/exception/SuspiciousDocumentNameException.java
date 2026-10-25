package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class SuspiciousDocumentNameException extends DocumentException {
    public SuspiciousDocumentNameException(String message) {
        super(HttpStatus.BAD_REQUEST, "SUSPICIOUS_DOCUMENT_NAME", message);
    }

    public SuspiciousDocumentNameException() {
        this("Document name looks disguised");
    }
}
