package com.vju.club.modules.notification.controller;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.notification.dto.request.BroadcastNotificationRequest;
import com.vju.club.modules.notification.dto.response.NotificationBroadcastResponse;
import com.vju.club.modules.notification.dto.response.NotificationResponse;
import com.vju.club.modules.notification.service.NotificationService;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Thông báo trong ứng dụng cá nhân và gửi broadcast thông báo theo CLB/Ban")
public class NotificationController {
    private final NotificationService service;

    @GetMapping("/users/me/notifications")
    @Operation(summary = "Danh sách thông báo của tôi", description = "Trả danh sách thông báo cá nhân mới nhất trước.")
    @ApiResponse(responseCode = "200", description = "Trang thông báo {items, total, offset, limit}")
    public PageResponse<NotificationResponse> list(Actor actor,
                                                   @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return service.list(actor, offset, limit);
    }

    @PatchMapping("/users/me/notifications/{id}/read")
    @Operation(summary = "Đánh dấu đã đọc 1 thông báo")
    @ApiResponse(responseCode = "204", description = "Đã đánh dấu đã đọc")
    public ResponseEntity<Void> markRead(Actor actor, @PathVariable UUID id) {
        service.markRead(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/users/me/notifications/read-all")
    @Operation(summary = "Đánh dấu đã đọc toàn bộ thông báo của tôi")
    @ApiResponse(responseCode = "204", description = "Đã đánh dấu toàn bộ thông báo là đã đọc")
    public ResponseEntity<Void> markAllRead(Actor actor) {
        service.markAllRead(actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/clubs/{clubId}/notifications")
    @Operation(summary = "Gửi thông báo hàng loạt (Broadcast) cho CLB hoặc Ban",
            description = "Quyền: notification.send tại CLB hoặc Ban tương ứng.")
    @ApiResponse(responseCode = "201", description = "Số lượng thành viên nhận được thông báo")
    public ResponseEntity<NotificationBroadcastResponse> broadcast(Actor actor,
                                                                   @PathVariable UUID clubId,
                                                                   @Valid @RequestBody BroadcastNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.broadcast(actor, clubId, request));
    }
}
