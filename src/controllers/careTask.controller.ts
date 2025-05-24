import { Request, Response } from "express";
import mongoose from "mongoose";
import careTaskService from "../services/careTask.service";
import plantService from "../services/plant.service";

export const createCareTask = async (req: Request, res: Response) => {
  try {
    const { plantId, name, type, scheduled_date, note } = req.body;
    const userId = req.user?.id;

    console.log("req.body:", req.body);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!plantId || !mongoose.Types.ObjectId.isValid(plantId)) {
      return res.status(400).json({
        success: false,
        message: "ID cây trồng không hợp lệ",
      });
    }

    if (!name || !type || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tên, loại và ngày thực hiện công việc",
      });
    }

    // Kiểm tra quyền truy cập cây trồng
    const plant = await plantService.getPlantById(
      new mongoose.Types.ObjectId(plantId)
    );
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cây trồng",
      });
    }

    const careTask = await careTaskService.createCareTask({
      plantId: new mongoose.Types.ObjectId(plantId),
      name,
      type,
      scheduled_date: new Date(scheduled_date),
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo công việc chăm sóc thành công",
      data: careTask,
    });
  } catch (error) {
    console.error("Error creating care task:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi tạo công việc chăm sóc",
    });
  }
};

export const getCareTasks = async (req: Request, res: Response) => {
  try {
    const { plantId, status, upcoming } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!plantId || !mongoose.Types.ObjectId.isValid(plantId as string)) {
      return res.status(400).json({
        success: false,
        message: "ID cây trồng không hợp lệ",
      });
    }

    // Kiểm tra quyền truy cập cây trồng
    const plant = await plantService.getPlantById(
      new mongoose.Types.ObjectId(plantId as string)
    );
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cây trồng",
      });
    }

    let tasks;
    if (upcoming === "true") {
      const days = parseInt(req.query.days as string) || 7;
      tasks = await careTaskService.getUpcomingTasks(
        new mongoose.Types.ObjectId(plantId as string),
        days
      );
    } else {
      const filter: any = {};
      if (status) {
        filter.status = status;
      }
      tasks = await careTaskService.getCareTasksByPlantId(
        new mongoose.Types.ObjectId(plantId as string),
        filter
      );
    }
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách công việc chăm sóc thành công",
      data: tasks,
    });
  } catch (error) {
    console.error("Error getting care tasks:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi lấy danh sách công việc chăm sóc",
    });
  }
};

export const getCareTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ",
      });
    }

    const task = await careTaskService.getCareTaskById(
      new mongoose.Types.ObjectId(taskId)
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc chăm sóc",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin công việc chăm sóc thành công",
      data: task,
    });
  } catch (error) {
    console.error("Error getting care task:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi lấy thông tin công việc chăm sóc",
    });
  }
};

export const updateCareTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { name, type, scheduled_date, note, plantId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ",
      });
    }

    // Nếu có truyền plantId thì kiểm tra quyền truy cập
    if (plantId) {
      if (!mongoose.Types.ObjectId.isValid(plantId)) {
        return res.status(400).json({
          success: false,
          message: "ID cây trồng không hợp lệ",
        });
      }
      const plant = await plantService.getPlantById(
        new mongoose.Types.ObjectId(plantId)
      );
      if (!plant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cây trồng",
        });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (scheduled_date) updateData.scheduled_date = new Date(scheduled_date);
    if (note !== undefined) updateData.note = note;

    const updatedTask = await careTaskService.updateCareTask(
      new mongoose.Types.ObjectId(taskId),
      updateData
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật công việc chăm sóc thành công",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Error updating care task:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi cập nhật công việc chăm sóc",
    });
  }
};

export const deleteCareTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ",
      });
    }

    const result = await careTaskService.deleteCareTask(
      new mongoose.Types.ObjectId(taskId)
    );

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Không thể xóa công việc chăm sóc",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa công việc chăm sóc thành công",
    });
  } catch (error) {
    console.error("Error deleting care task:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi xóa công việc chăm sóc",
    });
  }
};
