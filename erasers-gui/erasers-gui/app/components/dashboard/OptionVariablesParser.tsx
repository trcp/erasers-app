import { Autocomplete, TextField, Button, Box, Typography } from "@mui/material";
import TaskTimer from "./TaskTimer";

const accept_type: string[] = ["array", "array_input", "number", "str", "unixtime", "duration"];

function OptionRow({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {children}
        </Box>
    );
}

export default function OptionVariables({ task_key, node_key, opt_key, index, default_variables, setFunc, optionVariables, nodeRunStatus }: { task_key: string, node_key: string, opt_key: string, index: number, default_variables: any, setFunc: any, optionVariables: any, nodeRunStatus: any }) {

    if (!(task_key in optionVariables)) {
        optionVariables[task_key] = {};
    }
    if (!(node_key in optionVariables[task_key])) {
        optionVariables[task_key][node_key] = {};
    }

    if (!(opt_key in optionVariables[task_key][node_key])) {
        optionVariables[task_key][node_key][opt_key] = default_variables[opt_key].default;
    }

    const packOptionVariableData = (tk, nk, ok, value) => {
        optionVariables[tk][nk][ok] = value;
        setFunc({ ...optionVariables })
    };

    const resetValButtonClicked = (tk, nk, ok) => {
        optionVariables[tk][nk][ok] = -1;
        setFunc({ ...optionVariables })
    }

    if (!accept_type.includes(default_variables[opt_key].type)) {
        return <></>;
    }

    if (default_variables[opt_key].type == "unixtime") {
        const d_value = optionVariables[task_key][node_key][opt_key]
        return (
            <OptionRow>
                <TextField
                    size="small"
                    sx={{ width: 220 }}
                    id={`${task_key}-${node_key}-${opt_key}`}
                    label={opt_key}
                    value={d_value}
                    InputProps={{ readOnly: true }}
                />
                <Button size="small" variant="text" color="inherit" onClick={() => resetValButtonClicked(task_key, node_key, opt_key)}>
                    Reset
                </Button>
            </OptionRow>
        )
    }

    if (default_variables[opt_key].type == "duration") {
        const d_value = default_variables[opt_key].default
        return (
            <Box component="fieldset" sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                mb: 1.5,
                display: 'inline-block',
            }}>
                <Box component="legend" sx={{ fontSize: '0.75rem', color: 'text.secondary', px: 0.5 }}>
                    {opt_key}
                </Box>
                <TaskTimer
                    defaultDuration={d_value}
                    optionVariables={optionVariables}
                    task_key={task_key}
                    node_key={node_key}
                    opt_key={opt_key}
                    setOptionFunc={setFunc}
                    nodeRunStatus={nodeRunStatus} />
            </Box>
        )
    }

    if (default_variables[opt_key].type == "array") {
        const d_value = optionVariables[task_key][node_key][opt_key];
        const options_list = default_variables[opt_key].options;
        return (
            <OptionRow>
                <Autocomplete
                    sx={{ width: 220 }}
                    size="small"
                    disablePortal
                    id={`${task_key}-${node_key}-${opt_key}`}
                    options={Object.values(options_list).map((v) => v as string)}
                    defaultValue={d_value}
                    inputValue={d_value}
                    renderInput={(params) => <TextField {...params} label={opt_key} />}
                    onInputChange={(_event, value) => packOptionVariableData(task_key, node_key, opt_key, value)}
                />
                <Button size="small" variant="text" color="inherit" onClick={() => resetValButtonClicked(task_key, node_key, opt_key)}>
                    Reset
                </Button>
            </OptionRow>
        )
    }

    if (default_variables[opt_key].type == "array_input") {
        const d_value = optionVariables[task_key][node_key][opt_key];
        const options_list = default_variables[opt_key].options;
        return (
            <OptionRow>
                <Autocomplete
                    sx={{ width: 220 }}
                    size="small"
                    id={`${task_key}-${node_key}-${opt_key}`}
                    freeSolo
                    options={Object.values(options_list).map((v) => v as string)}
                    defaultValue={d_value}
                    inputValue={d_value}
                    renderInput={(params) => <TextField {...params} label={opt_key} />}
                    onInputChange={(_event, value) => packOptionVariableData(task_key, node_key, opt_key, value)}
                />
                <Button size="small" variant="text" color="inherit" onClick={() => resetValButtonClicked(task_key, node_key, opt_key)}>
                    Reset
                </Button>
            </OptionRow>
        )
    }

    if (default_variables[opt_key].type == "str") {
        const d_value = optionVariables[task_key][node_key][opt_key];
        return (
            <OptionRow>
                <TextField
                    required
                    size="small"
                    sx={{ width: 220 }}
                    id={`${task_key}-${node_key}-${opt_key}`}
                    label={opt_key}
                    value={d_value}
                    defaultValue={d_value}
                    onChange={(event) => packOptionVariableData(task_key, node_key, opt_key, event.target.value)}
                />
                <Button size="small" variant="text" color="inherit" onClick={() => resetValButtonClicked(task_key, node_key, opt_key)}>
                    Reset
                </Button>
            </OptionRow>
        )
    }

    if (default_variables[opt_key].type == "number") {
        const d_value = optionVariables[task_key][node_key][opt_key];
        return (
            <OptionRow>
                <TextField
                    required
                    size="small"
                    sx={{ width: 220 }}
                    id={`${task_key}-${node_key}-${opt_key}`}
                    label={opt_key}
                    value={d_value}
                    defaultValue={d_value}
                    onChange={(event) => packOptionVariableData(task_key, node_key, opt_key, event.target.value)}
                />
                <Button size="small" variant="text" color="inherit" onClick={() => resetValButtonClicked(task_key, node_key, opt_key)}>
                    Reset
                </Button>
            </OptionRow>
        )
    }

    return <><div>No Options</div></>;
}
