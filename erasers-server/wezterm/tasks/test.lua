local task = {
  task = {
    task_name = "test",
    display_name = "Test",
    description = "",
    author = "erasers",
  },
  programs = {
    shell = {
      display_name = "Shell",
      description = "Run: rosrun robot_tasks gpsr.py",
      commands = {
        default = {
          template = "watch -n 0.5 ls",
          kill = "",
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
        docker = {
          template = "docker compose up -d roslaunch navigation_start navigation.launch",
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
    devit = {
      display_name = "DeViT",
      description = "",
      commands = {
        default = {
          template = "cd ~/erasers_ws/src/devit_ros && CATEGORY_SPACE=robocup2024.pth docker compose up devit_ros",
          kill = "cd ~/erasers_ws/src/devit_ros && docker compose down devit_ros",
          variables = {},
        },
      },
    },
    rtmo = {
      display_name = "RTMO",
      description = "",
      commands = {
        default = {
          template = "cd ~/erasers_ws/src/rtmo_ros && docker compose up rtmo_ros",
          kill = "cd ~/erasers_ws/src/rtmo_ros && docker compose down rtmo_ros",
          variables = {},
        },
      },
    },
  },
  -- direction: "horizontal"=上下分割, "vertical"=左右分割
  layout = {
    direction = "vertical",
    panes = {
      { program = "shell" },
      {
        direction = "horizontal",
        panes = {
          { program = "navigation" },
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
