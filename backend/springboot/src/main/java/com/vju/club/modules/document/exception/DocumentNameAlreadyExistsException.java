package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentNameAlreadyExistsException extends DocumentException {
    public DocumentNameAlreadyExistsException(String message) {
        super(HttpStatus.CONFLICT, "DOCUMENT_NAME_ALREADY_EXISTS", message);
    }

    public DocumentNameAlreadyExistsException() {
        this("A live document with this name already exists in the club; upload a new version instead");
    }
}
