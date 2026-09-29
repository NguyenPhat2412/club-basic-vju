package com.vju.club.dao;

import com.vju.club.entity.User;

import java.util.List;
import java.util.UUID;

public interface UserDao {
    List<User> search(String query, int offset, int limit, String orderBy, String orderType);
    long count(String query);
}
