import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
  const {
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_CLUSTER,
    MONGODB_DB_NAME,
  } = process.env;

  if (!MONGODB_USERNAME) {
    console.error("⚠️  Thiếu biến môi trường: MONGODB_USERNAME");
    process.exit(1);
  }
  if (!MONGODB_PASSWORD) {
    console.error("⚠️  Thiếu biến môi trường: MONGODB_PASSWORD");
    process.exit(1);
  }
  if (!MONGODB_CLUSTER) {
    console.error("⚠️  Thiếu biến môi trường: MONGODB_CLUSTER");
    process.exit(1);
  }

  const dbName = MONGODB_DB_NAME || "smart-agriculture";
  const uri =
    `mongodb+srv://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(
      MONGODB_PASSWORD
    )}` + `@${MONGODB_CLUSTER}/?retryWrites=true&w=majority&appName=hungnm`;

  try {
    await mongoose.connect(uri, { dbName });
    console.log(
      `✅  Đã kết nối MongoDB Atlas thành công: Cluster=${MONGODB_CLUSTER}, Database=${dbName}`
    );
  } catch (error: any) {
    // Phân loại lỗi kết nối
    if (error.name === "MongoNetworkError") {
      console.error(
        "❌  Lỗi mạng: Không thể kết nối đến MongoDB Atlas. Vui lòng kiểm tra kết nối Internet và cấu hình cluster.",
        error.message
      );
    } else if (error.name === "MongoParseError") {
      console.error(
        "❌  Lỗi phân tích URI: Chuỗi kết nối MongoDB không hợp lệ.",
        error.message
      );
    } else if (error.name === "MongooseServerSelectionError") {
      console.error(
        "❌  Lỗi chọn server: Không tìm thấy server phù hợp trong cluster MongoDB.",
        error.message
      );
    } else {
      console.error(
        "❌  Lỗi không xác định khi kết nối MongoDB Atlas:",
        error.message || error
      );
    }
    process.exit(1);
  }
};

export default connectDB;
