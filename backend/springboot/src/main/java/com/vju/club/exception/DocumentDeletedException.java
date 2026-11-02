package com.vju.club.exception;

import org.springframework.http.HttpStatus;

public class DocumentDeletedException extends DocumentException {
    public DocumentDeletedException(String message) {
        super(HttpStatus.GONE, "DOCUMENT_DELETED", message);
    }

    public DocumentDeletedException() {
        this("Document has been deleted");
    }
}
