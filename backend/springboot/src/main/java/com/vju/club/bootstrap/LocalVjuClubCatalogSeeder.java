package com.vju.club.bootstrap;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.config.DemoDataProperties;
import com.vju.club.dto.request.FormFieldDefinition;
import com.vju.club.entity.AiSummary;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubApplication;
import com.vju.club.entity.ClubApplicationForm;
import com.vju.club.entity.Department;
import com.vju.club.entity.DepartmentMember;
import com.vju.club.entity.Document;
import com.vju.club.entity.DocumentVersion;
import com.vju.club.entity.Event;
import com.vju.club.entity.EventRegistration;
import com.vju.club.entity.Membership;
import com.vju.club.entity.Permission;
import com.vju.club.entity.Role;
import com.vju.club.entity.Task;
import com.vju.club.entity.User;
import com.vju.club.entity.UserRole;
import com.vju.club.enums.ChatChannelType;
import com.vju.club.enums.ChatSenderType;
import com.vju.club.enums.ClubApplicationStatus;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.enums.PermissionScope;
import com.vju.club.enums.TaskPriority;
import com.vju.club.enums.TaskStatus;
import com.vju.club.enums.UserStatus;
import com.vju.club.repository.AiSummaryRepository;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.ClubApplicationFormRepository;
import com.vju.club.repository.ClubApplicationRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.DocumentRepository;
import com.vju.club.repository.DocumentVersionRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.NotificationRepository;
import com.vju.club.repository.PermissionRepository;
import com.vju.club.repository.RoleRepository;
import com.vju.club.repository.TaskRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds and enriches the 12 real VJU student clubs, recruitment forms, showcase events,
 * multi-club memberships, department assignments, applications, and tasks
 * in the {@code local} profile when {@code app.demo-data.enabled=true}.
 */
@Component
@Profile("local")
@Order(20)
public class LocalVjuClubCatalogSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(LocalVjuClubCatalogSeeder.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final DemoDataProperties demoDataProperties;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final ClubApplicationFormRepository formRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final ClubApplicationRepository clubApplicationRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final String frontendBaseUrl;

    @Autowired(required = false)
    private PermissionRepository permissionRepository;

    @Autowired(required = false)
    private ChatChannelRepository chatChannelRepository;

    @Autowired(required = false)
    private ChatMessageRepository chatMessageRepository;

    @Autowired(required = false)
    private AiSummaryRepository aiSummaryRepository;

    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    @Autowired(required = false)
    private EventRegistrationRepository eventRegistrationRepository;

    @Autowired(required = false)
    private DocumentRepository documentRepository;

    @Autowired(required = false)
    private DocumentVersionRepository documentVersionRepository;

    public LocalVjuClubCatalogSeeder(
            DemoDataProperties demoDataProperties,
            ClubRepository clubRepository,
            DepartmentRepository departmentRepository,
            ClubApplicationFormRepository formRepository,
            EventRepository eventRepository,
            Clock clock,
            String frontendBaseUrl) {
        this(demoDataProperties, clubRepository, departmentRepository, formRepository, eventRepository,
                null, null, null, null, null, null, null, null, clock, frontendBaseUrl);
    }

    @Autowired
    public LocalVjuClubCatalogSeeder(
            DemoDataProperties demoDataProperties,
            ClubRepository clubRepository,
            DepartmentRepository departmentRepository,
            ClubApplicationFormRepository formRepository,
            EventRepository eventRepository,
            UserRepository userRepository,
            MembershipRepository membershipRepository,
            DepartmentMemberRepository departmentMemberRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            ClubApplicationRepository clubApplicationRepository,
            TaskRepository taskRepository,
            PasswordEncoder passwordEncoder,
            Clock clock,
            @Value("${app.frontend.public-url:http://localhost:3000}") String frontendBaseUrl) {
        this.demoDataProperties = demoDataProperties;
        this.clubRepository = clubRepository;
        this.departmentRepository = departmentRepository;
        this.formRepository = formRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.departmentMemberRepository = departmentMemberRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.clubApplicationRepository = clubApplicationRepository;
        this.taskRepository = taskRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.frontendBaseUrl = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!demoDataProperties.isEnabled()) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        String defaultFieldsJson = buildDefaultFieldsJson();
        int seededCount = 0;
        Map<String, Club> clubsByCode = new LinkedHashMap<>();

        for (ClubCatalogEntry spec : catalogEntries()) {
            Club club = upsertClub(spec);
            ensureDepartments(club, spec.departments());
            ensureOpenApplicationForm(club, spec, now, defaultFieldsJson);
            ensureClubEvents(club, spec, now);
            clubsByCode.put(spec.code(), club);
            seededCount++;
        }

        if (userRepository != null && membershipRepository != null
                && departmentMemberRepository != null && roleRepository != null && userRoleRepository != null) {
            ensureEnrichedRolePermissions();
            seedMembershipsAndOperations(clubsByCode, now);
        }

        log.info("Synchronized {} real VJU clubs (images, departments, open forms, memberships, and events) for local showcase", seededCount);
    }

    private void ensureEnrichedRolePermissions() {
        if (roleRepository == null || permissionRepository == null) {
            return;
        }
        enrichRoleWithPermissions("CLUB_MEMBER", List.of(
                "club.view",
                "department.view",
                "department.member.view",
                "member.view",
                "document.view",
                "event.view",
                "task.view",
                "chat.view",
                "chat.send",
                "chat.summarize"
        ));
        enrichRoleWithPermissions("DEPARTMENT_HEAD", List.of(
                "department.member.view",
                "department.member.add",
                "department.member.remove",
                "event.attendance",
                "event.attendance_edit",
                "task.view",
                "task.create",
                "task.update"
        ));
    }

    private void enrichRoleWithPermissions(String roleCode, List<String> permissionKeys) {
        roleRepository.findByCode(roleCode).ifPresent(role -> {
            java.util.Set<java.util.UUID> existingIds = role.getPermissions().stream()
                    .map(Permission::getId)
                    .collect(java.util.stream.Collectors.toSet());
            List<Permission> toAdd = permissionRepository.findByPermissionKeyIn(permissionKeys).stream()
                    .filter(p -> !existingIds.contains(p.getId()))
                    .filter(p -> isScopeCompatible(role.getScope(), p.getScope()))
                    .toList();
            if (!toAdd.isEmpty()) {
                role.getPermissions().addAll(toAdd);
                roleRepository.save(role);
            }
        });
    }

    private boolean isScopeCompatible(PermissionScope roleScope, PermissionScope permScope) {
        if (roleScope == PermissionScope.GLOBAL) {
            return true;
        }
        if (roleScope == PermissionScope.CLUB) {
            return permScope == PermissionScope.CLUB || permScope == PermissionScope.DEPARTMENT;
        }
        return permScope == PermissionScope.DEPARTMENT;
    }

    private void seedMembershipsAndOperations(Map<String, Club> clubsByCode, OffsetDateTime now) {
        User userA = ensureUser("demo.a@vju.local", "Nguyễn Văn A", "VJU-DEMO-A");
        User userB = ensureUser("demo.b@vju.local", "Trần Thị B", "VJU-DEMO-B");
        User userC = ensureUser("demo.c@vju.local", "Lê Văn C", "VJU-DEMO-C");
        User student = ensureUser("demo.student@vju.local", "Sinh viên đăng ký CLB", "VJU-DEMO-STUDENT");

        User svLinh = ensureUser("linh.nt@vju.local", "Nguyễn Thùy Linh", "22110025");
        User svMinh = ensureUser("minh.hq@vju.local", "Hoàng Quang Minh", "22110042");
        User svAnh = ensureUser("anh.pt@vju.local", "Phạm Tuấn Anh", "23110019");
        User svTrang = ensureUser("trang.dh@vju.local", "Đỗ Huyền Trang", "23110056");
        User svKhanh = ensureUser("khanh.nv@vju.local", "Nguyễn Vũ Khánh", "22110081");
        User svVy = ensureUser("vy.lt@vju.local", "Lê Thảo Vy", "23110064");

        // Enroll demo.a as CLUB_PRESIDENT and demo.student as CLUB_MEMBER across all 12 real VJU clubs first
        int clubIdx = 0;
        for (Club club : clubsByCode.values()) {
            ensureClubMembership(userA, club, clubIdx, "CLUB_PRESIDENT", userA, now.minusDays(45 - clubIdx));
            ensureClubMembership(student, club, clubIdx + 1, "CLUB_MEMBER", userA, now.minusDays(30 - clubIdx));
            clubIdx++;
        }

        // demo.b@vju.local: joins >= 3 clubs (VJUA, BIGHEART, NEB, HASUKO)
        ensureClubMembership(userB, clubsByCode.get("VJUA"), 0, "DEPARTMENT_HEAD", userA, now.minusDays(42));
        ensureClubMembership(userB, clubsByCode.get("BIGHEART"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(38));
        ensureClubMembership(userB, clubsByCode.get("NEB"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(30));
        ensureClubMembership(userB, clubsByCode.get("HASUKO"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(25));

        // demo.c@vju.local: joins >= 3 clubs (VJUA, SUNPINKEY, VJUP, VAC)
        ensureClubMembership(userC, clubsByCode.get("VJUA"), 0, "CLUB_MEMBER", userA, now.minusDays(36));
        ensureClubMembership(userC, clubsByCode.get("SUNPINKEY"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(34));
        ensureClubMembership(userC, clubsByCode.get("VJUP"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(27));
        ensureClubMembership(userC, clubsByCode.get("VAC"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(22));

        // Ensure every single one of the 12 VJU clubs has 3-4 active members and leadership across departments
        ensureClubMembership(svLinh, clubsByCode.get("VJUA"), 2, "CLUB_VICE_PRESIDENT", userA, now.minusDays(24));
        ensureClubMembership(svLinh, clubsByCode.get("ARC"), 1, "DEPARTMENT_HEAD", userA, now.minusDays(21));
        ensureClubMembership(svLinh, clubsByCode.get("HASUKO"), 1, "CLUB_MEMBER", userB, now.minusDays(19));
        ensureClubMembership(svLinh, clubsByCode.get("VAC"), 1, "DEPARTMENT_HEAD", userC, now.minusDays(16));

        ensureClubMembership(svMinh, clubsByCode.get("MONOZUKURI"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(35));
        ensureClubMembership(svMinh, clubsByCode.get("ARC"), 2, "CLUB_MEMBER", userA, now.minusDays(22));
        ensureClubMembership(svMinh, clubsByCode.get("VJUB"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(30));
        ensureClubMembership(svMinh, clubsByCode.get("VJUS"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(29));

        ensureClubMembership(svAnh, clubsByCode.get("OUVEVJU"), 0, "CLUB_VICE_PRESIDENT", userA, now.minusDays(33));
        ensureClubMembership(svAnh, clubsByCode.get("SUNPINKEY"), 1, "DEPARTMENT_HEAD", userC, now.minusDays(23));
        ensureClubMembership(svAnh, clubsByCode.get("VJUB"), 1, "DEPARTMENT_HEAD", svMinh, now.minusDays(19));
        ensureClubMembership(svAnh, clubsByCode.get("VJUS"), 1, "DEPARTMENT_HEAD", svMinh, now.minusDays(17));

        ensureClubMembership(svTrang, clubsByCode.get("BIGHEART"), 2, "CLUB_VICE_PRESIDENT", userB, now.minusDays(26));
        ensureClubMembership(svTrang, clubsByCode.get("HASUKO"), 2, "DEPARTMENT_HEAD", userB, now.minusDays(20));
        ensureClubMembership(svTrang, clubsByCode.get("OUVEVJU"), 2, "CLUB_MEMBER", svAnh, now.minusDays(15));
        ensureClubMembership(svTrang, clubsByCode.get("VAC"), 2, "CLUB_MEMBER", userC, now.minusDays(14));

        ensureClubMembership(svKhanh, clubsByCode.get("SUNPINKEY"), 2, "CLUB_MEMBER", userC, now.minusDays(18));
        ensureClubMembership(svKhanh, clubsByCode.get("VJUB"), 2, "CLUB_MEMBER", svMinh, now.minusDays(16));
        ensureClubMembership(svKhanh, clubsByCode.get("VJUS"), 2, "CLUB_MEMBER", svMinh, now.minusDays(14));
        ensureClubMembership(svKhanh, clubsByCode.get("MONOZUKURI"), 2, "DEPARTMENT_HEAD", svMinh, now.minusDays(13));

        ensureClubMembership(svVy, clubsByCode.get("NEB"), 1, "CLUB_VICE_PRESIDENT", userB, now.minusDays(25));
        ensureClubMembership(svVy, clubsByCode.get("VJUP"), 2, "DEPARTMENT_HEAD", userC, now.minusDays(21));
        ensureClubMembership(svVy, clubsByCode.get("OUVEVJU"), 3, "CLUB_MEMBER", svAnh, now.minusDays(16));
        ensureClubMembership(svVy, clubsByCode.get("ARC"), 3, "CLUB_MEMBER", userA, now.minusDays(12));

        // Enroll all existing active accounts (admin123@gmail.com, admin@vju.local, 23110209@st.vju.ac.vn, etc.)
        // into all 12 real VJU clubs so /memberships ("CLB đang tham gia"), /dashboard, and /management display all 12 clubs
        for (User existingUser : userRepository.findAll()) {
            if (existingUser.getStatus() != UserStatus.ACTIVE) {
                continue;
            }
            List<java.util.UUID> activeClubIds = membershipRepository.findActiveClubIdsByUserId(existingUser.getId());
            if (activeClubIds.size() < clubsByCode.size()) {
                int idx = 0;
                for (Club club : clubsByCode.values()) {
                    ensureClubMembership(existingUser, club, idx, "CLUB_MEMBER", userA, now.minusDays(25 - idx));
                    idx++;
                }
            }
        }

        if (clubApplicationRepository != null) {
            seedShowcaseApplications(clubsByCode, svLinh, svMinh, svTrang, svVy, now);
        }
        if (taskRepository != null) {
            seedShowcaseTasks(clubsByCode, userA, userB, userC, student, svLinh, svMinh, now);
        }
        seedShowcaseChannelsAndNotifications(clubsByCode, userA, userB, student, now);
    }

    private void seedShowcaseChannelsAndNotifications(
            Map<String, Club> clubsByCode,
            User userA,
            User userB,
            User student,
            OffsetDateTime now) {
        if (chatChannelRepository != null && chatMessageRepository != null) {
            for (Club club : clubsByCode.values()) {
                List<ChatChannel> existing = chatChannelRepository.findByClub_IdOrderByCreatedAtAsc(club.getId());
                if (existing.isEmpty()) {
                    ChatChannel general = new ChatChannel();
                    general.setClub(club);
                    general.setName("thong-bao-chung");
                    general.setChannelType(ChatChannelType.CLUB_GENERAL);
                    general = chatChannelRepository.save(general);

                    ChatMessage welcome = new ChatMessage();
                    welcome.setChannel(general);
                    welcome.setSender(userA);
                    welcome.setSenderType(ChatSenderType.USER);
                    welcome.setContent("Chào mừng các thành viên " + club.getName() + " (" + club.getCode()
                            + ")! Tuần này CLB triển khai kế hoạch hoạt động học kỳ tại cơ sở Hòa Lạc.");
                    chatMessageRepository.save(welcome);

                    ChatMessage reply = new ChatMessage();
                    reply.setChannel(general);
                    reply.setSender(student);
                    reply.setSenderType(ChatSenderType.USER);
                    reply.setContent("Em đã nhận thông tin từ Ban Chủ nhiệm " + club.getCode()
                            + " ạ! Các ban chuyên môn đã sẵn sàng phối hợp chuẩn bị sự kiện.");
                    chatMessageRepository.save(reply);

                    if (aiSummaryRepository != null) {
                        AiSummary summary = new AiSummary();
                        summary.setChannel(general);
                        summary.setRequestedBy(userA);
                        summary.setMessageCount(2);
                        summary.setSummary("Ban Chủ nhiệm và thành viên " + club.getName()
                                + " đã thống nhất kế hoạch triển khai sự kiện học kỳ tại cơ sở Hòa Lạc.");
                        summary.setDecisionsJson("[\"Chốt kế hoạch hoạt động học kỳ tại cơ sở Hòa Lạc\"]");
                        summary.setSuggestedTasksJson("[]");
                        summary.setSuggestedEventsJson("[]");
                        summary.setModel("gemini-2.5-flash");
                        aiSummaryRepository.save(summary);
                    }

                    List<Department> depts = departmentRepository.findByClub_IdOrderByNameAscIdAsc(club.getId());
                    if (!depts.isEmpty()) {
                        ChatChannel deptChannel = new ChatChannel();
                        deptChannel.setClub(club);
                        deptChannel.setDepartment(depts.getFirst());
                        deptChannel.setName("ban-chuyen-mon-noi-bo");
                        deptChannel.setChannelType(ChatChannelType.DEPARTMENT);
                        deptChannel = chatChannelRepository.save(deptChannel);

                        ChatMessage deptMsg = new ChatMessage();
                        deptMsg.setChannel(deptChannel);
                        deptMsg.setSender(userA);
                        deptMsg.setSenderType(ChatSenderType.USER);
                        deptMsg.setContent("Kênh trao đổi nội bộ ban chuyên môn của " + club.getCode()
                                + ". Các thành viên cập nhật tài liệu và phân công ca trực tại đây nhé.");
                        chatMessageRepository.save(deptMsg);
                    }
                }
            }
        }
        if (documentRepository != null && documentVersionRepository != null && userA != null) {
            for (Club club : clubsByCode.values()) {
                if (documentRepository.findNames(club.getId(), false).isEmpty()) {
                    seedClubDocument(club, userA,
                            "Quy-che-Hoat-dong-" + club.getCode() + "-2026.pdf",
                            "club_charter",
                            "1111111111111111111111111111111111111111111111111111111111111111");
                    seedClubDocument(club, userA,
                            "Ke-hoach-Hoat-dong-Hoc-ky-" + club.getCode() + "-2026.pdf",
                            "semester_plan",
                            "2222222222222222222222222222222222222222222222222222222222222222");
                }
            }
        }
        if (eventRegistrationRepository != null && student != null) {
            for (Club club : clubsByCode.values()) {
                for (Event ev : eventRepository.findByClub(club.getId(), EventStatus.OPEN_REGISTRATION, null, PageRequest.of(0, 5))) {
                    if (!eventRegistrationRepository.existsByEvent_IdAndUser_Id(ev.getId(), student.getId())) {
                        EventRegistration reg = new EventRegistration();
                        reg.setEvent(ev);
                        reg.setUser(student);
                        reg.setParticipantType(EventParticipantType.MEMBER);
                        reg.setStatus(EventRegistrationStatus.REGISTERED);
                        reg.setEventRole("Ban Tổ chức & Hậu cần");
                        reg.setNote("Đăng ký tham gia sự kiện CLB " + club.getCode());
                        reg.setRegisteredAt(now.minusDays(2));
                        eventRegistrationRepository.save(reg);
                    }
                }
            }
        }
        if (notificationRepository != null && student != null) {
            notificationRepository.insertIdempotent(
                    student.getId(),
                    "Chào mừng bạn gia nhập hệ thống 12 Câu lạc bộ VJU ClubHub",
                    "Hồ sơ thành viên của bạn đã được đồng bộ đầy đủ tại 12 câu lạc bộ sinh viên Trường Đại học Việt Nhật.",
                    "CLUB",
                    null,
                    "welcome-vju-student-2026"
            );
            notificationRepository.insertIdempotent(
                    student.getId(),
                    "Công việc mới: Chuẩn bị gian hàng Yukata & Origami lễ hội Aki Matsuri",
                    "Ban Chủ nhiệm CLB Văn hoá Việt Nam - Nhật Bản (NEB) vừa phân công nhiệm vụ chuẩn bị gian hàng văn hoá cho bạn.",
                    "TASK",
                    null,
                    "task-assigned-neb-student-2026"
            );
            notificationRepository.insertIdempotent(
                    student.getId(),
                    "Tài liệu mới: Quy chế Tổ chức & Kế hoạch hoạt động CLB học kỳ 2026",
                    "Ban Chủ nhiệm các câu lạc bộ vừa cập nhật bộ Quy chế hoạt động và Kế hoạch học kỳ 2026. Xem tại mục Quy chế & Tài liệu.",
                    "DOCUMENT",
                    null,
                    "doc-published-student-2026"
            );
        }
    }

    private void seedClubDocument(Club club, User owner, String fileName, String appDetailKey, String sha256) {
        String storagePath = "2026/11/09/" + java.util.UUID.randomUUID() + ".pdf";
        Document doc = new Document();
        doc.setClub(club);
        doc.setOwner(owner);
        doc.setName(fileName);
        doc.setPath(storagePath);
        doc.setVersion(1);
        doc.setContentType("application/pdf");
        doc.setSizeBytes(676L);
        doc.setChecksumSha256(sha256);
        doc.setAppDetailKey(appDetailKey);
        Document saved = documentRepository.saveAndFlush(doc);

        DocumentVersion ver = new DocumentVersion();
        ver.setDocument(saved);
        ver.setVersion(1);
        ver.setPath(storagePath);
        ver.setOriginalName(fileName);
        ver.setContentType("application/pdf");
        ver.setSizeBytes(676L);
        ver.setChecksumSha256(sha256);
        ver.setUploadedBy(owner.getId());
        documentVersionRepository.saveAndFlush(ver);
    }

    private User ensureUser(String email, String fullName, String studentCode) {
        return userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            String rawPassword = demoDataProperties.getPassword();
            if (rawPassword == null || rawPassword.isBlank()) {
                rawPassword = "Demo-Password-123";
            }
            User created = new User();
            created.setEmail(email);
            created.setFullName(fullName);
            if (!userRepository.existsByStudentCodeIgnoreCase(studentCode)) {
                created.setStudentCode(studentCode);
            }
            created.setPasswordHash(passwordEncoder != null ? passwordEncoder.encode(rawPassword) : "{noop}" + rawPassword);
            created.setStatus(UserStatus.ACTIVE);
            return userRepository.save(created);
        });
    }

    private void ensureClubMembership(
            User user,
            Club club,
            int departmentIndex,
            String roleCode,
            User grantedBy,
            OffsetDateTime joinedAt) {
        if (user == null || club == null) {
            return;
        }
        Membership membership = membershipRepository
                .findFirstByUser_IdAndClub_IdAndStatusNot(user.getId(), club.getId(), MembershipStatus.LEFT)
                .orElseGet(() -> {
                    Membership m = new Membership();
                    m.setUser(user);
                    m.setClub(club);
                    m.setStatus(MembershipStatus.ACTIVE);
                    m.setJoinedAt(joinedAt);
                    return membershipRepository.save(m);
                });

        if (membership.getStatus() != MembershipStatus.ACTIVE) {
            membership.setStatus(MembershipStatus.ACTIVE);
            membership.setLeftAt(null);
            membership = membershipRepository.save(membership);
        }

        List<Department> departments = departmentRepository.findByClub_IdOrderByNameAscIdAsc(club.getId());
        Department targetDepartment = departments.isEmpty()
                ? null
                : departments.get(Math.floorMod(departmentIndex, departments.size()));

        if (targetDepartment != null
                && departmentMemberRepository.findByDepartment_IdAndMembership_Id(targetDepartment.getId(), membership.getId()).isEmpty()) {
            DepartmentMember dm = new DepartmentMember();
            dm.setDepartment(targetDepartment);
            dm.setMembership(membership);
            dm.setClubId(club.getId());
            dm.setJoinedAt(joinedAt);
            departmentMemberRepository.save(dm);
        }

        User effectiveGranter = grantedBy != null ? grantedBy : user;
        assignRoleIfAbsent(user, "CLUB_MEMBER", PermissionScope.CLUB, club, null, effectiveGranter, joinedAt);
        if (roleCode != null && !"CLUB_MEMBER".equalsIgnoreCase(roleCode)) {
            if ("DEPARTMENT_HEAD".equalsIgnoreCase(roleCode) && targetDepartment != null) {
                assignRoleIfAbsent(user, roleCode, PermissionScope.DEPARTMENT, null, targetDepartment, effectiveGranter, joinedAt);
            } else {
                assignRoleIfAbsent(user, roleCode, PermissionScope.CLUB, club, null, effectiveGranter, joinedAt);
            }
        }
    }

    private void assignRoleIfAbsent(
            User user,
            String roleCode,
            PermissionScope scope,
            Club club,
            Department department,
            User grantedBy,
            OffsetDateTime grantedAt) {
        Role role = roleRepository.findByCode(roleCode).orElse(null);
        if (role == null || !role.isActive()) {
            return;
        }
        java.util.UUID clubId = club != null ? club.getId() : null;
        java.util.UUID deptId = department != null ? department.getId() : null;
        if (userRoleRepository.existsActive(user.getId(), role.getId(), scope, clubId, deptId)) {
            return;
        }
        if (role.getMaxHolders() != null) {
            int currentHolders = userRoleRepository.findActiveHoldersForTarget(role.getId(), scope, clubId, deptId).size();
            if (currentHolders >= role.getMaxHolders()) {
                return;
            }
        }
        UserRole assignment = new UserRole();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setScope(scope);
        assignment.setClub(club);
        assignment.setDepartment(department);
        assignment.setGrantedBy(grantedBy);
        assignment.setGrantedAt(grantedAt);
        userRoleRepository.save(assignment);
    }

    private void seedShowcaseApplications(
            Map<String, Club> clubsByCode,
            User svLinh,
            User svMinh,
            User svTrang,
            User svVy,
            OffsetDateTime now) {
        ensurePendingApplication(svLinh, clubsByCode.get("NEB"), "0987123450", "Nhật Bản học (BJS)", "K7 (Năm 2)",
                "Mong muốn tham gia Ban Sự kiện & Lễ hội để tổ chức ngày hội văn hóa Việt - Nhật Aki Matsuri.", now.minusDays(3));
        ensurePendingApplication(svMinh, clubsByCode.get("OUVEVJU"), "0912345671", "Khoa học và Kỹ thuật Máy tính (BCSE)", "K7 (Năm 2)",
                "Yêu thích nhiếp ảnh sự kiện và dựng video truyền thông cho các hoạt động sinh viên VJU.", now.minusDays(2));
        ensurePendingApplication(svTrang, clubsByCode.get("VJUA"), "0934567892", "Nông nghiệp thông minh và Bền vững (BSSA)", "K8 (Năm 1)",
                "Đam mê ca hát acoustic và muốn thử sức tại đêm nhạc sinh viên VJU.", now.minusDays(1));
        ensurePendingApplication(svVy, clubsByCode.get("BIGHEART"), "0978112233", "Kỹ thuật Xây dựng (BCE)", "K8 (Năm 1)",
                "Mong muốn đồng hành cùng các chiến dịch thiện nguyện Áo ấm mùa đông tại vùng cao.", now.minusHours(18));
    }

    private void ensurePendingApplication(
            User applicant,
            Club club,
            String phone,
            String facultyMajor,
            String academicYear,
            String message,
            OffsetDateTime createdAt) {
        if (applicant == null || club == null) {
            return;
        }
        if (membershipRepository.existsByUser_IdAndClub_IdAndStatus(applicant.getId(), club.getId(), MembershipStatus.ACTIVE)) {
            return;
        }
        if (!clubApplicationRepository.findByClub_IdAndStatus(club.getId(), ClubApplicationStatus.PENDING).isEmpty()) {
            return;
        }
        List<Department> depts = departmentRepository.findByClub_IdOrderByNameAscIdAsc(club.getId());
        ClubApplicationForm form = formRepository.findFirstByClub_IdOrderByIsDefaultDescCreatedAtDesc(club.getId()).orElse(null);

        ClubApplication app = new ClubApplication();
        app.setApplicant(applicant);
        app.setClub(club);
        app.setForm(form);
        if (!depts.isEmpty()) {
            app.setPreferredDepartment(depts.getFirst());
            if (depts.size() > 1) {
                app.setSecondaryDepartment(depts.get(1));
            }
        }
        app.setApplicantPhone(phone);
        app.setFacultyMajor(facultyMajor);
        app.setAcademicYear(academicYear);
        app.setGpa("3.45/4.0");
        app.setSelfIntroduction(message);
        app.setSkillsExperience("Làm việc nhóm, thiết kế Canva, giao tiếp tiếng Nhật giao tiếp cơ bản.");
        app.setAvailability("Chiều trong tuần và cuối tuần tại Hòa Lạc");
        app.setMessage(message);
        app.setCustomAnswers("{\"motivation\":\"" + message + "\",\"timeCommitment\":\"Linh hoạt theo lịch CLB\"}");
        app.setStatus(ClubApplicationStatus.PENDING);
        app.setCreatedAt(createdAt);
        app.setUpdatedAt(createdAt);
        clubApplicationRepository.save(app);
    }

    private void seedShowcaseTasks(
            Map<String, Club> clubsByCode,
            User userA,
            User userB,
            User userC,
            User student,
            User svLinh,
            User svMinh,
            OffsetDateTime now) {
        ensureClubTask(clubsByCode.get("VJUA"), userA, userB,
                "Chuẩn bị kịch bản & âm thanh Đêm nhạc Acoustic VJU",
                "Hoàn thiện danh sách tiết mục, liên hệ hội trường Hòa Lạc và kiểm tra hệ thống âm thanh ánh sáng.",
                TaskPriority.HIGH, TaskStatus.IN_PROGRESS, 65, now.plusDays(4));
        ensureClubTask(clubsByCode.get("ARC"), userA, svLinh,
                "Tổng hợp tài liệu diễn giả Seminar Nghiên cứu Khoa học",
                "Chuẩn bị slide giới thiệu phương pháp nghiên cứu và gửi thư mời cho giảng viên cố vấn.",
                TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, 45, now.plusDays(5));
        ensureClubTask(clubsByCode.get("BIGHEART"), userB, student,
                "Truyền thông Chiến dịch Áo ấm Mùa đông & Gây quỹ Sách",
                "Thiết kế bộ bài đăng fanpage và đặt bàn tiếp nhận quyên góp tại sảnh tòa nhà VJU Hòa Lạc.",
                TaskPriority.HIGH, TaskStatus.TODO, 20, now.plusDays(6));
        ensureClubTask(clubsByCode.get("MONOZUKURI"), svMinh, userA,
                "Kiểm tra linh kiện IoT & mô hình Robot triển lãm",
                "Test mạch điều khiển và chuẩn bị bàn trưng bày sản phẩm kỹ thuật cho ngày hội Monozukuri.",
                TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, 50, now.plusDays(7));
        ensureClubTask(clubsByCode.get("NEB"), userB, student,
                "Chuẩn bị gian hàng Yukata & Origami cho lễ hội Aki Matsuri",
                "Kiểm kê trang phục Yukata, giấy gấp Origami và phân công thành viên trực gian hàng văn hóa.",
                TaskPriority.MEDIUM, TaskStatus.TODO, 15, now.plusDays(5));
        ensureClubTask(clubsByCode.get("VJUP"), userC, student,
                "Biên tập bộ ảnh Photowalk Khuôn viên Hòa Lạc",
                "Chọn lọc 30 ảnh đẹp nhất và hậu kỳ màu sắc để đăng tải lên trang truyền thông của CLB.",
                TaskPriority.LOW, TaskStatus.IN_PROGRESS, 80, now.plusDays(3));
        for (Club club : clubsByCode.values()) {
            ensureClubTask(club, userA, student,
                    "Lập kế hoạch & chuẩn bị hậu cần sự kiện " + club.getCode(),
                    "Phối hợp cùng các ban chuyên môn của " + club.getName() + " chuẩn bị thiết bị và danh sách điểm danh tại Hòa Lạc.",
                    TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, 60, now.plusDays(5));
        }
    }

    private void ensureClubTask(
            Club club,
            User assigner,
            User assignee,
            String title,
            String description,
            TaskPriority priority,
            TaskStatus status,
            int progressPercent,
            OffsetDateTime deadline) {
        if (club == null || assigner == null || assignee == null) {
            return;
        }
        if (!taskRepository.findAllByClubFiltered(club.getId(), null, null, null, false, false, OffsetDateTime.now(clock)).isEmpty()) {
            return;
        }
        List<Department> depts = departmentRepository.findByClub_IdOrderByNameAscIdAsc(club.getId());
        Task task = new Task();
        task.setClub(club);
        if (!depts.isEmpty()) {
            task.setDepartment(depts.getFirst());
        }
        task.setTitle(title);
        task.setDescription(description);
        task.setPriority(priority);
        task.setStatus(status);
        task.setProgressPercent(progressPercent);
        task.setDeadline(deadline);
        task.setAssigner(assigner);
        task.setAssignee(assignee);
        taskRepository.save(task);
    }

    private Club upsertClub(ClubCatalogEntry spec) {
        String logoUrl = frontendBaseUrl + "/images/clubs/" + spec.slug() + "/" + spec.logoFile();
        String coverUrl = frontendBaseUrl + "/images/clubs/" + spec.slug() + "/cover.jpg";

        Club club = clubRepository.findByCodeIgnoreCase(spec.code()).orElseGet(() -> {
            Club created = new Club();
            created.setCode(spec.code());
            created.setStatus(ClubStatus.ACTIVE);
            return created;
        });

        // Enrich real VJU club profile and media URLs if missing or using placeholder demo text
        if (club.getName() == null || club.getName().isBlank() || club.getName().contains("(dữ liệu demo)")
                || "CLB Học thuật VJU".equals(club.getName())) {
            club.setName(spec.name());
        }
        if (club.getDescription() == null || club.getDescription().isBlank()
                || club.getDescription().contains("(dữ liệu demo)")
                || "Demo check".equalsIgnoreCase(club.getDescription().trim())) {
            club.setDescription(spec.description());
        }
        if (club.getActivityField() == null || club.getActivityField().isBlank()
                || ("VJUA".equalsIgnoreCase(spec.code()) && "Học thuật".equals(club.getActivityField()))) {
            club.setActivityField(spec.activityField());
        }
        if (club.getContactEmail() == null || club.getContactEmail().isBlank()) {
            club.setContactEmail(spec.contactEmail());
        }
        if (club.getLogoUrl() == null || club.getLogoUrl().isBlank()) {
            club.setLogoUrl(logoUrl);
        }
        if (club.getCoverUrl() == null || club.getCoverUrl().isBlank()) {
            club.setCoverUrl(coverUrl);
        }
        return clubRepository.save(club);
    }

    private void ensureDepartments(Club club, List<String> departmentNames) {
        for (String name : departmentNames) {
            if (!departmentRepository.existsByClub_IdAndNameIgnoreCase(club.getId(), name)) {
                Department department = new Department();
                department.setClub(club);
                department.setName(name);
                departmentRepository.save(department);
            }
        }
    }

    private void ensureOpenApplicationForm(Club club, ClubCatalogEntry spec, OffsetDateTime now, String defaultFieldsJson) {
        if (formRepository.findFirstByClub_IdOrderByIsDefaultDescCreatedAtDesc(club.getId()).isPresent()) {
            return;
        }
        ClubApplicationForm form = new ClubApplicationForm();
        form.setClub(club);
        form.setTitle("Đơn tuyển thành viên Gen mới — " + spec.name());
        form.setDescription("Chào mừng bạn đăng ký gia nhập " + spec.name()
                + ". Hãy chia sẻ sở thích, thế mạnh và ban chuyên môn bạn muốn đồng hành cùng CLB!");
        form.setStatus("OPEN");
        form.setOpenAt(now.minusDays(7));
        form.setCloseAt(now.plusDays(60));
        form.setFieldsConfig(defaultFieldsJson);
        form.setAllowAttachments(true);
        form.setRequireAttachment(false);
        form.setMaxAttachments(5);
        form.setDefault(true);
        formRepository.save(form);
    }

    private void ensureClubEvents(Club club, ClubCatalogEntry spec, OffsetDateTime now) {
        if (!eventRepository.findByClub(club.getId(), null, null, PageRequest.of(0, 1)).isEmpty()) {
            return;
        }
        List<Department> departments = departmentRepository.findByClub_IdOrderByNameAscIdAsc(club.getId());
        Department leadDept = departments.isEmpty() ? null : departments.getFirst();

        Event upcoming = new Event();
        upcoming.setClub(club);
        upcoming.setDepartment(leadDept);
        upcoming.setTitle(spec.eventTitle());
        upcoming.setDescription(spec.eventDescription());
        upcoming.setEventType(EventType.CLUB_EVENT);
        upcoming.setLocation(spec.eventLocation());
        upcoming.setStartTime(now.plusDays(spec.daysAhead()).withHour(14).withMinute(0).withSecond(0).withNano(0));
        upcoming.setEndTime(now.plusDays(spec.daysAhead()).withHour(17).withMinute(30).withSecond(0).withNano(0));
        upcoming.setRegistrationDeadline(now.plusDays(Math.max(1, spec.daysAhead() - 2)).withHour(23).withMinute(59).withSecond(0).withNano(0));
        upcoming.setAllowCtv(spec.allowCtv());
        upcoming.setMaxParticipants(spec.maxParticipants());
        upcoming.setStatus(EventStatus.OPEN_REGISTRATION);
        eventRepository.save(upcoming);
    }

    private String buildDefaultFieldsJson() {
        List<FormFieldDefinition> fields = List.of(
                new FormFieldDefinition(
                        "motivation",
                        "Lý do bạn muốn gia nhập CLB là gì?",
                        "TEXTAREA",
                        true,
                        "Chia sẻ niềm yêu thích hoặc mục tiêu của bạn khi tham gia CLB...",
                        List.of()),
                new FormFieldDefinition(
                        "skills",
                        "Kỹ năng / kinh nghiệm nổi bật của bạn",
                        "TEXT",
                        false,
                        "Ví dụ: Thiết kế Canva, chụp ảnh, tổ chức sự kiện, giao tiếp tiếng Nhật...",
                        List.of()),
                new FormFieldDefinition(
                        "timeCommitment",
                        "Khung thời gian bạn có thể sinh hoạt cùng CLB",
                        "SELECT",
                        true,
                        "Chọn lịch phù hợp",
                        List.of("Chiều trong tuần (16:30 - 18:30)", "Buổi tối (19:30 - 21:30)", "Cuối tuần tại Hòa Lạc / Mỹ Đình", "Linh hoạt theo lịch CLB"))
        );
        try {
            return JSON.writeValueAsString(fields);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private List<ClubCatalogEntry> catalogEntries() {
        List<String> standardDepts = List.of("Ban Truyền thông", "Ban Chuyên môn", "Ban Hậu cần", "Ban Đối ngoại");
        return List.of(
                new ClubCatalogEntry(
                        "VJUA", "vjua", "logo.png",
                        "CLB Nghệ thuật VJU (Vietnam Japan University Artist)",
                        "Nghệ thuật & Âm nhạc",
                        "vjua@vju.local",
                        "Câu lạc bộ Nghệ thuật và Âm nhạc Trường Đại học Việt Nhật (Vietnam Japan University Artist) — nơi quy tụ sinh viên đam mê ca hát, nhạc cụ, vũ đạo và biểu diễn sân khấu tại các sự kiện lớn của VJU.",
                        standardDepts,
                        "Đêm nhạc Acoustic & Giao lưu Nghệ thuật Sinh viên VJU",
                        "Chương trình biểu diễn âm nhạc học đường, giao lưu ban nhạc sinh viên và tuyển chọn tiết mục cho lễ hội trường.",
                        "Hội trường lớn VJU — Cơ sở Hòa Lạc",
                        6, true, 180
                ),
                new ClubCatalogEntry(
                        "ARC", "arc", "logo.jpg",
                        "CLB Học thuật và Nghiên cứu Khoa học VJU (ARC)",
                        "Học thuật & Nghiên cứu",
                        "arc@vju.local",
                        "Academic and Research Club (VJU ARC) — cộng đồng học thuật kết nối sinh viên đam mê nghiên cứu khoa học, hội thảo chuyên đề, tranh biện và chia sẻ tri thức liên ngành.",
                        List.of("Ban Nghiên cứu & Học thuật", "Ban Truyền thông", "Ban Sự kiện & Hội thảo", "Ban Đối ngoại"),
                        "Seminar Học thuật: Phương pháp Nghiên cứu & Thích nghi Môi trường Nhật Bản",
                        "Buổi chia sẻ kinh nghiệm công bố nghiên cứu sinh viên, phương pháp tư duy phản biện và học tập hiệu quả cùng giảng viên VJU.",
                        "Phòng Hội thảo 402 — Cơ sở Mỹ Đình",
                        8, true, 120
                ),
                new ClubCatalogEntry(
                        "BIGHEART", "bigheart", "logo.jpg",
                        "CLB Sinh viên Tình nguyện BigHeart VJU",
                        "Tình nguyện & Cộng đồng",
                        "bigheart@vju.local",
                        "Big love in my Heart — Câu lạc bộ Sinh viên Tình nguyện Trường Đại học Việt Nhật tổ chức các chiến dịch thiện nguyện vùng cao, Mùa hè xanh, hiến máu nhân đạo và hoạt động vì cộng đồng.",
                        List.of("Ban Phong trào & Hậu cần", "Ban Truyền thông", "Ban Đối ngoại & Gây quỹ", "Ban Nhân sự"),
                        "Chiến dịch Tình nguyện Áo ấm Mùa đông & Gây quỹ Sách cho Em",
                        "Hoạt động quyên góp sách giáo khoa, học cụ và tuyển cộng tác viên đồng hành cùng chương trình thiện nguyện cộng đồng của BigHeart.",
                        "Sảnh Tòa nhà VJU — Khu đô thị ĐHQGHN Hòa Lạc",
                        10, true, 200
                ),
                new ClubCatalogEntry(
                        "HASUKO", "hasuko", "logo.jpg",
                        "CLB Thực phẩm và Sức khoẻ Hasuko",
                        "Ẩm thực & Sức khoẻ",
                        "hasuko@vju.local",
                        "Câu lạc bộ Thực phẩm và Sức khoẻ Hasuko (From FTH and ESAS) — không gian thực hành chế biến ẩm thực Việt - Nhật, dinh dưỡng học đường và phát triển sản phẩm thực phẩm bền vững.",
                        List.of("Ban Chuyên môn Thực phẩm", "Ban Truyền thông", "Ban Hậu cần & Sự kiện", "Ban Đối ngoại"),
                        "Workshop Ẩm thực & Dinh dưỡng Xanh: Wagashi & Tiramisu Học đường",
                        "Trải nghiệm tự tay làm bánh thủ công, tìm hiểu an toàn thực phẩm và cân bằng dinh dưỡng cho sinh viên đại học.",
                        "Phòng Thực hành FTH — Cơ sở Hòa Lạc",
                        12, true, 60
                ),
                new ClubCatalogEntry(
                        "MONOZUKURI", "monozukuri", "logo.jpg",
                        "CLB Chế tạo & Sáng tạo Kỹ thuật Monozukuri",
                        "Công nghệ & Kỹ thuật",
                        "monozukuri@vju.local",
                        "Lấy cảm hứng từ tinh thần chế tác Monozukuri Nhật Bản, CLB kết nối sinh viên kỹ thuật, tự động hóa, IoT, cơ điện tử và sáng chế sản phẩm thực tiễn tại Hòa Lạc.",
                        List.of("Ban Kỹ thuật & Chế tạo", "Ban Lập trình & IoT", "Ban Truyền thông", "Ban Hậu cần"),
                        "Ngày hội Sáng tạo Kỹ thuật & Trình diễn Mô hình Monozukuri",
                        "Triển lãm sản phẩm kỹ thuật do sinh viên VJU thiết kế, thi đấu robot mini và hướng dẫn kỹ năng xưởng cơ bản cho thành viên mới.",
                        "Xưởng Thực hành Kỹ thuật VJU — Hòa Lạc",
                        14, true, 100
                ),
                new ClubCatalogEntry(
                        "NEB", "neb", "logo.jpg",
                        "CLB Văn hoá Việt Nam - Nhật Bản (NEB)",
                        "Văn hoá Việt - Nhật",
                        "neb@vju.local",
                        "Nichi-Etsu Bunka (VJU Since 2022) — cầu nối giao lưu văn hoá Việt Nam - Nhật Bản qua lễ hội truyền thống, Yukata, trà đạo, origami và giao lưu sinh viên quốc tế.",
                        List.of("Ban Nội dung Văn hoá", "Ban Truyền thông", "Ban Sự kiện & Lễ hội", "Ban Đối ngoại Quốc tế"),
                        "Ngày hội Giao lưu Văn hoá Việt - Nhật Aki Matsuri VJU",
                        "Không gian trải nghiệm mặc Yukata, nghệ thuật gấp giấy Origami, trò chơi dân gian Việt - Nhật và giao lưu cùng lưu học sinh Nhật Bản.",
                        "Khuôn viên Sân trung tâm ĐHQGHN Hòa Lạc",
                        9, true, 250
                ),
                new ClubCatalogEntry(
                        "OUVEVJU", "ouvevju", "logo.jpg",
                        "CLB Truyền thông và Sự kiện OuveVJU",
                        "Truyền thông & Sự kiện",
                        "ouvevju@vju.local",
                        "Câu lạc bộ Truyền thông và Sự kiện Trường Đại học Việt Nhật — đội ngũ sáng tạo nội dung số, thiết kế ấn phẩm, tổ chức sự kiện Chào Tân và lan toả hình ảnh sinh viên VJU.",
                        List.of("Ban Nội dung (Content)", "Ban Thiết kế & Media", "Ban Tổ chức Sự kiện", "Ban Đối ngoại"),
                        "Workshop Media & Tổ chức Sự kiện Sinh viên: Từ Ý tưởng đến Sân khấu",
                        "Chia sẻ quy trình lập kế hoạch truyền thông đa kênh, sản xuất ấn phẩm sự kiện và điều phối sân khấu thực tế tại VJU.",
                        "Phòng Đa năng 301 — Cơ sở Hòa Lạc",
                        7, true, 90
                ),
                new ClubCatalogEntry(
                        "SUNPINKEY", "sunpinkey", "logo.jpg",
                        "CLB Bóng chuyền VJU Sun Pinkey",
                        "Thể thao",
                        "sunpinkey@vju.local",
                        "VJU Volleyball Club - Sun Pinkey — sân chơi rèn luyện kỹ thuật bóng chuyền, tinh thần đồng đội và thi đấu giao hữu thể thao sôi nổi dành cho sinh viên Việt Nhật.",
                        List.of("Đội tuyển Nam & Nữ", "Ban Huấn luyện & Chuyên môn", "Ban Truyền thông", "Ban Hậu cần"),
                        "Giải Bóng chuyền Giao hữu Sinh viên VJU Open — Sun Pinkey Cup",
                        "Buổi tập huấn kỹ thuật phát bóng, phối hợp chiến thuật 6 người và thi đấu giao hữu mở rộng dành cho sinh viên toàn trường.",
                        "Nhà thi đấu Thể thao ĐHQGHN — Hòa Lạc",
                        11, false, 80
                ),
                new ClubCatalogEntry(
                        "VAC", "vac", "logo.jpg",
                        "CLB Vẽ Trường Đại học Việt Nhật (VAC)",
                        "Mỹ thuật & Sáng tạo",
                        "vac@vju.local",
                        "VJU Art Club — ngôi nhà chung của những tâm hồn yêu hội hoạ, minh hoạ kỹ thuật số, ký hoạ, thiết kế artbook và gian hàng thủ công nghệ thuật tại VJU.",
                        List.of("Ban Hội hoạ Truyền thống", "Ban Digital Art & Thiết kế", "Ban Truyền thông", "Ban Hậu cần & Triển lãm"),
                        "Triển lãm Tranh & Workshop Ký hoạ Sắc Thu Hòa Lạc cùng VAC",
                        "Trưng bày tác phẩm minh hoạ của thành viên CLB Vẽ VJU và hướng dẫn ký hoạ màu nước ngoài trời dành cho người mới bắt đầu.",
                        "Không gian Sáng tạo Sinh viên VJU — Hòa Lạc",
                        13, true, 75
                ),
                new ClubCatalogEntry(
                        "VJUB", "vjub", "logo.jpg",
                        "CLB Bóng rổ Trường Đại học Việt Nhật (VJUB)",
                        "Thể thao",
                        "vjub@vju.local",
                        "Viet Nhat Basketball Club — tập hợp các vận động viên bóng rổ nam nữ VJU cùng tập luyện định kỳ, tổ chức giải đấu 3x3, 5x5 và giao lưu liên trường ĐHQGHN.",
                        List.of("Đội Chuyên môn Nam & Nữ", "Ban Truyền thông", "Ban Hậu cần & Y tế", "Ban Đối ngoại"),
                        "Giải Bóng rổ Sinh viên 3x3 VJU Basketball Showdown",
                        "Ngày hội thi đấu bóng rổ 3x3, thử thách ném 3 điểm và tuyển chọn vận động viên bổ sung cho đội tuyển VJUB.",
                        "Sân Bóng rổ Khu Thể thao Hòa Lạc",
                        15, false, 100
                ),
                new ClubCatalogEntry(
                        "VJUP", "vjup", "logo.jpg",
                        "CLB Nhiếp ảnh Trường Đại học Việt Nhật (VJUP)",
                        "Nghệ thuật & Nhiếp ảnh",
                        "vjup@vju.local",
                        "VJU Photography Club — nơi lưu giữ mọi khoảnh khắc thanh xuân tại giảng đường Việt Nhật, tổ chức photowalk, workshop hậu kỳ ánh sáng và triển lãm ảnh sinh viên.",
                        List.of("Ban Nhiếp ảnh & Quay dựng", "Ban Hậu kỳ & Thiết kế", "Ban Truyền thông", "Ban Đối ngoại"),
                        "Photowalk & Workshop Nhiếp ảnh: Bố cục Ánh sáng & Kể chuyện bằng Hình ảnh",
                        "Thực hành chụp ảnh chân dung và sự kiện ngoài trời tại khuôn viên Hòa Lạc cùng các tay máy kinh nghiệm của VJUP.",
                        "Quảng trường trung tâm ĐHQGHN Hòa Lạc",
                        5, true, 70
                ),
                new ClubCatalogEntry(
                        "VJUS", "vjus", "logo.jpg",
                        "CLB Bóng đá Trường Đại học Việt Nhật (VJUS)",
                        "Thể thao",
                        "vjus@vju.local",
                        "VJU Soccer Club (Since 2022) — câu lạc bộ bóng đá sinh viên VJU duy trì lịch tập hàng tuần, giải đấu VJU Cup và kết nối đam mê sân cỏ tại khu đô thị ĐHQGHN Hòa Lạc.",
                        List.of("Ban Chuyên môn & Đội bóng", "Ban Truyền thông", "Ban Hậu cần & Sân bãi", "Ban Đối ngoại"),
                        "Giải Bóng đá Sinh viên VJU Champions Cup & Ngày hội Tuyển quân VJUS",
                        "Giao hữu bóng đá sân 7 người giữa các khoá sinh viên VJU và buổi thử chân tuyển thành viên mới cho mùa giải năm học.",
                        "Sân Bóng đá cỏ nhân tạo ĐHQGHN Hòa Lạc",
                        16, false, 150
                )
        );
    }

    private record ClubCatalogEntry(
            String code,
            String slug,
            String logoFile,
            String name,
            String activityField,
            String contactEmail,
            String description,
            List<String> departments,
            String eventTitle,
            String eventDescription,
            String eventLocation,
            int daysAhead,
            boolean allowCtv,
            int maxParticipants
    ) { }
}
