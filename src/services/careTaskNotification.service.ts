import CareTask from "../models/careTask.model";
import Notification from "../models/notification.model";
import Plant from "../models/plant.model";
import Location from "../models/location.model";
import { io } from "../app";

export class CareTaskNotificationService {
  // Kiểm tra và tạo thông báo cho task sắp đến hạn
  static async checkUpcomingTasks() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Lấy các task có ngày thực hiện là ngày mai
      const upcomingTasks = await CareTask.find({
        scheduled_date: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow,
        },
      }).populate("plantId");

      for (const task of upcomingTasks) {
        await this.createTaskReminder(task);
      }
    } catch (error) {
      console.error("Lỗi kiểm tra task sắp đến hạn:", error);
    }
  }

  private static async createTaskReminder(task: any) {
    try {
      const plant = await Plant.findById(task.plantId).populate("locationId");
      if (!plant) return;

      const notification = new Notification({
        type: "care_task_reminder",
        message: `Nhắc nhở: "${task.name}" cho cây ${plant.name} vào ngày mai`,
        locationId: plant.locationId,
        read: false,
        created_at: new Date(),
      });

      await notification.save();
      console.log(`Tạo nhắc nhở cho task: ${task.name}`);
    } catch (error) {
      console.error("Lỗi tạo nhắc nhở task:", error);
    }
  }
}
