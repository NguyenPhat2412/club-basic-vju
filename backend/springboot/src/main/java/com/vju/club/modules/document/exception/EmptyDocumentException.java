package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class EmptyDocumentException extends DocumentException {
    public EmptyDocumentException(String message) {
        super(HttpStatus.BAD_REQUEST, "EMPTY_DOCUMENT", message);
    }

    public EmptyDocumentException() {
        this("File is empty");
    }
}
