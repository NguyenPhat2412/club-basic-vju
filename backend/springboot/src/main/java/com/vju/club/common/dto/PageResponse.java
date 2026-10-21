package com.vju.club.common.dto;

import java.io.Serializable;
import java.util.List;

public record PageResponse<T>(List<T> items, long total, int offset, int limit) implements Serializable { }
