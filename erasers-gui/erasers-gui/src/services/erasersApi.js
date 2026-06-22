const SERVER_PORT = 3001

export function getServerUrl(pc) {
  return `http://${pc.host}:${SERVER_PORT}`
}

export function flattenTasks(data) {
  return Object.entries(data).flatMap(([taskName, entry]) =>
    Object.entries(entry.programs).map(([nodeName, node]) => {
      const defaultKey = node.default_command || Object.keys(node.commands)[0]
      const defaultCmd = node.commands[defaultKey] || {}
      return {
        id: `${taskName}/${nodeName}`,
        taskName,
        nodeName,
        displayName: node.display_name,
        taskDisplayName: entry.task.display_name,
        description: node.description,
        commands: node.commands,
        defaultCommandKey: defaultKey,
        commandTemplate: defaultCmd.template || "",
        variables: defaultCmd.variables || {},
      }
    })
  )
}

export async function fetchTasks(baseUrl) {
  const res = await fetch(`${baseUrl}/get_task`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return flattenTasks(data)
}

export async function runTask(baseUrl, taskName, nodeName, variables = {}, commandKey, commandTemplate) {
  const body = { ...variables }
  if (commandKey) body.__command_key__ = commandKey
  if (commandTemplate !== undefined) body.__command_template__ = commandTemplate
  const res = await fetch(`${baseUrl}/run_task/${taskName}/${nodeName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function killTask(baseUrl, taskName, nodeName) {
  const res = await fetch(`${baseUrl}/kill_task/${taskName}/${nodeName}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getTaskStatus(baseUrl, taskName, nodeName) {
  const res = await fetch(`${baseUrl}/task_running/${taskName}/${nodeName}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getXml(baseUrl, path) {
  const res = await fetch(`${baseUrl}/get_xml?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export async function saveXml(baseUrl, path, content) {
  const res = await fetch(`${baseUrl}/save_xml?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchNetworkInterfaces(baseUrl) {
  const res = await fetch(`${baseUrl}/get_network_interfaces`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchExecutionConfig(baseUrl) {
  const res = await fetch(`${baseUrl}/get_execution_config`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function saveExecutionConfig(baseUrl, config) {
  const res = await fetch(`${baseUrl}/set_execution_config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
