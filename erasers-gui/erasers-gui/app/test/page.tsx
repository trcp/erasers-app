'use client'

import { useState } from 'react';
import { Autocomplete, TextField, Button } from "@mui/material";

function ChildP({setFunc, iValue}) {

    const packValue = (v) => {
        setFunc(v)
    }

    const handleReset = (h) => {
        // resetボタンが押されたときにinputValueを変更する
        console.log("newinputvalue", h)
        setFunc(h);
    };
    return (
        <>
            <Autocomplete
                options={['Option 1', 'Option 2', 'Option 3']}
                id="free-solo-demo"
                freeSolo
                inputValue={iValue}
                defaultValue={"default value"}
                // onInputChange={(event, newInputValue) => setFunc(newInputValue)}
                onInputChange={(event, newInputValue) => packValue(newInputValue)}
                renderInput={(params) => (
                    <TextField {...params} label="Custom Input" variant="outlined" />
                )}
            />
            <Button variant="contained" color="secondary" onClick={(event) => { handleReset("hoge") }}>
                Reset
            </Button>
        </>)
}


export default function MyAutocomplete() {
    // const [inputValue, setInputValue] = useState({a:{"one":1, "two":2}, b:{"three":3, "four":4}});
    const [inputValue, setInputValue] = useState("");

    console.log('render')

    return (
        <div>
            <ChildP setFunc={setInputValue} iValue={inputValue}/>
        </div>
    );
};