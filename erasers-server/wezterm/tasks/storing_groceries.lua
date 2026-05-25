local task = {
  task = {
    task_name = "storing_groceries",
    display_name = "Storing Groceries",
    description = "",
    author = "erasers",
  },
  programs = {
    storing_groceries = {
      display_name = "Storing Groceries",
      description = "",
      commands = {
        default = {
          template = "rosrun robot_tasks storing_groceries.py",
          kill = "",
          variables = {},
        },
      },
    },
    shell = {
      display_name = "Shell",
      description = "Interactive shell",
      commands = {
        default = {
          template = "",
          kill = "",
          variables = {},
        },
      },
    },
    vision = {
      display_name = "Vision",
      description = "",
      commands = {
        default = {
          template = "roslaunch erasers_vision erasersvisiondebug.launch",
          kill = "",
          variables = {},
        },
      },
    },
    xtion = {
      display_name = "Xtion",
      description = "",
      commands = {
        default = {
          template = "roslaunch erasers_xtion_republisher erasers_xtion_republisher.launch",
          kill = "",
          variables = {},
        },
      },
    },
    devit = {
      display_name = "DeViT",
      description = "",
      commands = {
        default = {
          template = "cd ~/erasers_ws/src/devit_ros && CATEGORY_SPACE=robocup2025-jo.pth docker compose up devit_ros",
          kill = "cd ~/erasers_ws/src/devit_ros && docker compose down devit_ros",
          variables = {},
        },
      },
    },
    yolo = {
      display_name = "Yolo",
      description = "",
      commands = {
        default = {
          template = "cd ~/erasers_ws/src/yolo-ros-docker && docker compose up",
          kill = "cd ~/erasers_ws/src/yolo-ros-docker && docker compose down",
          variables = {},
        },
      },
    },
    navigation = {
      display_name = "Navigation",
      description = "",
      commands = {
        default = {
          template = "roslaunch navigation_start navigation.launch",
          kill = "",
          variables = {},
        },
      },
    },
  },
  -- direction: "horizontal"=上下分割, "vertical"=左右分割
  layout = {
    direction = "horizontal",
    panes = {
      {
        direction = "vertical",
        panes = {
          { program = "storing_groceries" },
          { program = "shell" },
          { program = "vision" },
          { program = "xtion" },
        },
      },
      {
        direction = "vertical",
        panes = {
          { program = "devit" },
          { program = "yolo" },
          { program = "navigation" },
        },
      },
    },
  },
}

-- Standalone wezterm config support
-- When loaded directly via `wezterm --config-file <this file>`, auto-launches
-- this task. When dofile'd from wezterm.lua (_ERASERS_TASK_CONTEXT="library"),
-- returns the task data table as usual.
local ok, wezterm = pcall(require, "wezterm")
if ok and _G._ERASERS_TASK_CONTEXT ~= "library" then
  local lib = dofile(wezterm.home_dir .. "/erasers_ws/wezterm/lib.lua")
  local config = wezterm.config_builder()
  config.automatically_reload_config = true
  wezterm.on('gui-startup', function()
    lib.launch_task(task)
  end)
  return config
end

return task
