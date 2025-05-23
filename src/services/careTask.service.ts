import { ICareTask } from "../models/careTask.model";
import CareTask from "../models/careTask.model";
import mongoose from "mongoose";

class CareTaskService {
  // Thêm công việc mới vào cây trồng
  async createCareTask(data: {
    plantId: mongoose.Types.ObjectId;
    name: string;
    type: string;
    scheduled_date: Date;
    note?: string;
  }): Promise<ICareTask> {
    try {
      // Kiểm tra plant có tồn tại không
      const Plant = mongoose.model("Plant");
      const plant = await Plant.findById(data.plantId);
      if (!plant) {
        throw new Error("Cây trồng không tồn tại");
      }
      // Tạo công việc
      const careTask = new CareTask({
        plantId: data.plantId,
        name: data.name,
        type: data.type,
        scheduled_date: data.scheduled_date,
        note: data.note || "",
        created_at: new Date(),
        updated_at: new Date(),
      });
      return await careTask.save();
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách công việc theo plantId
  async getCareTasksByPlantId(
    plantId: mongoose.Types.ObjectId,
    filter: any = {}
  ): Promise<ICareTask[]> {
    try {
      return await CareTask.find({
        plantId,
        ...filter,
      }).sort({ scheduled_date: 1 });
    } catch (error) {
      throw error;
    }
  }

  // Lấy chi tiết công việc
  async getCareTaskById(
    taskId: mongoose.Types.ObjectId
  ): Promise<ICareTask | null> {
    try {
      return await CareTask.findById(taskId);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật công việc
  async updateCareTask(
    taskId: mongoose.Types.ObjectId,
    data: {
      name?: string;
      type?: string;
      scheduled_date?: Date;
      note?: string;
    }
  ): Promise<ICareTask | null> {
    try {
      const updateData: any = { ...data, updated_at: new Date() };

      return await CareTask.findByIdAndUpdate(taskId, updateData, {
        new: true,
      });
    } catch (error) {
      throw error;
    }
  }

  // Xóa công việc
  async deleteCareTask(taskId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const result = await CareTask.findByIdAndDelete(taskId);
      return result !== null;
    } catch (error) {
      throw error;
    }
  }

  // Lấy các công việc sắp tới
  async getUpcomingTasks(
    plantId: mongoose.Types.ObjectId,
    days: number = 7
  ): Promise<ICareTask[]> {
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);
      // Kiểm tra plant tồn tại
      const Plant = mongoose.model("Plant");
      const plant = await Plant.findById(plantId);
      if (!plant) {
        return [];
      }
      return await CareTask.find({
        plantId,
        scheduled_date: {
          $gte: today,
          $lte: endDate,
        },
      }).sort({ scheduled_date: 1 });
    } catch (error) {
      throw error;
    }
  }
}

export default new CareTaskService();
