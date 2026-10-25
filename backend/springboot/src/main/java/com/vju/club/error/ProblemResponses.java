package com.vju.club.error;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

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
