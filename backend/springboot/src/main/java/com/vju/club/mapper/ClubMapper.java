package com.vju.club.mapper;

import com.vju.club.dto.record.ClubRecord;
import com.vju.club.dto.response.ClubResponse;
import com.vju.club.entity.Club;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface ClubMapper {
    @Mapping(target = "overviewConfig", expression = "java(com.vju.club.dto.record.ClubOverviewConfig.fromJson(club.getOverviewConfig()))")
    ClubResponse toResponse(Club club);

    @Mapping(target = "overviewConfig", expression = "java(com.vju.club.dto.record.ClubOverviewConfig.fromJson(club.getOverviewConfig()))")
    ClubRecord toRecord(Club club);
}
