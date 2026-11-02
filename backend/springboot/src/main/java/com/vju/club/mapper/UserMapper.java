package com.vju.club.mapper;

import com.vju.club.dto.record.UserRecord;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.entity.User;
import org.mapstruct.Mapper;

@Mapper
public interface UserMapper {
    UserResponse toResponse(User user);

    UserRecord toRecord(User user);
}
