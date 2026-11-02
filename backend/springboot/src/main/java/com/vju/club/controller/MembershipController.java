package com.vju.club.controller;

import lombok.RequiredArgsConstructor;
import com.vju.club.common.ApiPaths;
import com.vju.club.service.MembershipService;

import com.vju.club.security.Actor;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.dto.request.CreateMembershipRequest;
import com.vju.club.dto.response.MembershipResponse;
import com.vju.club.dto.response.MyMembershipResponse;
import com.vju.club.dto.request.UpdateMembershipRequest;
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
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class MembershipController {
    private final MembershipService membershipService;
    @GetMapping(ApiPaths.MEMBERSHIPS_BY_CLUB)
    public PageResponse<MembershipResponse> list(Actor actor, @PathVariable UUID clubId,
                                                 @RequestParam(required = false) MembershipStatus status,
                                                 @RequestParam(required = false) UUID departmentId,
                                                 @RequestParam(required = false) String search,
                                                 @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return membershipService.list(actor, clubId, status, departmentId, search, offset, limit);
    }

    @GetMapping(ApiPaths.MY_MEMBERSHIPS)
    public PageResponse<MyMembershipResponse> listMine(Actor actor,
                                                       @RequestParam(required = false) MembershipStatus status,
                                                       @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                       @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return membershipService.listMine(actor, status, offset, limit);
    }
    @GetMapping(ApiPaths.MEMBERSHIP_BY_ID)
    public MembershipResponse get(Actor actor, @PathVariable UUID membershipId) {
        return membershipService.get(actor, membershipId);
    }
    @PostMapping(ApiPaths.MEMBERSHIPS_BY_CLUB)
    public ResponseEntity<MembershipResponse> create(Actor actor, @PathVariable UUID clubId,
                                                      @Valid @RequestBody CreateMembershipRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(membershipService.create(actor, clubId, request));
    }
    @PatchMapping(ApiPaths.MEMBERSHIP_BY_ID)
    public MembershipResponse update(Actor actor, @PathVariable UUID membershipId,
                                     @Valid @RequestBody UpdateMembershipRequest request) {
        return membershipService.update(actor, membershipId, request);
    }
    @DeleteMapping(ApiPaths.MEMBERSHIP_BY_ID)
    public ResponseEntity<Void> remove(Actor actor, @PathVariable UUID membershipId) {
        membershipService.remove(actor, membershipId);
        return ResponseEntity.noContent().build();
    }
}
