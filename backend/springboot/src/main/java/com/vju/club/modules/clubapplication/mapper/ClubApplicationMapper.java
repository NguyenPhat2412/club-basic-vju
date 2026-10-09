package com.vju.club.modules.clubapplication.mapper;

import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.membership.entity.Membership;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface ClubApplicationMapper {

    default ClubApplicationResponse toResponse(ClubApplication application) {
        return toResponse(application, null);
    }

    /** Application details; membership fields are filled once an approval created the membership. */
    @Mapping(target = "id", source = "application.id")
    @Mapping(target = "applicantId", source = "application.applicant.id")
    @Mapping(target = "clubId", source = "application.club.id")
    @Mapping(target = "clubCode", source = "application.club.code")
    @Mapping(target = "clubName", source = "application.club.name")
    @Mapping(target = "message", source = "application.message")
    @Mapping(target = "status", source = "application.status")
    @Mapping(target = "reviewedBy", source = "application.reviewedBy.id")
    @Mapping(target = "reviewedAt", source = "application.reviewedAt")
    @Mapping(target = "reviewNote", source = "application.reviewNote")
    @Mapping(target = "cancelledAt", source = "application.cancelledAt")
    @Mapping(target = "createdAt", source = "application.createdAt")
    @Mapping(target = "updatedAt", source = "application.updatedAt")
    @Mapping(target = "membershipId", source = "membership.id")
    @Mapping(target = "membershipStatus", source = "membership.status")
    @Mapping(target = "membershipJoinedAt", source = "membership.joinedAt")
    ClubApplicationResponse toResponse(ClubApplication application, Membership membership);

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "clubCode", source = "club.code")
    @Mapping(target = "clubName", source = "club.name")
    ClubApplicationSummaryResponse toSummary(ClubApplication application);
}
