package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentVersionNotFoundException extends DocumentException {
    public DocumentVersionNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "DOCUMENT_VERSION_NOT_FOUND", message);
    }

    public DocumentVersionNotFoundException() {
        this("Document version not found");
    }
}
