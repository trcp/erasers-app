local task = {
  task = {
    task_name = "carry_my_luggage",
    display_name = "Carry My Luggage",
    description = "",
    author = "erasers",
  },
  programs = {
    carry = {
      display_name = "Carry",
      description = "",
      command = {
        template = "roslaunch robot_tasks carry.launch",
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
    cartographer = {
      display_name = "Cartographer",
      description = "",
      command = {
        template = "roslaunch cartographer_toyota_hsr hsr_2d.launch",
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
        template = "roslaunch erasers_vision erasersvision.launch",
        kill = "",
        variables = {},
      },
    },
    devit = {
      display_name = "DeViT",
      description = "",
      command = {
        template = "cd ~/erasers_ws/src/devit_ros && CATEGORY_SPACE=bags.pth docker compose up devit_ros",
        kill = "cd ~/erasers_ws/src/devit_ros && docker compose down devit_ros",
        variables = {},
      },
    },
    rtmo = {
      display_name = "RTMO",
      description = "",
      command = {
        template = "cd ~/erasers_ws/src/rtmo_ros && docker compose up rtmo_ros",
        kill = "cd ~/erasers_ws/src/rtmo_ros && docker compose down rtmo_ros",
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
          { program = "carry" },
          { program = "navigation" },
        },
      },
      {
        direction = "vertical",
        panes = {
          { program = "cartographer" },
          { program = "xtion" },
          { program = "vision" },
          { program = "devit" },
          { program = "rtmo" },
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
