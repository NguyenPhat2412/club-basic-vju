package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentTypeChangedException extends DocumentException {
    public DocumentTypeChangedException(String message) {
        super(HttpStatus.BAD_REQUEST, "DOCUMENT_TYPE_CHANGED", message);
    }

    public DocumentTypeChangedException() {
        this("A new version or name must keep the document's file type");
    }
}
