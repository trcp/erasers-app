-- Shared wezterm task-launcher logic
-- Used by wezterm.lua and standalone task files.
local wezterm = require("wezterm")
local M = {}

-- Substitute default variable values into a command template
function M.substitute_defaults(template, variables)
  local cmd = template
  for k, v in pairs(variables or {}) do
    if v.default ~= nil then
      cmd = cmd:gsub("%${" .. k .. "}", tostring(v.default))
    end
  end
  return cmd
end

-- Recursively split panes according to the layout node.
-- pane_cmds: table mapping pane object → command string (populated here)
function M.build_layout(parent_pane, node, task, pane_cmds)
  if node.program then
    local prog = task.programs[node.program]
    if prog then
      local key = prog.default_command or next(prog.commands)
      local entry = key and prog.commands[key]
      if entry and entry.template ~= "" then
        local cmd = M.substitute_defaults(entry.template, entry.variables)
        pane_cmds[parent_pane] = "hsrb_mode && " .. cmd
      end
    end
    return
  end

  -- direction: "horizontal" → split toward Bottom (上下)
  --            "vertical"   → split toward Right  (左右)
  local dir = (node.direction == "horizontal") and "Bottom" or "Right"
  local n = #node.panes
  local panes = { parent_pane }

  for i = 2, n do
    local fraction = (n - i + 1) / (n - i + 2)
    local new_pane = panes[#panes]:split({ direction = dir, size = fraction })
    table.insert(panes, new_pane)
  end

  for i, child in ipairs(node.panes) do
    M.build_layout(panes[i], child, task, pane_cmds)
  end
end

-- Launch a task in a new WezTerm window
function M.launch_task(task)
  local pane_cmds = {}
  local _, root_pane, _ = wezterm.mux.spawn_window({
    cwd = wezterm.home_dir,
  })

  M.build_layout(root_pane, task.layout, task, pane_cmds)

  wezterm.time.call_after(0.5, function()
    for pane, cmd in pairs(pane_cmds) do
      pane:send_text(cmd .. "\n")
    end
  end)
end

return M
