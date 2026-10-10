package com.vju.club.modules.document.exception;

import org.springframework.http.HttpStatus;

public class InvalidAppDetailKeyException extends DocumentException {
    public InvalidAppDetailKeyException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_APP_DETAIL_KEY", message);
    }

    public InvalidAppDetailKeyException() {
        this("appDetailKey must be dot-separated lower-case words, for example club.rules");
    }
}
