package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class InvalidDocumentVersionException extends DocumentException {
    public InvalidDocumentVersionException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_VERSION", message);
    }

    public InvalidDocumentVersionException() {
        this("Version must be a positive number");
    }
}
