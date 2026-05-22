local wezterm = require("wezterm")
local config = wezterm.config_builder()

-- ── Shared launch logic ────────────────────────────────────────────────────────

local lib = dofile(wezterm.home_dir .. "/erasers_ws/wezterm/lib.lua")
local launch_task = lib.launch_task

-- ── Task definitions ──────────────────────────────────────────────────────────

local task_dir = wezterm.home_dir .. "/erasers_ws/wezterm/tasks"

local function load_tasks()
  local tasks = {}
  local files = wezterm.glob(task_dir .. "/*.lua")
  for _, path in ipairs(files) do
    _G._ERASERS_TASK_CONTEXT = "library"
    local ok, task = pcall(dofile, path)
    _G._ERASERS_TASK_CONTEXT = nil
    if ok and task and task.task then
      tasks[task.task.task_name] = task
    else
      wezterm.log_error("Failed to load task: " .. path)
    end
  end
  return tasks
end

-- ── Auto-launch via ERASERS_TASK env var ──────────────────────────────────────

wezterm.on('gui-startup', function()
  local task_name = os.getenv("ERASERS_TASK")
  if task_name then
    local tasks = load_tasks()
    if tasks[task_name] then
      launch_task(tasks[task_name])
    else
      wezterm.log_error("ERASERS_TASK: task not found: " .. task_name)
    end
  end
end)

-- ── Key bindings ──────────────────────────────────────────────────────────────

config.keys = {
  {
    key = "l",
    mods = "CTRL|SHIFT",
    action = wezterm.action_callback(function(window, _pane)
      local tasks = load_tasks()
      local choices = {}
      for name, task in pairs(tasks) do
        table.insert(choices, {
          id = name,
          label = task.task.display_name .. " (" .. name .. ")",
        })
      end
      table.sort(choices, function(a, b) return a.label < b.label end)

      window:perform_action(
        wezterm.action.InputSelector({
          title = "Launch Task",
          choices = choices,
          fuzzy = true,
          action = wezterm.action_callback(function(_win, _pane, id, _label)
            if id then
              launch_task(tasks[id])
            end
          end),
        }),
        _pane
      )
    end),
  },
}

-- ── General settings ──────────────────────────────────────────────────────────

config.automatically_reload_config = true

return config
