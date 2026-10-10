package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentVersionConflictException extends DocumentException {
    public DocumentVersionConflictException(String message) {
        super(HttpStatus.CONFLICT, "DOCUMENT_VERSION_CONFLICT", message);
    }

    public DocumentVersionConflictException() {
        this("Document was changed by someone else; reload it and try again");
    }
}
