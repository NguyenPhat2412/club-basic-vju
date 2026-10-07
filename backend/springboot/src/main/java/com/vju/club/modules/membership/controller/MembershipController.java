package com.vju.club.modules.membership.controller;

import com.vju.club.modules.membership.service.MembershipService;

import com.vju.club.security.Actor;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.membership.entity.MembershipStatus;
import com.vju.club.modules.membership.config.request.CreateMembershipRequest;
import com.vju.club.modules.membership.config.response.MembershipResponse;
import com.vju.club.modules.membership.config.response.MyMembershipResponse;
import com.vju.club.modules.membership.config.request.UpdateMembershipRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
public class MembershipController {
    private final MembershipService membershipService;
    public MembershipController(MembershipService membershipService) { this.membershipService = membershipService; }

    @GetMapping("/clubs/{clubId}/memberships")
    public PageResponse<MembershipResponse> list(Actor actor, @PathVariable UUID clubId,
                                                 @RequestParam(required = false) MembershipStatus status,
                                                 @RequestParam(required = false) UUID departmentId,
                                                 @RequestParam(required = false) String search,
                                                 @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return membershipService.list(actor, clubId, status, departmentId, search, offset, limit);
    }

    @GetMapping("/users/me/memberships")
    public PageResponse<MyMembershipResponse> listMine(Actor actor,
                                                       @RequestParam(required = false) MembershipStatus status,
                                                       @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                       @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return membershipService.listMine(actor, status, offset, limit);
    }
    @GetMapping("/memberships/{membershipId}")
    public MembershipResponse get(Actor actor, @PathVariable UUID membershipId) {
        return membershipService.get(actor, membershipId);
    }
    @PostMapping("/clubs/{clubId}/memberships")
    public ResponseEntity<MembershipResponse> create(Actor actor, @PathVariable UUID clubId,
                                                      @Valid @RequestBody CreateMembershipRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(membershipService.create(actor, clubId, request));
    }
    @PatchMapping("/memberships/{membershipId}")
    public MembershipResponse update(Actor actor, @PathVariable UUID membershipId,
                                     @Valid @RequestBody UpdateMembershipRequest request) {
        return membershipService.update(actor, membershipId, request);
    }
    @DeleteMapping("/memberships/{membershipId}")
    public ResponseEntity<Void> remove(Actor actor, @PathVariable UUID membershipId) {
        membershipService.remove(actor, membershipId);
        return ResponseEntity.noContent().build();
    }
}
