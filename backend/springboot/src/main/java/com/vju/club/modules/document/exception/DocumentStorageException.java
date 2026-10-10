package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentStorageException extends DocumentException {
    public DocumentStorageException(String message, Throwable cause) {
        super(HttpStatus.BAD_GATEWAY, "DOCUMENT_STORAGE_ERROR", message);
        initCause(cause);
    }
}
