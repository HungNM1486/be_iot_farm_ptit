import { Request, Response } from "express";
import mongoose from "mongoose";
import plantService from "../services/plant.service";
import locationService from "../services/location.service";
import path from "path";
import fs from "fs";
import { log } from "console";

export const createPlant = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { locationId } = req.params;
    const { name, img, status, note, startdate, plantingDate, address } =
      req.body;

    console.log("req.body:", req.body);
    console.log("req.params:", req.params);

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(locationId))
      return res
        .status(400)
        .json({ success: false, message: "Invali  d location ID" });
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Plant name is required" });

    // Kiểm tra quyền truy cập location
    const location = await locationService.getLocationById(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!location)
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    if (location.userId.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this location",
      });

    // Tạo cây trồng mới
    const plant = await plantService.createPlant({
      name,
      img,
      address,
      status: status || "Đang tốt",
      note,
      startdate: startdate ? new Date(startdate) : new Date(),
      plantingDate: plantingDate ? new Date(plantingDate) : null,
      locationId: new mongoose.Types.ObjectId(locationId),
    });

    return res.status(201).json({
      success: true,
      message: "Plant created successfully",
      data: plant,
    });
  } catch (error) {
    console.error(error); // Thêm dòng này
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while creating plant",
    });
  }
};

export const getPlantsByLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { locationId } = req.params;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(locationId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid location ID" });

    console.log("thêm cây");
    // Kiểm tra quyền truy cập location
    const location = await locationService.getLocationById(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!location)
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    if (location.userId.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this location",
      });
    // Phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search)
      filter.name = { $regex: req.query.search, $options: "i" };
    const result = await plantService.getPlantsByLocationId(
      new mongoose.Types.ObjectId(locationId),
      page,
      limit,
      filter
    );
    return res.status(200).json({
      success: true,
      message: "Plants retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while getting plants",
    });
  }
};

export const getPlantById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { plantId } = req.params;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(plantId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid plant ID" });
    const plant = await plantService.getPlantById(
      new mongoose.Types.ObjectId(plantId)
    );
    if (!plant)
      return res
        .status(404)
        .json({ success: false, message: "Plant not found" });
    // Kiểm tra quyền truy cập location qua plant
    const location = await locationService.getLocationById(plant.locationId);
    if (!location || location.userId.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this plant",
      });
    return res.status(200).json({
      success: true,
      message: "Plant retrieved successfully",
      data: plant,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while getting plant",
    });
  }
};

export const updatePlant = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { plantId } = req.params;
    const { name, status, note, removeImage, plantingDate, address } = req.body;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(plantId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid plant ID" });
    const existingPlant = await plantService.getPlantById(
      new mongoose.Types.ObjectId(plantId)
    );
    if (!existingPlant)
      return res
        .status(404)
        .json({ success: false, message: "Plant not found" });
    // Kiểm tra quyền truy cập location qua plant
    const location = await locationService.getLocationById(
      existingPlant.locationId
    );
    if (!location || location.userId.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this plant",
      });
    const updateData: any = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (note !== undefined) updateData.note = note;
    if (address !== undefined) updateData.address = address;
    if (plantingDate !== undefined)
      updateData.plantingDate = plantingDate ? new Date(plantingDate) : null;
    // Xử lý cập nhật ảnh nếu có
    if (removeImage === "true" || removeImage === true) {
      if (existingPlant.img && existingPlant.img !== "") {
        try {
          const imagePath = path.join(
            __dirname,
            "../../",
            existingPlant.img.substring(1)
          );
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (error) {
          /* ignore */
        }
      }
      updateData.img = "";
    } else if (req.file) {
      if (existingPlant.img && existingPlant.img !== "") {
        try {
          const imagePath = path.join(
            __dirname,
            "../../",
            existingPlant.img.substring(1)
          );
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (error) {
          /* ignore */
        }
      }
      updateData.img = `/uploads/plants/${req.file.filename}`;
    }
    if (Object.keys(updateData).length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No data to update" });
    updateData.updated_at = new Date();
    const updatedPlant = await plantService.updatePlant(
      new mongoose.Types.ObjectId(plantId),
      updateData
    );
    return res.status(200).json({
      success: true,
      message: "Plant updated successfully",
      data: updatedPlant,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while updating plant",
    });
  }
};

export const deletePlant = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { plantId } = req.params;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(plantId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid plant ID" });
    const existingPlant = await plantService.getPlantById(
      new mongoose.Types.ObjectId(plantId)
    );
    if (!existingPlant)
      return res
        .status(404)
        .json({ success: false, message: "Plant not found" });
    const location = await locationService.getLocationById(
      existingPlant.locationId
    );
    if (!location || location.userId.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this plant",
      });
    const result = await plantService.deletePlant(
      new mongoose.Types.ObjectId(plantId)
    );
    if (!result)
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete plant" });
    return res
      .status(200)
      .json({ success: true, message: "Plant deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while deleting plant",
    });
  }
};

export const getPlantsByUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search)
      filter.name = { $regex: req.query.search, $options: "i" };
    const result = await plantService.getPlantsByUserId(
      new mongoose.Types.ObjectId(userId),
      page,
      limit,
      filter
    );
    return res.status(200).json({
      success: true,
      message: "Plants of user retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while getting user's plants",
    });
  }
};
