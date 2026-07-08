import { addBoss, addPlayer } from "./crud.js";
import { init, loadData, save } from "./main.js";
import { addMap, setMode } from "./rendering.js";
import {$,  data } from "./constants_data.js";


document.addEventListener("DOMContentLoaded", () => {
    Object.assign(data, loadData());
    init();
    window.TRPGDashboard = {
        setMode, addPlayer, addBoss, addMap, save, loadData, init
    };
});
