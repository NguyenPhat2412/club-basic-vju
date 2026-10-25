package com.vju.club.common;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public record OffsetLimitRequest(long offset, int limit, Sort sort) implements Pageable {
    public OffsetLimitRequest {
        if (offset < 0) throw new IllegalArgumentException("offset must be >= 0");
        if (limit < 1) throw new IllegalArgumentException("limit must be >= 1");
        sort = sort == null ? Sort.unsorted() : sort;
    }

    public OffsetLimitRequest(long offset, int limit) {
        this(offset, limit, Sort.unsorted());
    }

    @Override public int getPageNumber() { return (int) (offset / limit); }
    @Override public int getPageSize() { return limit; }
    @Override public long getOffset() { return offset; }
    @Override public Sort getSort() { return sort; }
    @Override public Pageable next() { return new OffsetLimitRequest(offset + limit, limit, sort); }
    @Override public Pageable previousOrFirst() { return new OffsetLimitRequest(Math.max(0, offset - limit), limit, sort); }
    @Override public Pageable first() { return new OffsetLimitRequest(0, limit, sort); }
    @Override public Pageable withPage(int pageNumber) { return new OffsetLimitRequest((long) pageNumber * limit, limit, sort); }
    @Override public boolean hasPrevious() { return offset > 0; }
}
