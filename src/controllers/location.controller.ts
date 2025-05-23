import { Request, Response } from "express";
import mongoose from "mongoose";
import locationService from "../services/location.service";

// Tạo location mới cho user
export const createLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, description, area, location_code } = req.body;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Tên vị trí là bắt buộc" });
    const location = await locationService.createLocation({
      name,
      description,
      area,
      location_code,
      userId: new mongoose.Types.ObjectId(userId),
    });
    return res
      .status(201)
      .json({
        success: true,
        message: "Tạo vị trí thành công",
        data: location,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: error instanceof Error ? error.message : "Lỗi khi tạo vị trí",
      });
  }
};

// Lấy danh sách location của user (có phân trang, tìm kiếm)
export const getLocations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filter: any = {};
    if (req.query.search)
      filter.name = { $regex: req.query.search, $options: "i" };
    const result = await locationService.getLocationsByUserId(
      new mongoose.Types.ObjectId(userId),
      page,
      limit,
      filter
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Locations retrieved successfully",
        data: result,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while getting locations",
      });
  }
};

// Lấy chi tiết location theo ID, kiểm tra quyền truy cập
export const getLocationById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { locationId } = req.params;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(locationId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid location ID" });
    const location = await locationService.getLocationById(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!location)
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    if (location.userId.toString() !== userId)
      return res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: You do not have access to this location",
        });
    return res
      .status(200)
      .json({
        success: true,
        message: "Location retrieved successfully",
        data: location,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while getting location",
      });
  }
};

// Cập nhật location
export const updateLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { locationId } = req.params;
    const { name, description, area } = req.body;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(locationId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid location ID" });
    const location = await locationService.getLocationById(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!location)
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    if (location.userId.toString() !== userId)
      return res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: You do not have access to this location",
        });
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (area !== undefined) updateData.area = area;
    const updatedLocation = await locationService.updateLocation(
      new mongoose.Types.ObjectId(locationId),
      updateData
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Location updated successfully",
        data: updatedLocation,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while updating location",
      });
  }
};

// Xóa location
export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { locationId } = req.params;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(locationId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid location ID" });
    const location = await locationService.getLocationById(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!location)
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    if (location.userId.toString() !== userId)
      return res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: You do not have access to this location",
        });
    const result = await locationService.deleteLocation(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!result)
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete location" });
    return res
      .status(200)
      .json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while deleting location",
      });
  }
};
