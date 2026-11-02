package com.vju.club.dto.record;

import java.io.InputStream;

public record DocumentContent(String fileName, String contentType, long size, String checksumSha256, int version,
                              InputStream content) { }
