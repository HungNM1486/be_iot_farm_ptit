// Công cụ kiểm tra API upload ảnh
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

// Cấu hình cho việc kiểm tra
const SERVER_URL = "http://192.168.1.17:3000"; // IP của laptop
const TEST_IMAGE_PATH = path.join(__dirname, "../../test/test_image.jpg");
const UPLOAD_ENDPOINT = "/api/camera/upload";
const DEVICE_ID = "ESP32CAM_TEST";

// Kiểm tra file test có tồn tại không
if (!fs.existsSync(TEST_IMAGE_PATH)) {
  console.error(`Lỗi: Không tìm thấy file test tại ${TEST_IMAGE_PATH}`);
  console.log("Vui lòng tạo thư mục test và thêm file test_image.jpg");
  process.exit(1);
}

// Tạo form-data để upload
async function testCameraUpload() {
  try {
    console.log("Bắt đầu kiểm tra API upload ảnh...");
    const form = new FormData();
    form.append("image", fs.createReadStream(TEST_IMAGE_PATH));
    form.append("deviceId", DEVICE_ID);

    console.log(`Gửi ảnh đến: ${SERVER_URL}${UPLOAD_ENDPOINT}`);
    console.log(`DeviceId: ${DEVICE_ID}`);
    console.log(`File ảnh: ${TEST_IMAGE_PATH}`);

    const response = await axios.post(`${SERVER_URL}${UPLOAD_ENDPOINT}`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log("Kết quả:");
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(response.data, null, 2));
    console.log("✅ Kiểm tra thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi kiểm tra API upload ảnh:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Response:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Kiểm tra kết nối đến server
async function testServerConnection() {
  try {
    console.log(`Kiểm tra kết nối đến ${SERVER_URL}...`);
    const response = await axios.get(SERVER_URL);
    console.log(`✅ Kết nối thành công! Status: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`❌ Không thể kết nối đến ${SERVER_URL}`);
    if (error.response) {
      console.log(`Nhận được phản hồi với status: ${error.response.status}`);
      return true; // Nếu nhận được phản hồi, vẫn coi là kết nối được
    }
    console.error("Chi tiết lỗi:", error.message);
    return false;
  }
}

// Hàm chính
async function runTests() {
  const connected = await testServerConnection();
  if (connected) {
    await testCameraUpload();
  } else {
    console.log("Vui lòng kiểm tra lại kết nối đến server");
  }
}

runTests();
