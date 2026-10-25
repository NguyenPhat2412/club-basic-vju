package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class UnsupportedDocumentTypeException extends DocumentException {
    public UnsupportedDocumentTypeException(String message) {
        super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_DOCUMENT_TYPE", message);
    }

    public UnsupportedDocumentTypeException() {
        this("This file type is not allowed");
    }
}
