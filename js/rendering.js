import { fillRuntimeShopSelects, fillShopSelects, fillTreeSkillSelect, fillWorldEventConditionSelect, renderAccessStatus, renderAdvancedSystems, renderCreationSystem, renderEncounterList, renderFactionList, renderFactionView, renderRuntimeSkillSelect, renderSaveSlotList, renderShopList, renderSkillTreeList, renderStandalonePlayerView, renderTurns, renderUpgradeRuleList, renderWorldEventList, renderWorldState, requestMasterAccess, showToast } from "./combat.js";
import { renderActiveBosses, renderActiveNpcs, renderBossList, renderEnchantList, renderEquipmentList, renderFumbleList, renderItemList, renderMaterialList, renderNpcJobConfigList, renderNpcList, renderPlayerCards, renderPlayerList } from "./crud.js";
import { actorValue, effectName, esc, fillForgeSelects, findActor, getAllActors, jobTitle, renderForgeConfigList, renderLog, skillName, typeName } from "./creation.js";
import {appState, $,  COMMON_STATS, STAT_LABELS, data } from "./constants_data.js";
import { makeId, save } from "./main.js";

export function setMode(mode) {
  if (mode === "master" && data.access.role !== "master") {
    requestMasterAccess();
    return;
  }
  if (mode === "game" && data.access.role !== "master") {
    showToast("마스터 권한이 필요합니다.");
    return;
  }
  if (mode === "mode") {
    data.access.role = "none";
  }
  data.mode = mode;
  save();
  renderAll();
  window.scrollTo(0, 0);
}

export function renderAll() {
  $("modeScreen").classList.toggle("hidden", data.mode !== "mode");
  $("masterScreen").classList.toggle("hidden", !(data.mode === "master" && data.access.role === "master"));
  $("gameScreen").classList.toggle("hidden", !(data.mode === "game" && data.access.role === "master"));
  $("playerScreen")?.classList.toggle("hidden", !(data.mode === "player" && data.access.role === "player"));
  renderSelects();
  renderLists();
  renderGame();
  renderAccessStatus();
  if (data.mode === "player") renderStandalonePlayerView();
  renderAdvancedSystems();
  renderCreationSystem();
}

export function renderSelects() {
  fillConditionSelects();
  fillSkillOwnerSelect();
  fillActorSelects();
  fillMapSelect();
  fillBossSelect();
  fillNpcSelect();
  fillMaterialSelect();
  fillEnchantSelect();
  fillSkillSelectForEnchant();
  fillFumbleSelect();
  fillShopSelects();
  fillWorldEventConditionSelect();
  fillTreeSkillSelect();
  fillRuntimeShopSelects();
  fillForgeSelects();
}

export function fillConditionSelects() {
  ["mapConditionSelect", "skillCondition", "runtimeConditionSelect", "itemCondition"].forEach(id => {
    const s = $(id); if (!s) return; s.innerHTML = `<option value="">선택 없음</option>`;
    data.conditions.forEach(c => s.add(new Option(c.name, c.id)));
  });
}
export function fillSkillOwnerSelect() { const s = $("skillOwner"); if (!s) return; s.innerHTML = ""; getAllActors().forEach(a => s.add(new Option(`[${typeName(a.type)}] ${a.name}`, actorValue(a.type, a.id)))); }
export function fillActorSelects() {
  ["checkActorSelect", "checkTargetSelect", "turnActorSelect"].forEach(id => {
    const s = $(id); if (!s) return; const prev = s.value; s.innerHTML = "";
    getAllActors().forEach(a => s.add(new Option(`[${typeName(a.type)}] ${a.name}`, actorValue(a.type, a.id))));
    if (prev) s.value = prev;
  });
  renderRuntimeSkillSelect();
}
export function fillMapSelect() { const s = $("mapSelect"); if (!s) return; s.innerHTML = ""; data.maps.forEach(m => s.add(new Option(m.name, m.id))); }
export function fillBossSelect() { const s = $("bossSelect"); if (!s) return; s.innerHTML = ""; data.bosses.forEach(b => s.add(new Option(b.name, b.id))); }
export function fillNpcSelect() { const s = $("npcSelect"); if (!s) return; s.innerHTML = ""; data.npcs.forEach(n => s.add(new Option(`${n.name} / ${jobTitle(n.job)}`, n.id))); }
export function fillMaterialSelect() { const s = $("equipmentMaterial"); if (!s) return; s.innerHTML = `<option value="">소재 없음</option>`; data.materials.forEach(m => s.add(new Option(m.name, m.id))); }
export function fillEnchantSelect() { const s = $("equipmentEnchant"); if (!s) return; s.innerHTML = `<option value="">인챈트 없음</option>`; data.enchants.forEach(e => s.add(new Option(e.name, e.id))); }
export function fillSkillSelectForEnchant() { const s = $("enchantSkill"); if (!s) return; s.innerHTML = `<option value="">추가 스킬 없음</option>`; data.skills.forEach(sk => s.add(new Option(sk.name, sk.id))); }
export function fillFumbleSelect() { const s = $("bossFumbleSelect"); if (!s) return; s.innerHTML = ""; data.fumbles.forEach(f => s.add(new Option(f.name, f.id))); }

export function renderLists() {
  renderMapList(); renderConditionList(); renderSkillList(); renderPlayerList(); renderNpcList(); renderNpcJobConfigList(); renderBossList(); renderMaterialList(); renderEnchantList(); renderEquipmentList(); renderItemList(); renderFumbleList(); renderShopList(); renderUpgradeRuleList(); renderWorldEventList(); renderEncounterList(); renderFactionList(); renderSkillTreeList(); renderSaveSlotList(); renderForgeConfigList();
}

export function renderGame() {
  renderMapView(); renderActiveBosses(); renderActiveNpcs(); renderPlayerCards(); renderTurns(); renderWorldState(); renderFactionView(); renderLog();
}

export function readImage(e, cb) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = ev => cb(ev.target.result); reader.readAsDataURL(file);
}

export function readStats(prefix) {
  const o = {}; COMMON_STATS.forEach(stat => o[stat] = Number($(`${prefix}${stat}`)?.value || 0)); return o;
}
export function clearStats(prefix) { COMMON_STATS.forEach(stat => { const el = $(`${prefix}${stat}`); if (el) el.value = ""; }); }
export function setStats(prefix, stats) { COMMON_STATS.forEach(stat => { const el = $(`${prefix}${stat}`); if (el) el.value = stats?.[stat] ?? 0; }); }
export function clearInputs(ids) { ids.forEach(id => { const el = $(id); if (el) el.value = ""; }); }

export function addTempMapEffect() {
  const cid = $("mapConditionSelect").value; if (!cid) return alert("상태이상을 선택하세요.");
  const c = data.conditions.find(x => x.id === cid);
  appState.tempMapEffects.push({ conditionId: cid, everyTurns: Number($("mapEveryTurns").value || 1), duration: Number($("mapConditionDuration").value || c.duration || 1) });
  renderTempMapEffects();
}
export function renderTempMapEffects() {
  const box = $("mapEffectPreview"); box.innerHTML = "";
  appState.tempMapEffects.forEach((e, i) => { const c = data.conditions.find(x => x.id === e.conditionId); box.insertAdjacentHTML("beforeend", `<div class="mini-item">${c?.name || "-"} / ${e.everyTurns}턴마다 / ${e.duration}턴 <button class="small danger" data-action="remove-temp-map-effect" data-index="${i}">삭제</button></div>`); });
}
export function removeTempMapEffect(i) { appState.tempMapEffects.splice(i, 1); renderTempMapEffects(); }

export function addMap() {
  const name = $("mapName").value.trim(); if (!name) return alert("맵 이름을 입력하세요.");
  data.maps.push({ id: makeId(), name, desc: $("mapDesc").value, bgm: $("mapBgm").value, image: appState.tempMapImage, effects: structuredClone(appState.tempMapEffects) });
  appState.tempMapImage = ""; appState.tempMapEffects = []; clearInputs(["mapName", "mapDesc", "mapBgm", "mapEveryTurns", "mapConditionDuration"]); renderTempMapEffects(); save(); renderAll();
}
export function renderList(boxId, items, renderFn) {
  const box = $(boxId);
  if (!box) return;
  box.innerHTML = items.length ? items.map(renderFn).join("") : '<p class="muted">항목이 없습니다.</p>';
}

export function renderMapList() {
  renderList("mapList", data.maps, m => `<div class="list-item"><div class="row-title">${esc(m.name)}</div><div class="row-meta">${esc(m.desc || "-")}<br>효과 ${m.effects?.length || 0}개</div><button class="small danger" data-action="delete-map" data-id="${m.id}">삭제</button></div>`);
}
export function deleteMap(id) { if (confirm("맵 삭제?")) { data.maps = data.maps.filter(m => m.id !== id); if (data.activeMapId === id) data.activeMapId = ""; save(); renderAll(); } }
export function loadMap() {
  const id = $("mapSelect").value; const m = data.maps.find(x => x.id === id); if (!m) return;
  data.activeMapId = id;
  if (m.image) pushScene(m.image);
  playBgm(m.bgm);
  save(); renderAll();
}
export function renderMapView() {
  const m = data.maps.find(x => x.id === data.activeMapId);
  $("currentMapInfo").innerHTML = m ? `<strong>${esc(m.name)}</strong><br>${esc(m.desc || "")}<br><br>맵 효과: ${(m.effects || []).map(e => { const c = data.conditions.find(x => x.id === e.conditionId); return `${esc(c?.name || "-")} ${e.everyTurns}턴마다 ${e.duration}턴`; }).join("<br>") || "-"}` : "-";
  $("mapDescView").textContent = m ? m.desc || "" : "";
  const img = $("sceneImage"), ph = $("scenePlaceholder");
  if (data.sceneHistory[0]) { img.src = data.sceneHistory[0]; img.style.display = "block"; ph.style.display = "none"; } else { img.style.display = "none"; ph.style.display = "block"; }
  renderSceneHistory();
}
export function pushScene(src) { if (!src) return; data.sceneHistory = [src, ...data.sceneHistory.filter(x => x !== src)].slice(0, 6); }
export function renderSceneHistory() { const box = $("sceneHistory"); box.innerHTML = ""; data.sceneHistory.forEach(src => box.insertAdjacentHTML("beforeend", `<img class="history-thumb" src="${src}" data-action="set-scene" data-src="${src.replaceAll("'", "\\'")}">`)); }
export function setScene(src) { pushScene(src); save(); renderMapView(); }
export function setupSceneDragDrop() {
  const dz = $("dropZone"), input = $("sceneFileInput"); if (!dz) return;
  dz.onclick = e => { if (e.target.closest?.(".main-scene-shop")) return; input.click(); };
  input.onchange = e => { const f = e.target.files[0]; if (f) sceneFile(f); };
  dz.ondragover = e => { e.preventDefault(); dz.classList.add("dragover"); };
  dz.ondragleave = () => dz.classList.remove("dragover");
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove("dragover"); const f = e.dataTransfer.files[0]; if (f) sceneFile(f); };
}
export function sceneFile(file) { if (!file.type.startsWith("image/")) return alert("이미지 파일만 가능"); const r = new FileReader(); r.onload = e => { pushScene(e.target.result); save(); renderMapView(); }; r.readAsDataURL(file); }
export function playBgm(src) { const a = $("bgmPlayer"); if (!a) return; if (!src) { a.removeAttribute("src"); return; } a.src = src; a.volume = .55; a.play().catch(() => { }); }

export function addCondition() { const name = $("conditionName").value.trim(); if (!name) return alert("상태이상 이름"); data.conditions.push({ id: makeId(), name, stat: $("conditionStat").value, effect: $("conditionEffect").value, value: Number($("conditionValue").value || 0), duration: Number($("conditionDuration").value || 1), desc: $("conditionDesc").value }); clearInputs(["conditionName", "conditionValue", "conditionDuration", "conditionDesc"]); save(); renderAll(); }
export function renderConditionList() {
  renderList("conditionList", data.conditions, c => `<div class="list-item"><div class="row-title">${esc(c.name)}</div><div class="row-meta">${effectName(c.effect)} / ${STAT_LABELS[c.stat]} / ${c.value} / ${c.duration}턴</div><button class="small danger" data-action="delete-condition" data-id="${c.id}">삭제</button></div>`);
}
export function deleteCondition(id) { if (confirm("상태이상 삭제?")) { data.conditions = data.conditions.filter(c => c.id !== id); save(); renderAll(); } }

export function addSkill() { const unassigned = $("skillUnassigned").checked; const owner = unassigned ? null : findActor($("skillOwner").value); const name = $("skillName").value.trim(); if (!unassigned && !owner) return alert("스킬 소유자 확인"); if (!name) return alert("스킬 이름 확인"); data.skills.push({ id: makeId(), ownerType: owner?.type || "none", ownerId: owner?.id || "", forSale: $("skillForSale").checked, price: Number($("skillPrice").value || 0), name, type: $("skillType").value, stat: $("skillStat").value, mpCost: Number($("skillMpCost").value || 0), bonus: Number($("skillBonus").value || 0), amount: $("skillAmount").value, conditionId: $("skillCondition").value, desc: $("skillDesc").value }); clearInputs(["skillName", "skillPrice", "skillMpCost", "skillBonus", "skillAmount", "skillDesc"]); $("skillUnassigned").checked = false; $("skillForSale").checked = false; save(); renderAll(); }
export function renderSkillList() { const box = $("skillList"); if (!box) return; box.innerHTML = ""; data.skills.forEach(s => { const o = findActor(actorValue(s.ownerType, s.ownerId)); box.insertAdjacentHTML("beforeend", `<div class="list-item"><div class="row-title">${esc(s.name)}</div><div class="row-meta">${s.ownerType === "none" ? "미지급" : esc(o?.actor.name || "?")} / ${skillName(s.type)} / ${STAT_LABELS[s.stat]} / MP ${s.mpCost || 0} / 보정 ${s.bonus || 0}${s.forSale ? `<br>상점판매 가능 / ${s.price || 0} Gold` : ""}</div><button class="small danger" data-action="delete-skill" data-id="${s.id}">삭제</button></div>`); }); }
export function deleteSkill(id) { if (confirm("스킬 삭제?")) { data.skills = data.skills.filter(s => s.id !== id); save(); renderAll(); } }

