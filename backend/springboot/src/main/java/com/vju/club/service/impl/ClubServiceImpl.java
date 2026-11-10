package com.vju.club.service.impl;

import com.vju.club.common.ApiPaths;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.config.CacheConfig;
import com.vju.club.error.ApiException;
import com.vju.club.storage.DocumentStorage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ClubApplicationStatus;
import com.vju.club.service.AiTranslationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.NotificationService;
import com.vju.club.common.ClubConstants;
import com.vju.club.dto.request.ClubPatchRequest;
import com.vju.club.dto.request.ClubRequest;
import com.vju.club.dto.request.ClubStatusRequest;
import com.vju.club.dto.response.ClubResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubApplication;
import com.vju.club.enums.ClubStatus;
import com.vju.club.mapper.ClubMapper;
import com.vju.club.repository.ClubRepository;
import com.vju.club.service.ClubService;
import com.vju.club.specification.ClubSpecifications;
import com.vju.club.annotation.RequirePermission;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.repository.ClubApplicationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ClubServiceImpl implements ClubService {
    private static final long MAX_CLUB_IMAGE_BYTES = 10L * 1024 * 1024;

    private final ClubRepository clubRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final ClubMapper clubMapper;
    private final ClubApplicationRepository applicationRepository;
    private final Clock clock;
    private final NotificationService notificationService;
    private final DocumentStorage documentStorage;
    private final String publicApiBaseUrl;

    @Autowired(required = false)
    private AiTranslationService aiTranslationService;

    public ClubServiceImpl(
            ClubRepository clubRepository,
            PermissionAuthorizationService authorizationService,
            AuditService auditService,
            ClubMapper clubMapper,
            ClubApplicationRepository applicationRepository,
            Clock clock,
            NotificationService notificationService) {
        this(clubRepository, authorizationService, auditService, clubMapper,
                applicationRepository, clock, notificationService, null, "http://localhost:8080");
    }

    @Autowired
    public ClubServiceImpl(
            ClubRepository clubRepository,
            PermissionAuthorizationService authorizationService,
            AuditService auditService,
            ClubMapper clubMapper,
            ClubApplicationRepository applicationRepository,
            Clock clock,
            NotificationService notificationService,
            DocumentStorage documentStorage,
            @Value("${app.public-api-base-url:http://localhost:${server.port:8080}}") String publicApiBaseUrl) {
        this.clubRepository = clubRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
        this.clubMapper = clubMapper;
        this.applicationRepository = applicationRepository;
        this.clock = clock;
        this.notificationService = notificationService;
        this.documentStorage = documentStorage;
        this.publicApiBaseUrl = publicApiBaseUrl != null && publicApiBaseUrl.endsWith("/")
                ? publicApiBaseUrl.substring(0, publicApiBaseUrl.length() - 1)
                : (publicApiBaseUrl != null ? publicApiBaseUrl : "http://localhost:8080");
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.CACHE_PUBLIC_CLUBS,
            key = "(#query ?: '') + ':' + (#category ?: '') + ':' + #offset + ':' + #limit")
    public PageResponse<ClubResponse> listPublic(String query, String category, int offset, int limit) {
        Specification<Club> spec = Specification.where(ClubSpecifications.hasKeyword(query))
                .and(ClubSpecifications.hasCategory(category))
                .and(ClubSpecifications.isDiscoverable());

        Sort sort = Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort);
        Page<Club> clubPage = clubRepository.findAll(spec, page);
        List<ClubResponse> clubs = clubPage.getContent().stream().map(clubMapper::toResponse).toList();
        return new PageResponse<>(clubs, clubPage.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.CACHE_PUBLIC_CLUBS, key = "'categories'")
    public List<String> listPublicCategories() {
        return clubRepository.findActiveCategories();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.CACHE_PUBLIC_CLUB_DETAIL, key = "#clubId")
    public ClubResponse getPublic(UUID clubId) {
        return clubMapper.toResponse(clubRepository.findByIdAndStatus(clubId, ClubStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found")));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClubResponse> list(Actor actor, String query, int offset, int limit) {
        return list(actor, query, null, null, offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClubResponse> list(Actor actor, String query, String category, ClubStatus status,
                                           int offset, int limit) {
        Specification<Club> spec = Specification.where(ClubSpecifications.hasKeyword(query))
                .and(ClubSpecifications.hasCategory(category));

        if (authorizationService.hasGlobalPermission(actor, ClubConstants.PERMISSION_VIEW)) {
            spec = spec.and(ClubSpecifications.hasStatus(status));
        } else if (authorizationService.hasAnyPermission(actor, ClubConstants.PERMISSION_VIEW)) {
            Set<UUID> permittedClubIds = authorizationService.getPermittedClubIds(actor, ClubConstants.PERMISSION_VIEW);
            Specification<Club> visible = Specification.where(ClubSpecifications.isDiscoverable())
                    .or(ClubSpecifications.idIn(permittedClubIds));
            spec = spec.and(ClubSpecifications.hasStatus(status)).and(visible);
        } else {
            spec = spec.and(ClubSpecifications.hasStatus(status)).and(ClubSpecifications.isDiscoverable());
        }

        Sort sort = Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort);
        Page<Club> clubPage = clubRepository.findAll(spec, page);
        List<ClubResponse> clubs = clubPage.getContent().stream().map(clubMapper::toResponse).toList();
        return new PageResponse<>(clubs, clubPage.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubResponse get(Actor actor, UUID clubId) {
        if (authorizationService.hasPermission(actor, ClubConstants.PERMISSION_VIEW, clubId, null)) {
            return clubMapper.toResponse(findClub(clubId));
        }
        return getPublic(clubId);
    }

    @Override
    @Transactional
    @RequirePermission(ClubConstants.PERMISSION_CREATE)
    @CacheEvict(cacheNames = {CacheConfig.CACHE_PUBLIC_CLUBS, CacheConfig.CACHE_PUBLIC_CLUB_DETAIL}, allEntries = true)
    public ClubResponse create(Actor actor, ClubRequest request) {
        String code = request.code().trim();
        if (clubRepository.existsByCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        Club club = new Club();
        club.setCode(code);
        apply(club, request);
        Club saved = clubRepository.saveAndFlush(club);
        auditService.record(actor.id(), AuditAction.CLUB_CREATED, saved.getId(), saved.getId(), null, snapshot(saved));
        warmTranslateClub(saved);
        return clubMapper.toResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission(value = ClubConstants.PERMISSION_UPDATE, clubId = "clubId")
    @CacheEvict(cacheNames = {CacheConfig.CACHE_PUBLIC_CLUBS, CacheConfig.CACHE_PUBLIC_CLUB_DETAIL}, allEntries = true)
    public ClubResponse update(Actor actor, UUID clubId, ClubPatchRequest request) {
        Club club = findClub(clubId);
        if (request.code() != null && !club.getCode().equalsIgnoreCase(request.code().trim())
                && clubRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        Map<String, Object> before = snapshot(club);
        applyPatch(club, request);
        Club saved = clubRepository.saveAndFlush(club);
        auditService.recordChange(actor.id(), AuditAction.CLUB_UPDATED, clubId, clubId, before, snapshot(saved));
        warmTranslateClub(saved);
        return clubMapper.toResponse(saved);
    }

    private void warmTranslateClub(Club club) {
        if (aiTranslationService == null || club == null) return;
        List<String> texts = new java.util.ArrayList<>();
        if (club.getName() != null) texts.add(club.getName());
        if (club.getActivityField() != null) texts.add(club.getActivityField());
        if (club.getDescription() != null) texts.add(club.getDescription());
        aiTranslationService.warmTranslateAsync(texts);
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = {CacheConfig.CACHE_PUBLIC_CLUBS, CacheConfig.CACHE_PUBLIC_CLUB_DETAIL}, allEntries = true)
    public ClubResponse updateStatus(Actor actor, UUID clubId, ClubStatusRequest request) {
        authorizationService.require(actor,
                request.status() == ClubStatus.ACTIVE ? "club.active" : "club.inactive",
                clubId, null);
        Club club = findClub(clubId);
        Map<String, Object> before = Map.of("status", club.getStatus());
        club.setStatus(request.status());
        Club saved = clubRepository.saveAndFlush(club);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", saved.getStatus());
        if (saved.getStatus() != ClubStatus.ACTIVE) {
            List<ClubApplication> pendingApplications = applicationRepository != null
                    ? applicationRepository.findByClub_IdAndStatus(clubId, ClubApplicationStatus.PENDING)
                    : List.of();
            String autoRejectNote = "CLB tạm dừng hoạt động nên đơn được tự động từ chối.";
            int rejectedCount = applicationRepository != null
                    ? applicationRepository.rejectPendingForClub(clubId, actor.id(),
                            java.time.OffsetDateTime.now(clock), autoRejectNote)
                    : 0;
            after.put("rejectedPendingApplications", rejectedCount);
            if (notificationService != null && !pendingApplications.isEmpty()) {
                for (ClubApplication pending : pendingApplications) {
                    notificationService.create(
                            pending.getApplicant().getId(),
                            "Đơn đăng ký bị từ chối",
                            "Đơn đăng ký vào " + saved.getName() + " đã bị từ chối do CLB tạm dừng hoạt động.",
                            "CLUB_APPLICATION",
                            pending.getId(),
                            "APPLICATION_REVIEWED:" + pending.getId()
                    );
                }
            }
        }
        auditService.recordChange(actor.id(), request.status() == ClubStatus.ACTIVE
                ? AuditAction.CLUB_ACTIVATED : AuditAction.CLUB_DEACTIVATED, clubId, clubId,
                before, after);
        return clubMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubMediaContent getLogoContent(UUID clubId) {
        Club club = findClub(clubId);
        if (club.getLogoStorageKey() == null || club.getLogoStorageKey().isBlank() || documentStorage == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CLUB_LOGO_NOT_FOUND", "Club logo is not stored in cloud storage");
        }
        String contentType = club.getLogoContentType() != null ? club.getLogoContentType() : "image/jpeg";
        String ext = extensionForContentType(contentType);
        DocumentStorage.StoredObject stored = documentStorage.open(club.getLogoStorageKey());
        return new ClubMediaContent(
                club.getCode().toLowerCase(Locale.ROOT) + "-logo" + ext,
                contentType,
                stored.size() > 0 ? stored.size() : club.getLogoSizeBytes(),
                stored.content()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ClubMediaContent getCoverContent(UUID clubId) {
        Club club = findClub(clubId);
        if (club.getCoverStorageKey() == null || club.getCoverStorageKey().isBlank() || documentStorage == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CLUB_COVER_NOT_FOUND", "Club cover is not stored in cloud storage");
        }
        String contentType = club.getCoverContentType() != null ? club.getCoverContentType() : "image/jpeg";
        String ext = extensionForContentType(contentType);
        DocumentStorage.StoredObject stored = documentStorage.open(club.getCoverStorageKey());
        return new ClubMediaContent(
                club.getCode().toLowerCase(Locale.ROOT) + "-cover" + ext,
                contentType,
                stored.size() > 0 ? stored.size() : club.getCoverSizeBytes(),
                stored.content()
        );
    }

    @Override
    @Transactional
    @RequirePermission(value = ClubConstants.PERMISSION_UPDATE, clubId = "clubId")
    @CacheEvict(cacheNames = {CacheConfig.CACHE_PUBLIC_CLUBS, CacheConfig.CACHE_PUBLIC_CLUB_DETAIL}, allEntries = true)
    public ClubResponse uploadLogo(Actor actor, UUID clubId, UploadedFile file) {
        if (documentStorage == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "DOCUMENT_STORAGE_ERROR", "Cloud storage is not configured");
        }
        Club club = findClub(clubId);
        Map<String, Object> before = snapshot(club);
        ValidatedImage image = validateAndReadImage(file);
        String oldKey = club.getLogoStorageKey();
        String storageKey = "clubs/" + club.getCode().toLowerCase(Locale.ROOT) + "/logo-" + UUID.randomUUID() + image.extension();

        documentStorage.put(storageKey, new ByteArrayInputStream(image.bytes()), image.bytes().length, image.contentType());
        if (oldKey != null && !oldKey.isBlank() && !oldKey.equals(storageKey)) {
            try {
                documentStorage.delete(oldKey);
            } catch (Exception ignored) {
                // Non-fatal cleanup of superseded logo object in R2
            }
        }

        long version = clock != null ? clock.millis() : System.currentTimeMillis();
        club.setLogoStorageKey(storageKey);
        club.setLogoContentType(image.contentType());
        club.setLogoSizeBytes((long) image.bytes().length);
        club.setLogoUrl(publicApiBaseUrl + ApiPaths.publicClubLogoPath(clubId) + "?v=" + version);

        Club saved = clubRepository.saveAndFlush(club);
        auditService.recordChange(actor.id(), AuditAction.CLUB_UPDATED, clubId, clubId, before, snapshot(saved));
        return clubMapper.toResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission(value = ClubConstants.PERMISSION_UPDATE, clubId = "clubId")
    @CacheEvict(cacheNames = {CacheConfig.CACHE_PUBLIC_CLUBS, CacheConfig.CACHE_PUBLIC_CLUB_DETAIL}, allEntries = true)
    public ClubResponse uploadCover(Actor actor, UUID clubId, UploadedFile file) {
        if (documentStorage == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "DOCUMENT_STORAGE_ERROR", "Cloud storage is not configured");
        }
        Club club = findClub(clubId);
        Map<String, Object> before = snapshot(club);
        ValidatedImage image = validateAndReadImage(file);
        String oldKey = club.getCoverStorageKey();
        String storageKey = "clubs/" + club.getCode().toLowerCase(Locale.ROOT) + "/cover-" + UUID.randomUUID() + image.extension();

        documentStorage.put(storageKey, new ByteArrayInputStream(image.bytes()), image.bytes().length, image.contentType());
        if (oldKey != null && !oldKey.isBlank() && !oldKey.equals(storageKey)) {
            try {
                documentStorage.delete(oldKey);
            } catch (Exception ignored) {
                // Non-fatal cleanup of superseded cover object in R2
            }
        }

        long version = clock != null ? clock.millis() : System.currentTimeMillis();
        club.setCoverStorageKey(storageKey);
        club.setCoverContentType(image.contentType());
        club.setCoverSizeBytes((long) image.bytes().length);
        club.setCoverUrl(publicApiBaseUrl + ApiPaths.publicClubCoverPath(clubId) + "?v=" + version);

        Club saved = clubRepository.saveAndFlush(club);
        auditService.recordChange(actor.id(), AuditAction.CLUB_UPDATED, clubId, clubId, before, snapshot(saved));
        return clubMapper.toResponse(saved);
    }

    private record ValidatedImage(byte[] bytes, String contentType, String extension) { }

    private static ValidatedImage validateAndReadImage(UploadedFile file) {
        if (file == null || file.originalName() == null || file.originalName().isBlank() || file.content() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_IMAGE", "Vui lòng chọn file ảnh để tải lên");
        }
        byte[] bytes;
        try (InputStream in = file.content().open();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            long total = 0;
            int read;
            while ((read = in.read(buf)) != -1) {
                total += read;
                if (total > MAX_CLUB_IMAGE_BYTES) {
                    throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "IMAGE_TOO_LARGE",
                            "Kích thước ảnh vượt quá giới hạn 10 MB");
                }
                out.write(buf, 0, read);
            }
            bytes = out.toByteArray();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_STREAM", "Không thể đọc dữ liệu file ảnh");
        }
        if (bytes.length < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_IMAGE", "File ảnh rỗng hoặc không hợp lệ");
        }
        if (isPng(bytes)) {
            return new ValidatedImage(bytes, "image/png", ".png");
        }
        if (isJpeg(bytes)) {
            return new ValidatedImage(bytes, "image/jpeg", ".jpg");
        }
        if (isGif(bytes)) {
            return new ValidatedImage(bytes, "image/gif", ".gif");
        }
        if (isWebp(bytes)) {
            return new ValidatedImage(bytes, "image/webp", ".webp");
        }
        throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_IMAGE_TYPE",
                "Chỉ hỗ trợ định dạng ảnh PNG, JPG/JPEG, WEBP hoặc GIF");
    }

    private static boolean isPng(byte[] b) {
        return b.length >= 8
                && (b[0] & 0xFF) == 0x89
                && b[1] == 0x50
                && b[2] == 0x4E
                && b[3] == 0x47
                && b[4] == 0x0D
                && b[5] == 0x0A
                && b[6] == 0x1A
                && b[7] == 0x0A;
    }

    private static boolean isJpeg(byte[] b) {
        return b.length >= 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isGif(byte[] b) {
        return b.length >= 6
                && b[0] == 'G'
                && b[1] == 'I'
                && b[2] == 'F'
                && b[3] == '8'
                && (b[4] == '7' || b[4] == '9')
                && b[5] == 'a';
    }

    private static boolean isWebp(byte[] b) {
        return b.length >= 12
                && b[0] == 'R'
                && b[1] == 'I'
                && b[2] == 'F'
                && b[3] == 'F'
                && b[8] == 'W'
                && b[9] == 'E'
                && b[10] == 'B'
                && b[11] == 'P';
    }

    private static String extensionForContentType(String contentType) {
        if ("image/png".equalsIgnoreCase(contentType)) return ".png";
        if ("image/webp".equalsIgnoreCase(contentType)) return ".webp";
        if ("image/gif".equalsIgnoreCase(contentType)) return ".gif";
        return ".jpg";
    }

    private static Map<String, Object> snapshot(Club club) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("code", club.getCode());
        values.put("name", club.getName());
        values.put("description", club.getDescription());
        values.put("activityField", club.getActivityField());
        values.put("contactEmail", club.getContactEmail());
        values.put("logoUrl", club.getLogoUrl());
        if (club.getLogoStorageKey() != null) {
            values.put("logoStorageKey", club.getLogoStorageKey());
        }
        values.put("coverUrl", club.getCoverUrl());
        if (club.getCoverStorageKey() != null) {
            values.put("coverStorageKey", club.getCoverStorageKey());
        }
        values.put("status", club.getStatus());
        return values;
    }

    private void apply(Club club, ClubRequest request) {
        club.setName(request.name().trim());
        club.setLogoUrl(request.logoUrl());
        club.setCoverUrl(request.coverUrl());
        club.setDescription(request.description());
        club.setActivityField(request.activityField());
        club.setContactEmail(request.contactEmail());
    }

    private void applyPatch(Club club, ClubPatchRequest request) {
        if (request.code() != null) {
            if (request.code().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CLUB_CODE", "Club code cannot be blank");
            club.setCode(request.code().trim());
        }
        if (request.name() != null) {
            if (request.name().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CLUB_NAME", "Club name cannot be blank");
            club.setName(request.name().trim());
        }
        if (request.logoUrl() != null) club.setLogoUrl(request.logoUrl());
        if (request.coverUrl() != null) club.setCoverUrl(request.coverUrl());
        if (request.description() != null) club.setDescription(request.description());
        if (request.activityField() != null) club.setActivityField(request.activityField());
        if (request.contactEmail() != null) club.setContactEmail(request.contactEmail());
    }

    private Club findClub(UUID id) {
        return clubRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
    }
}
