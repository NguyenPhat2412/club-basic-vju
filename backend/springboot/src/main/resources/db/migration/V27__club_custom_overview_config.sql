-- =============================================================================
-- V27: Custom Club Overview Configuration (overview_config JSON) for 12 VJU Clubs
-- =============================================================================

ALTER TABLE clubs
    ADD COLUMN IF NOT EXISTS overview_config TEXT NOT NULL DEFAULT '{}';

ALTER TABLE clubs
    DROP CONSTRAINT IF EXISTS ck_clubs_overview_config_object;

ALTER TABLE clubs
    ADD CONSTRAINT ck_clubs_overview_config_object CHECK (jsonb_typeof(overview_config::jsonb) = 'object');

-- 1. VJUS — CLB Bóng đá Trường Đại học Việt Nhật
UPDATE clubs
SET overview_config = '{
  "preset": "SPORTS",
  "slogan": "Cháy hết mình trên sân cỏ Hòa Lạc & Mỹ Đình — Đoàn kết tạo nên bản lĩnh VJUS",
  "campusLocation": "Sân cỏ nhân tạo ĐHQGHN Hòa Lạc & Sân Mỹ Đình",
  "operatingSchedule": "Thứ 3 & Thứ 6 · 17:30 – 19:30 (Tập chiến thuật & Đấu tập)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Giải đấu thường niên", "value": "04 giải", "sub": "VJU Champions Cup & Giao hữu ĐHQGHN"},
    {"label": "Đội hình thi đấu", "value": "03 tuyến", "sub": "Đội Nam · Đội Nữ · Futsal sinh viên"},
    {"label": "Buổi tập duy trì", "value": "80+ buổi", "sub": "Định kỳ hàng tuần tại Hòa Lạc & Mỹ Đình"},
    {"label": "Cúp & Huy chương", "value": "12 danh hiệu", "sub": "Giải thể thao sinh viên khối ĐHQGHN"}
  ],
  "highlights": [
    {"title": "Giải Bóng đá Sinh viên VJU Champions Cup", "tag": "Giải truyền thống", "description": "Giải đấu thường niên quy tụ các khóa, chương trình đào tạo và cựu sinh viên Trường Đại học Việt Nhật."},
    {"title": "Giao hữu Việt – Nhật Friendship Cup", "tag": "Đối ngoại thể thao", "description": "Thi đấu giao lưu cùng lưu học sinh Nhật Bản và các CLB bóng đá đối tác tại Hà Nội."}
  ]
}'
WHERE UPPER(code) = 'VJUS' AND (overview_config IS NULL OR overview_config = '{}');

-- 2. VJUB — CLB Bóng rổ Trường Đại học Việt Nhật
UPDATE clubs
SET overview_config = '{
  "preset": "SPORTS",
  "slogan": "Fast Break · High Spirit — Nhịp đập bóng rổ sinh viên Việt Nhật",
  "campusLocation": "Sân bóng rổ Khu Thể thao Hòa Lạc & Nhà thi đấu Mỹ Đình",
  "operatingSchedule": "Thứ 2 & Thứ 5 · 17:30 – 19:45 (Skills, 3x3 & Scrimmage 5v5)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Thể thức thi đấu", "value": "3x3 & 5x5", "sub": "Đội tuyển Nam & Nữ mở rộng"},
    {"label": "Showdown Events", "value": "03 giải", "sub": "VJU Basketball Showdown hàng năm"},
    {"label": "Tỷ lệ duy trì tập", "value": "92%", "sub": "Theo dõi chuyên cần định kỳ hàng tuần"},
    {"label": "Clinic tân binh", "value": "16 buổi/kỳ", "sub": "Kèm kỹ thuật cơ bản miễn phí cho SV mới"}
  ],
  "highlights": [
    {"title": "VJU 3x3 Basketball Showdown", "tag": "Giải đấu sân trường", "description": "Sân chơi bóng rổ 3x3 tốc độ cao thu hút đông đảo vận động viên và CTV điều phối bàn thư ký."},
    {"title": "Chương trình Rookie Camp Đầu Năm", "tag": "Đào tạo tân binh", "description": "Chuỗi huấn luyện nền tảng dẫn bóng, ném rổ và chiến thuật đồng đội cho sinh viên chưa có kinh nghiệm."}
  ]
}'
WHERE UPPER(code) = 'VJUB' AND (overview_config IS NULL OR overview_config = '{}');

-- 3. SUNPINKEY — CLB Bóng chuyền VJU Sun Pinkey
UPDATE clubs
SET overview_config = '{
  "preset": "SPORTS",
  "slogan": "Đập bóng bứt phá — Năng lượng tích cực kết nối hai cơ sở VJU",
  "campusLocation": "Sân bóng chuyền Hòa Lạc & Khu liên hợp thể thao Mỹ Đình",
  "operatingSchedule": "Thứ 4 & Thứ 7 · 17:00 – 19:00 (Đệm bóng · Chuyền hai · Đấu tập 6v6)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Đội hình hỗn hợp", "value": "Nam & Nữ", "sub": "Thi đấu 6v6 tiêu chuẩn & giao lưu"},
    {"label": "Giải giao hữu", "value": "05 đợt/năm", "sub": "Kết nối các CLB khu đô thị ĐHQGHN Hòa Lạc"},
    {"label": "Trại huấn luyện", "value": "02 kỳ/năm", "sub": "Pre-season đầu thu & học kỳ mùa xuân"},
    {"label": "Hoàn thành cơ bản", "value": "95%", "sub": "Tân binh nắm vững kỹ thuật sau 6 tuần"}
  ],
  "highlights": [
    {"title": "Giải Bóng chuyền Mở rộng Sun Pinkey Open", "tag": "Giải mở rộng", "description": "Giải đấu giao lưu quy tụ các đội bóng chuyền sinh viên khu vực Hòa Lạc và Mỹ Đình."},
    {"title": "Volley Night Chào Tân Sinh Viên", "tag": "Gắn kết nội bộ", "description": "Hoạt động thể thao kết hợp teambuilding giúp tân sinh viên nhanh chóng hòa nhập đời sống nội trú."}
  ]
}'
WHERE UPPER(code) = 'SUNPINKEY' AND (overview_config IS NULL OR overview_config = '{}');

-- 4. MONOZUKURI — CLB Chế tạo & Sáng tạo Kỹ thuật Monozukuri
UPDATE clubs
SET overview_config = '{
  "preset": "ACADEMIC_TECH",
  "slogan": "Tinh thần Monozukuri Nhật Bản — Từ bản vẽ CAD đến nguyên mẫu thực tế",
  "campusLocation": "Xưởng Thực hành Kỹ thuật VJU Hòa Lạc & Phòng Lab Cơ sở Mỹ Đình",
  "operatingSchedule": "Thứ 4 (18:00 – 20:30) & Chiều Thứ 7 (Lab Session chế tạo nguyên mẫu)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Nguyên mẫu chế tạo", "value": "18+ mô hình", "sub": "Cơ điện tử · IoT · In 3D · Tự động hóa"},
    {"label": "Nhóm dự án Lab", "value": "05 nhóm", "sub": "Embedded · CAD/3D · Robotics · Smart Sensor"},
    {"label": "Workshop thực hành", "value": "10 buổi/năm", "sub": "Hàn mạch, vi điều khiển & thiết kế SolidWorks"},
    {"label": "Sản phẩm triển lãm", "value": "08 đề tài", "sub": "Trình diễn thực tế tại VJU Open Day"}
  ],
  "highlights": [
    {"title": "Ngày hội Sáng tạo Kỹ thuật & Trình diễn Mô hình Monozukuri", "tag": "Showcase thường niên", "description": "Triển lãm robot tự hành, hệ thống cảm biến nông nghiệp thông minh và mô hình in 3D do sinh viên chế tạo."},
    {"title": "Bootcamp Nhập môn Vi điều khiển & Thiết kế 3D", "tag": "Đào tạo thực chiến", "description": "Chuỗi thực hành cầm tay chỉ việc tại xưởng kỹ thuật dành cho sinh viên đam mê chế tạo."}
  ]
}'
WHERE UPPER(code) = 'MONOZUKURI' AND (overview_config IS NULL OR overview_config = '{}');

-- 5. ARC — CLB Học thuật và Nghiên cứu Khoa học VJU
UPDATE clubs
SET overview_config = '{
  "preset": "ACADEMIC_TECH",
  "slogan": "Khơi nguồn tư duy học thuật — Kết nối mentor giảng viên Việt – Nhật",
  "campusLocation": "Phòng Seminar Cơ sở Mỹ Đình & Không gian Học thuật Hòa Lạc",
  "operatingSchedule": "Thứ 5 hàng tuần · 19:30 – 21:00 (Reading Group & Seminar NCKH)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Tiểu ban nghiên cứu", "value": "06 nhóm", "sub": "Kinh tế · Kỹ thuật · Khoa học bền vững · Xã hội"},
    {"label": "Seminar học thuật", "value": "14 buổi/năm", "sub": "Cùng giảng viên & cựu sinh viên học bổng"},
    {"label": "Đề tài & Báo cáo SV", "value": "22+ công trình", "sub": "Tham dự hội nghị NCKH cấp trường & ĐHQGHN"},
    {"label": "Hồ sơ học bổng cố vấn", "value": "30+ hồ sơ", "sub": "MEXT · JICA · Học bổng trao đổi Nhật Bản"}
  ],
  "highlights": [
    {"title": "Diễn đàn Nghiên cứu Trẻ VJU Academic Forum", "tag": "Hội thảo khoa học", "description": "Không gian trình bày poster, báo cáo đề tài nghiên cứu sinh viên và nhận góp ý chuyên sâu từ giảng viên."},
    {"title": "Chuỗi Mentoring Học bổng & Trao đổi Nhật Bản", "tag": "Cố vấn học thuật", "description": "Hướng dẫn xây dựng đề cương nghiên cứu (Research Plan) và chuẩn bị phỏng vấn học bổng quốc tế."}
  ]
}'
WHERE UPPER(code) = 'ARC' AND (overview_config IS NULL OR overview_config = '{}');

-- 6. NEB — CLB Văn hoá Việt Nam - Nhật Bản
UPDATE clubs
SET overview_config = '{
  "preset": "CULTURE_ARTS",
  "slogan": "Nhịp cầu giao thoa văn hóa Việt – Nhật ngay trong lòng VJU",
  "campusLocation": "Cả hai cơ sở Mỹ Đình & Hòa Lạc (Không gian Văn hóa Việt – Nhật)",
  "operatingSchedule": "Thứ 3 (Mỹ Đình / Trực tuyến) & Chiều Thứ 6 tại Hòa Lạc",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Lễ hội văn hóa", "value": "04 mùa/năm", "sub": "Natsu Matsuri · Bunkasai · Giao lưu Tết Việt"},
    {"label": "Lưu học sinh kết nối", "value": "35+ SV Nhật", "sub": "Giao lưu song ngữ Việt – Nhật hàng tháng"},
    {"label": "Workshop truyền thống", "value": "12 chủ đề", "sub": "Trà đạo · Origami · Thư pháp · Mặc Yukata"},
    {"label": "CTV vận hành lễ hội", "value": "120+ lượt", "sub": "Điều phối gian hàng văn hóa mở toàn trường"}
  ],
  "highlights": [
    {"title": "Lễ hội Văn hóa Việt – Nhật VJU Matsuri", "tag": "Sự kiện tâm điểm", "description": "Tái hiện không gian lễ hội truyền thống Nhật Bản kết hợp trò chơi dân gian Việt Nam tại khuôn viên trường."},
    {"title": "Bàn tròn Giao lưu Ngôn ngữ & Văn hóa Nihongo Café", "tag": "Giao lưu quốc tế", "description": "Hoạt động trò chuyện song ngữ thực tế giữa sinh viên VJU và sinh viên các đại học đối tác Nhật Bản."}
  ]
}'
WHERE UPPER(code) = 'NEB' AND (overview_config IS NULL OR overview_config = '{}');

-- 7. VJUA — CLB Nghệ thuật VJU (Vietnam Japan University Artist)
UPDATE clubs
SET overview_config = '{
  "preset": "CULTURE_ARTS",
  "slogan": "Nơi giai điệu, vũ đạo và ánh đèn sân khấu VJU thăng hoa",
  "campusLocation": "Phòng tập Nghệ thuật Hòa Lạc & Hội trường Cơ sở Mỹ Đình",
  "operatingSchedule": "Thứ 3, Thứ 5 & Chủ nhật · 18:00 – 20:30 (Vocal · Band · Dance)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Phân ban biểu diễn", "value": "03 mảng", "sub": "Thanh nhạc · Live Band · Vũ đạo hiện đại"},
    {"label": "Sân khấu thường niên", "value": "09 show", "sub": "Chào tân sinh viên · Prom · Lễ hội trường"},
    {"label": "Tiết mục dàn dựng", "value": "35+ tiết mục", "sub": "Nhạc Việt · J-Pop/J-Rock · Acoustic"},
    {"label": "Nghệ sĩ & Hậu đài", "value": "40+ thành viên", "sub": "Biểu diễn sân khấu, âm thanh & ánh sáng"}
  ],
  "highlights": [
    {"title": "Đêm nhạc Thường niên VJUA Live Concert", "tag": "Show nghệ thuật", "description": "Đêm diễn âm nhạc và vũ đạo quy mô toàn trường do chính sinh viên VJU biên tập, hòa âm và dàn dựng."},
    {"title": "Acoustic Night — Giai Điệu Hòa Lạc", "tag": "Đêm nhạc mở", "description": "Không gian giao lưu âm nhạc ngoài trời ấm cúng gắn kết sinh viên sau giờ học."}
  ]
}'
WHERE UPPER(code) = 'VJUA' AND (overview_config IS NULL OR overview_config = '{}');

-- 8. VAC — CLB Vẽ Trường Đại học Việt Nhật
UPDATE clubs
SET overview_config = '{
  "preset": "CULTURE_ARTS",
  "slogan": "Phác họa sắc màu tuổi trẻ — Từ ký họa truyền thống đến Digital Art",
  "campusLocation": "Không gian Sáng tạo Hòa Lạc & Buổi ký họa dã ngoại Mỹ Đình",
  "operatingSchedule": "Chiều Thứ 7 · 14:00 – 17:00 (Sketching, Màu nước & Minh họa số)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Triển lãm mỹ thuật", "value": "03 kỳ/năm", "sub": "Trưng bày tại sảnh giảng đường VJU"},
    {"label": "Tác phẩm lưu trữ", "value": "150+ bức", "sub": "Màu nước · Ký họa · Manga · Digital Art"},
    {"label": "Chuyến ký họa thực tế", "value": "12 buổi/năm", "sub": "Khuôn viên Hòa Lạc & không gian văn hóa Hà Nội"},
    {"label": "Bộ sưu tập Artbook", "value": "05 ấn phẩm", "sub": "Postcard, Sticker & Bookmark gây quỹ CLB"}
  ],
  "highlights": [
    {"title": "Triển lãm Tranh Sinh viên VAC Art Gallery", "tag": "Triển lãm", "description": "Không gian trưng bày tác phẩm hội họa truyền thống và minh họa lấy cảm hứng giao thoa Việt – Nhật."},
    {"title": "Workshop Ký họa Màu nước & Thiết kế Nhân vật Manga", "tag": "Trải nghiệm mở", "description": "Buổi hướng dẫn thực hành trực quan dành cho sinh viên yêu thích hội họa ở mọi trình độ."}
  ]
}'
WHERE UPPER(code) = 'VAC' AND (overview_config IS NULL OR overview_config = '{}');

-- 9. VJUP — CLB Nhiếp ảnh Trường Đại học Việt Nhật
UPDATE clubs
SET overview_config = '{
  "preset": "MEDIA_LIFESTYLE",
  "slogan": "Lưu giữ từng khoảnh khắc thanh xuân tại giảng đường Việt Nhật",
  "campusLocation": "Cơ sở Hòa Lạc & Cơ sở Mỹ Đình (Tác nghiệp toàn bộ sự kiện trường)",
  "operatingSchedule": "Thứ 6 · 18:00 – 20:00 (Hậu kỳ ảnh) & Photowalk sáng tác cuối tuần",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Sự kiện tác nghiệp", "value": "25+ sự kiện", "sub": "Đối tác hình ảnh truyền thông các sự kiện VJU"},
    {"label": "Kho ảnh tư liệu", "value": "8.000+ ảnh", "sub": "Sự kiện · Chân dung · Phong cảnh Hòa Lạc"},
    {"label": "Photowalk sáng tác", "value": "10 chuyến/năm", "sub": "Săn hoàng hôn Hòa Lạc & phố cổ Hà Nội"},
    {"label": "Chuyên đề kỹ thuật", "value": "06 buổi/năm", "sub": "Bố cục, ánh sáng & chỉnh màu Lightroom"}
  ],
  "highlights": [
    {"title": "Triển lãm Nhiếp ảnh Góc Nhìn VJU Qua Bốn Mùa", "tag": "Triển lãm thị giác", "description": "Tuyển tập những khung hình ấn tượng nhất ghi lại đời sống học tập và sinh hoạt tại Hòa Lạc – Mỹ Đình."},
    {"title": "Ngày hội Chụp Ảnh Hồ Sơ & Học Bổng Sinh Viên", "tag": "Hoạt động hỗ trợ SV", "description": "Studio lưu động hỗ trợ chụp và chỉnh sửa ảnh thẻ, ảnh CV chuyên nghiệp cho sinh viên toàn trường."}
  ]
}'
WHERE UPPER(code) = 'VJUP' AND (overview_config IS NULL OR overview_config = '{}');

-- 10. BIGHEART — CLB Sinh viên Tình nguyện BigHeart VJU
UPDATE clubs
SET overview_config = '{
  "preset": "VOLUNTEER",
  "slogan": "Kết nối trái tim tình nguyện — Lan tỏa trách nhiệm xã hội sinh viên VJU",
  "campusLocation": "Cơ sở Hòa Lạc, Mỹ Đình & Các điểm trường vùng cao phía Bắc",
  "operatingSchedule": "Thứ 4 · 19:00 – 20:30 (Họp điều phối chiến dịch & Hậu cần thiện nguyện)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Chiến dịch trọng điểm", "value": "05 đợt/năm", "sub": "Mùa Hè Xanh · Đông Ấm · Ngày Chủ Nhật Đỏ"},
    {"label": "Giờ tình nguyện", "value": "1.600+ giờ", "sub": "Ghi nhận minh bạch đóng góp phục vụ cộng đồng"},
    {"label": "Cộng tác viên đồng hành", "value": "240+ lượt", "sub": "Mở đăng ký CTV rộng rãi cho toàn trường"},
    {"label": "Điểm trường hỗ trợ", "value": "08 địa điểm", "sub": "Hòa Bình, Sơn La, Hà Giang & ngoại thành Hà Nội"}
  ],
  "highlights": [
    {"title": "Chiến dịch Thiện nguyện Đông Ấm Vùng Cao", "tag": "Chiến dịch cộng đồng", "description": "Gây quỹ trao tặng tủ sách, áo ấm và tổ chức lớp học trải nghiệm cho học sinh vùng khó khăn."},
    {"title": "Ngày hội Hiến máu & Môi trường Xanh Hòa Lạc", "tag": "Hoạt động thường kỳ", "description": "Phối hợp vận động hiến máu nhân đạo và chiến dịch phân loại rác tái chế trong khuôn viên đại học."}
  ]
}'
WHERE UPPER(code) = 'BIGHEART' AND (overview_config IS NULL OR overview_config = '{}');

-- 11. OUVEVJU — CLB Truyền thông và Sự kiện OuveVJU
UPDATE clubs
SET overview_config = '{
  "preset": "MEDIA_LIFESTYLE",
  "slogan": "Sáng tạo nội dung đa nền tảng — Đứng sau những sân khấu lớn nhất VJU",
  "campusLocation": "Phòng Media Cơ sở Mỹ Đình & Không gian Sự kiện Hòa Lạc",
  "operatingSchedule": "Thứ 2 (Pitching nội dung) & Thứ 6 (Sản xuất Media / Tiền kỳ sự kiện)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Chiến dịch truyền thông", "value": "18+ chiến dịch", "sub": "Fanpage · Short Video · Ấn phẩm sự kiện"},
    {"label": "Sự kiện điều phối", "value": "08 chương trình", "sub": "Orientation · Talkshow · Đêm Gala toàn trường"},
    {"label": "Độ phủ truyền thông", "value": "250K+ lượt xem", "sub": "Tổng lượt tiếp cận tự nhiên trên các nền tảng"},
    {"label": "Tổ chuyên môn", "value": "04 tổ", "sub": "Content · Graphic Design · Video · Event Ops"}
  ],
  "highlights": [
    {"title": "Chuỗi Sự kiện Chào Tân Sinh Viên VJU Orientation", "tag": "Tổ chức sự kiện", "description": "Xây dựng kịch bản sân khấu, chiến dịch truyền thông đa kênh và điều phối đội ngũ CTV hậu cần."},
    {"title": "Khóa Huấn luyện Nội bộ Ouve Media & Event Lab", "tag": "Đào tạo kỹ năng", "description": "Chia sẻ thực chiến về viết kịch bản truyền thông, thiết kế bộ nhận diện và quản trị rủi ro sự kiện."}
  ]
}'
WHERE UPPER(code) = 'OUVEVJU' AND (overview_config IS NULL OR overview_config = '{}');

-- 12. HASUKO — CLB Thực phẩm và Sức khoẻ Hasuko
UPDATE clubs
SET overview_config = '{
  "preset": "MEDIA_LIFESTYLE",
  "slogan": "Ăn lành mạnh · Sống cân bằng — Văn hóa ẩm thực & dinh dưỡng học đường",
  "campusLocation": "Không gian Sinh hoạt Hòa Lạc & Khu Workshop Ẩm thực Mỹ Đình",
  "operatingSchedule": "Chiều Thứ 6 · 16:30 – 18:30 (Workshop Ẩm thực Việt – Nhật & Dinh dưỡng)",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "Workshop ẩm thực", "value": "10 buổi/năm", "sub": "Bento Nhật Bản · Bánh truyền thống · Healthy Meal"},
    {"label": "Chuyên đề dinh dưỡng", "value": "24 bài viết", "sub": "Thực đơn tiết kiệm & khoa học cho SV nội trú"},
    {"label": "Gian hàng lễ hội", "value": "04 kỳ/năm", "sub": "Trải nghiệm ẩm thực sạch tại các sự kiện VJU"},
    {"label": "Lượt trải nghiệm", "value": "90+ sinh viên", "sub": "Thành viên & CTV tham gia thực hành bếp"}
  ],
  "highlights": [
    {"title": "Workshop Bento Chuẩn Nhật cho Sinh Viên Hòa Lạc", "tag": "Ẩm thực học đường", "description": "Hướng dẫn tự chuẩn bị hộp cơm cân bằng dinh dưỡng, đẹp mắt và tối ưu chi phí cho ngày học dài."},
    {"title": "Tuần lễ Sức khỏe & Lối sống Xanh Hasuko", "tag": "Chăm sóc sức khỏe", "description": "Chuỗi chia sẻ kiến thức vệ sinh an toàn thực phẩm, đọc nhãn dinh dưỡng và vận động lành mạnh."}
  ]
}'
WHERE UPPER(code) = 'HASUKO' AND (overview_config IS NULL OR overview_config = '{}');
