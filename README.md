# Phòng thí nghiệm 3D: CaCO₃ + 2HCl

## Chạy trên VS Code — 3 bước

1. Giải nén ZIP, mở thư mục `Lab3D` bằng **File → Open Folder** trong VS Code.
2. Cài extension **Live Server** của Ritwick Dey.
3. Nhấn chuột phải `index.html` → **Open with Live Server**. Dùng Chrome hoặc Edge có WebGL; kéo để xoay, cuộn để thu phóng.

Không cần npm, build hoặc Internet sau khi đã cài Live Server. Truy cập qua địa chỉ HTTP của Live Server, không mở bằng `file://`.

## Cấu trúc

| File | Trách nhiệm |
| --- | --- |
| `index.html`, `css/style.css` | Giao diện tiếng Việt, bố cục responsive |
| `js/main.js` | Khởi tạo sau DOMContentLoaded, UI, thời gian, CSV, vòng đời ứng dụng |
| `js/chemistry.js` | Trạng thái mol và tích phân động học, độc lập DOM/Three.js |
| `js/scene.js` | Hình học, vật liệu, camera, bọt khí, gợn sóng, dispose |
| `js/chart.js` | Biểu đồ canvas, trục và dữ liệu thực nghiệm |
| `vendor/` | Three.js r160, OrbitControls cùng phiên bản và giấy phép MIT |
| `data/mau_du_lieu_thuc_nghiem.csv` | Header mẫu, không chứa số liệu đo giả |

Start chuyển thành Pause khi chạy và Resume khi tạm dừng. Các thông số được khóa từ khi bắt đầu; Reset giữ giá trị hiện tại, đưa thời gian về 0 và mở khóa thông số. Thanh trượt/select thay đổi ngay mô hình khi đang ở trạng thái sẵn sàng. CSV thực nghiệm được giữ qua Reset để so sánh nhiều lượt chạy. Thể tích HCl cố định 100 mL theo giao diện bản B.

## Đối chiếu mã nguồn đã tải

- A: https://github.com/nguyenttrieungocqn/Lab3D_CaCO3_HCl — commit `fa3536f01c6b668a05b4e69d65636642b693e123`.
- B: https://github.com/nguyenttrieungocqn/Lab3D_CaCO3_HCl-du-an-2 — commit `f0df5540a308771540c21a957504a34fd6a42992`.

| Phát hiện | Xử lý trong gói này |
| --- | --- |
| A gộp CSS, DOM, động học và WebGL trong 1 HTML. B tham chiếu CSS/JS nhưng repository thiếu các file đó. | Khôi phục tài nguyên và chọn 4 module theo trách nhiệm. Dùng HTML B, tái tạo CSS theo ảnh preview vì CSS gốc không tồn tại trong commit B. |
| A chỉ tắt depthWrite cho vỏ kính; dung dịch, mặt nước, bọt và gợn sóng vẫn ghi depth; không có renderOrder. | Đá opaque: 10; dung dịch: 20/21; kính: 30/31; bọt: 40; sóng: 50. Tất cả vật liệu transparent tắt depthWrite, giữ depthTest. |
| A remove đá/gợn sóng nhưng không dispose; bọt dùng geometry/material chung. | Gói mới dispose geometry/material riêng của bọt và sóng khi hết đời. Reset dispose đá và hạt cũ; material đá dùng chung chỉ dispose khi hủy scene. |
| A đọc lại slider ngay trong reactionStep, nhưng không tái khởi tạo số mol khi đổi mass/conc; scale đá có thể lệch sau khi ép số mol về 0. | Chụp bộ thông số khi reset; dùng duy nhất extent để tính mol, đồ thị, chỉ số và scale đá. Không ép hết đá khi axit giới hạn. |
| A dùng 24000 mL/mol, không đúng quy đổi 25 °C/1 atm trong mô tả B. | Dùng 24465,4 mL/mol, quy ước hoàn thành ở 99,5% chất giới hạn như B. |

`scene.sortObjects = true` được giữ theo yêu cầu. Trong Three.js r160, công tắc thực sự điều khiển việc sắp xếp là `renderer.sortObjects = true`, cũng đã được bật. Đây là alpha blending có thứ tự cho mô hình này, không phải order-independent transparency tổng quát. Camera bị giới hạn phía trên mặt bàn và bên ngoài bình. Không dùng transmission để tránh thêm một pass khúc xạ có thể loại vật thể transparent khỏi ảnh truyền qua.

## Mô hình khoa học

Phản ứng: `CaCO₃ + 2HCl → CaCl₂ + CO₂ + H₂O`.

Với extent `x` (mol):

- `nCa0 = mass / 100.086`, `nH0 = concentration × volume_L`.
- `xMax = min(nCa0, nH0 / 2)`; `nCa = nCa0 − x`, `nH = nH0 − 2x`.
- `dx/dt = 0.005 × (mass/2) × (2/diameter_mm) × (nCa/nCa0)^(2/3) × (nH/volume_L) × exp[(35000/R)(1/298.15 − 1/T_K)]`.
- `VCO2_mL = x × 24465.4`; hệ số scale của mọi viên đá bằng `(nCa/nCa0)^(1/3)`; tổng thể tích hình học còn lại tỷ lệ với khối lượng còn lại trong mỗi lượt chạy.

Tích phân RK4 với bước con tối đa 0,01 s, giới hạn lượng phản ứng và dừng ở 99,5% xMax. Không ép kết quả lên 100%: vẫn còn 0,5% lượng chất giới hạn tại ngưỡng kết thúc. Tốc độ ban đầu là lượng CO₂ sinh ra trong giây đầu / 1 s; nếu phản ứng đạt ngưỡng trước 1 s thì phần thời gian còn lại có tốc độ 0.

Hệ số 0,005 và năng lượng hoạt hóa 35 kJ/mol là tham số minh họa kế thừa ý tưởng bản A, chưa hiệu chuẩn thực nghiệm. Giả định khuấy đều, nhiệt độ/thể tích không đổi, hạt có kích thước đại diện đồng nhất; không mô hình hóa truyền khối, CO₂ hòa tan hay sự thay đổi nhiệt. Kích thước 3D được phóng đại để quan sát, không phải thước đo mm thực tế. Số lượng bọt biểu diễn tốc độ, không phải đếm phân tử hay đo trực tiếp thể tích khí.

## Xác minh và giới hạn

Đã chạy kiểm tra tự động với Node.js: bảo toàn mol, hai trường hợp chất giới hạn, ngưỡng 99,5%, độ ổn định theo bước thời gian, ảnh hưởng khối lượng/kích thước/nhiệt độ; Start/Pause/Resume/Reset, range/select, DOMContentLoaded và CSV qua DOM harness; 80 lần reset với bộ đếm cấp phát/dispose tài nguyên Three.js. Đã kiểm tra cú pháp JS và các đường dẫn tài nguyên cục bộ.

Chromium trong môi trường thực thi bị hệ điều hành chặn tạo socket, nên chưa thực hiện được kiểm thử ảnh WebGL, FPS hoặc GPU memory thực tế. Kiểm tra vòng đời dùng renderer giả lập và các geometry/material Three.js thật; không đồng nghĩa đã xác minh trên GPU. Khi chạy trên máy, hãy xoay quanh bình, thử các tốc độ, Pause/Resume và Reset nhiều lần để kiểm tra với driver hiện tại.

CSV dùng `time_s,co2_ml` ở dòng đầu, sau đó là hai số không âm mỗi dòng, thời gian tăng dần. Chấp nhận dấu phẩy, chấm phẩy hoặc tab phân cột; dùng dấu chấm thập phân. Tối đa 2 MB / 20.000 điểm.

## Giấy phép

Giấy phép Three.js/OrbitControls nằm tại `vendor/LICENSE-three.txt`. Hai repository nguồn chưa có file LICENSE trong các commit đã kiểm tra; gói này không tự áp đặt giấy phép mới cho mã nguồn dự án gốc.
