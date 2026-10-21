package com.vju.club.modules.event.mapper;

import com.vju.club.modules.event.dto.record.EventRecord;
import com.vju.club.modules.event.dto.response.EventAttendanceResponse;
import com.vju.club.modules.event.dto.response.EventRegistrationResponse;
import com.vju.club.modules.event.dto.response.EventResponse;
import com.vju.club.modules.event.entity.Event;
import com.vju.club.modules.event.entity.EventAttendance;
import com.vju.club.modules.event.entity.EventRegistration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface EventMapper {
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "clubCode", source = "club.code")
    @Mapping(target = "clubName", source = "club.name")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    EventResponse toResponse(Event event);

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    EventRecord toRecord(Event event);

    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "userFullName", source = "user.fullName")
    @Mapping(target = "studentCode", source = "user.studentCode")
    EventRegistrationResponse toRegistrationResponse(EventRegistration registration);

    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "userFullName", source = "user.fullName")
    @Mapping(target = "studentCode", source = "user.studentCode")
    @Mapping(target = "checkedBy", source = "checkedBy.id")
    EventAttendanceResponse toAttendanceResponse(EventAttendance attendance);
}
