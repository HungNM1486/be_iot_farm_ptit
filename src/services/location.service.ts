import { ILocation } from "../models/location.model";
import Location from "../models/location.model";
import mongoose from "mongoose";

class LocationService {
  async createLocation(locationData: {
    name: string;
    description?: string;
    area?: string;
    location_code?: string;
    userId: mongoose.Types.ObjectId;
  }): Promise<ILocation> {
    try {
      // Tạo location_code nếu không được cung cấp
      if (!locationData.location_code) {
        const baseCode = locationData.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        const randomCode = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        locationData.location_code = `${baseCode}-${randomCode}`;
      }
      // Kiểm tra location_code đã tồn tại
      const existingLocation = await Location.findOne({
        location_code: locationData.location_code,
      });
      if (existingLocation) {
        throw new Error(
          `Location code "${locationData.location_code}" already exists`
        );
      }
      const location = new Location({
        ...locationData,
        created_at: new Date(),
        updated_at: new Date(),
      });
      return await location.save();
    } catch (error) {
      throw error;
    }
  }

  async getLocationByCode(locationCode: string): Promise<ILocation | null> {
    try {
      return await Location.findOne({ location_code: locationCode });
    } catch (error) {
      throw error;
    }
  }

  async getLocationsByUserId(
    userId: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    filter: any = {}
  ): Promise<{
    locations: ILocation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query = { userId, ...filter };
      const total = await Location.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      const locations = await Location.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return {
        locations,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw error;
    }
  }

  async getLocationById(
    locationId: mongoose.Types.ObjectId
  ): Promise<ILocation | null> {
    try {
      return await Location.findById(locationId);
    } catch (error) {
      throw error;
    }
  }

  async updateLocation(
    locationId: mongoose.Types.ObjectId,
    updateData: Partial<ILocation>
  ): Promise<ILocation | null> {
    try {
      return await Location.findByIdAndUpdate(
        locationId,
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

  async deleteLocation(locationId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const result = await Location.findByIdAndDelete(locationId);
      return result !== null;
    } catch (error) {
      throw error;
    }
  }
}

export default new LocationService();
