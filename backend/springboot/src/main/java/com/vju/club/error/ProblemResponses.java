package com.vju.club.error;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/**
 * Writes RFC 7807 problem bodies from servlet filters and security handlers, which run
 * outside Spring MVC and therefore cannot rely on {@link GlobalExceptionHandler}.
 */
public final class ProblemResponses {

    private ProblemResponses() { }

    public static void write(HttpServletResponse response, int status, String code, String detail) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"title\":\"" + code + "\",\"status\":" + status
                + ",\"detail\":\"" + detail + "\",\"code\":\"" + code + "\"}");
    }
}
