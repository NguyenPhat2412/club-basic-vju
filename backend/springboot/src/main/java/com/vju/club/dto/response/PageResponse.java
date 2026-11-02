package com.vju.club.dto.response;

import java.io.Serializable;
import java.util.List;

public record PageResponse<T>(List<T> items, long total, int offset, int limit) implements Serializable { }
