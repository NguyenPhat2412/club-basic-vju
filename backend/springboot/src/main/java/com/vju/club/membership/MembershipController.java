package com.vju.club.membership;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.membership.dto.CreateMembershipRequest;
import com.vju.club.membership.dto.MembershipResponse;
import com.vju.club.membership.dto.UpdateMembershipRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    public PageResponse<MembershipResponse> list(Authentication authentication, @PathVariable UUID clubId,
                                                 @RequestParam(defaultValue = "0") int offset,
                                                 @RequestParam(defaultValue = "20") int limit) {
        return membershipService.list(authentication, clubId, offset, limit);
    }
    @GetMapping("/memberships/{membershipId}")
    public MembershipResponse get(Authentication authentication, @PathVariable UUID membershipId) {
        return membershipService.get(authentication, membershipId);
    }
    @PostMapping("/clubs/{clubId}/memberships")
    public ResponseEntity<MembershipResponse> create(Authentication authentication, @PathVariable UUID clubId,
                                                      @Valid @RequestBody CreateMembershipRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(membershipService.create(authentication, clubId, request));
    }
    @PatchMapping("/memberships/{membershipId}")
    public MembershipResponse update(Authentication authentication, @PathVariable UUID membershipId,
                                     @Valid @RequestBody UpdateMembershipRequest request) {
        return membershipService.update(authentication, membershipId, request);
    }
    @DeleteMapping("/memberships/{membershipId}")
    public ResponseEntity<Void> remove(Authentication authentication, @PathVariable UUID membershipId) {
        membershipService.remove(authentication, membershipId);
        return ResponseEntity.noContent().build();
    }
}
