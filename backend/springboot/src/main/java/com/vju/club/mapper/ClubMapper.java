package com.vju.club.mapper;

import com.vju.club.dto.record.ClubRecord;
import com.vju.club.dto.response.ClubResponse;
import com.vju.club.entity.Club;
import org.mapstruct.Mapper;

@Mapper
public interface ClubMapper {
    ClubResponse toResponse(Club club);

    ClubRecord toRecord(Club club);
}
