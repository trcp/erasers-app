export const PROGRAMS_BY_PC = {
  "pc-1": [
    { id: "p1", pkg: "nav2_bringup",     file: "tb3_simulation_launch.py",  desc: "Nav2 ナビゲーションスタック起動",        category: "navigation",   args: { use_sim_time: "false", map: "/maps/warehouse.yaml" } },
    { id: "p2", pkg: "slam_toolbox",     file: "online_async_launch.py",    desc: "SLAM Toolbox オンライン非同期マッピング", category: "slam",         args: { slam_params_file: "/cfg/slam.yaml" } },
    { id: "p4", pkg: "rosbridge_server", file: "rosbridge_websocket.launch", desc: "WebSocket ブリッジサーバ",               category: "bridge",       args: { port: "9090" } },
    { id: "p6", pkg: "robot_state_pub",  file: "rsp.launch.py",             desc: "ロボットステートパブリッシャ",            category: "system",       args: { robot_description: "/urdf/robot.urdf" } },
    { id: "p9", pkg: "diff_drive_ctrl",  file: "controller.launch.py",      desc: "差動二輪コントローラ",                   category: "system",       args: { wheel_separation: "0.50" } },
  ],
  "pc-2": [
    { id: "p5",  pkg: "realsense_camera", file: "rs_launch.py",              desc: "Intel RealSense D435i 起動",             category: "sensor",       args: { camera_name: "front", enable_depth: "true" } },
    { id: "p10", pkg: "perception",       file: "yolo_detector.launch.py",   desc: "YOLO物体検出 (GPU)",                     category: "perception",   args: { model: "yolov8n", device: "cuda:0" } },
    { id: "p11", pkg: "perception",       file: "face_recognition.launch.py",desc: "顔認識 / 人物トラッキング",              category: "perception",   args: { gallery: "/data/faces" } },
    { id: "p3",  pkg: "robot_speech",     file: "tts_node.launch.py",        desc: "音声合成 (TTS) ノード",                  category: "speech",       args: { voice: "ja_neural_v2", rate: "1.0" } },
    { id: "p12", pkg: "robot_speech",     file: "asr_node.launch.py",        desc: "音声認識 (ASR) ノード",                  category: "speech",       args: { model: "whisper-large-v3", lang: "ja" } },
  ],
  "pc-3": [
    { id: "p7",  pkg: "teleop_twist",    file: "joy_teleop.launch.py",       desc: "ゲームパッドテレオプ",                   category: "teleop",       args: { joy_dev: "/dev/input/js0" } },
    { id: "p13", pkg: "rviz2",           file: "default.rviz",               desc: "RViz2 可視化ツール",                     category: "visualization",args: { config: "/cfg/default.rviz" } },
    { id: "p14", pkg: "foxglove_bridge", file: "foxglove_bridge_launch.xml",  desc: "Foxglove Studio ブリッジ",               category: "bridge",       args: { port: "8765" } },
    { id: "p8",  pkg: "moveit2",         file: "demo.launch.py",             desc: "MoveIt2 アームプランニング (シミュレータ)", category: "manipulation", args: { use_rviz: "true" } },
  ],
};

export const CATEGORY_LABELS = {
  navigation:    "ナビゲーション",
  slam:          "SLAM",
  speech:        "音声",
  bridge:        "ブリッジ",
  sensor:        "センサー",
  system:        "システム",
  teleop:        "テレオプ",
  manipulation:  "マニピュレーション",
  perception:    "認識",
  visualization: "可視化",
};
