import type { SupportedLocale } from '@/types';

export interface HeroSlideCopy {
  src: string;
  position: string;
  caption: string;
  kicker: string;
  titleLine1: string;
  titleLine2Prefix: string;
  titleLine2Highlight: string;
  lead: string;
}

export interface HomeLocaleMessages {
  topBar: {
    university: string;
    campuses: string;
    logoSubCompact: string;
    logoSubFull: string;
    homeAria: string;
  };
  nav: {
    mainAria: string;
    home: string;
    clubs: string;
    events: string;
    workspace: string;
    schedule: string;
    dashboard: string;
    clubsDirectory: string;
    eventsRegister: string;
    workspaceMobile: string;
    myApplications: string;
    myClubs: string;
    notifications: string;
    signIn: string;
    signOut: string;
    joinNow: string;
    joinShort: string;
    enterClubShort: string;
    createAccount: string;
    openMenu: string;
    closeMenu: string;
  };
  hero: {
    slides: HeroSlideCopy[];
    primaryCta: string;
    dashboardCta: string;
    registerCta: string;
    prevSlideAria: string;
    nextSlideAria: string;
    viewSlideAria: (caption: string) => string;
  };
  facts: {
    sectionAria: string;
    clubsTitle: (count?: number) => string;
    clubsDesc: string;
    eventsTitle: (count?: number) => string;
    eventsCtvPrefix: string;
    eventsCtvHighlight: (count: number) => string;
    eventsCtvSuffix: string;
    eventsFallback: string;
    deptsTitle: string;
    deptsPrefix: string;
    deptsHighlight: string;
    deptsSuffix: string;
    opsTitle: string;
    opsDesc: string;
  };
  clubsSection: {
    kicker: string;
    titlePrefix: string;
    titleHighlight: string;
    openDirectory: (count?: number) => string;
    lead: string;
    searchPlaceholder: string;
    searchAria: string;
    clearSearchAria: string;
    resetFilter: string;
    allCategories: (count: number) => string;
    showingCount: (shown: number, total: number) => string;
    loadErrorPrefix: string;
    emptyTitle: string;
    emptyDesc: string;
    showAllBtn: string;
    defaultField: string;
    openEventsBadge: (count: number) => string;
    defaultClubDesc: string;
    quickView: string;
    applyClub: string;
    previewCloseAria: string;
    previewUpcomingTitle: string;
    previewViewEvent: string;
    previewClose: string;
    previewApplyCta: string;
  };
  campusLife: {
    kicker: string;
    title: string;
    bodyPart1: string;
    campusMyDinh: string;
    bodyPart2: string;
    campusHoaLac: string;
    bodyPart3: string;
    exploreClubsCta: string;
    openEventsCta: string;
    mainPhotoKicker: string;
    mainPhotoTitle: string;
    card1Title: string;
    card1Desc: string;
    card2Title: string;
    card2Desc: string;
  };
  eventsSection: {
    kicker: string;
    title: string;
    filterAll: (count: number) => string;
    filterCtv: (count: number) => string;
    openPortal: string;
    empty: string;
    defaultType: string;
    quota: (max: number) => string;
    deadline: (dayMonth: string) => string;
    ctvOpenBadge: string;
    clubEventBadge: string;
    detailsLink: string;
  };
  workspace: {
    kicker: string;
    title: string;
    lead: string;
    photoBadge: string;
    photoCaption: string;
    studentTitle: string;
    studentPart1: string;
    studentHighlight: string;
    studentPart2: string;
    boardTitle: string;
    boardPart1: string;
    boardHighlight: string;
    boardPart2: string;
    openWorkspaceCta: string;
    tryStudentCta: string;
    viewDirectoryCta: string;
    tabsAria: string;
    tabRecruitment: string;
    tabEvents: string;
    tabOperations: string;
    recFormLabel: string;
    recSampleClubFallback: string;
    recOpenBadge: string;
    recChoice1Label: string;
    recChoice1Title: string;
    recChoice1Desc: string;
    recChoice2Label: string;
    recChoice2Title: string;
    recChoice2Desc: string;
    recPipelineLabel: string;
    recStep1: string;
    recStep2: string;
    recStep3: string;
    recFooterNote: string;
    recOpenSample: string;
    evHeaderTitle: string;
    evHeaderBadge: string;
    evCtvBadge: string;
    evMemberBadge: string;
    evSyncing: string;
    evFooterNote: string;
    evAllLink: string;
    opsChannelName: string;
    opsOnlineBadge: string;
    opsQuote: string;
    opsAiLabel: string;
    opsAiSummary: string;
    opsVaultTitle: string;
    opsDoc1Scope: string;
    opsDoc2Scope: string;
    opsOpenVaultLink: string;
  };
  onboarding: {
    kicker: string;
    title: string;
    createAccountLink: string;
    steps: { stage: string; title: string; desc: string; img: string; pos: string }[];
  };
  galleryFaq: {
    galleryKicker: string;
    galleryTitle: string;
    galleryLead: string;
    galleryCta: string;
    photos: { src: string; pos: string; tag: string; label: string; wide?: boolean }[];
    faqKicker: string;
    faqTitle: string;
    faqLead: string;
    faqCardBadge: string;
    faqCardTitle: string;
    faqCardDescPrefix: string;
    faqCardEmailHighlight: string;
    faqCardDescSuffix: string;
    faqs: { q: string; a: string }[];
  };
  closing: {
    kicker: string;
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    lead: string;
    dashboardCta: string;
    joinCta: string;
    clubsCta: string;
  };
  footer: {
    desc: string;
    pillars: string[];
    studentColTitle: string;
    opsColTitle: string;
    opsVaultLink: string;
    opsOnboardingLink: string;
    opsFaqLink: string;
    universityTitle: string;
    campusMyDinhLabel: string;
    campusMyDinhAddr: string;
    campusHoaLacLabel: string;
    campusHoaLacAddr: string;
    studentEmailNote: string;
    officialSiteLabel: string;
    copyright: string;
    imprintRight: string;
  };
  smartPrompt: {
    ariaLabel: string;
    ctaText: string;
    signIn: string;
    dismissAria: string;
  };
}

export const HOME_MESSAGES: Record<SupportedLocale, HomeLocaleMessages> = {
  vi: {
    topBar: {
      university: 'Trường Đại học Việt Nhật · ĐHQGHN',
      campuses: 'Cơ sở Mỹ Đình & Hòa Lạc',
      logoSubCompact: 'VJU · ĐHQGHN',
      logoSubFull: 'Vietnam Japan University',
      homeAria: 'VJU ClubHub - Trang chủ',
    },
    nav: {
      mainAria: 'Điều hướng chính',
      home: 'Trang chủ',
      clubs: 'Câu lạc bộ',
      events: 'Sự kiện & CTV',
      workspace: 'Không gian số',
      schedule: 'Lịch sự kiện',
      dashboard: 'Bảng điều khiển',
      clubsDirectory: 'Danh bạ câu lạc bộ',
      eventsRegister: 'Sự kiện & Đăng ký CTV',
      workspaceMobile: 'Không gian vận hành số',
      myApplications: 'Đơn ứng tuyển của tôi',
      myClubs: 'Câu lạc bộ đang tham gia',
      notifications: 'Thông báo hệ thống',
      signIn: 'Đăng nhập',
      signOut: 'Đăng xuất',
      joinNow: 'Gia nhập ngay',
      joinShort: 'Gia nhập',
      enterClubShort: 'Vào CLB',
      createAccount: 'Tạo tài khoản',
      openMenu: 'Mở menu',
      closeMenu: 'Đóng menu',
    },
    hero: {
      slides: [
        {
          src: '/images/clubs/bigheart/cover.jpg',
          position: 'center 45%',
          caption: 'CLB Thiện nguyện BigHeart · VJU',
          kicker: 'Cộng đồng sinh viên VJU · Mỹ Đình & Hòa Lạc',
          titleLine1: 'Mỗi hành trình bắt đầu',
          titleLine2Prefix: 'từ ',
          titleLine2Highlight: 'một cộng đồng.',
          lead: 'Kết nối những trái tim nhiệt huyết qua các chiến dịch thiện nguyện, dự án xã hội và hoạt động sẻ chia lan tỏa từ giảng đường Trường Đại học Việt Nhật.',
        },
        {
          src: '/images/clubs/vjua/cover.jpg',
          position: 'center 40%',
          caption: 'CLB Nghệ thuật VJU (VJUA)',
          kicker: 'Cơ sở Mỹ Đình & Hòa Lạc · Sắc màu thanh xuân',
          titleLine1: 'Đời sống câu lạc bộ',
          titleLine2Prefix: '',
          titleLine2Highlight: 'sinh viên Việt Nhật.',
          lead: 'Tìm câu lạc bộ hợp sở thích, nộp đơn ứng tuyển trực tuyến theo ban chuyên môn và cháy hết mình trên sân khấu nghệ thuật, âm nhạc sinh viên.',
        },
        {
          src: '/images/clubs/monozukuri/gallery-3.jpg',
          position: 'center',
          caption: 'CLB Sáng tạo kỹ thuật Monozukuri',
          kicker: 'Học thuật · Công nghệ & Chế tác',
          titleLine1: 'Khơi nguồn sáng tạo',
          titleLine2Prefix: 'tinh thần ',
          titleLine2Highlight: 'Monozukuri.',
          lead: 'Từ giảng đường Mỹ Đình và phòng thí nghiệm Hòa Lạc đến các sân chơi nghiên cứu khoa học, lập trình và tự động hóa, cùng biến ý tưởng thành sản phẩm thực tế.',
        },
        {
          src: '/images/clubs/neb/gallery-2.jpg',
          position: 'center 35%',
          caption: 'CLB Giao lưu Văn hóa Việt - Nhật NEB',
          kicker: 'Nhịp cầu quốc tế · Ngôn ngữ & Lễ hội',
          titleLine1: 'Nhịp cầu giao lưu',
          titleLine2Prefix: 'văn hóa ',
          titleLine2Highlight: 'Việt - Nhật.',
          lead: 'Trải nghiệm không gian ngôn ngữ, lễ hội truyền thống và các sự kiện giao lưu sinh viên quốc tế mở đăng ký Cộng tác viên xuyên suốt năm học.',
        },
        {
          src: '/images/clubs/sunpinkey/cover.jpg',
          position: 'center 45%',
          caption: 'CLB Bóng chuyền Sun Pinkey',
          kicker: 'Thể thao sinh viên · Rèn luyện mỗi ngày',
          titleLine1: 'Bứt phá năng lượng trẻ',
          titleLine2Prefix: 'sau mỗi ',
          titleLine2Highlight: 'giờ lên lớp.',
          lead: 'Duy trì lịch tập luyện hàng tuần tại cả cơ sở Mỹ Đình và Hòa Lạc, gắn kết đồng đội và tranh tài sôi nổi ở các giải đấu thể thao liên câu lạc bộ.',
        },
        {
          src: '/images/clubs/vjub/cover.jpg',
          position: 'center 40%',
          caption: 'CLB Bóng rổ VJUB · Mỹ Đình & Hòa Lạc',
          kicker: 'Tinh thần đồng đội · Bản lĩnh sân đấu',
          titleLine1: 'Viết tiếp thanh xuân',
          titleLine2Prefix: 'cùng những ',
          titleLine2Highlight: 'đồng đội.',
          lead: 'Gia nhập đội hình câu lạc bộ yêu thích, rèn kỹ năng tổ chức sự kiện và lưu giữ trọn vẹn dấu ấn trưởng thành suốt những năm tháng đại học.',
        },
      ],
      primaryCta: 'Tìm câu lạc bộ phù hợp',
      dashboardCta: 'Mở bảng điều khiển',
      registerCta: 'Tạo tài khoản sinh viên',
      prevSlideAria: 'Slide trước',
      nextSlideAria: 'Slide tiếp theo',
      viewSlideAria: (caption) => `Xem slide ${caption}`,
    },
    facts: {
      sectionAria: 'Tổng quan hệ sinh thái câu lạc bộ',
      clubsTitle: (count) => (count !== undefined ? `${count} câu lạc bộ` : 'Hệ sinh thái CLB'),
      clubsDesc: 'Học thuật, công nghệ Monozukuri, giao lưu văn hóa Việt - Nhật, nghệ thuật và thể thao.',
      eventsTitle: (count) => (count !== undefined ? `${count} sự kiện mở` : 'Sự kiện quanh năm'),
      eventsCtvPrefix: 'Hiện có ',
      eventsCtvHighlight: (count) => `${count} chương trình`,
      eventsCtvSuffix: ' đang mở đăng ký Cộng tác viên cho toàn trường.',
      eventsFallback: 'Đăng ký tham gia hội thảo, lễ hội và chương trình tình nguyện trực tuyến.',
      deptsTitle: '2 nguyện vọng ban',
      deptsPrefix: 'Ứng tuyển trực tuyến vào ',
      deptsHighlight: 'ban chuyên môn',
      deptsSuffix: ' yêu thích, đính kèm CV và nhận thông báo duyệt đơn.',
      opsTitle: 'Vận hành tập trung',
      opsDesc: 'Điểm danh CTV thực tế, trao đổi nội bộ thời gian thực, tóm tắt việc AI và kho tài liệu CLB.',
    },
    clubsSection: {
      kicker: 'Hệ sinh thái câu lạc bộ sinh viên',
      titlePrefix: 'Tìm nơi ',
      titleHighlight: 'bạn thuộc về.',
      openDirectory: (count) =>
        count !== undefined ? `Mở danh bạ đầy đủ (${count} CLB)` : 'Mở danh bạ câu lạc bộ',
      lead: 'Gõ từ khóa sở thích hoặc chọn lĩnh vực để lọc nhanh câu lạc bộ phù hợp, xem trước hoạt động ngay tại chỗ và nộp đơn ứng tuyển trực tuyến.',
      searchPlaceholder: 'Tìm theo tên CLB, mã viết tắt, tiếng Nhật, lập trình, bóng rổ, thiện nguyện...',
      searchAria: 'Tìm kiếm câu lạc bộ',
      clearSearchAria: 'Xóa từ khóa tìm kiếm',
      resetFilter: 'Đặt lại bộ lọc',
      allCategories: (count) => `Tất cả (${count})`,
      showingCount: (shown, total) => `Đang hiển thị ${shown} trên tổng số ${total} câu lạc bộ tại VJU`,
      loadErrorPrefix: 'Không thể tải danh sách câu lạc bộ:',
      emptyTitle: 'Không tìm thấy câu lạc bộ khớp với từ khóa hiện tại.',
      emptyDesc: 'Thử đổi từ khóa khác hoặc xem lại toàn bộ danh sách câu lạc bộ đang hoạt động.',
      showAllBtn: 'Hiển thị tất cả câu lạc bộ',
      defaultField: 'Câu lạc bộ VJU',
      openEventsBadge: (count) => `${count} sự kiện mở`,
      defaultClubDesc: 'Khám phá hoạt động chuyên môn và cơ hội đồng hành cùng câu lạc bộ tại VJU.',
      quickView: 'Xem nhanh',
      applyClub: 'Ứng tuyển CLB',
      previewCloseAria: 'Đóng xem nhanh',
      previewUpcomingTitle: 'Sự kiện sắp tới của câu lạc bộ',
      previewViewEvent: 'Xem sự kiện →',
      previewClose: 'Đóng',
      previewApplyCta: 'Xem ban chuyên môn & Ứng tuyển',
    },
    campusLife: {
      kicker: 'Nhịp sống hai cơ sở Mỹ Đình & Hòa Lạc',
      title: 'Ngoài giảng đường, còn cả một thế giới.',
      bodyPart1: 'Từ các buổi sinh hoạt học thuật, giao lưu văn hóa Việt - Nhật tại ',
      campusMyDinh: 'cơ sở Mỹ Đình',
      bodyPart2: ' đến những dự án kỹ thuật Monozukuri và sân bóng chiều muộn ở ',
      campusHoaLac: 'cơ sở Hòa Lạc',
      bodyPart3: ', mỗi câu lạc bộ là nơi sinh viên rèn kỹ năng làm việc nhóm và tìm thấy những người bạn đồng hành suốt thời đại học.',
      exploreClubsCta: 'Khám phá các câu lạc bộ',
      openEventsCta: 'Xem lịch sự kiện mở',
      mainPhotoKicker: 'Hoạt động tập thể sinh viên VJU',
      mainPhotoTitle: 'Gắn kết đa khóa học qua những mùa lễ hội và dự án cộng đồng',
      card1Title: 'Học thuật & Chế tạo',
      card1Desc: 'Nghiên cứu khoa học, lập trình và thực hành tinh thần Monozukuri',
      card2Title: 'Văn hóa, Sự kiện & Thể thao',
      card2Desc: 'Giao lưu văn hóa Việt - Nhật, nghệ thuật biểu diễn và giải đấu sinh viên',
    },
    eventsSection: {
      kicker: 'Bảng tin hoạt động mở',
      title: 'Lịch sự kiện câu lạc bộ sắp diễn ra',
      filterAll: (count) => `Tất cả (${count})`,
      filterCtv: (count) => `Đang tuyển CTV (${count})`,
      openPortal: 'Xem cổng sự kiện',
      empty: 'Hiện chưa có sự kiện phù hợp đang mở đăng ký công khai.',
      defaultType: 'Hoạt động CLB',
      quota: (max) => `Chỉ tiêu ${max} người`,
      deadline: (dayMonth) => `Hạn ĐK ${dayMonth}`,
      ctvOpenBadge: 'Mở đăng ký CTV',
      clubEventBadge: 'Sự kiện CLB',
      detailsLink: 'Chi tiết',
    },
    workspace: {
      kicker: 'Không gian vận hành số VJU ClubHub',
      title: 'Nền tảng chung cho sinh viên và CLB.',
      lead: 'Thay vì điền nhiều biểu mẫu rời rạc hay thất lạc thông báo trong nhóm chat, sinh viên và các câu lạc bộ tại VJU thực hiện trọn vẹn quy trình tuyển thành viên, tổ chức sự kiện và lưu trữ tài liệu trên cùng một hệ thống.',
      photoBadge: 'Mỹ Đình & Hòa Lạc · 12+ CLB',
      photoCaption: 'Đồng hành cùng phong trào sinh viên, nghiên cứu học thuật và giao lưu quốc tế tại VJU',
      studentTitle: 'Dành cho Sinh viên & Cộng tác viên',
      studentPart1: 'Nộp đơn chọn ',
      studentHighlight: 'nguyện vọng 1 & 2',
      studentPart2: ' theo ban chuyên môn, đăng ký CTV sự kiện mở toàn trường và theo dõi lịch sử tham gia tập trung.',
      boardTitle: 'Dành cho Ban Chủ nhiệm Câu lạc bộ',
      boardPart1: 'Tạo đợt tuyển quân tùy chỉnh, xét duyệt hồ sơ tập trung, điểm danh sự kiện theo thời gian thực, ',
      boardHighlight: 'tóm tắt việc bằng AI',
      boardPart2: ' và quản lý kho tài liệu 3 tầng.',
      openWorkspaceCta: 'Mở không gian làm việc',
      tryStudentCta: 'Trải nghiệm bằng tài khoản sinh viên',
      viewDirectoryCta: 'Xem danh bạ câu lạc bộ',
      tabsAria: 'Xem trước tính năng ClubHub',
      tabRecruitment: 'Ứng tuyển NV1 · NV2',
      tabEvents: 'Sự kiện & Điểm danh',
      tabOperations: 'Chat & Kho tài liệu',
      recFormLabel: 'Biểu mẫu tuyển thành viên trực tuyến',
      recSampleClubFallback: 'Câu lạc bộ Văn hóa & Học thuật VJU',
      recOpenBadge: 'Đang mở đợt tuyển',
      recChoice1Label: 'Nguyện vọng ban ưu tiên',
      recChoice1Title: 'Ban Chuyên môn & Sự kiện',
      recChoice1Desc: 'Tổ chức chương trình giao lưu tại Mỹ Đình & Hòa Lạc',
      recChoice2Label: 'Nguyện vọng ban dự phòng',
      recChoice2Title: 'Ban Truyền thông & Đối ngoại',
      recChoice2Desc: 'Thiết kế ấn phẩm, nhiếp ảnh và kết nối khách mời',
      recPipelineLabel: 'Tiến trình xét duyệt tự động thông báo',
      recStep1: 'Đã nộp hồ sơ',
      recStep2: 'BCN phỏng vấn',
      recStep3: 'Kích hoạt thành viên',
      recFooterNote: 'Hỗ trợ đính kèm CV / Portfolio trực tiếp',
      recOpenSample: 'Mở đơn ứng tuyển mẫu',
      evHeaderTitle: 'Đăng ký & ghi nhận điểm danh CTV thực tế',
      evHeaderBadge: 'Mở cho toàn trường',
      evCtvBadge: 'Tuyển CTV',
      evMemberBadge: 'Thành viên',
      evSyncing: 'Đang đồng bộ danh sách sự kiện sắp diễn ra tại cơ sở Mỹ Đình và Hòa Lạc...',
      evFooterNote: 'Điểm danh trực tiếp · Lưu lịch sử hoạt động cá nhân',
      evAllLink: 'Tất cả sự kiện',
      opsChannelName: 'Kênh thảo luận #ban-to-chuc-su-kien',
      opsOnlineBadge: 'Trực tuyến',
      opsQuote: '“Đã chốt sơ đồ gian hàng giao lưu văn hóa tại Mỹ Đình và lịch hoạt động ở Hòa Lạc. Các bạn CTV ca sáng kiểm tra danh sách phân công trong kho tài liệu nhé!”',
      opsAiLabel: 'Tóm tắt nhanh bằng AI: ',
      opsAiSummary: 'Hoàn tất phân ca 18 CTV sự kiện · Hạn nộp kịch bản MC trước 17:00 thứ Sáu.',
      opsVaultTitle: 'Kho lưu trữ tài liệu câu lạc bộ (3 tầng phân quyền)',
      opsDoc1Scope: 'Cấp Câu lạc bộ · Phiên bản mới nhất',
      opsDoc2Scope: 'Cấp Ban Sự kiện · Xem trực tuyến',
      opsOpenVaultLink: 'Mở kho tài liệu CLB',
    },
    onboarding: {
      kicker: 'Lộ trình tham gia rõ ràng',
      title: 'Bốn bước gia nhập câu lạc bộ tại VJU',
      createAccountLink: 'Khởi tạo tài khoản ngay',
      steps: [
        {
          stage: 'Bước 01',
          title: 'Tìm câu lạc bộ hợp sở thích',
          desc: 'Lọc theo lĩnh vực hoạt động, xem ảnh thực tế và các ban chuyên môn của từng câu lạc bộ tại cả hai cơ sở Mỹ Đình và Hòa Lạc.',
          img: '/images/clubs/ouvevju/gallery-1.jpg',
          pos: 'center 35%',
        },
        {
          stage: 'Bước 02',
          title: 'Tạo tài khoản sinh viên VJU',
          desc: 'Đăng ký nhanh trong nửa phút hoặc đăng nhập bằng tài khoản email sinh viên @st.vju.ac.vn ngay trên hệ thống.',
          img: '/images/clubs/ouvevju/gallery-2.jpg',
          pos: 'center 25%',
        },
        {
          stage: 'Bước 03',
          title: 'Chọn nguyện vọng & nộp đơn',
          desc: 'Điền biểu mẫu trực tuyến, chọn ban chuyên môn nguyện vọng 1 & 2, đính kèm CV hoặc đăng ký làm CTV sự kiện.',
          img: '/images/clubs/vjup/gallery-2.jpg',
          pos: 'center 25%',
        },
        {
          stage: 'Bước 04',
          title: 'Nhận kết quả & tham gia hoạt động',
          desc: 'Nhận thông báo duyệt đơn tự động, trao đổi trong kênh CLB, theo dõi nhiệm vụ và lưu lịch sử điểm danh.',
          img: '/images/clubs/vjus/gallery-2.jpg',
          pos: 'center 28%',
        },
      ],
    },
    galleryFaq: {
      galleryKicker: 'Thư viện hình ảnh câu lạc bộ',
      galleryTitle: 'Khoảnh khắc đáng nhớ tại các CLB VJU',
      galleryLead: 'Sắc màu thanh xuân thực tế từ lễ hội giao lưu văn hóa Việt - Nhật, các chuyến thiện nguyện, xưởng chế tác kỹ thuật đến sân đấu thể thao sinh viên tại Mỹ Đình và Hòa Lạc.',
      galleryCta: 'Khám phá toàn bộ 12+ CLB',
      photos: [
        {
          src: '/images/clubs/neb/gallery-3.jpg',
          pos: 'center 35%',
          tag: 'Giao lưu Văn hóa · Hòa Lạc',
          label: 'Lễ hội Tết Việt - Nhật cùng CLB Văn hóa NEB',
          wide: true,
        },
        {
          src: '/images/clubs/vjua/gallery-1.jpg',
          pos: 'center 35%',
          tag: 'Nghệ thuật & Âm nhạc',
          label: 'Sân khấu biểu diễn CLB Nghệ thuật VJU (VJUA)',
        },
        {
          src: '/images/clubs/monozukuri/gallery-1.jpg',
          pos: 'center 35%',
          tag: 'Công nghệ & Kỹ thuật',
          label: 'CLB Sáng tạo & Chế tác Kỹ thuật Monozukuri',
        },
        {
          src: '/images/clubs/bigheart/cover.jpg',
          pos: 'center 40%',
          tag: 'Tình nguyện & Cộng đồng',
          label: 'Chiến dịch thiện nguyện CLB Sinh viên BigHeart',
        },
        {
          src: '/images/clubs/sunpinkey/cover.jpg',
          pos: 'center 40%',
          tag: 'Thể thao sinh viên',
          label: 'Giải bóng chuyền giao hữu CLB Sun Pinkey',
        },
        {
          src: '/images/clubs/hasuko/gallery-1.jpg',
          pos: 'center',
          tag: 'Ẩm thực & Sức khỏe',
          label: 'Thực hành bánh ngọt & dinh dưỡng cùng CLB Hasuko',
        },
        {
          src: '/images/clubs/vac/gallery-1.jpg',
          pos: 'center 35%',
          tag: 'Mỹ thuật & Sáng tạo',
          label: 'Gian hàng nghệ thuật & minh họa CLB Vẽ VAC',
        },
      ],
      faqKicker: 'Giải đáp nhanh cho sinh viên',
      faqTitle: 'Câu hỏi thường gặp',
      faqLead: 'Những thông tin cần biết trước khi nộp hồ sơ ứng tuyển thành viên hoặc đăng ký làm Cộng tác viên sự kiện tại VJU.',
      faqCardBadge: 'Đồng hành cùng sinh viên VJU',
      faqCardTitle: 'Sẵn sàng cho mùa tuyển thành viên & sự kiện mới',
      faqCardDescPrefix: 'Sử dụng tài khoản email sinh viên ',
      faqCardEmailHighlight: '@st.vju.ac.vn',
      faqCardDescSuffix: ' để đồng bộ thông tin khóa học và nhận thông báo xét duyệt nhanh nhất từ Ban Chủ nhiệm các câu lạc bộ tại Mỹ Đình & Hòa Lạc.',
      faqs: [
        {
          q: 'Một sinh viên có thể ứng tuyển nhiều câu lạc bộ cùng lúc không?',
          a: 'Có. Bạn có thể nộp hồ sơ vào nhiều câu lạc bộ khác nhau và lựa chọn ban chuyên môn nguyện vọng 1 & nguyện vọng 2 cho từng đợt tuyển quân đang mở.',
        },
        {
          q: 'Chưa là thành viên CLB có đăng ký tham gia sự kiện hoặc làm Cộng tác viên được không?',
          a: 'Hoàn toàn được. Các chương trình gắn nhãn Mở đăng ký CTV trên cổng sự kiện cho phép toàn bộ sinh viên VJU đăng ký tham gia và được ghi nhận điểm danh.',
        },
        {
          q: 'Làm sao để biết đơn ứng tuyển câu lạc bộ đã được xét duyệt?',
          a: 'Ngay khi Ban Chủ nhiệm cập nhật trạng thái phỏng vấn hoặc duyệt đơn, thông báo sẽ gửi thẳng tới chuông thông báo trên hệ thống và kích hoạt quyền thành viên của bạn.',
        },
        {
          q: 'Ban Chủ nhiệm câu lạc bộ sử dụng hệ thống để quản lý những gì?',
          a: 'Ban Chủ nhiệm có không gian riêng để mở đợt tuyển thành viên, duyệt đơn, tạo sự kiện, điểm danh CTV, phân công công việc, chat nội bộ tích hợp AI và quản lý kho tài liệu 3 tầng.',
        },
        {
          q: 'Nên dùng địa chỉ email nào để tạo tài khoản trên VJU ClubHub?',
          a: 'Khuyến khích sử dụng email sinh viên @st.vju.ac.vn để Ban Chủ nhiệm dễ dàng xác thực mã số sinh viên, khóa học và đồng bộ hồ sơ hoạt động ngoại khóa.',
        },
      ],
    },
    closing: {
      kicker: 'Cộng đồng sinh viên VJU · Mỹ Đình & Hòa Lạc',
      titlePrefix: 'Sẵn sàng viết nên ',
      titleHighlight: 'thanh xuân rực rỡ',
      titleSuffix: ' cùng VJU?',
      lead: 'Ứng tuyển vào câu lạc bộ yêu thích, đăng ký làm Cộng tác viên sự kiện tại cơ sở Mỹ Đình và Hòa Lạc, kết nối cùng hàng trăm sinh viên Trường Đại học Việt Nhật ngay hôm nay.',
      dashboardCta: 'Mở bảng điều khiển',
      joinCta: 'Gia nhập cộng đồng CLB',
      clubsCta: 'Xem danh sách câu lạc bộ',
    },
    footer: {
      desc: 'Nền tảng kết nối 12+ câu lạc bộ sinh viên, tuyển thành viên theo nguyện vọng ban chuyên môn, điều phối Cộng tác viên sự kiện và lưu trữ tài liệu tập trung của Trường Đại học Việt Nhật (ĐHQGHN).',
      pillars: ['Học thuật · Monozukuri', 'Văn hóa Việt - Nhật', 'Thể thao & Tình nguyện'],
      studentColTitle: 'Dành cho Sinh viên',
      opsColTitle: 'Không gian & Tiện ích',
      opsVaultLink: 'Kho tài liệu CLB 3 tầng',
      opsOnboardingLink: 'Lộ trình 4 bước gia nhập',
      opsFaqLink: 'Câu hỏi thường gặp (FAQ)',
      universityTitle: 'Trường Đại học Việt Nhật · ĐHQGHN',
      campusMyDinhLabel: 'Cơ sở Mỹ Đình:',
      campusMyDinhAddr: 'Đường Lưu Hữu Phước, Nam Từ Liêm, Hà Nội',
      campusHoaLacLabel: 'Cơ sở Hòa Lạc:',
      campusHoaLacAddr: 'Khu đô thị ĐHQGHN tại Hòa Lạc, Hà Nội',
      studentEmailNote: 'Tài khoản sinh viên: @st.vju.ac.vn',
      officialSiteLabel: 'Cổng thông tin vju.ac.vn',
      copyright: '© 2026 VJU ClubHub · Hệ thống Quản lý Câu lạc bộ & Hoạt động Sinh viên',
      imprintRight: 'Trường Đại học Việt Nhật (ĐHQGHN) · Cơ sở Mỹ Đình & Hòa Lạc',
    },
    smartPrompt: {
      ariaLabel: 'Mời đăng nhập tài khoản sinh viên VJU',
      ctaText: 'Ứng tuyển CLB & đăng ký CTV',
      signIn: 'Đăng nhập',
      dismissAria: 'Đóng gợi ý đăng nhập',
    },
  },

  en: {
    topBar: {
      university: 'Vietnam Japan University · VNU Hanoi',
      campuses: 'My Dinh & Hoa Lac Campuses',
      logoSubCompact: 'VJU · VNU',
      logoSubFull: 'Vietnam Japan University',
      homeAria: 'VJU ClubHub - Home',
    },
    nav: {
      mainAria: 'Main navigation',
      home: 'Home',
      clubs: 'Clubs',
      events: 'Events & CTV',
      workspace: 'Digital Workspace',
      schedule: 'Schedule',
      dashboard: 'Dashboard',
      clubsDirectory: 'Club Directory',
      eventsRegister: 'Events & Volunteer Sign-up',
      workspaceMobile: 'Digital Operations Workspace',
      myApplications: 'My Applications',
      myClubs: 'My Clubs',
      notifications: 'Notifications',
      signIn: 'Sign in',
      signOut: 'Sign out',
      joinNow: 'Join now',
      joinShort: 'Join',
      enterClubShort: 'Portal',
      createAccount: 'Create account',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    hero: {
      slides: [
        {
          src: '/images/clubs/bigheart/cover.jpg',
          position: 'center 45%',
          caption: 'BigHeart Volunteer Club · VJU',
          kicker: 'VJU Student Community · My Dinh & Hoa Lac',
          titleLine1: 'Every journey begins',
          titleLine2Prefix: 'with ',
          titleLine2Highlight: 'a community.',
          lead: 'Connect passionate hearts through volunteer drives, social impact projects, and outreach initiatives starting right from Vietnam Japan University.',
        },
        {
          src: '/images/clubs/vjua/cover.jpg',
          position: 'center 40%',
          caption: 'VJU Performing Arts Club (VJUA)',
          kicker: 'My Dinh & Hoa Lac Campuses · Vibrant Youth',
          titleLine1: 'Student club life',
          titleLine2Prefix: 'at ',
          titleLine2Highlight: 'Vietnam Japan Univ.',
          lead: 'Discover clubs that match your interests, apply online to specialized departments, and shine on stage in student music and performing arts.',
        },
        {
          src: '/images/clubs/monozukuri/gallery-3.jpg',
          position: 'center',
          caption: 'Monozukuri Engineering & Innovation Club',
          kicker: 'Academics · Technology & Craftsmanship',
          titleLine1: 'Sparking innovation in',
          titleLine2Prefix: 'the ',
          titleLine2Highlight: 'Monozukuri spirit.',
          lead: 'From My Dinh lecture halls and Hoa Lac engineering labs to robotics, coding, and research arenas, turn technical ideas into real prototypes.',
        },
        {
          src: '/images/clubs/neb/gallery-2.jpg',
          position: 'center 35%',
          caption: 'NEB Vietnam–Japan Culture Club',
          kicker: 'International Bridge · Language & Festivals',
          titleLine1: 'A living bridge of',
          titleLine2Prefix: '',
          titleLine2Highlight: 'Vietnam–Japan culture.',
          lead: 'Experience language exchange, traditional festivals, and international student events open for volunteer registration throughout the academic year.',
        },
        {
          src: '/images/clubs/sunpinkey/cover.jpg',
          position: 'center 45%',
          caption: 'Sun Pinkey Volleyball Club',
          kicker: 'Campus Sports · Weekly Training',
          titleLine1: 'Unleash youth energy',
          titleLine2Prefix: 'after ',
          titleLine2Highlight: 'every lecture.',
          lead: 'Join weekly practices across both My Dinh and Hoa Lac campuses, build team spirit, and compete in lively inter-club tournaments.',
        },
        {
          src: '/images/clubs/vjub/cover.jpg',
          position: 'center 40%',
          caption: 'VJUB Basketball Club · My Dinh & Hoa Lac',
          kicker: 'Team Spirit · Court Confidence',
          titleLine1: 'Write your youth story',
          titleLine2Prefix: 'with ',
          titleLine2Highlight: 'true teammates.',
          lead: 'Step onto the roster of your favorite club, sharpen event leadership skills, and create lasting memories across your university years.',
        },
      ],
      primaryCta: 'Find your club',
      dashboardCta: 'Open dashboard',
      registerCta: 'Create student account',
      prevSlideAria: 'Previous slide',
      nextSlideAria: 'Next slide',
      viewSlideAria: (caption) => `View slide ${caption}`,
    },
    facts: {
      sectionAria: 'Club ecosystem overview',
      clubsTitle: (count) => (count !== undefined ? `${count} active clubs` : 'Club ecosystem'),
      clubsDesc: 'Academics, Monozukuri engineering, Vietnam–Japan cultural exchange, performing arts, and sports.',
      eventsTitle: (count) => (count !== undefined ? `${count} open events` : 'Year-round events'),
      eventsCtvPrefix: 'Currently ',
      eventsCtvHighlight: (count) => `${count} programs`,
      eventsCtvSuffix: ' are open for campus-wide volunteer (CTV) sign-ups.',
      eventsFallback: 'Register online for seminars, cultural festivals, and volunteer campaigns.',
      deptsTitle: '2 department choices',
      deptsPrefix: 'Apply online to your ',
      deptsHighlight: 'preferred departments',
      deptsSuffix: ', attach your CV, and get instant status updates.',
      opsTitle: 'Unified operations',
      opsDesc: 'Live volunteer attendance, real-time club channels, AI task summaries, and a 3-tier document vault.',
    },
    clubsSection: {
      kicker: 'Student club ecosystem',
      titlePrefix: 'Find where ',
      titleHighlight: 'you belong.',
      openDirectory: (count) =>
        count !== undefined ? `Open full directory (${count} clubs)` : 'Open club directory',
      lead: 'Search by interest or select a category to filter clubs instantly, preview upcoming activities in place, and submit your online application.',
      searchPlaceholder: 'Search by club name, code, Japanese culture, coding, basketball, volunteering...',
      searchAria: 'Search student clubs',
      clearSearchAria: 'Clear search query',
      resetFilter: 'Reset filters',
      allCategories: (count) => `All (${count})`,
      showingCount: (shown, total) => `Showing ${shown} of ${total} active clubs at VJU`,
      loadErrorPrefix: 'Unable to load clubs:',
      emptyTitle: 'No clubs match your current search.',
      emptyDesc: 'Try a different keyword or browse the full list of active clubs.',
      showAllBtn: 'Show all clubs',
      defaultField: 'VJU Student Club',
      openEventsBadge: (count) => `${count} open ${count === 1 ? 'event' : 'events'}`,
      defaultClubDesc: 'Explore specialized activities and opportunities to collaborate with this club at VJU.',
      quickView: 'Quick preview',
      applyClub: 'Apply now',
      previewCloseAria: 'Close quick preview',
      previewUpcomingTitle: 'Upcoming events by this club',
      previewViewEvent: 'View event →',
      previewClose: 'Close',
      previewApplyCta: 'View departments & Apply',
    },
    campusLife: {
      kicker: 'Campus life across My Dinh & Hoa Lac',
      title: 'Beyond lectures lies a whole world.',
      bodyPart1: 'From academic seminars and Vietnam–Japan cultural exchanges at ',
      campusMyDinh: 'My Dinh Campus',
      bodyPart2: ' to Monozukuri engineering builds and late-afternoon matches at ',
      campusHoaLac: 'Hoa Lac Campus',
      bodyPart3: ', every club is a place to build teamwork and lifelong university friendships.',
      exploreClubsCta: 'Explore student clubs',
      openEventsCta: 'View open events',
      mainPhotoKicker: 'VJU student collective activities',
      mainPhotoTitle: 'Connecting cohorts through seasonal festivals and community projects',
      card1Title: 'Academics & Monozukuri',
      card1Desc: 'Scientific research, software programming, and hands-on engineering builds',
      card2Title: 'Culture, Events & Sports',
      card2Desc: 'Vietnam–Japan cultural exchange, performing arts, and student tournaments',
    },
    eventsSection: {
      kicker: 'Open activity bulletin',
      title: 'Upcoming club events schedule',
      filterAll: (count) => `All (${count})`,
      filterCtv: (count) => `Volunteers open (${count})`,
      openPortal: 'Open events portal',
      empty: 'No matching public events are currently open for registration.',
      defaultType: 'Club Activity',
      quota: (max) => `Quota: ${max}`,
      deadline: (dayMonth) => `Apply by ${dayMonth}`,
      ctvOpenBadge: 'Volunteers Open',
      clubEventBadge: 'Club Event',
      detailsLink: 'Details',
    },
    workspace: {
      kicker: 'VJU ClubHub Digital Workspace',
      title: 'One shared platform for students & clubs.',
      lead: 'Instead of scattered forms and lost chat threads, VJU students and Club Boards run member recruitment, event coordination, and document archiving in one unified workspace.',
      photoBadge: 'My Dinh & Hoa Lac · 12+ Clubs',
      photoCaption: 'Empowering student leadership, academic research, and cultural exchange across VJU',
      studentTitle: 'For Students & Event Volunteers',
      studentPart1: 'Submit applications with ',
      studentHighlight: '1st & 2nd choices',
      studentPart2: ' by department, sign up as an event volunteer, and track your extracurricular record.',
      boardTitle: 'For Club Executive Boards',
      boardPart1: 'Launch custom recruitment rounds, review applicants, check in volunteers live, use ',
      boardHighlight: 'AI task summaries',
      boardPart2: ', and manage a 3-tier document vault.',
      openWorkspaceCta: 'Open workspace',
      tryStudentCta: 'Try with a student account',
      viewDirectoryCta: 'Browse club directory',
      tabsAria: 'Preview ClubHub capabilities',
      tabRecruitment: '1st · 2nd Choice',
      tabEvents: 'Events & Check-in',
      tabOperations: 'Club Chat & Vault',
      recFormLabel: 'Online membership application form',
      recSampleClubFallback: 'VJU Culture & Academic Club',
      recOpenBadge: 'Recruitment Open',
      recChoice1Label: '1st choice department',
      recChoice1Title: 'Programs & Events Department',
      recChoice1Desc: 'Organizing cultural exchange events at My Dinh & Hoa Lac',
      recChoice2Label: '2nd choice department',
      recChoice2Title: 'Media & External Relations',
      recChoice2Desc: 'Visual design, photography, and guest coordination',
      recPipelineLabel: 'Transparent approval workflow with instant alerts',
      recStep1: 'Submitted',
      recStep2: 'Board Interview',
      recStep3: 'Member Activated',
      recFooterNote: 'Supports direct CV / Portfolio attachments',
      recOpenSample: 'Open sample application',
      evHeaderTitle: 'Volunteer registration & live attendance tracking',
      evHeaderBadge: 'Open university-wide',
      evCtvBadge: 'CTV Open',
      evMemberBadge: 'Members',
      evSyncing: 'Syncing upcoming events across My Dinh and Hoa Lac campuses...',
      evFooterNote: 'Live check-in · Saved to personal activity history',
      evAllLink: 'All events',
      opsChannelName: 'Channel #event-organizing-team',
      opsOnlineBadge: 'Live',
      opsQuote: '“Cultural booth layout at My Dinh and shuttle schedule to Hoa Lac are finalized. Morning-shift volunteers, please check the assignment sheet in the vault!”',
      opsAiLabel: 'AI Quick Summary: ',
      opsAiSummary: '18 event volunteers scheduled · MC script due by Friday 17:00.',
      opsVaultTitle: 'Club Document Vault (3-tier access control)',
      opsDoc1Scope: 'Club Level · Latest version',
      opsDoc2Scope: 'Events Dept · Online preview',
      opsOpenVaultLink: 'Open Document Vault',
    },
    onboarding: {
      kicker: 'Clear onboarding path',
      title: 'Four steps to join a club at VJU',
      createAccountLink: 'Create an account now',
      steps: [
        {
          stage: 'Step 01',
          title: 'Find clubs that fit your passion',
          desc: 'Filter by activity field, inspect real event photos, and explore departments across both My Dinh and Hoa Lac campuses.',
          img: '/images/clubs/ouvevju/gallery-1.jpg',
          pos: 'center 35%',
        },
        {
          stage: 'Step 02',
          title: 'Create your VJU student account',
          desc: 'Sign up in 30 seconds or sign in with your @st.vju.ac.vn student email right on the portal.',
          img: '/images/clubs/ouvevju/gallery-2.jpg',
          pos: 'center 25%',
        },
        {
          stage: 'Step 03',
          title: 'Select preferences & apply',
          desc: 'Complete the online form, pick your 1st & 2nd choice departments, attach your CV, or sign up as an event volunteer.',
          img: '/images/clubs/vjup/gallery-2.jpg',
          pos: 'center 25%',
        },
        {
          stage: 'Step 04',
          title: 'Get notified & collaborate',
          desc: 'Receive instant approval alerts, join real-time club channels, track tasks, and build your attendance record.',
          img: '/images/clubs/vjus/gallery-2.jpg',
          pos: 'center 28%',
        },
      ],
    },
    galleryFaq: {
      galleryKicker: 'Club photo archive',
      galleryTitle: 'Memorable moments across VJU clubs',
      galleryLead: 'Authentic student life from Vietnam–Japan cultural festivals, volunteer campaigns, Monozukuri engineering workshops, and campus tournaments across My Dinh and Hoa Lac.',
      galleryCta: 'Explore all 12+ clubs',
      photos: [
        {
          src: '/images/clubs/neb/gallery-3.jpg',
          pos: 'center 35%',
          tag: 'Cultural Exchange · Hoa Lac',
          label: 'Vietnam–Japan Spring Festival with NEB Culture Club',
          wide: true,
        },
        {
          src: '/images/clubs/vjua/gallery-1.jpg',
          pos: 'center 35%',
          tag: 'Music & Performing Arts',
          label: 'Live stage showcase by VJU Performing Arts (VJUA)',
        },
        {
          src: '/images/clubs/monozukuri/gallery-1.jpg',
          pos: 'center 35%',
          tag: 'Technology & Engineering',
          label: 'Monozukuri Engineering & Craftsmanship Club',
        },
        {
          src: '/images/clubs/bigheart/cover.jpg',
          pos: 'center 40%',
          tag: 'Volunteering & Community',
          label: 'Community outreach with BigHeart Volunteer Club',
        },
        {
          src: '/images/clubs/sunpinkey/cover.jpg',
          pos: 'center 40%',
          tag: 'Campus Sports',
          label: 'Friendly volleyball tournament with Sun Pinkey',
        },
        {
          src: '/images/clubs/hasuko/gallery-1.jpg',
          pos: 'center',
          tag: 'Culinary & Nutrition',
          label: 'Pastry & nutrition workshop by Hasuko Club',
        },
        {
          src: '/images/clubs/vac/gallery-1.jpg',
          pos: 'center 35%',
          tag: 'Fine Arts & Illustration',
          label: 'Creative art & illustration booth by VAC Club',
        },
      ],
      faqKicker: 'Quick student guide',
      faqTitle: 'Frequently asked questions',
      faqLead: 'Key details to know before submitting club applications or registering as an event volunteer at VJU.',
      faqCardBadge: 'Supporting VJU Students',
      faqCardTitle: 'Ready for the new club recruitment & event season',
      faqCardDescPrefix: 'Sign up with your ',
      faqCardEmailHighlight: '@st.vju.ac.vn',
      faqCardDescSuffix: ' student email to verify your cohort and receive instant updates from Club Executive Boards across My Dinh & Hoa Lac.',
      faqs: [
        {
          q: 'Can a student apply to multiple clubs at the same time?',
          a: 'Yes. You can submit applications to multiple clubs and choose 1st & 2nd department preferences for each open recruitment round.',
        },
        {
          q: 'Can non-members join events or sign up as event volunteers (CTV)?',
          a: 'Absolutely. Programs marked Volunteers Open on the events portal welcome all VJU students to register and earn verified attendance.',
        },
        {
          q: 'How will I know when my club application is approved?',
          a: 'As soon as the Club Board updates your interview or approval status, an instant alert arrives in your notification bell and activates your membership.',
        },
        {
          q: 'What can Club Executive Boards manage on VJU ClubHub?',
          a: 'Club Boards get a dedicated workspace to publish recruitment forms, review applicants, schedule events, check in volunteers, chat with AI summaries, and manage a 3-tier document vault.',
        },
        {
          q: 'Which email address should I use to register on VJU ClubHub?',
          a: 'We recommend using your @st.vju.ac.vn student email so Club Boards can verify your student ID, cohort, and extracurricular participation record.',
        },
      ],
    },
    closing: {
      kicker: 'VJU Student Community · My Dinh & Hoa Lac',
      titlePrefix: 'Ready to write a ',
      titleHighlight: 'vibrant youth chapter',
      titleSuffix: ' at VJU?',
      lead: 'Apply to your favorite clubs, register as an event volunteer across My Dinh and Hoa Lac campuses, and connect with hundreds of VJU students today.',
      dashboardCta: 'Open dashboard',
      joinCta: 'Join the club community',
      clubsCta: 'Browse all clubs',
    },
    footer: {
      desc: 'Unified portal connecting 12+ VJU student clubs, 1st/2nd-choice department recruitment, campus-wide volunteer coordination, and centralized document archiving at Vietnam Japan University (VNU Hanoi).',
      pillars: ['Academics · Monozukuri', 'Vietnam–Japan Culture', 'Sports & Volunteering'],
      studentColTitle: 'For Students',
      opsColTitle: 'Workspace & Guide',
      opsVaultLink: '3-Tier Club Document Vault',
      opsOnboardingLink: '4-Step Onboarding Guide',
      opsFaqLink: 'Frequently Asked Questions',
      universityTitle: 'Vietnam Japan University · VNU Hanoi',
      campusMyDinhLabel: 'My Dinh Campus:',
      campusMyDinhAddr: 'Luu Huu Phuoc St., Nam Tu Liem, Hanoi',
      campusHoaLacLabel: 'Hoa Lac Campus:',
      campusHoaLacAddr: 'VNU Urban Area at Hoa Lac, Hanoi',
      studentEmailNote: 'Student accounts: @st.vju.ac.vn',
      officialSiteLabel: 'Official portal vju.ac.vn',
      copyright: '© 2026 VJU ClubHub · Student Club & Activity Management System',
      imprintRight: 'Vietnam Japan University (VNU Hanoi) · My Dinh & Hoa Lac Campuses',
    },
    smartPrompt: {
      ariaLabel: 'Sign in with your VJU student account',
      ctaText: 'Apply to clubs & join as CTV',
      signIn: 'Sign in',
      dismissAria: 'Dismiss sign-in prompt',
    },
  },

  ja: {
    topBar: {
      university: '日越大学 (VJU) · ベトナム国家大学ハノイ校',
      campuses: 'ミーディン & ホアラック両キャンパス',
      logoSubCompact: 'VJU · VNU',
      logoSubFull: 'Vietnam Japan University',
      homeAria: 'VJU ClubHub - ホーム',
    },
    nav: {
      mainAria: 'メインナビゲーション',
      home: 'ホーム',
      clubs: 'クラブ一覧',
      events: 'イベント・CTV',
      workspace: 'デジタル基盤',
      schedule: '開催日程',
      dashboard: 'ダッシュボード',
      clubsDirectory: 'クラブディレクトリ',
      eventsRegister: 'イベント・サポーター応募',
      workspaceMobile: 'クラブ運営デジタル基盤',
      myApplications: '入部申請履歴',
      myClubs: '所属クラブ',
      notifications: 'システム通知',
      signIn: 'ログイン',
      signOut: 'ログアウト',
      joinNow: '今すぐ参加',
      joinShort: '参加',
      enterClubShort: 'マイ画面',
      createAccount: '新規登録',
      openMenu: 'メニューを開く',
      closeMenu: 'メニューを閉じる',
    },
    hero: {
      slides: [
        {
          src: '/images/clubs/bigheart/cover.jpg',
          position: 'center 45%',
          caption: 'BigHeart 学生ボランティアクラブ · VJU',
          kicker: 'VJU 学生コミュニティ · ミーディン & ホアラック',
          titleLine1: 'すべての学生の歩みは',
          titleLine2Prefix: '',
          titleLine2Highlight: 'コミュニティから。',
          lead: '日越大学のキャンパスから広がるボランティア活動や地域貢献プロジェクトを通じて、志を同じくする仲間とつながりましょう。',
        },
        {
          src: '/images/clubs/vjua/cover.jpg',
          position: 'center 40%',
          caption: 'VJU 芸術パフォーマンスクラブ (VJUA)',
          kicker: 'ミーディン & ホアラック · 青春の彩り',
          titleLine1: '日越大学で輝く',
          titleLine2Prefix: '',
          titleLine2Highlight: '学生クラブライフ。',
          lead: '興味に合うクラブを見つけ、希望部署を選んでオンラインで入部申請し、音楽・芸術のステージで情熱を解き放ちましょう。',
        },
        {
          src: '/images/clubs/monozukuri/gallery-3.jpg',
          position: 'center',
          caption: 'Monozukuri ものづくり工学クラブ',
          kicker: '学術研究 · テクノロジー & 創造',
          titleLine1: '創造力を呼び覚ます',
          titleLine2Prefix: '日本の ',
          titleLine2Highlight: 'ものづくり精神。',
          lead: 'ミーディンの講義室やホアラックの実験ラボからプログラミング・自動化・研究発表まで、技術アイデアを形にします。',
        },
        {
          src: '/images/clubs/neb/gallery-2.jpg',
          position: 'center 35%',
          caption: 'NEB 日越文化交流クラブ',
          kicker: '国際交流の架け橋 · 言語と伝統文化',
          titleLine1: '心をつなぐ架け橋',
          titleLine2Prefix: '',
          titleLine2Highlight: '日越文化の交流。',
          lead: '言語交流、伝統祭り、年間を通じてサポーター（CTV）応募が可能な国際交流イベントを体験できます。',
        },
        {
          src: '/images/clubs/sunpinkey/cover.jpg',
          position: 'center 45%',
          caption: 'Sun Pinkey バレーボールクラブ',
          kicker: '学生スポーツ · 毎週の定期練習',
          titleLine1: '授業のあとに解き放つ',
          titleLine2Prefix: '',
          titleLine2Highlight: '若きエネルギー。',
          lead: 'ミーディン・ホアラック両キャンパスでの定期練習で仲間と絆を深め、白熱の学内スポーツ大会に挑戦しましょう。',
        },
        {
          src: '/images/clubs/vjub/cover.jpg',
          position: 'center 40%',
          caption: 'VJUB バスケットボールクラブ · 両キャンパス',
          kicker: 'チームワーク · コートの誇り',
          titleLine1: '最高の仲間と綴る',
          titleLine2Prefix: '',
          titleLine2Highlight: 'かけがえのない青春。',
          lead: 'お気に入りのクラブの一員となり、イベント企画力を磨きながら大学生活の確かな足跡を残しましょう。',
        },
      ],
      primaryCta: '自分に合うクラブを探す',
      dashboardCta: 'ダッシュボードを開く',
      registerCta: '学生アカウントを作成',
      prevSlideAria: '前のスライド',
      nextSlideAria: '次のスライド',
      viewSlideAria: (caption) => `${caption} のスライドを表示`,
    },
    facts: {
      sectionAria: 'クラブエコシステム概要',
      clubsTitle: (count) => (count !== undefined ? `${count} 団体が活動中` : '多様なクラブ'),
      clubsDesc: '学術研究、ものづくり工学、日越文化交流、音楽・芸術、スポーツまで幅広く網羅。',
      eventsTitle: (count) => (count !== undefined ? `${count} 件の公開イベント` : '通年イベント'),
      eventsCtvPrefix: '現在、全学対象で ',
      eventsCtvHighlight: (count) => `${count} 件の企画`,
      eventsCtvSuffix: ' がイベントサポーター（CTV）を募集中です。',
      eventsFallback: 'セミナー、文化祭、ボランティア企画へオンラインで参加登録できます。',
      deptsTitle: '第1・第2希望部署',
      deptsPrefix: '興味のある ',
      deptsHighlight: '専門部署を選択',
      deptsSuffix: ' し、履歴書添付から承認通知までオンラインで完結。',
      opsTitle: '一元化された運営',
      opsDesc: 'CTV出欠確認、リアルタイムチャット、AIタスク要約、3階層ドキュメント保管庫を搭載。',
    },
    clubsSection: {
      kicker: '日越大学 学生クラブエコシステム',
      titlePrefix: '自分の ',
      titleHighlight: '居場所を見つけよう。',
      openDirectory: (count) =>
        count !== undefined ? `全クラブ一覧を見る (${count}団体)` : 'クラブ一覧を開く',
      lead: 'キーワード検索や分野フィルターで自分に合うクラブを素早く絞り込み、活動内容をプレビューしてそのまま入部申請できます。',
      searchPlaceholder: 'クラブ名、略称、日本文化、プログラミング、バスケ、ボランティアで検索...',
      searchAria: 'クラブを検索',
      clearSearchAria: '検索ワードをクリア',
      resetFilter: '条件をリセット',
      allCategories: (count) => `すべて (${count})`,
      showingCount: (shown, total) => `VJUの活動中クラブ 全 ${total} 団体中 ${shown} 団体を表示中`,
      loadErrorPrefix: 'クラブ一覧を読み込めませんでした:',
      emptyTitle: '条件に一致するクラブが見つかりませんでした。',
      emptyDesc: '別のキーワードを試すか、すべての活動中クラブを再表示してください。',
      showAllBtn: 'すべてのクラブを表示',
      defaultField: 'VJU 学生クラブ',
      openEventsBadge: (count) => `公開イベント ${count}件`,
      defaultClubDesc: 'VJUでの専門活動やイベント運営に一緒に参加しましょう。',
      quickView: 'クイック表示',
      applyClub: '入部申請へ',
      previewCloseAria: 'プレビューを閉じる',
      previewUpcomingTitle: 'このクラブの開催予定イベント',
      previewViewEvent: '詳細を見る →',
      previewClose: '閉じる',
      previewApplyCta: '専門部署を見て入部申請する',
    },
    campusLife: {
      kicker: 'ミーディン & ホアラック両キャンパスの日常',
      title: '講義室の外に広がる、もう一つの世界。',
      bodyPart1: '学術ゼミや日越文化交流が盛んな ',
      campusMyDinh: 'ミーディンキャンパス',
      bodyPart2: ' から、ものづくり実験や夕暮れのコートが賑わう ',
      campusHoaLac: 'ホアラックキャンパス',
      bodyPart3: ' まで、各クラブは協働力を磨き一生の仲間と出会う舞台です。',
      exploreClubsCta: 'クラブ一覧を探索する',
      openEventsCta: '公開イベント日程を見る',
      mainPhotoKicker: 'VJU 学生の合同アクティビティ',
      mainPhotoTitle: '季節の文化祭や地域プロジェクトを通じて学年を超えてつながる',
      card1Title: '学術研究・ものづくり',
      card1Desc: '科学研究、プログラミング、日本式ものづくり（Monozukuri）の実践',
      card2Title: '文化交流・イベント・スポーツ',
      card2Desc: '日越文化交流、舞台パフォーマンス、白熱の学生スポーツ大会',
    },
    eventsSection: {
      kicker: '公開アクティビティ掲示板',
      title: '開催予定のクラブイベント日程',
      filterAll: (count) => `すべて (${count})`,
      filterCtv: (count) => `CTV募集中 (${count})`,
      openPortal: 'イベントポータルへ',
      empty: '現在、条件に一致する公開募集中のイベントはありません。',
      defaultType: 'クラブ活動',
      quota: (max) => `定員 ${max}名`,
      deadline: (dayMonth) => `締切 ${dayMonth}`,
      ctvOpenBadge: 'CTVサポーター募集',
      clubEventBadge: 'クラブイベント',
      detailsLink: '詳細',
    },
    workspace: {
      kicker: 'VJU ClubHub デジタル運営基盤',
      title: '学生とクラブ運営陣をつなぐ共通基盤。',
      lead: 'バラバラな応募フォームや流れてしまうチャット連絡をなくし、部員募集・イベント運営・資料保管を一つのシステムで完結できます。',
      photoBadge: 'ミーディン & ホアラック · 12以上のクラブ',
      photoCaption: '日越大学における学生自治、学術研究、国際文化交流を一体的にサポート',
      studentTitle: '学生・イベントサポーター（CTV）向け',
      studentPart1: '専門部署の ',
      studentHighlight: '第1・第2希望',
      studentPart2: ' を選んで応募し、全学公開イベントへのCTV参加履歴も一括管理。',
      boardTitle: 'クラブ運営陣（執行部）向け',
      boardPart1: 'カスタム募集フォーム作成、選考管理、リアルタイム出欠記録、',
      boardHighlight: 'AIタスク要約',
      boardPart2: '、3階層ドキュメント保管庫を完備。',
      openWorkspaceCta: 'ワークスペースを開く',
      tryStudentCta: '学生アカウントで体験する',
      viewDirectoryCta: 'クラブ一覧を見る',
      tabsAria: 'ClubHub 機能プレビュー',
      tabRecruitment: '第1・第2希望応募',
      tabEvents: 'イベント & 出欠記録',
      tabOperations: 'チャット & 資料庫',
      recFormLabel: 'オンライン入部申請フォーム',
      recSampleClubFallback: 'VJU 文化・学術クラブ',
      recOpenBadge: '現在募集中',
      recChoice1Label: '第1希望の専門部署',
      recChoice1Title: '企画・イベント運営局',
      recChoice1Desc: 'ミーディン & ホアラックでの日越交流企画を運営',
      recChoice2Label: '第2希望の専門部署',
      recChoice2Title: '広報・渉外デザイン局',
      recChoice2Desc: '広報デザイン、写真撮影、ゲスト連携を担当',
      recPipelineLabel: '自動通知つきの透明な選考ステータス',
      recStep1: '応募提出済',
      recStep2: '執行部面談',
      recStep3: 'メンバー承認',
      recFooterNote: '履歴書・ポートフォリオの直接添付に対応',
      recOpenSample: '応募フォーム例を開く',
      evHeaderTitle: 'サポーター応募 & リアルタイム出欠記録',
      evHeaderBadge: '全学対象オープン',
      evCtvBadge: 'CTV募集',
      evMemberBadge: '部員向け',
      evSyncing: 'ミーディン・ホアラック両キャンパスの開催予定イベントを同期中...',
      evFooterNote: '会場での出欠確認 · 個人の課外活動履歴へ自動記録',
      evAllLink: '全イベントを見る',
      opsChannelName: 'チャンネル #イベント実行委員会',
      opsOnlineBadge: 'オンライン',
      opsQuote: '「ミーディン会場の文化交流ブース配置とホアラック移動スケジュールが確定しました。午前の部のCTVは資料保管庫のシフト表を確認してください！」',
      opsAiLabel: 'AI クイック要約: ',
      opsAiSummary: 'イベントCTV 18名のシフト確定 · 金曜17:00までに司会台本を提出。',
      opsVaultTitle: 'クラブ資料保管庫（3階層アクセス権限）',
      opsDoc1Scope: 'クラブ全体 · 最新版',
      opsDoc2Scope: 'イベント局 · オンライン閲覧',
      opsOpenVaultLink: '資料保管庫を開く',
    },
    onboarding: {
      kicker: 'わかりやすい参加ステップ',
      title: 'VJUクラブ参加への4つのステップ',
      createAccountLink: '今すぐアカウントを作成',
      steps: [
        {
          stage: 'ステップ 01',
          title: '興味に合うクラブを探す',
          desc: 'ミーディン・ホアラック両キャンパスで活動する各クラブの分野、写真、専門部署をチェックします。',
          img: '/images/clubs/ouvevju/gallery-1.jpg',
          pos: 'center 35%',
        },
        {
          stage: 'ステップ 02',
          title: 'VJU学生アカウントを作成',
          desc: '30秒で新規登録、または学生メール（@st.vju.ac.vn）を使ってすぐにログインできます。',
          img: '/images/clubs/ouvevju/gallery-2.jpg',
          pos: 'center 25%',
        },
        {
          stage: 'ステップ 03',
          title: '希望部署を選んで応募',
          desc: 'オンライン申請書で第1・第2希望部署を選択し、CV添付やイベントCTV登録を行います。',
          img: '/images/clubs/vjup/gallery-2.jpg',
          pos: 'center 25%',
        },
        {
          stage: 'ステップ 04',
          title: '承認通知を受け取り活動開始',
          desc: '承認通知をリアルタイムで受け取り、クラブ内チャットやタスク管理、出欠記録を活用します。',
          img: '/images/clubs/vjus/gallery-2.jpg',
          pos: 'center 28%',
        },
      ],
    },
    galleryFaq: {
      galleryKicker: 'クラブ活動フォトギャラリー',
      galleryTitle: 'VJUクラブのかけがえのない瞬間',
      galleryLead: '日越文化交流祭、地域ボランティア、ものづくり工房、学生スポーツ大会まで、ミーディン・ホアラック両キャンパスのリアルな記録です。',
      galleryCta: '12以上の全クラブを見る',
      photos: [
        {
          src: '/images/clubs/neb/gallery-3.jpg',
          pos: 'center 35%',
          tag: '日越文化交流 · ホアラック',
          label: 'NEB日越文化クラブの新春交流フェスティバル',
          wide: true,
        },
        {
          src: '/images/clubs/vjua/gallery-1.jpg',
          pos: 'center 35%',
          tag: '音楽・芸術',
          label: 'VJU芸術パフォーマンスクラブ（VJUA）のステージ',
        },
        {
          src: '/images/clubs/monozukuri/gallery-1.jpg',
          pos: 'center 35%',
          tag: 'テクノロジー・工学',
          label: 'Monozukuri ものづくり創造工学クラブ',
        },
        {
          src: '/images/clubs/bigheart/cover.jpg',
          pos: 'center 40%',
          tag: 'ボランティア・地域貢献',
          label: 'BigHeart 学生ボランティアクラブの支援活動',
        },
        {
          src: '/images/clubs/sunpinkey/cover.jpg',
          pos: 'center 40%',
          tag: '学生スポーツ',
          label: 'Sun Pinkey バレーボールクラブ親善大会',
        },
        {
          src: '/images/clubs/hasuko/gallery-1.jpg',
          pos: 'center',
          tag: '食文化・健康科学',
          label: 'Hasuko 食品・健康クラブのスイーツ調理実習',
        },
        {
          src: '/images/clubs/vac/gallery-1.jpg',
          pos: 'center 35%',
          tag: '美術・クリエイティブ',
          label: 'VAC 美術・イラストレーションクラブの展示ブース',
        },
      ],
      faqKicker: '学生向けクイックガイド',
      faqTitle: 'よくある質問',
      faqLead: 'クラブへの入部申請やイベントサポーター（CTV）登録の前に知っておきたいポイントをまとめました。',
      faqCardBadge: 'VJU学生サポート',
      faqCardTitle: '新歓・イベントシーズンに向けて準備しよう',
      faqCardDescPrefix: '大学発行の学生メール ',
      faqCardEmailHighlight: '@st.vju.ac.vn',
      faqCardDescSuffix: ' で登録すると、学年・学籍確認がスムーズになり、ミーディン・ホアラック各クラブからの選考通知を即座に受け取れます。',
      faqs: [
        {
          q: '1人の学生が複数のクラブに同時応募することはできますか？',
          a: 'はい、可能です。興味のある複数のクラブへ応募でき、募集ごとに第1希望・第2希望の専門部署を選択できます。',
        },
        {
          q: 'クラブ未所属でもイベント参加やサポーター（CTV）応募はできますか？',
          a: 'もちろん可能です。「CTVサポーター募集」ラベルのあるイベントは全VJU学生が応募でき、出欠実績も記録されます。',
        },
        {
          q: '入部申請が承認されたかどうかはどう確認できますか？',
          a: 'クラブ運営陣が面談や承認ステータスを更新すると、画面右上の通知ベルへ即座に通知が届き、メンバー権限が有効化されます。',
        },
        {
          q: 'クラブ運営陣（執行部）はこのシステムで何を管理できますか？',
          a: '部員募集フォーム公開、選考承認、イベント作成、CTV出欠確認、AI要約つきチャット、3階層資料保管庫を専用画面で一括管理できます。',
        },
        {
          q: 'VJU ClubHubの登録にはどのメールアドレスを使うべきですか？',
          a: '学生番号や学年、課外活動履歴のスムーズな確認のため、大学発行の @st.vju.ac.vn メールアドレスのご利用を推奨しています。',
        },
      ],
    },
    closing: {
      kicker: 'VJU 学生コミュニティ · ミーディン & ホアラック',
      titlePrefix: 'VJUの仲間と一緒に ',
      titleHighlight: '輝く青春の1ページ',
      titleSuffix: ' を描きませんか？',
      lead: 'お気に入りのクラブへの入部申請や、ミーディン・ホアラック両キャンパスでのイベントCTV登録を今すぐ始めましょう。',
      dashboardCta: 'ダッシュボードを開く',
      joinCta: 'クラブコミュニティに参加',
      clubsCta: 'クラブ一覧を見る',
    },
    footer: {
      desc: '日越大学（VJU・VNU Hanoi）の12以上の学生クラブ検索、第1・第2希望部署への入部申請、イベントサポーター調整、3階層資料保管を統合した公式ポータル。',
      pillars: ['学術研究 · ものづくり', '日越文化交流', 'スポーツ & ボランティア'],
      studentColTitle: '学生向けメニュー',
      opsColTitle: '運営機能・ガイド',
      opsVaultLink: '3階層クラブ資料保管庫',
      opsOnboardingLink: '参加までの4ステップ',
      opsFaqLink: 'よくある質問（FAQ）',
      universityTitle: '日越大学 (VJU) · ベトナム国家大学ハノイ校',
      campusMyDinhLabel: 'ミーディンキャンパス:',
      campusMyDinhAddr: 'ハノイ市ナムトゥリエム区ルー・フー・フオック通り',
      campusHoaLacLabel: 'ホアラックキャンパス:',
      campusHoaLacAddr: 'ハノイ市ホアラック VNU都市区',
      studentEmailNote: '推奨学生メール: @st.vju.ac.vn',
      officialSiteLabel: '公式サイト vju.ac.vn',
      copyright: '© 2026 VJU ClubHub · 学生クラブ・課外活動管理システム',
      imprintRight: '日越大学（VNU Hanoi）· ミーディン & ホアラック両キャンパス',
    },
    smartPrompt: {
      ariaLabel: 'VJU学生アカウントでログイン',
      ctaText: 'クラブ応募 & CTV参加登録',
      signIn: 'ログイン',
      dismissAria: '案内を閉じる',
    },
  },
};
