local task = {
  task = {
    task_name = "tidyup",
    display_name = "Tidyup",
    description = "Copied Preset From HSR_GUI",
    author = "erasers",
  },
  programs = {
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
    vision = {
      display_name = "Vision",
      description = "",
      commands = {
        default = {
          template = "roslaunch erasers_vision erasersvision.launch",
          kill = "",
          variables = {},
        },
      },
    },
    yolo = {
      display_name = "Yolo",
      description = "Object detection and recognition",
      commands = {
        default = {
          template = "docker compose -f /home/roboworks/erasers_ws_fix/src/vision/yolo-ros-docker/docker-compose.yml up",
          kill = "docker compose -f /home/roboworks/erasers_ws_fix/src/vision/yolo-ros-docker/docker-compose.yml down",
          variables = {
            home = { type = "env", key = "HOME" },
          },
        },
      },
    },
    tidyup = {
      display_name = "Tidyup",
      description = "",
      commands = {
        default = {
          template = "roslaunch robot_tasks tidyup.launch start_time:=${start_time} task1_time:=${task1_time} start_state:=${start_state} search_location:=${search_location}",
          kill = "",
          variables = {
            start_time  = { type = "unixtime", default = -1 },
            task1_time  = { type = "duration", default = 900 },
            start_state = { type = "array", options = {"FULLTEST","TASK1","TASK2A","TASK2B","TASKBOSS"}, default = "FULLTEST" },
            search_location = { type = "array", options = {"0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","90","91"}, default = "0" },
          },
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
          { program = "navigation" },
          { program = "vision" },
        },
      },
      {
        direction = "vertical",
        panes = {
          { program = "yolo" },
          { program = "tidyup" },
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
