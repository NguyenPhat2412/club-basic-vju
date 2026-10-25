package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentTooLargeException extends DocumentException {
    public DocumentTooLargeException(String message) {
        super(HttpStatus.PAYLOAD_TOO_LARGE, "DOCUMENT_TOO_LARGE", message);
    }

    public DocumentTooLargeException() {
        this("File is larger than the allowed maximum");
    }
}
