package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class DocumentVersionUnchangedException extends DocumentException {
    public DocumentVersionUnchangedException(String message) {
        super(HttpStatus.CONFLICT, "DOCUMENT_VERSION_UNCHANGED", message);
    }

    public DocumentVersionUnchangedException() {
        this("The file is identical to the current version");
    }
}
