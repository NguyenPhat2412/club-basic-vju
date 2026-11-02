package com.vju.club.exception;

import org.springframework.http.HttpStatus;

public class DocumentContentMismatchException extends DocumentException {
    public DocumentContentMismatchException(String message) {
        super(HttpStatus.BAD_REQUEST, "DOCUMENT_CONTENT_MISMATCH", message);
    }

    public DocumentContentMismatchException() {
        this("File content does not match its extension");
    }
}
