# Hướng dẫn kết nối cảm biến với ESP32

## Sơ đồ kết nối

### Cảm biến DHT11

- VCC: kết nối với 3.3V của ESP32
- GND: kết nối với GND của ESP32
- DATA: kết nối với GPIO4 của ESP32

### Cảm biến khí gas MQ02

- VCC: kết nối với 5V của ESP32 (cảm biến MQ02 cần nguồn 5V để hoạt động tốt)
- GND: kết nối với GND của ESP32
- AO (Analog Output): kết nối với GPIO34 của ESP32

### Cảm biến ánh sáng quang trở

- Một chân của quang trở: kết nối với 3.3V của ESP32
- Chân còn lại của quang trở: kết nối với GPIO35 của ESP32 và với GND qua điện trở 10kΩ

## Lưu ý

1. ESP32 chỉ có thể đọc điện áp analog từ 0V đến 3.3V, vì vậy cần đảm bảo điện áp đầu ra từ cảm biến không vượt quá 3.3V.
2. Các chân GPIO34 và GPIO35 là chân input-only, không thể sử dụng làm output.
3. Với cảm biến MQ02, cần đợi khoảng 20-30 giây để cảm biến khởi động và ổn định trước khi đọc giá trị.
4. Nếu sử dụng pin để cấp nguồn cho ESP32, hãy đảm bảo pin có đủ dung lượng để cấp nguồn cho cả hệ thống, đặc biệt là cảm biến MQ02 tiêu thụ khá nhiều năng lượng.
