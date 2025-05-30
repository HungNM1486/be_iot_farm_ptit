import { IPlant } from "../models/plant.model";
import Plant from "../models/plant.model";
import Location from "../models/location.model";
import mongoose from "mongoose";

class PlantService {
  // Tạo cây trồng mới
  async createPlant(plantData: {
    name: string;
    img?: string;
    address?: string;
    status?: string;
    startdate?: Date;
    plantingDate?: Date;
    harvestDate?: Date;
    yield?: {
      amount?: number;
      unit?: string;
    };
    quality?: {
      rating?: string;
      description?: string;
    };
    note?: string;
    locationId: mongoose.Types.ObjectId;
  }): Promise<IPlant> {
    try {
      // Kiểm tra xem Location có tồn tại không
      const locationExists = await Location.exists({
        _id: plantData.locationId,
      });
      if (!locationExists) {
        throw new Error("Location not found");
      }
      const plant = new Plant({
        ...plantData,
        created_at: new Date(),
        updated_at: new Date(),
      });
      return await plant.save();
    } catch (error) {
      throw error;
    }
  }

  async getPlantsByLocationId(
    locationId: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    filter: any = {},
    harvested?: boolean
  ): Promise<{
    plants: IPlant[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query: any = { locationId, ...filter };

      if (harvested === true) {
        // Chỉ lấy cây đã thu hoạch
        query.status = "Đã thu hoạch";
      } else if (harvested === false) {
        // Chỉ lấy cây chưa thu hoạch
        query.status = { $ne: "Đã thu hoạch" };
      }
      // Nếu harvested undefined thì lấy tất cả

      const total = await Plant.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      const plants = await Plant.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return {
        plants,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy chi tiết cây trồng
  async getPlantById(plantId: mongoose.Types.ObjectId): Promise<IPlant | null> {
    try {
      return await Plant.findById(plantId);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật cây trồng
  async updatePlant(
    plantId: mongoose.Types.ObjectId,
    updateData: Partial<IPlant>
  ): Promise<IPlant | null> {
    // Nếu có trường status thì validate hợp lệ
    if (updateData.status) {
      const validStatuses = [
        "Đang tốt",
        "Cần chú ý",
        "Có vấn đề",
        "Đã thu hoạch",
      ];
      if (!validStatuses.includes(updateData.status)) {
        throw new Error(
          "Invalid status. Must be one of: " + validStatuses.join(", ")
        );
      }
    }
    try {
      return await Plant.findByIdAndUpdate(
        plantId,
        {
          ...updateData,
          updated_at: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  // Xóa cây trồng
  async deletePlant(plantId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const result = await Plant.findByIdAndDelete(plantId);
      return result !== null;
    } catch (error) {
      throw error;
    }
  }

  async getPlantsByUserId(
    userId: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    filter: any = {}
  ): Promise<{
    plants: IPlant[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Lấy tất cả locationId của user
      const locations = await Location.find({ userId });
      const locationIds = locations.map((loc) => loc._id);

      const query: any = { locationId: { $in: locationIds }, ...filter };

      // Mặc định chỉ lấy cây chưa thu hoạch (trừ khi filter có status cụ thể)
      if (!filter.status) {
        query.status = { $ne: "Đã thu hoạch" };
      }

      const total = await Plant.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      const plants = await Plant.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return {
        plants,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new PlantService();
