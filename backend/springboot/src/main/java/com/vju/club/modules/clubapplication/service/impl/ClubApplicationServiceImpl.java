package com.vju.club.modules.clubapplication.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.clubapplication.dto.request.CreateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.FormFieldDefinition;
import com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.UpdateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.UpsertClubApplicationFormRequest;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationFileResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationFormResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.entity.ClubApplicationFile;
import com.vju.club.modules.clubapplication.entity.ClubApplicationForm;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.clubapplication.mapper.ClubApplicationMapper;
import com.vju.club.modules.clubapplication.repository.ClubApplicationFileRepository;
import com.vju.club.modules.clubapplication.repository.ClubApplicationFormRepository;
import com.vju.club.modules.clubapplication.repository.ClubApplicationRepository;
import com.vju.club.modules.clubapplication.service.ClubApplicationService;
import com.vju.club.modules.clubapplication.specification.ClubApplicationSpecifications;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.enums.DepartmentStatus;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.document.dto.record.DocumentContent;
import com.vju.club.modules.document.dto.record.UploadedFile;
import com.vju.club.modules.document.enums.DocumentFileType;
import com.vju.club.modules.document.exception.DocumentStorageException;
import com.vju.club.modules.document.exception.UnsupportedDocumentTypeException;
import com.vju.club.modules.document.service.DocumentFileInspector;
import com.vju.club.modules.document.storage.DocumentStorage;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.notification.service.NotificationService;
import com.vju.club.modules.role.repository.UserRoleRepository;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ClubApplicationServiceImpl implements ClubApplicationService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> VALID_FORM_STATUSES = Set.of("DRAFT", "OPEN", "CLOSED");
    private static final Set<String> VALID_FILE_CATEGORIES = Set.of(
            "FORM_TEMPLATE_DOC",
            "FORM_POSTER_IMAGE",
            "APPLICANT_DOC",
            "APPLICANT_CV_PDF",
            "APPLICANT_IMAGE",
            "APPLICANT_ATTACHMENT"
    );
    private static final Set<DocumentFileType> ALLOWED_APPLICATION_FILE_TYPES = EnumSet.of(
            DocumentFileType.PDF,
            DocumentFileType.DOC,
            DocumentFileType.DOCX,
            DocumentFileType.PNG,
            DocumentFileType.JPG,
            DocumentFileType.GIF,
            DocumentFileType.WEBP
    );

    private final ClubApplicationRepository applicationRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final Clock clock;
    private final NotificationService notificationService;
    private final ClubApplicationMapper clubApplicationMapper;
    private final UserRoleRepository userRoleRepository;
    private final ClubApplicationFormRepository formRepository;
    private final ClubApplicationFileRepository fileRepository;
    private final DepartmentRepository departmentRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final DocumentFileInspector fileInspector;
    private final DocumentStorage documentStorage;

    public ClubApplicationServiceImpl(ClubApplicationRepository applicationRepository,
                                      ClubRepository clubRepository,
                                      UserRepository userRepository,
                                      MembershipRepository membershipRepository,
                                      PermissionAuthorizationService authorizationService,
                                      AuditService auditService,
                                      Clock clock,
                                      ClubApplicationMapper clubApplicationMapper) {
        this(applicationRepository, clubRepository, userRepository, membershipRepository,
                authorizationService, auditService, clock, null, clubApplicationMapper,
                null, null, null, null, null, null, null);
    }

    @Autowired
    public ClubApplicationServiceImpl(ClubApplicationRepository applicationRepository,
                                      ClubRepository clubRepository,
                                      UserRepository userRepository,
                                      MembershipRepository membershipRepository,
                                      PermissionAuthorizationService authorizationService,
                                      AuditService auditService,
                                      Clock clock,
                                      NotificationService notificationService,
                                      ClubApplicationMapper clubApplicationMapper,
                                      UserRoleRepository userRoleRepository,
                                      ClubApplicationFormRepository formRepository,
                                      ClubApplicationFileRepository fileRepository,
                                      DepartmentRepository departmentRepository,
                                      DepartmentMemberRepository departmentMemberRepository,
                                      DocumentFileInspector fileInspector,
                                      DocumentStorage documentStorage) {
        this.applicationRepository = applicationRepository;
        this.clubRepository = clubRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
        this.clock = clock;
        this.notificationService = notificationService;
        this.clubApplicationMapper = clubApplicationMapper;
        this.userRoleRepository = userRoleRepository;
        this.formRepository = formRepository;
        this.fileRepository = fileRepository;
        this.departmentRepository = departmentRepository;
        this.departmentMemberRepository = departmentMemberRepository;
        this.fileInspector = fileInspector;
        this.documentStorage = documentStorage;
    }

    // -----------------------------------------------------------------------------------------
    // 1. Club Application Form Builder (CRUD + Template Docs/PDF/Poster Images)
    // -----------------------------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public ClubApplicationFormResponse getActiveFormForClub(Actor actor, UUID clubId) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        List<ClubApplicationFormResponse.DepartmentOption> departments = activeDepartmentOptions(clubId);
        if (formRepository == null) {
            return synthesizedDefaultForm(club, departments);
        }
        return formRepository.findFirstByClub_IdAndStatusOrderByIsDefaultDescCreatedAtDesc(clubId, "OPEN")
                .or(() -> formRepository.findFirstByClub_IdAndStatusOrderByIsDefaultDescCreatedAtDesc(clubId, "CLOSED"))
                .map(form -> toFormResponse(form, club, filesForForm(form.getId()), departments))
                .orElseGet(() -> synthesizedDefaultForm(club, departments));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClubApplicationFormResponse> listFormsForClub(Actor actor, UUID clubId) {
        requireAnyPermission(actor, clubId, "application.manage_form", "application.view");
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (formRepository == null) return Collections.emptyList();
        List<ClubApplicationForm> forms = formRepository.findByClub_IdOrderByIsDefaultDescCreatedAtDesc(clubId);
        List<ClubApplicationFormResponse.DepartmentOption> departments = activeDepartmentOptions(clubId);
        Map<UUID, List<ClubApplicationFileResponse>> filesByForm = filesByFormIds(
                forms.stream().map(ClubApplicationForm::getId).toList());
        return forms.stream()
                .map(form -> toFormResponse(
                        form,
                        club,
                        filesByForm.getOrDefault(form.getId(), Collections.emptyList()),
                        departments))
                .toList();
    }

    @Override
    @Transactional
    public ClubApplicationFormResponse createForm(Actor actor, UUID clubId, UpsertClubApplicationFormRequest request) {
        requireAnyPermission(actor, clubId, "application.manage_form", "application.review");
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        ClubApplicationForm form = new ClubApplicationForm();
        form.setClub(club);
        applyFormRequest(form, request);
        if (form.isDefault()) {
            unsetOtherDefaultForms(clubId, null);
        }
        ClubApplicationForm saved = formRepository.saveAndFlush(form);
        auditService.record(actor.id(), AuditAction.APPLICATION_FORM_CREATED, saved.getId(), clubId, null,
                Map.of("title", saved.getTitle(), "status", saved.getStatus(), "isDefault", saved.isDefault()));
        return toFormResponse(saved, club, Collections.emptyList(), activeDepartmentOptions(clubId));
    }

    @Override
    @Transactional
    public ClubApplicationFormResponse updateForm(Actor actor, UUID clubId, UUID formId,
                                                  UpsertClubApplicationFormRequest request) {
        requireAnyPermission(actor, clubId, "application.manage_form", "application.review");
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        ClubApplicationForm form = formRepository.findByIdAndClub_Id(formId, clubId)
                .orElseThrow(() -> notFound("APPLICATION_FORM_NOT_FOUND", "Application form not found"));
        Map<String, Object> before = Map.of(
                "title", form.getTitle(),
                "status", form.getStatus(),
                "isDefault", form.isDefault()
        );
        applyFormRequest(form, request);
        if (form.isDefault()) {
            unsetOtherDefaultForms(clubId, form.getId());
        }
        ClubApplicationForm saved = formRepository.saveAndFlush(form);
        auditService.record(actor.id(), AuditAction.APPLICATION_FORM_UPDATED, saved.getId(), clubId, before,
                Map.of("title", saved.getTitle(), "status", saved.getStatus(), "isDefault", saved.isDefault()));
        return toFormResponse(saved, club, filesForForm(saved.getId()), activeDepartmentOptions(clubId));
    }

    @Override
    @Transactional
    public void deleteForm(Actor actor, UUID clubId, UUID formId) {
        requireAnyPermission(actor, clubId, "application.manage_form", "application.review");
        ClubApplicationForm form = formRepository.findByIdAndClub_Id(formId, clubId)
                .orElseThrow(() -> notFound("APPLICATION_FORM_NOT_FOUND", "Application form not found"));
        if (fileRepository != null && documentStorage != null) {
            for (ClubApplicationFile file : fileRepository.findByForm_IdOrderByCreatedAtAsc(formId)) {
                safeDeleteStorageKey(file.getStoragePath());
            }
        }
        Map<String, Object> before = Map.of("title", form.getTitle(), "status", form.getStatus());
        formRepository.delete(form);
        formRepository.flush();
        auditService.record(actor.id(), AuditAction.APPLICATION_FORM_DELETED, formId, clubId, before, null);
    }

    @Override
    @Transactional
    public ClubApplicationFileResponse uploadFormFile(Actor actor, UUID clubId, UUID formId,
                                                      String fileCategory, UploadedFile file) {
        requireAnyPermission(actor, clubId, "application.manage_form", "application.review");
        ClubApplicationForm form = formRepository.findByIdAndClub_Id(formId, clubId)
                .orElseThrow(() -> notFound("APPLICATION_FORM_NOT_FOUND", "Application form not found"));
        String normalizedCategory = normalizeFileCategory(fileCategory, "FORM_TEMPLATE_DOC");
        ClubApplicationFile saved = inspectAndStoreFile(actor.id(), form.getClub(), form, null, normalizedCategory, file);
        return clubApplicationMapper.toFileResponse(saved);
    }

    @Override
    @Transactional
    public void deleteFormFile(Actor actor, UUID clubId, UUID formId, UUID fileId) {
        requireAnyPermission(actor, clubId, "application.manage_form", "application.review");
        formRepository.findByIdAndClub_Id(formId, clubId)
                .orElseThrow(() -> notFound("APPLICATION_FORM_NOT_FOUND", "Application form not found"));
        ClubApplicationFile file = fileRepository.findByIdAndForm_Id(fileId, formId)
                .orElseThrow(() -> notFound("APPLICATION_FILE_NOT_FOUND", "Application form file not found"));
        safeDeleteStorageKey(file.getStoragePath());
        fileRepository.delete(file);
        fileRepository.flush();
    }

    // -----------------------------------------------------------------------------------------
    // 2. Club Applications (Detailed CRUD + File Attachments + Review/Approve)
    // -----------------------------------------------------------------------------------------

    @Override
    @Transactional
    public ClubApplicationResponse create(Actor actor, UUID clubId, CreateClubApplicationRequest request) {
        UUID targetApplicantId = request.applicantId() != null ? request.applicantId() : actor.id();
        boolean createdByManager = !targetApplicantId.equals(actor.id());
        if (createdByManager) {
            requireAnyPermission(actor, clubId, "application.review", "application.update", "application.approve", "application.create");
        }
        User applicant = findUser(targetApplicantId);
        if (applicant.getStatus() != UserStatus.ACTIVE) {
            throw conflict("USER_INACTIVE", "User account is inactive");
        }
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw conflict("CLUB_INACTIVE", "Club is inactive");
        }
        if (membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(
                targetApplicantId, clubId, MembershipStatus.LEFT).isPresent()) {
            throw conflict("ALREADY_CLUB_MEMBER", "User already has a membership in this club");
        }
        if (applicationRepository.findByApplicant_IdAndClub_IdAndStatus(
                targetApplicantId, clubId, ClubApplicationStatus.PENDING).isPresent()) {
            throw conflict("APPLICATION_ALREADY_PENDING", "An application is already pending");
        }

        ClubApplication application = new ClubApplication();
        application.setApplicant(applicant);
        application.setClub(club);
        application.setMessage(request.message().trim());
        application.setStatus(ClubApplicationStatus.PENDING);

        if (formRepository != null) {
            // A manager entering an application on someone's behalf may use any form at any time.
            ClubApplicationForm form = createdByManager
                    ? resolveFormForClub(clubId, request.formId())
                    : resolveAcceptingForm(clubId, request.formId());
            if (form != null) {
                application.setForm(form);
                if (!createdByManager) {
                    validateRequiredCustomFields(form, request.customAnswers());
                }
            }
        }
        applyDetailedFields(
                application,
                clubId,
                request.preferredDepartmentId(),
                request.secondaryDepartmentId(),
                request.applicantPhone(),
                request.facultyMajor(),
                request.academicYear(),
                request.gpa(),
                request.socialPortfolioUrl(),
                request.selfIntroduction(),
                request.skillsExperience(),
                request.availability(),
                request.customAnswers()
        );

        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_CREATED, saved.getId(), clubId, null,
                Map.of("applicantId", targetApplicantId, "clubId", clubId, "status", saved.getStatus()));
        return clubApplicationMapper.toResponse(saved, null, filesForApplication(saved.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClubApplicationSummaryResponse> listMine(
            Actor actor, ClubApplicationStatus status, UUID clubId, String sort, int offset, int limit) {
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, applicationSort(sort));
        Specification<ClubApplication> spec = Specification.where(ClubApplicationSpecifications.forApplicant(actor.id()))
                .and(ClubApplicationSpecifications.hasStatus(status))
                .and(ClubApplicationSpecifications.forClub(clubId));
        Page<ClubApplication> applicationPage = applicationRepository.findAll(spec, page);
        Map<UUID, List<ClubApplicationFileResponse>> filesByApp = filesByApplicationIds(
                applicationPage.getContent().stream().map(ClubApplication::getId).toList());
        List<ClubApplicationSummaryResponse> items = applicationPage.getContent().stream()
                .map(app -> clubApplicationMapper.toSummary(
                        app,
                        filesByApp.getOrDefault(app.getId(), Collections.emptyList()).size()))
                .toList();
        return new PageResponse<>(items, applicationPage.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubApplicationResponse getMine(Actor actor, UUID applicationId) {
        ClubApplication application = applicationRepository.findByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        return clubApplicationMapper.toResponse(application, null, filesForApplication(application.getId()));
    }

    @Override
    @Transactional
    public ClubApplicationResponse updateMine(Actor actor, UUID applicationId, UpdateClubApplicationRequest request) {
        ClubApplication application = applicationRepository.findForUpdateByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        if (application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_CANNOT_BE_UPDATED", "Only pending applications can be updated");
        }
        Map<String, Object> before = pendingAuditValues(application);
        if (request.message() != null) {
            if (request.message().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MESSAGE", "Application message cannot be blank");
            }
            application.setMessage(request.message().trim());
        }
        if (application.getForm() != null && request.customAnswers() != null) {
            validateRequiredCustomFields(application.getForm(), request.customAnswers());
        }
        applyDetailedFields(
                application,
                application.getClub().getId(),
                request.preferredDepartmentId(),
                request.secondaryDepartmentId(),
                request.applicantPhone(),
                request.facultyMajor(),
                request.academicYear(),
                request.gpa(),
                request.socialPortfolioUrl(),
                request.selfIntroduction(),
                request.skillsExperience(),
                request.availability(),
                request.customAnswers()
        );
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_UPDATED, saved.getId(), saved.getClub().getId(),
                before, pendingAuditValues(saved));
        return clubApplicationMapper.toResponse(saved, null, filesForApplication(saved.getId()));
    }

    @Override
    @Transactional
    public void deleteMine(Actor actor, UUID applicationId) {
        ClubApplication application = applicationRepository.findForUpdateByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        if (application.getStatus() == ClubApplicationStatus.APPROVED) {
            throw conflict("APPLICATION_CANNOT_BE_DELETED", "Approved applications cannot be deleted by applicant");
        }
        deleteApplicationFilesFromStorage(application.getId());
        UUID clubId = application.getClub().getId();
        Map<String, Object> before = pendingAuditValues(application);
        applicationRepository.delete(application);
        applicationRepository.flush();
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_DELETED, applicationId, clubId, before, null);
    }

    @Override
    @Transactional
    public ClubApplicationResponse cancel(Actor actor, UUID applicationId) {
        ClubApplication application = applicationRepository.findForUpdateByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        if (application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_CANNOT_BE_CANCELLED", "Only pending applications can be cancelled");
        }
        Map<String, Object> before = pendingAuditValues(application);
        application.setStatus(ClubApplicationStatus.CANCELLED);
        application.setCancelledAt(now());
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_CANCELLED, saved.getId(), saved.getClub().getId(),
                before, applicationAuditValues(saved, saved.getStatus(), null));
        return clubApplicationMapper.toResponse(saved, null, filesForApplication(saved.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClubApplicationResponse> listForClub(Actor actor, UUID clubId,
                                                             ClubApplicationStatus status, String search,
                                                             OffsetDateTime createdFrom, OffsetDateTime createdTo,
                                                             String sort, int offset, int limit) {
        if (!authorizationService.hasPermission(actor, "application.view", clubId, null)) {
            throw forbidden();
        }
        if (!clubRepository.existsById(clubId)) {
            throw notFound("CLUB_NOT_FOUND", "Club not found");
        }
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, applicationSort(sort));
        Specification<ClubApplication> spec = Specification.where(ClubApplicationSpecifications.forClub(clubId))
                .and(ClubApplicationSpecifications.hasStatus(status))
                .and(ClubApplicationSpecifications.applicantKeyword(search))
                .and(ClubApplicationSpecifications.createdBetween(createdFrom, createdTo));
        Page<ClubApplication> applicationPage = applicationRepository.findAll(spec, page);
        Map<UUID, List<ClubApplicationFileResponse>> filesByApp = filesByApplicationIds(
                applicationPage.getContent().stream().map(ClubApplication::getId).toList());
        List<ClubApplicationResponse> items = applicationPage.getContent().stream()
                .map(app -> clubApplicationMapper.toResponse(
                        app,
                        null,
                        filesByApp.getOrDefault(app.getId(), Collections.emptyList())))
                .toList();
        return new PageResponse<>(items, applicationPage.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubApplicationResponse getForClub(Actor actor, UUID clubId, UUID applicationId) {
        requireAnyPermission(actor, clubId, "application.view", "application.view_detail");
        ClubApplication application = applicationRepository.findByIdAndClub_Id(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        return clubApplicationMapper.toResponse(application, null, filesForApplication(application.getId()));
    }

    @Override
    @Transactional
    public ClubApplicationResponse updateForClub(Actor actor, UUID clubId, UUID applicationId,
                                                 UpdateClubApplicationRequest request) {
        requireAnyPermission(actor, clubId, "application.update", "application.review", "application.approve", "application.reject");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        Map<String, Object> before = pendingAuditValues(application);

        if (request.message() != null && !request.message().isBlank()) {
            application.setMessage(request.message().trim());
        }
        applyDetailedFields(
                application,
                clubId,
                request.preferredDepartmentId(),
                request.secondaryDepartmentId(),
                request.applicantPhone(),
                request.facultyMajor(),
                request.academicYear(),
                request.gpa(),
                request.socialPortfolioUrl(),
                request.selfIntroduction(),
                request.skillsExperience(),
                request.availability(),
                request.customAnswers()
        );

        if (request.reviewNote() != null) {
            application.setReviewNote(blankToNull(request.reviewNote()));
        }

        Membership linkedMembership = null;
        if (request.status() != null && request.status() != application.getStatus()) {
            User reviewer = findUser(actor.id());
            ClubApplicationStatus targetStatus = request.status();
            application.setStatus(targetStatus);
            if (targetStatus == ClubApplicationStatus.APPROVED) {
                application.setReviewedBy(reviewer);
                application.setReviewedAt(now());
                application.setCancelledAt(null);
                linkedMembership = membershipRepository
                        .findFirstByUser_IdAndClub_IdAndStatusNot(
                                application.getApplicant().getId(), clubId, MembershipStatus.LEFT)
                        .orElseGet(() -> {
                            Membership m = new Membership();
                            m.setUser(application.getApplicant());
                            m.setClub(application.getClub());
                            m.setStatus(MembershipStatus.ACTIVE);
                            m.setJoinedAt(now());
                            Membership savedM = membershipRepository.saveAndFlush(m);
                            if (userRoleRepository != null) {
                                userRoleRepository.grantJoinRoles(application.getApplicant().getId(), clubId, actor.id());
                            }
                            return savedM;
                        });
            } else if (targetStatus == ClubApplicationStatus.REJECTED) {
                application.setReviewedBy(reviewer);
                application.setReviewedAt(now());
                application.setCancelledAt(null);
            } else if (targetStatus == ClubApplicationStatus.PENDING) {
                application.setReviewedBy(null);
                application.setReviewedAt(null);
                application.setCancelledAt(null);
            } else if (targetStatus == ClubApplicationStatus.CANCELLED) {
                application.setCancelledAt(now());
            }
        }

        if (request.assignDepartmentId() != null && application.getStatus() == ClubApplicationStatus.APPROVED) {
            Department targetDept = resolveClubDepartment(clubId, request.assignDepartmentId());
            if (targetDept != null && departmentMemberRepository != null) {
                if (linkedMembership == null) {
                    linkedMembership = membershipRepository
                            .findFirstByUser_IdAndClub_IdAndStatusNot(
                                    application.getApplicant().getId(), clubId, MembershipStatus.LEFT)
                            .orElse(null);
                }
                if (linkedMembership != null && departmentMemberRepository
                        .findByDepartment_IdAndMembership_Id(targetDept.getId(), linkedMembership.getId()).isEmpty()) {
                    DepartmentMember dm = new DepartmentMember();
                    dm.setDepartment(targetDept);
                    dm.setMembership(linkedMembership);
                    dm.setClubId(clubId);
                    dm.setJoinedAt(now());
                    departmentMemberRepository.saveAndFlush(dm);
                }
            }
        }

        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_UPDATED, saved.getId(), clubId,
                before, applicationAuditValues(saved, saved.getStatus(), linkedMembership != null ? linkedMembership.getId() : null));
        return clubApplicationMapper.toResponse(saved, linkedMembership, filesForApplication(saved.getId()));
    }

    @Override
    @Transactional
    public void deleteForClub(Actor actor, UUID clubId, UUID applicationId) {
        requireAnyPermission(actor, clubId, "application.delete", "application.review");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        deleteApplicationFilesFromStorage(applicationId);
        Map<String, Object> before = Map.of(
                "applicantId", application.getApplicant().getId(),
                "clubId", clubId,
                "status", application.getStatus()
        );
        applicationRepository.delete(application);
        applicationRepository.flush();
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_DELETED, applicationId, clubId, before, null);
    }

    @Override
    @Transactional
    public ClubApplicationFileResponse uploadApplicationFile(Actor actor, UUID applicationId,
                                                             String fileCategory, UploadedFile file) {
        ClubApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        UUID clubId = application.getClub().getId();
        boolean isOwner = application.getApplicant().getId().equals(actor.id());
        if (!isOwner && !authorizationService.hasPermission(actor, "application.update", clubId, null)
                && !authorizationService.hasPermission(actor, "application.review", clubId, null)) {
            throw forbidden();
        }
        if (isOwner && application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_NOT_PENDING", "Attachments can only be added while the application is pending");
        }
        int maxAttachments = application.getForm() != null ? application.getForm().getMaxAttachments() : 5;
        if (application.getForm() != null && !application.getForm().isAllowAttachments()) {
            throw conflict("ATTACHMENTS_DISABLED", "This application form does not accept file attachments");
        }
        if (fileRepository != null && fileRepository.countByApplication_Id(applicationId) >= maxAttachments) {
            throw conflict("MAX_ATTACHMENTS_EXCEEDED", "Maximum number of attachments (" + maxAttachments + ") reached");
        }
        String normalizedCategory = normalizeFileCategory(fileCategory, "APPLICANT_ATTACHMENT");
        ClubApplicationFile saved = inspectAndStoreFile(
                actor.id(), application.getClub(), null, application, normalizedCategory, file);
        return clubApplicationMapper.toFileResponse(saved);
    }

    @Override
    @Transactional
    public void deleteApplicationFile(Actor actor, UUID applicationId, UUID fileId) {
        ClubApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        UUID clubId = application.getClub().getId();
        boolean isOwner = application.getApplicant().getId().equals(actor.id());
        if (!isOwner && !authorizationService.hasPermission(actor, "application.update", clubId, null)
                && !authorizationService.hasPermission(actor, "application.review", clubId, null)) {
            throw forbidden();
        }
        if (isOwner && application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_NOT_PENDING", "Attachments can only be removed while the application is pending");
        }
        ClubApplicationFile file = fileRepository.findByIdAndApplication_Id(fileId, applicationId)
                .orElseThrow(() -> notFound("APPLICATION_FILE_NOT_FOUND", "Application attachment not found"));
        safeDeleteStorageKey(file.getStoragePath());
        fileRepository.delete(file);
        fileRepository.flush();
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentContent downloadFile(Actor actor, UUID fileId) {
        if (fileRepository == null || documentStorage == null) {
            throw notFound("APPLICATION_FILE_NOT_FOUND", "Application file not found");
        }
        ClubApplicationFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> notFound("APPLICATION_FILE_NOT_FOUND", "Application file not found"));
        if (file.getApplication() != null) {
            ClubApplication application = file.getApplication();
            UUID clubId = file.getClub().getId();
            boolean isOwner = application.getApplicant().getId().equals(actor.id());
            boolean isReviewer = authorizationService.hasPermission(actor, "application.view", clubId, null)
                    || authorizationService.hasPermission(actor, "application.view_detail", clubId, null)
                    || authorizationService.hasPermission(actor, "application.review", clubId, null);
            if (!isOwner && !isReviewer) {
                throw forbidden();
            }
        }
        DocumentStorage.StoredObject stored = documentStorage.open(file.getStoragePath());
        return new DocumentContent(
                file.getOriginalName(),
                file.getContentType(),
                file.getSizeBytes(),
                file.getChecksumSha256(),
                1,
                stored.content()
        );
    }

    @Override
    @Transactional
    public ClubApplicationResponse approve(Actor actor, UUID clubId, UUID applicationId,
                                           ReviewClubApplicationRequest request) {
        requireAnyPermission(actor, clubId, "application.approve", "application.review");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        ensurePending(application);
        if (application.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw conflict("CLUB_INACTIVE", "Club is inactive");
        }
        if (application.getApplicant().getStatus() != UserStatus.ACTIVE) {
            throw conflict("USER_INACTIVE", "The applicant's account is inactive");
        }
        if (membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(
                application.getApplicant().getId(), clubId, MembershipStatus.LEFT).isPresent()) {
            throw conflict("DUPLICATE_MEMBERSHIP", "User already has a current membership in this club");
        }
        if (application.getForm() != null && application.getForm().isRequireAttachment()
                && fileRepository != null && fileRepository.countByApplication_Id(applicationId) == 0) {
            throw conflict("APPLICATION_ATTACHMENT_REQUIRED", "This form requires an attachment before the application can be approved");
        }

        User reviewer = findUser(actor.id());
        Membership membership = new Membership();
        membership.setUser(application.getApplicant());
        membership.setClub(application.getClub());
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(now());
        Membership savedMembership = membershipRepository.saveAndFlush(membership);
        if (userRoleRepository != null) {
            userRoleRepository.grantJoinRoles(application.getApplicant().getId(), clubId, actor.id());
        }

        Department targetDepartment = resolveApprovalDepartment(clubId, application, request);
        if (targetDepartment != null && departmentMemberRepository != null) {
            if (departmentMemberRepository.findByDepartment_IdAndMembership_Id(
                    targetDepartment.getId(), savedMembership.getId()).isEmpty()) {
                DepartmentMember dm = new DepartmentMember();
                dm.setDepartment(targetDepartment);
                dm.setMembership(savedMembership);
                dm.setClubId(clubId);
                dm.setJoinedAt(now());
                DepartmentMember savedDm = departmentMemberRepository.saveAndFlush(dm);
                auditService.record(actor.id(), AuditAction.DEPARTMENT_MEMBER_ADDED, savedDm.getId(), clubId, null,
                        Map.of("departmentId", targetDepartment.getId(), "membershipId", savedMembership.getId()));
            }
        }

        Map<String, Object> approvalBefore = pendingAuditValues(application);
        application.setStatus(ClubApplicationStatus.APPROVED);
        application.setReviewedBy(reviewer);
        application.setReviewedAt(now());
        application.setReviewNote(normalizeNote(request));
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        Map<String, Object> membershipAfter = new LinkedHashMap<>();
        membershipAfter.put("userId", application.getApplicant().getId());
        membershipAfter.put("clubId", clubId);
        membershipAfter.put("applicationId", saved.getId());
        membershipAfter.put("status", MembershipStatus.ACTIVE);
        membershipAfter.put("joinRolesGranted", true);
        auditService.record(actor.id(), AuditAction.MEMBERSHIP_CREATED, savedMembership.getId(), clubId, null,
                membershipAfter);
        Map<String, Object> approvalAfter = applicationAuditValues(application, saved.getStatus(), savedMembership.getId());
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_APPROVED, saved.getId(), clubId,
                approvalBefore, approvalAfter);
        if (notificationService != null) {
            notificationService.create(application.getApplicant().getId(), "Đơn đăng ký được duyệt",
                    "Bạn đã được chấp nhận vào " + application.getClub().getName() + ".", saved.getId());
        }
        return clubApplicationMapper.toResponse(saved, savedMembership, filesForApplication(saved.getId()));
    }

    @Override
    @Transactional
    public ClubApplicationResponse reject(Actor actor, UUID clubId, UUID applicationId,
                                          ReviewClubApplicationRequest request) {
        requireAnyPermission(actor, clubId, "application.reject", "application.review");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        ensurePending(application);
        User reviewer = findUser(actor.id());
        Map<String, Object> rejectionBefore = pendingAuditValues(application);
        application.setStatus(ClubApplicationStatus.REJECTED);
        application.setReviewedBy(reviewer);
        application.setReviewedAt(now());
        application.setReviewNote(normalizeNote(request));
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_REJECTED, saved.getId(), clubId,
                rejectionBefore,
                applicationAuditValues(saved, saved.getStatus(), null));
        if (notificationService != null) {
            notificationService.create(application.getApplicant().getId(), "Đơn đăng ký bị từ chối",
                    "Đơn đăng ký vào " + application.getClub().getName() + " đã bị từ chối.", saved.getId());
        }
        return clubApplicationMapper.toResponse(saved, null, filesForApplication(saved.getId()));
    }

    // -----------------------------------------------------------------------------------------
    // Private Helpers
    // -----------------------------------------------------------------------------------------

    private void applyFormRequest(ClubApplicationForm form, UpsertClubApplicationFormRequest request) {
        form.setTitle(request.title().trim());
        form.setDescription(blankToNull(request.description()));
        String status = request.status() == null || request.status().isBlank()
                ? "OPEN"
                : request.status().trim().toUpperCase(Locale.ROOT);
        if (!VALID_FORM_STATUSES.contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FORM_STATUS",
                    "Form status must be DRAFT, OPEN, or CLOSED");
        }
        form.setStatus(status);
        if (request.openAt() != null && request.closeAt() != null && !request.closeAt().isAfter(request.openAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FORM_WINDOW",
                    "The closing time must be after the opening time");
        }
        form.setOpenAt(request.openAt());
        form.setCloseAt(request.closeAt());
        form.setFieldsConfig(serializeFields(request.fields()));
        if (request.allowAttachments() != null) form.setAllowAttachments(request.allowAttachments());
        if (request.requireAttachment() != null) form.setRequireAttachment(request.requireAttachment());
        if (request.maxAttachments() != null) form.setMaxAttachments(request.maxAttachments());
        if (request.isDefault() != null) form.setDefault(request.isDefault());
    }

    private void unsetOtherDefaultForms(UUID clubId, UUID excludeFormId) {
        if (formRepository == null) return;
        for (ClubApplicationForm existing : formRepository.findByClub_IdOrderByIsDefaultDescCreatedAtDesc(clubId)) {
            if (existing.isDefault() && (excludeFormId == null || !existing.getId().equals(excludeFormId))) {
                existing.setDefault(false);
                formRepository.save(existing);
            }
        }
    }

    private ClubApplicationForm resolveFormForClub(UUID clubId, UUID requestedFormId) {
        if (formRepository == null) return null;
        if (requestedFormId != null) {
            return formRepository.findByIdAndClub_Id(requestedFormId, clubId)
                    .orElseThrow(() -> notFound("APPLICATION_FORM_NOT_FOUND", "Application form not found for this club"));
        }
        return formRepository.findFirstByClub_IdAndStatusOrderByIsDefaultDescCreatedAtDesc(clubId, "OPEN")
                .orElse(null);
    }

    /**
     * The form a student applies through: the requested one, else the club's open form. A club that never set up
     * a form takes applications on the built-in default; one whose forms are all draft or closed takes none.
     */
    private ClubApplicationForm resolveAcceptingForm(UUID clubId, UUID requestedFormId) {
        ClubApplicationForm form;
        if (requestedFormId != null) {
            form = formRepository.findByIdAndClub_Id(requestedFormId, clubId)
                    .orElseThrow(() -> notFound("APPLICATION_FORM_NOT_FOUND", "Application form not found for this club"));
        } else {
            form = formRepository.findFirstByClub_IdAndStatusOrderByIsDefaultDescCreatedAtDesc(clubId, "OPEN").orElse(null);
            if (form == null) {
                if (formRepository.findFirstByClub_IdOrderByIsDefaultDescCreatedAtDesc(clubId).isEmpty()) {
                    return null;
                }
                throw conflict("APPLICATION_FORM_CLOSED", "The club is not accepting applications");
            }
        }
        if (!"OPEN".equalsIgnoreCase(form.getStatus())) {
            throw conflict("APPLICATION_FORM_CLOSED", "The club is not accepting applications");
        }
        OffsetDateTime now = now();
        if (form.getOpenAt() != null && now.isBefore(form.getOpenAt())) {
            throw conflict("APPLICATION_NOT_OPEN_YET", "Applications open at " + form.getOpenAt());
        }
        if (form.getCloseAt() != null && !now.isBefore(form.getCloseAt())) {
            throw conflict("APPLICATION_FORM_CLOSED", "Applications closed at " + form.getCloseAt());
        }
        return form;
    }

    private void validateRequiredCustomFields(ClubApplicationForm form, Map<String, Object> customAnswers) {
        List<FormFieldDefinition> fields = parseFields(form.getFieldsConfig());
        Map<String, Object> answers = customAnswers != null ? customAnswers : Collections.emptyMap();
        for (FormFieldDefinition field : fields) {
            if (field.required() && field.key() != null && !field.key().isBlank()) {
                Object val = answers.get(field.key());
                if (val == null || val.toString().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "MISSING_REQUIRED_FORM_FIELD",
                            "Vui lòng điền trường bắt buộc: " + (field.label() != null ? field.label() : field.key()));
                }
            }
        }
    }

    private void applyDetailedFields(ClubApplication application,
                                     UUID clubId,
                                     UUID preferredDepartmentId,
                                     UUID secondaryDepartmentId,
                                     String applicantPhone,
                                     String facultyMajor,
                                     String academicYear,
                                     String gpa,
                                     String socialPortfolioUrl,
                                     String selfIntroduction,
                                     String skillsExperience,
                                     String availability,
                                     Map<String, Object> customAnswers) {
        if (preferredDepartmentId != null) {
            application.setPreferredDepartment(resolveClubDepartment(clubId, preferredDepartmentId));
        }
        if (secondaryDepartmentId != null) {
            application.setSecondaryDepartment(resolveClubDepartment(clubId, secondaryDepartmentId));
        }
        if (applicantPhone != null) application.setApplicantPhone(blankToNull(applicantPhone));
        if (facultyMajor != null) application.setFacultyMajor(blankToNull(facultyMajor));
        if (academicYear != null) application.setAcademicYear(blankToNull(academicYear));
        if (gpa != null) application.setGpa(blankToNull(gpa));
        if (socialPortfolioUrl != null) application.setSocialPortfolioUrl(blankToNull(socialPortfolioUrl));
        if (selfIntroduction != null) application.setSelfIntroduction(blankToNull(selfIntroduction));
        if (skillsExperience != null) application.setSkillsExperience(blankToNull(skillsExperience));
        if (availability != null) application.setAvailability(blankToNull(availability));
        if (customAnswers != null) {
            application.setCustomAnswers(serializeMap(customAnswers));
        }
    }

    private Department resolveClubDepartment(UUID clubId, UUID departmentId) {
        if (departmentRepository == null) return null;
        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> notFound("DEPARTMENT_NOT_FOUND", "Department not found"));
        if (!dept.getClub().getId().equals(clubId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CROSS_CLUB_DEPARTMENT",
                    "Selected department does not belong to this club");
        }
        if (dept.getStatus() != DepartmentStatus.ACTIVE) {
            throw conflict("DEPARTMENT_INACTIVE", "Selected department is inactive");
        }
        return dept;
    }

    private Department resolveApprovalDepartment(UUID clubId, ClubApplication application,
                                                 ReviewClubApplicationRequest request) {
        if (departmentRepository == null) return null;
        if (request != null && request.departmentId() != null) {
            return resolveClubDepartment(clubId, request.departmentId());
        }
        if (application.getPreferredDepartment() != null
                && application.getPreferredDepartment().getStatus() == DepartmentStatus.ACTIVE
                && application.getPreferredDepartment().getClub().getId().equals(clubId)) {
            return application.getPreferredDepartment();
        }
        return null;
    }

    private ClubApplicationFile inspectAndStoreFile(UUID actorId, Club club, ClubApplicationForm form,
                                                    ClubApplication application, String fileCategory,
                                                    UploadedFile file) {
        if (file == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "file: must not be null");
        }
        DocumentFileInspector.InspectedFile inspected = fileInspector.inspect(file.originalName(), file.content()::open);
        if (!ALLOWED_APPLICATION_FILE_TYPES.contains(inspected.type())) {
            throw new UnsupportedDocumentTypeException(
                    "Only PDF, Word (.doc, .docx), and image (.png, .jpg, .gif, .webp) files are supported for applications");
        }
        UUID storageToken = UUID.randomUUID();
        String ownerFolder = form != null ? "forms/" + form.getId() : "applications/" + application.getId();
        String storageKey = "clubs/" + club.getId() + "/" + ownerFolder + "/" + storageToken + "-" + inspected.name();
        try (InputStream stream = file.content().open()) {
            documentStorage.put(storageKey, stream, inspected.size(), inspected.type().contentType());
        } catch (IOException exception) {
            throw new DocumentStorageException("Could not read uploaded file", exception);
        }
        ClubApplicationFile entity = new ClubApplicationFile();
        entity.setClub(club);
        entity.setForm(form);
        entity.setApplication(application);
        entity.setFileCategory(fileCategory);
        entity.setOriginalName(inspected.name());
        entity.setFileType(inspected.type().name());
        entity.setContentType(inspected.type().contentType());
        entity.setSizeBytes(inspected.size());
        entity.setStoragePath(storageKey);
        entity.setChecksumSha256(inspected.sha256());
        entity.setUploadedBy(actorId);
        return fileRepository.saveAndFlush(entity);
    }

    private void deleteApplicationFilesFromStorage(UUID applicationId) {
        if (fileRepository == null || documentStorage == null) return;
        for (ClubApplicationFile file : fileRepository.findByApplication_IdOrderByCreatedAtAsc(applicationId)) {
            safeDeleteStorageKey(file.getStoragePath());
        }
    }

    private void safeDeleteStorageKey(String key) {
        if (documentStorage == null || key == null) return;
        try {
            documentStorage.delete(key);
        } catch (Exception ignored) {
            // Keep DB deletion resilient even if storage file was already missing.
        }
    }

    private List<ClubApplicationFileResponse> filesForForm(UUID formId) {
        if (fileRepository == null || formId == null) return Collections.emptyList();
        return fileRepository.findByForm_IdOrderByCreatedAtAsc(formId).stream()
                .map(clubApplicationMapper::toFileResponse)
                .toList();
    }

    private Map<UUID, List<ClubApplicationFileResponse>> filesByFormIds(List<UUID> formIds) {
        if (fileRepository == null || formIds.isEmpty()) return Collections.emptyMap();
        return fileRepository.findByForm_IdInOrderByCreatedAtAsc(formIds).stream()
                .map(clubApplicationMapper::toFileResponse)
                .collect(Collectors.groupingBy(ClubApplicationFileResponse::formId));
    }

    private List<ClubApplicationFileResponse> filesForApplication(UUID applicationId) {
        if (fileRepository == null || applicationId == null) return Collections.emptyList();
        return fileRepository.findByApplication_IdOrderByCreatedAtAsc(applicationId).stream()
                .map(clubApplicationMapper::toFileResponse)
                .toList();
    }

    private Map<UUID, List<ClubApplicationFileResponse>> filesByApplicationIds(List<UUID> applicationIds) {
        if (fileRepository == null || applicationIds.isEmpty()) return Collections.emptyMap();
        return fileRepository.findByApplication_IdInOrderByCreatedAtAsc(applicationIds).stream()
                .map(clubApplicationMapper::toFileResponse)
                .collect(Collectors.groupingBy(ClubApplicationFileResponse::applicationId));
    }

    private List<ClubApplicationFormResponse.DepartmentOption> activeDepartmentOptions(UUID clubId) {
        if (departmentRepository == null) return Collections.emptyList();
        return departmentRepository.findByClub_IdAndStatusOrderByNameAsc(clubId, DepartmentStatus.ACTIVE).stream()
                .map(d -> new ClubApplicationFormResponse.DepartmentOption(d.getId(), d.getName(), d.getDescription()))
                .toList();
    }

    private ClubApplicationFormResponse toFormResponse(
            ClubApplicationForm form,
            Club club,
            List<ClubApplicationFileResponse> templateFiles,
            List<ClubApplicationFormResponse.DepartmentOption> departments) {
        return new ClubApplicationFormResponse(
                form.getId(),
                club.getId(),
                club.getCode(),
                club.getName(),
                form.getTitle(),
                form.getDescription(),
                form.getStatus(),
                form.getOpenAt(),
                form.getCloseAt(),
                parseFields(form.getFieldsConfig()),
                form.isAllowAttachments(),
                form.isRequireAttachment(),
                form.getMaxAttachments(),
                form.isDefault(),
                templateFiles,
                departments,
                form.getCreatedAt(),
                form.getUpdatedAt()
        );
    }

    private static ClubApplicationFormResponse synthesizedDefaultForm(
            Club club,
            List<ClubApplicationFormResponse.DepartmentOption> departments) {
        return new ClubApplicationFormResponse(
                null,
                club.getId(),
                club.getCode(),
                club.getName(),
                "Đơn đăng ký thành viên " + club.getName(),
                "Điền đầy đủ thông tin cá nhân, nguyện vọng phân ban và đính kèm CV / Đơn đăng ký (.docx, .pdf, hình ảnh minh chứng) nếu có.",
                "OPEN",
                null,
                null,
                Collections.emptyList(),
                true,
                false,
                5,
                true,
                Collections.emptyList(),
                departments,
                null,
                null
        );
    }

    private static String normalizeFileCategory(String raw, String fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (!VALID_FILE_CATEGORIES.contains(upper)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_CATEGORY",
                    "Unsupported fileCategory: " + raw);
        }
        return upper;
    }

    private static List<FormFieldDefinition> parseFields(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return JSON.readValue(json, new TypeReference<>() { });
        } catch (IOException exception) {
            return Collections.emptyList();
        }
    }

    private static String serializeFields(List<FormFieldDefinition> fields) {
        if (fields == null || fields.isEmpty()) return "[]";
        try {
            return JSON.writeValueAsString(fields);
        } catch (JsonProcessingException exception) {
            return "[]";
        }
    }

    private static String serializeMap(Map<String, Object> map) {
        if (map == null || map.isEmpty()) return "{}";
        try {
            return JSON.writeValueAsString(map);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private User findUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
    }

    private void requireAnyPermission(Actor actor, UUID clubId, String... keys) {
        for (String key : keys) {
            if (authorizationService.hasPermission(actor, key, clubId, null)) {
                return;
            }
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }

    private static void ensurePending(ClubApplication application) {
        if (application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_ALREADY_REVIEWED", "Application has already been reviewed");
        }
    }

    private static String normalizeNote(ReviewClubApplicationRequest request) {
        return request == null || request.reviewNote() == null || request.reviewNote().isBlank()
                ? null : request.reviewNote().trim();
    }

    private static Sort applicationSort(String raw) {
        if (raw == null || raw.isBlank()) {
            return Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        }
        String[] parts = raw.trim().split(",", -1);
        if (parts.length != 2 || !parts[0].equals("createdAt")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Sort must be createdAt,asc or createdAt,desc");
        }
        Sort.Direction direction;
        try {
            direction = Sort.Direction.fromString(parts[1]);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Sort must be createdAt,asc or createdAt,desc");
        }
        return Sort.by(new Sort.Order(direction, "createdAt"), new Sort.Order(direction, "id"));
    }

    private static Map<String, Object> applicationAuditValues(ClubApplication application,
                                                                ClubApplicationStatus status,
                                                                UUID membershipId) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", status);
        values.put("applicantId", application.getApplicant().getId());
        values.put("clubId", application.getClub().getId());
        if (application.getReviewedBy() != null) values.put("reviewerId", application.getReviewedBy().getId());
        if (application.getReviewNote() != null) values.put("reviewNote", application.getReviewNote());
        if (membershipId != null) values.put("membershipId", membershipId);
        return values;
    }

    private static Map<String, Object> pendingAuditValues(ClubApplication application) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", ClubApplicationStatus.PENDING);
        values.put("applicantId", application.getApplicant().getId());
        values.put("clubId", application.getClub().getId());
        return values;
    }

    private static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    private static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }
}
