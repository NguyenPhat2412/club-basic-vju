package com.vju.club.notification;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.security.Actor;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/users/me/notifications")
public class NotificationController { private final NotificationService service; public NotificationController(NotificationService service){this.service=service;} @GetMapping public PageResponse<NotificationResponse> list(Actor actor,@RequestParam(defaultValue="0") @Min(0) int offset,@RequestParam(defaultValue="20") @Min(1) @Max(100) int limit){return service.list(actor,offset,limit);} @PatchMapping("/{id}/read") public ResponseEntity<Void> markRead(Actor actor,@PathVariable UUID id){service.markRead(actor,id); return ResponseEntity.noContent().build();} }
