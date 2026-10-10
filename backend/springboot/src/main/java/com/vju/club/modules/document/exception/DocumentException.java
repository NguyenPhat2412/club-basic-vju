package com.vju.club.modules.document.exception;

import com.vju.club.error.ApiException;
import org.springframework.http.HttpStatus;

public abstract class DocumentException extends ApiException {
    protected DocumentException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
