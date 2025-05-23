// fix-duplicate-flatten.js
// Script để sửa lỗi xung đột giữa GlobalAveragePooling2D và Flatten

const fs = require("fs");
const path = require("path");

// Đường dẫn đến file model.json
const MODEL_DIR = path.join(__dirname, "tfjs_model");
const MODEL_JSON_PATH = path.join(MODEL_DIR, "model.json");
const OUTPUT_PATH = path.join(MODEL_DIR, "model_fixed2.json");

console.log(`Đang đọc file model.json từ: ${MODEL_JSON_PATH}`);

try {
  const modelJsonStr = fs.readFileSync(MODEL_JSON_PATH, "utf8");
  const modelJson = JSON.parse(modelJsonStr);

  console.log(
    "Đã đọc file model.json thành công. Đang sửa vấn đề GlobalAveragePooling2D và Flatten..."
  );

  if (
    modelJson.modelTopology &&
    modelJson.modelTopology.model_config &&
    modelJson.modelTopology.model_config.config &&
    modelJson.modelTopology.model_config.config.layers
  ) {
    const layers = modelJson.modelTopology.model_config.config.layers;

    // Tìm các lớp GlobalAveragePooling2D và Flatten
    const globalPoolingLayers = layers.filter(
      (l) => l.class_name === "GlobalAveragePooling2D"
    );
    const flattenLayers = layers.filter((l) => l.class_name === "Flatten");

    console.log(
      `Tìm thấy ${globalPoolingLayers.length} lớp GlobalAveragePooling2D và ${flattenLayers.length} lớp Flatten`
    );

    // Kiểm tra xem có chuỗi GlobalAveragePooling2D -> Flatten không
    if (globalPoolingLayers.length > 0 && flattenLayers.length > 0) {
      // Phương pháp 1: Thêm Reshape giữa GlobalAveragePooling2D và Flatten

      // Tìm vị trí của GlobalAveragePooling2D và Flatten trong mảng layers
      const poolingLayerIndex = layers.findIndex(
        (l) => l.class_name === "GlobalAveragePooling2D"
      );
      const flattenLayerIndex = layers.findIndex(
        (l) => l.class_name === "Flatten"
      );

      // Kiểm tra xem Flatten có ngay sau GlobalAveragePooling2D không
      if (flattenLayerIndex > poolingLayerIndex) {
        console.log(
          "Phát hiện chuỗi GlobalAveragePooling2D -> Flatten. Đang sửa mô hình..."
        );

        // Lấy thông tin về các lớp
        const poolingLayer = layers[poolingLayerIndex];
        const flattenLayer = layers[flattenLayerIndex];

        // Phương pháp 1: Sửa kết nối inbound để bỏ qua Flatten
        // if (flattenLayerIndex + 1 < layers.length) {
        //   const nextLayerAfterFlatten = layers[flattenLayerIndex + 1];

        //   console.log(
        //     `Đang thay đổi kết nối từ lớp ${nextLayerAfterFlatten.name} đến trực tiếp lớp ${poolingLayer.name}...`
        //   );

        //   // Thay đổi kết nối inbound của lớp sau Flatten để trỏ trực tiếp đến GlobalAveragePooling2D
        //   if (
        //     nextLayerAfterFlatten.inbound_nodes &&
        //     nextLayerAfterFlatten.inbound_nodes.length > 0
        //   ) {
        //     // Lưu ý: Trong phiên bản model.json đã được sửa, inbound_nodes có thể đã thay đổi thành mảng
        //     // Kiểm tra cả hai định dạng
        //     if (Array.isArray(nextLayerAfterFlatten.inbound_nodes[0])) {
        //       // Định dạng mảng sau khi đã sửa
        //       for (
        //         let i = 0;
        //         i < nextLayerAfterFlatten.inbound_nodes.length;
        //         i++
        //       ) {
        //         for (
        //           let j = 0;
        //           j < nextLayerAfterFlatten.inbound_nodes[i].length;
        //           j++
        //         ) {
        //           if (
        //             nextLayerAfterFlatten.inbound_nodes[i][j][0] ===
        //             flattenLayer.name
        //           ) {
        //             // Thay thế tên lớp Flatten bằng tên lớp GlobalAveragePooling2D
        //             nextLayerAfterFlatten.inbound_nodes[i][j][0] =
        //               poolingLayer.name;
        //           }
        //         }
        //       }
        //     } else {
        //       // Định dạng object gốc (nếu chưa được sửa)
        //       for (
        //         let i = 0;
        //         i < nextLayerAfterFlatten.inbound_nodes.length;
        //         i++
        //       ) {
        //         if (
        //           nextLayerAfterFlatten.inbound_nodes[i].args &&
        //           Array.isArray(nextLayerAfterFlatten.inbound_nodes[i].args)
        //         ) {
        //           for (
        //             let j = 0;
        //             j < nextLayerAfterFlatten.inbound_nodes[i].args.length;
        //             j++
        //           ) {
        //             const arg = nextLayerAfterFlatten.inbound_nodes[i].args[j];
        //             if (
        //               arg.class_name === "__keras_tensor__" &&
        //               arg.config &&
        //               arg.config.keras_history &&
        //               arg.config.keras_history[0] === flattenLayer.name
        //             ) {
        //               // Thay thế tên lớp Flatten bằng tên lớp GlobalAveragePooling2D
        //               arg.config.keras_history[0] = poolingLayer.name;
        //             }
        //           }
        //         }
        //       }
        //     }
        //   }
        // }

        // Phương pháp 2: Loại bỏ lớp Flatten hoàn toàn
        // (Lưu ý: Đây là phương pháp thay thế - chỉ sử dụng nếu phương pháp 1 không hiệu quả)
        console.log(`Đang loại bỏ lớp Flatten thừa: ${flattenLayer.name}...`);

        // Lấy tất cả các lớp trừ lớp Flatten
        const newLayers = layers.filter((l) => l.class_name !== "Flatten");

        // Cập nhật inbound_nodes của tất cả các lớp
        for (const layer of newLayers) {
          if (layer.inbound_nodes && layer.inbound_nodes.length > 0) {
            // Xử lý cho cả hai định dạng của inbound_nodes
            if (Array.isArray(layer.inbound_nodes[0])) {
              for (let i = 0; i < layer.inbound_nodes.length; i++) {
                for (let j = 0; j < layer.inbound_nodes[i].length; j++) {
                  if (layer.inbound_nodes[i][j][0] === flattenLayer.name) {
                    layer.inbound_nodes[i][j][0] = poolingLayer.name;
                  }
                }
              }
            } else {
              for (let i = 0; i < layer.inbound_nodes.length; i++) {
                if (
                  layer.inbound_nodes[i].args &&
                  Array.isArray(layer.inbound_nodes[i].args)
                ) {
                  for (let j = 0; j < layer.inbound_nodes[i].args.length; j++) {
                    const arg = layer.inbound_nodes[i].args[j];
                    if (
                      arg.class_name === "__keras_tensor__" &&
                      arg.config &&
                      arg.config.keras_history &&
                      arg.config.keras_history[0] === flattenLayer.name
                    ) {
                      arg.config.keras_history[0] = poolingLayer.name;
                    }
                  }
                }
              }
            }
          }
        }

        // Cập nhật danh sách layers trong model
        modelJson.modelTopology.model_config.config.layers = newLayers;
      }
    }

    // Lưu model đã sửa
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(modelJson, null, 2));
    console.log(`Đã lưu model đã sửa vào: ${OUTPUT_PATH}`);

    // Tạo bản sao lưu và thay thế file gốc
    const backupPath = `${MODEL_JSON_PATH}.backup2`;
    fs.copyFileSync(MODEL_JSON_PATH, backupPath);
    console.log(`Đã tạo bản sao lưu tại: ${backupPath}`);

    fs.copyFileSync(OUTPUT_PATH, MODEL_JSON_PATH);
    console.log(`Đã thay thế file gốc với phiên bản đã sửa.`);

    console.log("Hoàn tất! Bây giờ bạn có thể thử tải lại model.");
  } else {
    console.error("Cấu trúc file model.json không đúng định dạng mong đợi");
  }
} catch (error) {
  console.error("Lỗi khi xử lý file model.json:", error);
}
