package com.vju.club.mapper;

import com.vju.club.dto.record.EventRecord;
import com.vju.club.dto.response.EventAttendanceResponse;
import com.vju.club.dto.response.EventCoHostResponse;
import com.vju.club.dto.response.EventFeedbackResponse;
import com.vju.club.dto.response.EventRegistrationResponse;
import com.vju.club.dto.response.EventResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventAttendance;
import com.vju.club.entity.EventFeedback;
import com.vju.club.entity.EventRegistration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Mapper
public interface EventMapper {
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "clubCode", source = "club.code")
    @Mapping(target = "clubName", source = "club.name")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "parentEventId", source = "parentEvent.id")
    @Mapping(target = "parentEventTitle", source = "parentEvent.title")
    @Mapping(target = "childBoothCount", constant = "0")
    @Mapping(target = "coHosts", expression = "java(mapCoHosts(event.getCoHosts()))")
    EventResponse toResponse(Event event);

    default List<EventCoHostResponse> mapCoHosts(Set<Club> clubs) {
        if (clubs == null || clubs.isEmpty()) {
            return List.of();
        }
        return clubs.stream()
                .sorted(Comparator.comparing(Club::getName, String.CASE_INSENSITIVE_ORDER))
                .map(c -> new EventCoHostResponse(c.getId(), c.getCode(), c.getName()))
                .toList();
    }

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    EventRecord toRecord(Event event);

    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "userFullName", source = "user.fullName")
    @Mapping(target = "studentCode", source = "user.studentCode")
    @Mapping(target = "userAvatarUrl", source = "user.avatarUrl")
    EventRegistrationResponse toRegistrationResponse(EventRegistration registration);

    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "userFullName", source = "user.fullName")
    @Mapping(target = "studentCode", source = "user.studentCode")
    @Mapping(target = "checkedBy", source = "checkedBy.id")
    EventAttendanceResponse toAttendanceResponse(EventAttendance attendance);

    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userFullName", source = "user.fullName")
    EventFeedbackResponse toFeedbackResponse(EventFeedback feedback);
}
