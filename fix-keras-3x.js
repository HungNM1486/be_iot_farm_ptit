const fs = require("fs");
const path = require("path");

const MODEL_DIR = path.join(__dirname, "tfjs_model");
const MODEL_JSON_PATH = path.join(MODEL_DIR, "model.json");
const OUTPUT_PATH = path.join(MODEL_DIR, "model_fixed.json");

console.log(`Đang đọc file model.json từ: ${MODEL_JSON_PATH}`);

try {
  const modelJsonStr = fs.readFileSync(MODEL_JSON_PATH, "utf8");
  const modelJson = JSON.parse(modelJsonStr);

  console.log("Đã đọc file model.json thành công. Bắt đầu sửa cấu trúc...");

  function fixInputLayer(layers) {
    layers.forEach((layer) => {
      if (layer.class_name === "InputLayer" && layer.config) {
        if (layer.config.batch_shape && !layer.config.batch_input_shape) {
          console.log("Đang sửa batch_shape thành batch_input_shape...");
          layer.config.batch_input_shape = layer.config.batch_shape;
          delete layer.config.batch_shape;
        }
      }
    });
    return layers;
  }

  // 2. Đơn giản hóa inbound_nodes
  function fixInboundNodes(layers) {
    layers.forEach((layer) => {
      if (layer.inbound_nodes && Array.isArray(layer.inbound_nodes)) {
        const simplifiedNodes = [];

        for (const node of layer.inbound_nodes) {
          if (node.args && Array.isArray(node.args)) {
            const connectionGroup = [];

            for (const arg of node.args) {
              if (
                arg.class_name === "__keras_tensor__" &&
                arg.config &&
                arg.config.keras_history
              ) {
                // Format [source_layer_name, source_output_index, destination_input_index, {}]
                connectionGroup.push([
                  arg.config.keras_history[0], // source layer name
                  arg.config.keras_history[1], // source output index
                  arg.config.keras_history[2], // destination input index
                  {}, // empty kwargs object
                ]);
              }
            }

            if (connectionGroup.length > 0) {
              simplifiedNodes.push(connectionGroup);
            }
          }
        }

        console.log(`Đang đơn giản hóa inbound_nodes cho lớp ${layer.name}...`);
        layer.inbound_nodes = simplifiedNodes;
      }
    });
    return layers;
  }

  // 3. Đơn giản hóa cấu trúc keras_version
  function simplifyKerasVersion(modelTopology) {
    if (typeof modelTopology.keras_version === "object") {
      console.log("Đang đơn giản hóa keras_version...");
      modelTopology.keras_version = "2.12.0"; // Set to a version TensorFlow.js understands
    }
    return modelTopology;
  }

  // 4. Đơn giản hóa dtype trong các lớp
  function fixDTypes(layers) {
    layers.forEach((layer) => {
      if (
        layer.config &&
        layer.config.dtype &&
        typeof layer.config.dtype === "object"
      ) {
        console.log(`Đang đơn giản hóa dtype cho lớp ${layer.name}...`);
        layer.config.dtype = "float32";
      }
    });
    return layers;
  }

  // Áp dụng các sửa đổi nếu cấu trúc đúng
  if (
    modelJson.modelTopology &&
    modelJson.modelTopology.model_config &&
    modelJson.modelTopology.model_config.config &&
    modelJson.modelTopology.model_config.config.layers
  ) {
    // Sửa đổi mô hình
    modelJson.modelTopology = simplifyKerasVersion(modelJson.modelTopology);
    modelJson.modelTopology.model_config.config.layers = fixInputLayer(
      modelJson.modelTopology.model_config.config.layers
    );
    modelJson.modelTopology.model_config.config.layers = fixDTypes(
      modelJson.modelTopology.model_config.config.layers
    );
    modelJson.modelTopology.model_config.config.layers = fixInboundNodes(
      modelJson.modelTopology.model_config.config.layers
    );

    // Lưu file đã sửa
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(modelJson, null, 2));
    console.log(`Đã sửa thành công và lưu vào: ${OUTPUT_PATH}`);

    // Tạo bản sao lưu file gốc
    const backupPath = `${MODEL_JSON_PATH}.backup`;
    fs.copyFileSync(MODEL_JSON_PATH, backupPath);
    console.log(`Đã tạo bản sao lưu tại: ${backupPath}`);

    // Thay thế file gốc bằng file đã sửa
    fs.copyFileSync(OUTPUT_PATH, MODEL_JSON_PATH);
    console.log(`Đã thay thế file gốc bằng file đã sửa.`);

    console.log("Hoàn tất! Bây giờ bạn có thể thử tải model với TensorFlow.js");
  } else {
    console.error(
      "Lỗi: Cấu trúc file model.json không khớp với định dạng mong đợi"
    );
  }
} catch (error) {
  console.error("Lỗi khi xử lý file model.json:", error);
}
