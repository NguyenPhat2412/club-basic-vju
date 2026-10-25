package com.vju.club.modules.user.mapper;

import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.user.entity.User;
import org.mapstruct.Mapper;

@Mapper
public interface UserMapper {
    UserResponse toResponse(User user);
}
