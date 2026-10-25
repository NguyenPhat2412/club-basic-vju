package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class InvalidDocumentNameException extends DocumentException {
    public InvalidDocumentNameException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_NAME", message);
    }

    public InvalidDocumentNameException() {
        this("Document name is invalid");
    }
}
