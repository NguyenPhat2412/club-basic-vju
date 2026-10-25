package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentNotFoundException extends DocumentException {
    public DocumentNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", message);
    }

    public DocumentNotFoundException() {
        this("Document not found");
    }
}
