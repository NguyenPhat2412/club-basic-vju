package com.vju.club.service.impl;

import com.vju.club.common.EventConstants;
import com.vju.club.dto.request.CreateEventFeedbackRequest;
import com.vju.club.dto.response.EventFeedbackResponse;
import com.vju.club.dto.response.EventFeedbackSummaryResponse;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventAttendance;
import com.vju.club.entity.EventFeedback;
import com.vju.club.entity.User;
import com.vju.club.enums.AttendanceStatus;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.EventMapper;
import com.vju.club.repository.EventAttendanceRepository;
import com.vju.club.repository.EventFeedbackRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventFeedbackServiceImpl {
    private static final Set<EventStatus> DETAIL_VISIBLE_STATUSES = Set.of(
            EventStatus.OPEN_REGISTRATION,
            EventStatus.CLOSED_REGISTRATION,
            EventStatus.COMPLETED,
            EventStatus.CANCELLED
    );

    private final EventRepository eventRepository;
    private final EventAttendanceRepository attendanceRepository;
    private final EventRegistrationRepository registrationRepository;
    private final EventFeedbackRepository eventFeedbackRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final EventMapper eventMapper;

    @Transactional
    public EventFeedbackResponse submitFeedback(Actor actor, UUID eventId, CreateEventFeedbackRequest request) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        if (event.getStatus() == EventStatus.DRAFT || event.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_NOT_HELD",
                    "Không thể gửi khảo sát cho sự kiện nháp hoặc đã huỷ");
        }

        if (!canUserSubmitFeedback(event, actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FEEDBACK_ATTENDANCE_REQUIRED",
                    "Chỉ người đã được điểm danh Có mặt hoặc Đi muộn mới có thể gửi khảo sát sự kiện");
        }

        if (eventFeedbackRepository.existsByEvent_IdAndUser_Id(eventId, actor.id())) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_FEEDBACK_ALREADY_SUBMITTED",
                    "Bạn đã gửi đánh giá cho sự kiện này trước đó");
        }

        if (request == null || request.rating() < 1 || request.rating() > 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Điểm đánh giá phải từ 1 đến 5 sao");
        }
        String comment = request.comment() == null ? null : request.comment().strip();
        if (comment != null && comment.isEmpty()) {
            comment = null;
        }
        if (comment != null && comment.length() > 1000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Nhận xét tối đa 1000 ký tự");
        }

        User user = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        EventFeedback feedback = new EventFeedback();
        feedback.setEvent(event);
        feedback.setUser(user);
        feedback.setRating(request.rating());
        feedback.setComment(comment);
        EventFeedback saved = eventFeedbackRepository.saveAndFlush(feedback);
        return eventMapper.toFeedbackResponse(saved);
    }

    @Transactional(readOnly = true)
    public EventFeedbackSummaryResponse listFeedbacks(Actor actor, UUID eventId) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        boolean publiclyVisible = event.isAllowCtv()
                && event.getClub().getStatus() == ClubStatus.ACTIVE
                && DETAIL_VISIBLE_STATUSES.contains(event.getStatus());
        boolean canView = publiclyVisible
                || registrationRepository.existsByEvent_IdAndUser_Id(eventId, actor.id())
                || attendanceRepository.findByEvent_IdAndUser_Id(eventId, actor.id()).isPresent()
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_VIEW, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_UPDATE, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_ATTENDANCE, clubId, deptId)
                || authorizationService.hasPermission(actor, "club.view", clubId, null)
                || membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), clubId, MembershipStatus.ACTIVE);
        if (!canView) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        List<EventFeedback> feedbacks = eventFeedbackRepository.findByEvent_IdOrderByCreatedAtDesc(eventId);
        long totalCount = feedbacks.size();
        double averageRating = 0.0;
        if (totalCount > 0) {
            long sum = feedbacks.stream().mapToLong(EventFeedback::getRating).sum();
            averageRating = Math.round((sum * 100.0) / totalCount) / 100.0;
        }
        List<EventFeedbackResponse> items = feedbacks.stream()
                .map(eventMapper::toFeedbackResponse)
                .toList();
        boolean canSubmit = canUserSubmitFeedback(event, actor.id());
        return new EventFeedbackSummaryResponse(eventId, totalCount, averageRating, items, canSubmit);
    }

    private boolean canUserSubmitFeedback(Event event, UUID userId) {
        if (event.getStatus() == EventStatus.DRAFT || event.getStatus() == EventStatus.CANCELLED) {
            return false;
        }
        EventAttendance attendance = attendanceRepository.findByEvent_IdAndUser_Id(event.getId(), userId)
                .orElse(null);
        if (attendance == null
                || (attendance.getStatus() != AttendanceStatus.PRESENT && attendance.getStatus() != AttendanceStatus.LATE)) {
            return false;
        }
        boolean hasAnyRegistration = registrationRepository.existsByEvent_IdAndUser_Id(event.getId(), userId);
        if (!hasAnyRegistration) {
            return true;
        }
        return registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                event.getId(), userId, EventRegistrationStatus.REGISTERED).isPresent();
    }
}
