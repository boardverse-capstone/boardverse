# AUTH & PROFILE INTIALIZATION SPECIFICATION

## 1. TỔNG QUAN & Ý NGHĨA NGHIỆP VỤ
Hệ thống cung cấp cơ chế quản lý truy cập tập trung, phân quyền dựa trên vai trò (Role-based Access Control) cho 4 nhóm đối tượng: Admin, Cafe Manager, Staff, và Player.

Đối với các vai trò quản trị/vận hành (Admin, Cafe Manager, Staff): Tài khoản do hệ thống cấp phát sau khi được phê duyệt hồ sơ.

Đối với vai trò khách hàng (Player): Cho phép đăng ký tự do nhưng bắt buộc phải qua bước xác thực Email (OTP) để kích hoạt trạng thái hoạt động và khởi tạo các chỉ số định danh hành vi (Elo, Karma).

## 2. CÁC THÀNH PHẦN DỮ LIỆU ĐẦU VÀO VÀ ĐẦU RA (DATA CONTRACT)
A. Dữ liệu đầu vào (Input Parameters)
Yêu cầu Đăng ký (Register Request): Email (Chuỗi mã hóa chuẩn RFC 5322), Password (Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt).

Yêu cầu Xác thực (Verification Request): Email, OTP_Code (Chuỗi 6 chữ số).

Yêu cầu Đăng nhập (Login Request): Email, Password.

B. Dữ liệu đầu ra & Trạng thái hệ thống (Output & State)
Trạng thái tài khoản (Account Status): PENDING (Chờ kích hoạt), ACTIVE (Đang hoạt động), INACTIVE (Bị khóa/Đình chỉ).

Chỉ số mặc định (Default Metrics): Elo = 1000, Karma = 100.

Dữ liệu trả về khi đăng nhập thành công: Access Token (JWT chứa: AccountId, Email, Role).

## 3. CHI TIẾT CÁC LUỒNG XỬ LÝ (BUSINESS FLOWS)
### 3.1. Luồng chuẩn (Normal Flow): Đăng ký, Xác thực & Đăng nhập dành cho Player
Giai đoạn 1: Đăng ký tài khoản (Sign Up)
Điều kiện tiên quyết (Pre-conditions): Người chơi chưa có tài khoản trên hệ thống. Email sử dụng chưa từng được đăng ký trước đó.

Các bước thực hiện:

Người dùng truy cập Ứng dụng Mobile, chọn chức năng Đăng ký, nhập Email và Password.

Hệ thống thực hiện kiểm tra định dạng Email và độ mạnh của Mật khẩu.

Hệ thống kiểm tra tính duy nhất của Email trong Cơ sở dữ liệu.

Hệ thống thực hiện mã hóa mật khẩu (hashing) và tạo bản ghi tài khoản mới với trạng thái là PENDING.

Hệ thống tự động sinh một mã OTP gồm 6 chữ số ngẫu nhiên, thiết lập thời gian hết hạn là 5 phút (300 giây) kể từ thời điểm sinh mã, và lưu vào nhật ký hệ thống.

Hệ thống kích hoạt dịch vụ gửi Email (Mail Service) để gửi mã OTP này tới địa chỉ Email người dùng vừa nhập.

Ứng dụng Mobile chuyển hướng người dùng sang màn hình "Nhập mã xác thực OTP".

Giai đoạn 2: Xác thực OTP & Khởi tạo Hồ sơ (Verification & Profile Initialization)
Điều kiện tiên quyết: Tài khoản đang ở trạng thái PENDING. Hệ thống đã gửi OTP thành công.

Các bước thực hiện:

Người dùng kiểm tra hộp thư điện tử, lấy mã OTP và nhập vào giao diện xác thực trên Ứng dụng Mobile.

Hệ thống đối chiếu mã OTP người dùng nhập với mã OTP được lưu trong nhật ký.

Hệ thống kiểm tra thời gian hiệu lực của mã (hiện tại so với thời điểm sinh mã phải <= 5 phút).

Hệ thống xác nhận mã trùng khớp và còn hiệu lực.

Hệ thống cập nhật trạng thái tài khoản từ PENDING sang ACTIVE.

Hệ thống tự động khởi tạo bản ghi Hồ sơ người chơi (Player Profile) liên kết với ID tài khoản này, thiết lập giá trị ban đầu: Elo = 1000, Karma = 100, PlayHistory = Rỗng.

Ứng dụng Mobile hiển thị thông báo "Kích hoạt tài khoản thành công" và chuyển hướng về màn hình Đăng nhập.

Giai đoạn 3: Đăng nhập hệ thống (Sign In)
Điều kiện tiên quyết: Tài khoản đã ở trạng thái ACTIVE.

Các bước thực hiện:

Người dùng nhập Email và Password trên màn hình Đăng nhập.

Hệ thống kiểm tra sự tồn tại của Email và thực hiện đối chiếu mật khẩu đã mã hóa.

Hệ thống kiểm tra trạng thái tài khoản. Xác nhận trạng thái là ACTIVE.

Hệ thống tạo mã Access Token bảo mật (JWT) có chứa thông tin định danh và quyền (Role: PLAYER).

Hệ thống gửi mã Token về ứng dụng Mobile. Ứng dụng lưu trữ Token bảo mật vào bộ nhớ thiết bị và chuyển hướng người dùng vào giao diện trang chủ (Dashboard).

### 3.2. Luồng rẽ nhánh (Alternative Flow): Đăng nhập cho các vai trò quản trị (Admin, Cafe Manager, Staff)
Ý nghĩa: Rút gọn quy trình xác thực OTP trực tiếp cho các nhân sự vận hành hệ thống, do tài khoản của họ đã được xác minh nghiêm ngặt từ bước phê duyệt đơn đăng ký của Admin.

Điều kiện tiên quyết: Tài khoản đã được Admin khởi tạo sẵn trong hệ thống với trạng thái ACTIVE.

Các bước thực hiện:

Người dùng truy cập vào trang quản trị hệ thống (Web Portal), chọn phân hệ đăng nhập tương ứng.

Người dùng nhập thông tin Email và Password.

Hệ thống kiểm tra thông tin đăng nhập trong cơ sở dữ liệu.

Hệ thống xác nhận tài khoản tồn tại, mật khẩu trùng khớp và trạng thái tài khoản là ACTIVE.

Hệ thống kiểm tra vai trò gắn liền với tài khoản (Xác nhận thuộc một trong các quyền: ADMIN, CAFE_MANAGER, hoặc STAFF).

Hệ thống bỏ qua bước xác thực OTP bằng Email, lập tức sinh mã Access Token (JWT) tương ứng với vai trò của nhân sự đó.

Hệ thống chuyển hướng người dùng thẳng vào giao diện làm việc của trang Web quản trị (Admin Dashboard hoặc POS Management).

### 3.3. Các luồng ngoại lệ (Exception Flows)
Ngoại lệ 1: Email đăng ký đã tồn tại trong hệ thống (Tại Giai đoạn 1)
Điều kiện kích hoạt: Hệ thống phát hiện Email nhập vào đã có trong bảng dữ liệu tài khoản.

Hành vi hệ thống:

Hệ thống dừng luồng xử lý đăng ký, không sinh mã OTP.

Trả về mã lỗi nghiệp vụ kèm thông báo: "Địa chỉ Email này đã được sử dụng. Vui lòng sử dụng Email khác hoặc chọn chức năng Quên mật khẩu."

Ngoại lệ 2: Mã OTP nhập vào bị sai lệch hoặc không chính xác (Tại Giai đoạn 2)
Điều kiện kích hoạt: Chuỗi 6 chữ số người dùng nhập không trùng khớp với mã OTP hệ thống đã lưu.

Hành vi hệ thống:

Hệ thống từ chối cập nhật trạng thái tài khoản (giữ nguyên trạng thái PENDING).

Hiển thị thông báo lỗi: "Mã xác thực không chính xác. Vui lòng kiểm tra lại."

Cho phép người dùng nhập lại (Tối đa 5 lần thử. Nếu quá 5 lần, mã OTP đó sẽ tự động bị hủy để đảm bảo bảo mật).

Ngoại lệ 3: Mã OTP bị hết hạn hiệu lực (Tại Giai đoạn 2)
Điều kiện kích hoạt: Người dùng nhập mã chính xác nhưng thời gian thực hiện thao tác đã vượt quá 5 phút kể từ lúc hệ thống gửi mail.

Hành vi hệ thống:

Hệ thống hủy bỏ giá trị của mã OTP cũ trong nhật ký hệ thống.

Giao diện hiển thị thông báo lỗi: "Mã xác thực đã hết hạn hiệu lực."

Hệ thống hiển thị nút hành động "Gửi lại mã" trên màn hình. Khi người dùng bấm nút này, hệ thống sẽ thực hiện lại từ Bước 5 của Giai đoạn 1 (Sinh mã OTP mới và gửi lại vào Email).

Ngoại lệ 4: Đăng nhập vào tài khoản đang bị khóa/đình chỉ (Tại Giai đoạn 3)
Điều kiện kích hoạt: Hệ thống xác thực đúng Email và Mật khẩu, nhưng trường dữ liệu trạng thái tài khoản đang ghi nhận là INACTIVE.

Hành vi hệ thống:

Hệ thống từ chối sinh mã Access Token, chấm dứt phiên đăng nhập ngay lập tức.

Hệ thống hiển thị thông báo cảnh báo trên màn hình: "Tài khoản của bạn đã bị đình chỉ hoạt động do vi phạm kỷ luật (No-show hoặc Toxic). Vui lòng liên hệ bộ phận hỗ trợ của BoardVerse để được giải quyết."

## 4. QUY TẮC NGHIỆP VỤ BẮT BUỘC (BUSINESS RULES)
Ràng buộc mật khẩu (Password Policy): Mật khẩu bắt buộc phải được băm bằng thuật toán bảo mật cao (ví dụ: BCrypt, Argon2 hoặc PBKDF2) trước khi lưu xuống Database. Tuyệt đối không lưu mật khẩu dưới dạng văn bản thô (Plain-text).

Độc quyền kích hoạt: Một tài khoản ở trạng thái PENDING sẽ không được xuất hiện trong bất kỳ kết quả tìm kiếm nào của luồng Ghép đội (Matchmaking) hoặc Đặt chỗ (Booking) ở các sprint sau.

Giới hạn Số điện thoại (Future-proof): Mặc dù Sprint 1 sử dụng Email làm khóa đăng nhập chính, cấu trúc cơ sở dữ liệu và hàm xử lý đăng nhập phải được thiết kế theo dạng mở để sẵn sàng tích hợp thêm điều kiện kiểm tra Số điện thoại (OR Phone = :input) mà không cần đi xây lại hệ thống API.

 

# DANH SÁCH CÁC TRẠNG THÁI CỦA TÀI KHOẢN
Vòng đời của một tài khoản (áp dụng cho mọi Role) được quản lý nghiêm ngặt qua 3 trạng thái core sau:

PENDING (Chờ kích hoạt): Trạng thái tạm thời ngay sau khi người dùng (Player) bấm đăng ký thành công. Ở trạng thái này, hệ thống từ chối mọi quyền truy cập vào các tính năng bên trong ứng dụng.

ACTIVE (Đang hoạt động): Tài khoản đã qua xác thực (OTP hoặc qua kiểm duyệt của Admin), có toàn quyền đăng nhập và sử dụng các tính năng tương ứng với vai trò (Role) của mình.

INACTIVE (Bị khóa/Đình chỉ): Tài khoản bị tước quyền truy cập tạm thời hoặc vĩnh viễn do vi phạm các quy tắc nghiệp vụ của hệ thống (Ví dụ: Player toxic, no-show nhiều lần hoặc đơn vị Cafe Partner vi phạm hợp đồng).

## LOGIC CHUYỂN ĐỔI TRẠNG THÁI VÀ ĐIỀU KIỆN (STATE TRANSITIONS & CONDITIONS)
Từ trạng thái PENDING (Chờ kích hoạt)
Sang ACTIVE:

Đối tượng kích hoạt: Hệ thống tự động xử lý.

Điều kiện cần: Người dùng nhập chuỗi mã xác thực chính xác (OTP_Code trùng khớp) và thời gian thực hiện thao tác <= 5 phút kể từ lúc hệ thống phát hành mã.

Hành động đi kèm: Hệ thống đồng thời kích hoạt lệnh khởi tạo Hồ sơ người chơi (Player Profile) với các thông số Master Data mặc định (Elo = 1000, Karma = 100).

Từ trạng thái ACTIVE (Đang hoạt động)
Sang INACTIVE:

Đối tượng kích hoạt: Admin hệ thống xử lý thủ công (qua trang quản lý tài khoản) hoặc do Logic hệ thống tự động quét.

Điều kiện cần: Tài khoản bị ghi nhận vi phạm kỷ luật. Đối với Player: Điểm uy tín Karma bị trừ tụt xuống dưới ngưỡng cho phép tối thiểu (Penalty Threshold) do hệ thống cấu hình. Đối với Cafe Partner: Đơn vị vi phạm các quy định vận hành hoặc chấm dứt hợp đồng đàm phán.

Hành động đi kèm: Hủy bỏ/Thu hồi ngay lập tức Token phiên làm việc hiện tại (Access Token JWT), đăng xuất tài khoản trên mọi thiết bị và từ chối các phiên đăng nhập mới.

Từ trạng thái INACTIVE (Bị khóa/Đình chỉ)
Sang ACTIVE:

Đối tượng kích hoạt: Chỉ có Admin hệ thống mới có quyền thực hiện hành động này trên Admin Portal.

Điều kiện cần: Admin xem xét khiếu nại, thực hiện "Mở khóa tài khoản". Hệ thống đặt lại (Reset) điểm uy tín Karma về mức an toàn tối thiểu (nếu là Player) để người dùng có cơ hội cải thiện chỉ số hành vi.

## RÀNG BUỘC NGHIỆP VỤ GIỮA TRẠNG THÁI TÀI KHOẢN VÀ HỒ SƠ ĐÍNH KÈM
Ràng buộc khởi tạo: Bản ghi Hồ sơ người chơi (Player Profile) tuyệt đối không được phép sinh ra trước hoặc song song với trạng thái PENDING. Nó chỉ được phép tạo ra đúng vào thời điểm giao thoa khi trạng thái chuyển từ PENDING sang ACTIVE thành công.

Ràng buộc vận hành: Khi trạng thái tài khoản là PENDING hoặc INACTIVE, ID tài khoản đó phải lập tức bị loại bỏ hoàn toàn khỏi tất cả các bộ lọc của các tính năng: Tìm kiếm bạn bè, Ghép phòng chờ (Matchmaking Lobby), Gửi lời mời kết bạn, Đặt chỗ giữ bàn (Booking). Mọi request gọi API từ các tài khoản không phải ACTIVE tới các tính năng này đều bị hệ thống chặn và trả về lỗi 403 Forbidden.