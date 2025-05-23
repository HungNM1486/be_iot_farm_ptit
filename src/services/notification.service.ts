import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Cấu hình email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Gửi email thông báo
export async function sendEmailNotification(
  to: string,
  subject: string,
  message: string
): Promise<boolean> {
  try {
    // Kiểm tra cấu hình email hợp lệ
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Thiếu cấu hình email trong biến môi trường");
      return false;
    }

    const mailOptions = {
      from: `"Hệ thống IoT Nông nghiệp" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">Thông báo từ hệ thống IoT Nông nghiệp</h2>
          <p>${message}</p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #777; font-size: 12px;">
            Đây là email tự động, vui lòng không trả lời.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email được gửi thành công:", info.messageId);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
    return false;
  }
}
