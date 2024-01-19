import { Autocomplete, TextField, Button, Stack, Box } from "@mui/material";
import { useEffect } from "react";
import TaskTimer from "./TaskTimer";

//type options default
const accept_type: string = ["array", "array_input", "number", "str", "unixtime", "duration"];

export default function OptionVariables({ task_key, node_key, opt_key, index, default_variables, setFunc, optionVariables, nodeRunStatus }: { task_key: string, node_key: string, opt_key: string, index: number }) {

    if (!(task_key in optionVariables)) {
        optionVariables[task_key] = {};
    }
    if (!(node_key in optionVariables[task_key])) {
        optionVariables[task_key][node_key] = {};
    }

    if (!(opt_key in optionVariables[task_key][node_key])) { // if not key exsists
        optionVariables[task_key][node_key][opt_key] = default_variables[opt_key].default; // if type is enum its seted "en":Hello no en
    }

    const packOptionVariableData = (tk, nk, ok, value) => {
        optionVariables[tk][nk][ok] = value;
        setFunc({ ...optionVariables })
    };

    const resetValButtonClicked = (tk, nk, ok) => {
        // optionVariables[tk][nk][ok] = default_variables[ok].default;
        optionVariables[tk][nk][ok] = -1;
        setFunc({ ...optionVariables })
    }

    if (!accept_type.includes(default_variables[opt_key].type)) {
        return (
            <>
            </>
        )
    }

    if (default_variables[opt_key].type == "unixtime") {
        const d_value = optionVariables[task_key][node_key][opt_key]
        return (
            <>
                <Stack direction="row" alignItems="center">
                    <Box sx={{ p: 1 }}>
                        Start Time: {d_value}
                    </Box>
                    <Button onClick={(event) => (resetValButtonClicked(task_key, node_key, opt_key))}>
                        reset
                    </Button>
                </Stack>
            </>
        )
    }

    if (default_variables[opt_key].type == "duration") {
        const value = optionVariables[task_key][node_key][opt_key];
        console.log("value-> ", value)
        const d_value = default_variables[opt_key].default
        return (
            <>
                <Box sx={{ marginBottom: 3, p: 1 }}>
                    <Box sx={{ p: 1 }}>{opt_key}</Box>
                    <TaskTimer
                        defaultDuration={d_value}
                        optionVariables={optionVariables}
                        task_key={task_key}
                        node_key={node_key}
                        opt_key={opt_key}
                        setOptionFunc={setFunc}
                        nodeRunStatus={nodeRunStatus} />
                </Box>
            </>
        )

    }

    if (default_variables[opt_key].type == "array") {
        const d_value = optionVariables[task_key][node_key][opt_key];
        const options_list = default_variables[opt_key].options; //its need for crate list
        return (
            <>
                <Stack direction="row" alignItems="center">
                    <Autocomplete
                        sx={{ width: 300, p: 1 }}
                        disablePortal
                        id="combo-box-demo"
                        options={Object.values(options_list).map((v) => v)}
                        defaultValue={d_value}
                        inputValue={d_value}
                        renderInput={(params) => <TextField {...params} label={opt_key} />}
                        onInputChange={(event, value) => (packOptionVariableData(task_key, node_key, opt_key, value))}
                    />
                    <Box>
                        <Button onClick={(event) => (resetValButtonClicked(task_key, node_key, opt_key))}>
                            reset
                        </Button>
                    </Box>
                </Stack>
            </>
        )
    }

    if (default_variables[opt_key].type == "array_input") {
        const d_value = optionVariables[task_key][node_key][opt_key];
        const options_list = default_variables[opt_key].options;
        return (
            <>
                <Stack direction="row" alignItems="center">
                    <Autocomplete
                        sx={{ width: 300, p: 1 }}
                        id="free-solo-demo"
                        freeSolo
                        options={Object.values(options_list).map((v) => v)}
                        defaultValue={d_value}
                        inputValue={d_value}
                        renderInput={(params) => <TextField {...params} label={opt_key} />}
                        onInputChange={(event, value) => (packOptionVariableData(task_key, node_key, opt_key, value))}
                    />
                    <Box>
                        <Button onClick={(event) => (resetValButtonClicked(task_key, node_key, opt_key))}>
                            reset
                        </Button>
                    </Box>
                </Stack>
            </>
        )
    }


    if (default_variables[opt_key].type == "str") {
        const d_value = optionVariables[task_key][node_key][opt_key];
        return (
            <>
                <Stack direction="row" alignItems="center">
                    <TextField
                        required
                        sx={{ width: 300, p: 1 }}
                        id="outlined-required"
                        label={opt_key}
                        value={d_value}
                        defaultValue={d_value}
                        onChange={(event) => (packOptionVariableData(task_key, node_key, opt_key, event.target.value))}
                    />
                    <Box>
                        <Button onClick={(event) => (resetValButtonClicked(task_key, node_key, opt_key))}>
                            reset
                        </Button>
                    </Box>
                </Stack>
            </>
        )
    }

    if (default_variables[opt_key].type == "number") {
        const d_value = optionVariables[task_key][node_key][opt_key];

        return (
            <>
                <Stack direction="row" alignItems="center">

                    <TextField
                        required
                        sx={{ width: 300, p: 1 }}
                        id="outlined-required"
                        label={opt_key}
                        value={d_value}
                        defaultValue={d_value}
                        onChange={(event) => (packOptionVariableData(task_key, node_key, opt_key, event.target.value))}
                    />
                    <Box>
                        <Button onClick={(event) => (resetValButtonClicked(task_key, node_key, opt_key))}>
                            reset
                        </Button>
                    </Box>
                </Stack>
            </>
        )
    }

    return (
        <>
            <div>No Options</div>
        </>
    )
}