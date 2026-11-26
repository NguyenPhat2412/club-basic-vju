package com.vju.club.service.impl;

import com.vju.club.dto.request.CreateEventRequest;
import com.vju.club.dto.request.UpdateEventRequest;
import com.vju.club.dto.response.EventResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Event;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.EventMapper;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventFestivalSupport {
    private static final Set<String> ALLOWED_FACEBOOK_HOSTS = Set.of(
            "facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "web.facebook.com"
    );

    private final EventRepository eventRepository;
    private final ClubRepository clubRepository;
    private final EventMapper eventMapper;

    public void applyOnCreate(Event event, CreateEventRequest request) {
        if (request.parentEventId() != null) {
            event.setParentEvent(resolveValidParent(request.parentEventId(), null));
        }
        String normalizedBooth = normalizeBoothCode(request.boothCode());
        if (normalizedBooth != null && event.getParentEvent() != null) {
            ensureBoothAvailable(event.getParentEvent().getId(), normalizedBooth, null);
        }
        event.setBoothCode(event.getParentEvent() == null ? null : normalizedBooth);
        if (request.venueMapUrl() != null) {
            event.setVenueMapUrl(normalizeSafeMediaOrHttpsUrl(request.venueMapUrl(), "INVALID_VENUE_MAP_URL",
                    "Venue map URL must start with https://, http://, or /"));
        }
        if (request.facebookPostUrl() != null) {
            event.setFacebookPostUrl(normalizeFacebookUrl(request.facebookPostUrl()));
        }
        if (request.recapAlbumUrl() != null) {
            event.setRecapAlbumUrl(normalizeExternalHttpsUrl(request.recapAlbumUrl(), "INVALID_RECAP_ALBUM_URL",
                    "Recap album URL must be a valid https:// link"));
        }
        event.setAllowShuttleBus(Boolean.TRUE.equals(request.allowShuttleBus()));
        if (request.coHostClubIds() != null) {
            event.setCoHosts(resolveCoHosts(event.getClub().getId(), request.coHostClubIds()));
        }
    }

    public void applyOnUpdate(Event event, UpdateEventRequest request) {
        if (Boolean.TRUE.equals(request.clearParentEvent())) {
            event.setParentEvent(null);
            event.setBoothCode(null);
        } else if (request.parentEventId() != null) {
            if (eventRepository.countPublicBoothsByParentIds(List.of(event.getId())).stream()
                    .anyMatch(r -> ((Number) r[1]).longValue() > 0)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "NESTED_PARENT_EVENT_NOT_ALLOWED",
                        "An umbrella festival that already has child booths cannot become a child event");
            }
            event.setParentEvent(resolveValidParent(request.parentEventId(), event.getId()));
        }

        if (!Boolean.TRUE.equals(request.clearParentEvent()) && request.boothCode() != null) {
            String normalizedBooth = normalizeBoothCode(request.boothCode());
            event.setBoothCode(event.getParentEvent() == null ? null : normalizedBooth);
        }
        if (event.getParentEvent() != null && event.getBoothCode() != null) {
            ensureBoothAvailable(event.getParentEvent().getId(), event.getBoothCode(), event.getId());
        }

        if (request.venueMapUrl() != null) {
            event.setVenueMapUrl(normalizeSafeMediaOrHttpsUrl(request.venueMapUrl(), "INVALID_VENUE_MAP_URL",
                    "Venue map URL must start with https://, http://, or /"));
        }
        if (request.facebookPostUrl() != null) {
            event.setFacebookPostUrl(normalizeFacebookUrl(request.facebookPostUrl()));
        }
        if (request.recapAlbumUrl() != null) {
            event.setRecapAlbumUrl(normalizeExternalHttpsUrl(request.recapAlbumUrl(), "INVALID_RECAP_ALBUM_URL",
                    "Recap album URL must be a valid https:// link"));
        }
        if (request.allowShuttleBus() != null) {
            event.setAllowShuttleBus(request.allowShuttleBus());
        }
        if (request.coHostClubIds() != null) {
            event.setCoHosts(resolveCoHosts(event.getClub().getId(), request.coHostClubIds()));
        }
    }

    @Transactional(readOnly = true)
    public List<EventResponse> listPublicBooths(UUID parentEventId) {
        Event parent = eventRepository.findWithRelationsById(parentEventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        if (parent.getClub().getStatus() != ClubStatus.ACTIVE
                || (!parent.isAllowCtv() && !parent.isAllowPublicAttendees())
                || parent.getStatus() == EventStatus.DRAFT
                || parent.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found");
        }
        return eventRepository.findPublicBoothsByParentId(parentEventId).stream()
                .map(eventMapper::toResponse)
                .toList();
    }

    public List<EventResponse> enrichBoothCounts(List<EventResponse> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = items.stream().map(EventResponse::id).toList();
        Map<UUID, Integer> counts = new HashMap<>();
        for (Object[] row : eventRepository.countPublicBoothsByParentIds(ids)) {
            counts.put((UUID) row[0], ((Number) row[1]).intValue());
        }
        if (counts.isEmpty()) {
            return items;
        }
        return items.stream()
                .map(it -> EventResponse.withBoothCount(it, counts.getOrDefault(it.id(), 0)))
                .toList();
    }

    public EventResponse enrichSingleBoothCount(EventResponse item) {
        if (item == null) {
            return null;
        }
        return enrichBoothCounts(List.of(item)).getFirst();
    }

    private Event resolveValidParent(UUID parentEventId, UUID selfEventId) {
        if (selfEventId != null && selfEventId.equals(parentEventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PARENT_EVENT",
                    "An event cannot reference itself as parent event");
        }
        Event parent = eventRepository.findWithRelationsById(parentEventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PARENT_EVENT_NOT_FOUND",
                        "Parent festival event not found"));
        if (parent.getStatus() == EventStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "PARENT_EVENT_CANCELLED",
                    "Cannot attach booth to a cancelled parent event");
        }
        if (parent.getParentEvent() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NESTED_PARENT_EVENT_NOT_ALLOWED",
                    "Festival event hierarchy only supports 1 level (parent festival -> club booth)");
        }
        return parent;
    }

    private void ensureBoothAvailable(UUID parentEventId, String boothCode, UUID excludeEventId) {
        if (eventRepository.countConflictingBoothCode(parentEventId, boothCode, excludeEventId) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOTH_CODE_ALREADY_TAKEN",
                    "Mã vị trí gian hàng \"" + boothCode + "\" đã được đăng ký bởi đơn vị khác trong sự kiện này");
        }
    }

    private Set<Club> resolveCoHosts(UUID hostClubId, List<UUID> rawIds) {
        Set<UUID> targetIds = new LinkedHashSet<>();
        for (UUID id : rawIds) {
            if (id != null && !id.equals(hostClubId)) {
                targetIds.add(id);
            }
        }
        if (targetIds.isEmpty()) {
            return new LinkedHashSet<>();
        }
        List<Club> clubs = clubRepository.findAllById(targetIds);
        if (clubs.size() != targetIds.size()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "One or more co-host clubs were not found");
        }
        for (Club club : clubs) {
            if (club.getStatus() != ClubStatus.ACTIVE) {
                throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE",
                        "Co-host club \"" + club.getName() + "\" is inactive");
            }
        }
        return new LinkedHashSet<>(clubs);
    }

    private static String normalizeBoothCode(String raw) {
        if (raw == null) return null;
        String stripped = raw.strip();
        return stripped.isEmpty() ? null : stripped;
    }

    private static String normalizeSafeMediaOrHttpsUrl(String raw, String code, String msg) {
        String stripped = raw.strip();
        if (stripped.isEmpty()) return null;
        boolean ok = stripped.startsWith("https://")
                || stripped.startsWith("http://")
                || (stripped.startsWith("/") && !stripped.startsWith("//"));
        if (!ok) {
            throw new ApiException(HttpStatus.BAD_REQUEST, code, msg);
        }
        return stripped;
    }

    private static String normalizeExternalHttpsUrl(String raw, String code, String msg) {
        String stripped = raw.strip();
        if (stripped.isEmpty()) return null;
        try {
            URI uri = URI.create(stripped);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getHost().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, code, msg);
            }
            return stripped;
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, code, msg);
        }
    }

    private static String normalizeFacebookUrl(String raw) {
        String stripped = raw.strip();
        if (stripped.isEmpty()) return null;
        try {
            URI uri = URI.create(stripped);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !ALLOWED_FACEBOOK_HOSTS.contains(host)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FACEBOOK_URL",
                        "Facebook campaign URL must use https:// on facebook.com or fb.com");
            }
            return stripped;
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FACEBOOK_URL",
                    "Facebook campaign URL must use https:// on facebook.com or fb.com");
        }
    }
}
