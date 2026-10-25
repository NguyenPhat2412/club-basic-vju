package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentNotDeletedException extends DocumentException {
    public DocumentNotDeletedException(String message) {
        super(HttpStatus.CONFLICT, "DOCUMENT_NOT_DELETED", message);
    }

    public DocumentNotDeletedException() {
        this("Document is not deleted");
    }
}
