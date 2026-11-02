package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.request.BroadcastNotificationRequest;
import com.vju.club.dto.response.NotificationBroadcastResponse;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.service.NotificationService;
import com.vju.club.security.Actor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Thông báo trong ứng dụng cá nhân và gửi broadcast thông báo theo CLB/Ban")
public class NotificationController {
    private final NotificationService service;

    @GetMapping(ApiPaths.MY_NOTIFICATIONS)
    @Operation(summary = "Danh sách thông báo của tôi", description = "Trả danh sách thông báo cá nhân mới nhất trước.")
    @ApiResponse(responseCode = "200", description = "Trang thông báo {items, total, offset, limit}")
    public PageResponse<NotificationResponse> list(Actor actor,
                                                   @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return service.list(actor, offset, limit);
    }

    @GetMapping(ApiPaths.MY_NOTIFICATION_BY_ID)
    @Operation(summary = "Chi tiết một thông báo của tôi")
    @ApiResponse(responseCode = "200", description = "Chi tiết thông báo")
    public NotificationResponse get(Actor actor, @PathVariable UUID notificationId) {
        return service.get(actor, notificationId);
    }

    @PatchMapping(ApiPaths.MY_NOTIFICATION_READ)
    @Operation(summary = "Đánh dấu đã đọc 1 thông báo")
    @ApiResponse(responseCode = "204", description = "Đã đánh dấu đã đọc")
    public ResponseEntity<Void> markRead(Actor actor, @PathVariable UUID notificationId) {
        service.markRead(actor, notificationId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping(ApiPaths.MY_NOTIFICATIONS_READ_ALL)
    @Operation(summary = "Đánh dấu đã đọc toàn bộ thông báo của tôi")
    @ApiResponse(responseCode = "204", description = "Đã đánh dấu toàn bộ thông báo là đã đọc")
    public ResponseEntity<Void> markAllRead(Actor actor) {
        service.markAllRead(actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(ApiPaths.CLUB_NOTIFICATIONS)
    @Operation(summary = "Gửi thông báo hàng loạt (Broadcast) cho CLB hoặc Ban",
            description = "Quyền: notification.send tại CLB hoặc Ban tương ứng.")
    @ApiResponse(responseCode = "201", description = "Số lượng thành viên nhận được thông báo")
    public ResponseEntity<NotificationBroadcastResponse> broadcast(Actor actor,
                                                                   @PathVariable UUID clubId,
                                                                   @Valid @RequestBody BroadcastNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.broadcast(actor, clubId, request));
    }
}
