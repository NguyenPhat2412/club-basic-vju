package com.vju.club.modules.club.mapper;

import com.vju.club.modules.club.dto.response.ClubResponse;
import com.vju.club.modules.club.entity.Club;
import org.mapstruct.Mapper;

@Mapper
public interface ClubMapper {
    ClubResponse toResponse(Club club);
}
