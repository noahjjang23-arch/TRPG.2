import {$,  COMMON_STATS, STAT_LABELS } from "./constants_data.js";

export function buildStatInputs() {
  [
    ["playerStats", "player"], ["npcStats", "npc"], ["bossStats", "boss"], ["materialStats", "material"], ["enchantStats", "enchant"], ["equipmentStats", "equipment"], ["classStats", "class"]
  ].forEach(([boxId, prefix]) => {
    const box = $(boxId); if (!box) return; box.innerHTML = "";
    COMMON_STATS.forEach(stat => box.insertAdjacentHTML("beforeend", `<input id="${prefix}${stat}" type="number" placeholder="${STAT_LABELS[stat]}" />`));
  });
  ["conditionStat", "skillStat", "checkStatSelect", "enchantDebuff", "fumbleStat"].forEach(fillStatSelect);
}

export function fillStatSelect(id) {
  const select = $(id); if (!select) return; select.innerHTML = "";
  if (id === "enchantDebuff") {
    const none = document.createElement("option"); none.value = ""; none.textContent = "디버프 없음"; select.appendChild(none);
  }
  COMMON_STATS.forEach(stat => {
    const opt = document.createElement("option"); opt.value = stat; opt.textContent = STAT_LABELS[stat]; select.appendChild(opt);
  });
}

