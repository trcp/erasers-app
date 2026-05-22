local task = {
  task = {
    task_name = "restaurant",
    display_name = "Restaurant",
    description = "restaurant task",
    author = "erasers",
  },
  programs = {
    cartographer = {
      display_name = "Cartographer",
      description = "",
      command = {
        template = "roslaunch cartographer_toyota_hsr hsr_2d.launch",
        kill = "",
        variables = {},
      },
    },
    navigation = {
      display_name = "Navigation",
      description = "",
      command = {
        template = "roslaunch navigation_start navigation_cartographer.launch",
        kill = "",
        variables = {},
      },
    },
    xtion = {
      display_name = "Xtion",
      description = "",
      command = {
        template = "roslaunch erasers_xtion_republisher erasers_xtion_republisher.launch",
        kill = "",
        variables = {},
      },
    },
    vision = {
      display_name = "Vision",
      description = "",
      command = {
        template = "roslaunch erasers_vision erasersvisiondebug.launch",
        kill = "",
        variables = {},
      },
    },
    hmi = {
      display_name = "HMI",
      description = "",
      command = {
        template = "rosrun erasers_hmi_ros cli_node.py",
        kill = "",
        variables = {},
      },
    },
    restaurant = {
      display_name = "Restaurant",
      description = "",
      command = {
        template = "roslaunch robot_tasks restaurant_main.launch",
        kill = "",
        variables = {},
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
          { program = "cartographer" },
          { program = "navigation" },
          { program = "xtion" },
        },
      },
      {
        direction = "vertical",
        panes = {
          { program = "vision" },
          { program = "hmi" },
          { program = "restaurant" },
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
