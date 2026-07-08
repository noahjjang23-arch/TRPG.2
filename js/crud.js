import {appState, $,  COMMON_STATS, EQUIP_SLOTS, STAT_LABELS, data } from "./constants_data.js";
import { attackTypeName, esc, escAttr, fumbleName, getPercent, jobTitle, openMainSceneForge, openMainSceneShop, skillName } from "./creation.js";
import { applyCondition, effStat, giveReward, resistText, showToast, syncStatus } from "./combat.js";
import { clearInputs, clearStats, readStats, renderAll, renderList } from "./rendering.js";
import { makeId, save } from "./main.js";

export function addPlayer() { const name = $("playerName").value.trim(); if (!name) return alert("플레이어 이름"); const st = readStats("player"); const maxHp = Number($("playerMaxHp").value || 10 + st.VIT * 2); const maxMp = Number($("playerMaxMp").value || 5 + st.INT + st.MND); data.players.push({ id: makeId(), name, level: Number($("playerLevel").value || 1), exp: Number($("playerExp").value || 0), nextExp: Number($("playerNextExp").value || 100), statPoints: 0, hp: Number($("playerHp").value || maxHp), maxHp, mp: Number($("playerMp").value || maxMp), maxMp, gold: Number($("playerGold").value || 0), hype: Number($("playerHype").value || 0), status: $("playerStatus").value || "정상", memo: $("playerMemo").value, portrait: appState.tempPlayerPortrait, stats: st, conditions: [], disabledWeaponTurns: 0 }); appState.tempPlayerPortrait = ""; clearInputs(["playerName", "playerLevel", "playerExp", "playerNextExp", "playerGold", "playerHype", "playerHp", "playerMaxHp", "playerMp", "playerMaxMp", "playerStatus", "playerMemo"]); clearStats("player"); save(); renderAll(); }
export function renderPlayerList() {
  renderList("playerList", data.players, p => `<div class="list-item"><div class="row-title">${esc(p.name)} Lv.${p.level}</div><div class="row-meta">EXP ${p.exp}/${p.nextExp} / 포인트 ${p.statPoints} / 고양감 ${p.hype || 0}<br>HP ${p.hp}/${p.maxHp} MP ${p.mp}/${p.maxMp}</div><button class="small danger" data-action="delete-player" data-id="${p.id}">삭제</button></div>`);
}
export function deletePlayer(id) { if (confirm("플레이어 삭제?")) { data.players = data.players.filter(p => p.id !== id); save(); renderAll(); } }


export function saveNpcJobConfig() {
  const key = $("npcJobConfigSelect").value;
  data.npcJobConfigs[key] = {
    title: $("npcJobConfigTitle").value || jobTitle(key),
    desc: $("npcJobConfigDesc").value || ""
  };
  save(); renderNpcJobConfigList(); alert("NPC 직업 설명 저장 완료");
}
export function fillNpcJobConfigForm() {
  const key = $("npcJobConfigSelect").value;
  const cfg = data.npcJobConfigs?.[key] || { title: jobTitle(key), desc: "" };
  $("npcJobConfigTitle").value = cfg.title || jobTitle(key);
  $("npcJobConfigDesc").value = cfg.desc || "";
}
export function renderNpcJobConfigList() {
  const box = $("npcJobConfigList"); if (!box) return; box.innerHTML = "";
  Object.entries(data.npcJobConfigs || {}).forEach(([key, cfg]) => {
    box.insertAdjacentHTML("beforeend", `<div class="list-item"><div class="row-title">${esc(cfg.title || jobTitle(key))}</div><div class="row-meta">${esc(cfg.desc || "-")}</div></div>`);
  });
  fillNpcJobConfigForm();
}

export function addNpc() { const name = $("npcName").value.trim(); if (!name) return alert("NPC 이름"); data.npcs.push({ id: makeId(), name, job: $("npcJob").value, portrait: appState.tempNpcPortrait, hp: Number($("npcHp").value || 0), maxHp: Number($("npcMaxHp").value || $("npcHp").value || 1), def: Number($("npcDef").value || 0), atk: Number($("npcAtk").value || 0), status: $("npcStatus").value || "정상", skillMemo: $("npcSkillMemo").value, public: $("npcPublic").checked, stats: readStats("npc"), conditions: [], npcStats: { SUSPICION: Number($("npcSUSPICION").value || 0), AFFECTION: Number($("npcAFFECTION").value || 0), MADNESS: Number($("npcMADNESS").value || 0), CORRUPTION: Number($("npcCORRUPTION").value || 0) } }); appState.tempNpcPortrait = ""; save(); renderAll(); }
export function renderNpcList() {
  renderList("npcList", data.npcs, n => `<div class="list-item"><div class="row-title">${esc(n.name)} / ${jobTitle(n.job)}</div><div class="row-meta">HP ${n.hp}/${n.maxHp} / ${n.public ? "공개" : "비공개"}<br>${esc(n.skillMemo || "")}</div><button class="small danger" data-action="delete-npc" data-id="${n.id}">삭제</button></div>`);
}
export function deleteNpc(id) { if (confirm("NPC 삭제?")) { data.npcs = data.npcs.filter(n => n.id !== id); save(); renderAll(); } }

export function addTempBossFumble() { const id = $("bossFumbleSelect").value; if (!id) return; if (!appState.tempBossFumbles.includes(id)) appState.tempBossFumbles.push(id); renderTempBossFumbles(); }
export function renderTempBossFumbles() { const box = $("bossFumblePreview"); box.innerHTML = ""; appState.tempBossFumbles.forEach((id, i) => { const f = data.fumbles.find(x => x.id === id); box.insertAdjacentHTML("beforeend", `<div class="mini-item">${esc(f?.name || "-")} <button class="small danger" data-action="remove-temp-boss-fumble" data-index="${i}">삭제</button></div>`); }); }
export function removeTempBossFumble(i) { appState.tempBossFumbles.splice(i, 1); renderTempBossFumbles(); }
export function addBoss() { const name = $("bossName").value.trim(); if (!name) return alert("보스 이름"); data.bosses.push({ id: makeId(), name, hp: Number($("bossHp").value || 100), maxHp: Number($("bossMaxHp").value || 100), status: $("bossStatus").value || "정상", attackType: $("bossAttackType").value || "slash", memo: $("bossMemo").value, stats: readStats("boss"), conditions: [], fumbleIds: structuredClone(appState.tempBossFumbles), reward: { exp: Number($("bossRewardExp").value || 0), gold: Number($("bossRewardGold").value || 0), itemName: $("bossDropItem").value, itemQty: Number($("bossDropQty").value || 1), itemDesc: $("bossDropDesc").value } }); appState.tempBossFumbles = []; renderTempBossFumbles(); save(); renderAll(); }
export function renderBossList() {
  renderList("bossList", data.bosses, b => `<div class="list-item"><div class="row-title">${esc(b.name)}</div><div class="row-meta">HP ${b.hp}/${b.maxHp}<br><span class="attack-type-badge">${attackTypeName(b.attackType)}</span><br>펌블 ${b.fumbleIds?.length || 0}개 / EXP ${b.reward.exp} Gold ${b.reward.gold}</div><button class="small danger" data-action="delete-boss" data-id="${b.id}">삭제</button></div>`);
}
export function deleteBoss(id) { if (confirm("보스 삭제?")) { data.bosses = data.bosses.filter(b => b.id !== id); data.activeBossIds = data.activeBossIds.filter(x => x !== id); save(); renderAll(); } }

export function addMaterial() { const name = $("materialName").value.trim(); if (!name) return alert("소재 이름"); data.materials.push({ id: makeId(), name, durabilityBonus: Number($("materialDurability").value || 0), stats: readStats("material"), desc: $("materialDesc").value }); clearInputs(["materialName", "materialDurability", "materialDesc"]); clearStats("material"); save(); renderAll(); }
export function renderMaterialList() {
  renderList("materialList", data.materials, m => `<div class="list-item"><div class="row-title">${esc(m.name)}</div><div class="row-meta">내구도 +${m.durabilityBonus}</div><button class="small danger" data-action="delete-material" data-id="${m.id}">삭제</button></div>`);
}
export function deleteMaterial(id) { data.materials = data.materials.filter(m => m.id !== id); save(); renderAll(); }

export function addEnchant() { const name = $("enchantName").value.trim(); if (!name) return alert("인챈트 이름"); data.enchants.push({ id: makeId(), name, stats: readStats("enchant"), debuffStat: $("enchantDebuff").value, skillId: $("enchantSkill").value, desc: $("enchantDesc").value }); clearInputs(["enchantName", "enchantDesc"]); clearStats("enchant"); save(); renderAll(); }
export function renderEnchantList() {
  renderList("enchantList", data.enchants, e => `<div class="list-item"><div class="row-title">${esc(e.name)}</div><div class="row-meta">디버프 ${e.debuffStat ? STAT_LABELS[e.debuffStat] : "없음"}</div><button class="small danger" data-action="delete-enchant" data-id="${e.id}">삭제</button></div>`);
}
export function deleteEnchant(id) { data.enchants = data.enchants.filter(e => e.id !== id); save(); renderAll(); }

export function addEquipment() { const name = $("equipmentName").value.trim(); if (!name) return alert("장비 이름"); const mat = data.materials.find(m => m.id === $("equipmentMaterial").value); const base = Number($("equipmentDurability").value || 10); data.equipments.push({ id: makeId(), name, type: $("equipmentType").value, attackType: $("equipmentAttackType").value || "slash", resists: { slash: Number($("resistSlash").value || 0), pierce: Number($("resistPierce").value || 0), blunt: Number($("resistBlunt").value || 0), special: Number($("resistSpecial").value || 0) }, materialId: $("equipmentMaterial").value, enchantId: $("equipmentEnchant").value, durability: base + (mat?.durabilityBonus || 0), maxDurability: base + (mat?.durabilityBonus || 0), enchantable: $("equipmentEnchantable").checked, image: appState.tempEquipmentImage, desc: $("equipmentDesc").value, stats: readStats("equipment"), equippedBy: "" }); appState.tempEquipmentImage = ""; clearInputs(["equipmentName", "equipmentDurability", "equipmentDesc", "resistSlash", "resistPierce", "resistBlunt", "resistSpecial"]); clearStats("equipment"); save(); renderAll(); }
export function renderEquipmentList() { const box = $("equipmentList"); if (!box) return; box.innerHTML = ""; data.equipments.forEach(e => { const mat = data.materials.find(m => m.id === e.materialId); const ench = data.enchants.find(x => x.id === e.enchantId); box.insertAdjacentHTML("beforeend", `<div class="list-item"><div class="row-title">${esc(e.name)} [${EQUIP_SLOTS[e.type]}]</div><div class="row-meta">${esc(mat?.name || "소재 없음")} / ${esc(ench?.name || "인챈트 없음")}<br><span class="attack-type-badge">${e.type === "weapon" ? attackTypeName(e.attackType) : "방어구 내성"}</span><br>${resistText(e)}<br>내구도 ${e.durability}/${e.maxDurability} / 장착 ${esc(e.equippedBy || "-")}</div><button class="small danger" data-action="delete-equipment" data-id="${e.id}">삭제</button></div>`); }); }
export function deleteEquipment(id) { data.equipments = data.equipments.filter(e => e.id !== id); save(); renderAll(); }

export function addItem() { const name = $("itemName").value.trim(); if (!name) return alert("아이템 이름"); data.items.push({ id: makeId(), name, qty: Number($("itemQty").value || 1), owner: $("itemOwner").value, image: appState.tempItemImage, desc: $("itemDesc").value, effect: $("itemEffect").value, effectAmount: Number($("itemEffectAmount").value || 0), conditionId: $("itemCondition").value, used: $("itemUsed").checked }); appState.tempItemImage = ""; clearInputs(["itemName", "itemQty", "itemOwner", "itemDesc", "itemEffectAmount"]); if ($("itemUsed")) $("itemUsed").checked = false; save(); renderAll(); }
export function renderItemList() {
  renderList("itemList", data.items, i => `<div class="list-item">${i.image ? `<img class="list-thumb" src="${i.image}">` : ""}<div class="row-title">${esc(i.name)} x${i.qty}</div><div class="row-meta">보유자 ${esc(i.owner || "-")} / 효과 ${i.effect}</div><button class="small danger" data-action="delete-item" data-id="${i.id}">삭제</button></div>`);
}
export function deleteItem(id) { data.items = data.items.filter(i => i.id !== id); save(); renderAll(); }

export function addFumble() { const name = $("fumbleName").value.trim(); if (!name) return alert("펌블 이름"); data.fumbles.push({ id: makeId(), name, type: $("fumbleType").value, stat: $("fumbleStat").value, value: Number($("fumbleValue").value || 0), duration: Number($("fumbleDuration").value || 1), desc: $("fumbleDesc").value }); clearInputs(["fumbleName", "fumbleValue", "fumbleDuration", "fumbleDesc"]); save(); renderAll(); }
export function renderFumbleList() {
  renderList("fumbleList", data.fumbles, f => `<div class="list-item"><div class="row-title">${esc(f.name)}</div><div class="row-meta">${fumbleName(f.type)} / ${f.value} / ${f.duration}턴</div><button class="small danger" data-action="delete-fumble" data-id="${f.id}">삭제</button></div>`);
}
export function deleteFumble(id) { data.fumbles = data.fumbles.filter(f => f.id !== id); save(); renderAll(); }

export function renderPlayerCards() {
  const box = $("mainPlayerCards");
  if (!box) return;
  box.innerHTML = "";
  data.players.forEach(p => {
    const hp = getPercent(p.hp, p.maxHp), mp = getPercent(p.mp, p.maxMp), exp = getPercent(p.exp, p.nextExp);
    const selected = data.playerSession?.currentPlayerId === p.id;
    box.insertAdjacentHTML("beforeend", `<div class="player-main-card ${selected ? "selected-player-card" : ""}">
      <div class="portrait-frame" data-action="open-level-modal" data-id="${p.id}">${p.portrait ? `<img src="${p.portrait}">` : `<div class="portrait-placeholder">NO<br>PORTRAIT</div>`}</div>
      <div>
        <div class="player-name">${esc(p.name)}${selected ? " · 선택됨" : ""}</div>
        <div class="level-badge">Lv.${p.level} / ${esc(p.className || "무직")} / 포인트 ${p.statPoints}</div>
        <span class="hype-badge">고양감 ${p.hype || 0}</span>
        <div class="stat-line"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
        <div class="small-bar-frame"><div class="hp-bar hp" style="width:${hp}%"></div></div>
        <div class="stat-line"><span>MP</span><span>${p.mp}/${p.maxMp}</span></div>
        <div class="small-bar-frame"><div class="hp-bar mp" style="width:${mp}%"></div></div>
        <div class="stat-line"><span>EXP</span><span>${p.exp}/${p.nextExp}</span></div>
        <div class="small-bar-frame"><div class="hp-bar exp" style="width:${exp}%"></div></div>
        <div class="player-extra">상태: ${renderStatus(p)}<br>Gold ${p.gold}<br>STR ${effStat(p, "STR")} / DEX ${effStat(p, "DEX")} / VIT ${effStat(p, "VIT")}</div>
        <div class="player-card-actions">
          <button data-action="change-player-hp" data-id="${p.id}">HP 변경</button>
          <button data-action="change-player-gold" data-id="${p.id}">골드 변경</button>
          <button data-action="add-player-condition" data-id="${p.id}">상태 추가</button>
          <button data-action="remove-player-condition" data-id="${p.id}">상태 제거</button>
          <button data-action="open-inventory" data-name="${escAttr(p.name)}">인벤토리 보기</button>
          <button data-action="select-main-player-character" data-id="${p.id}">캐릭터 선택</button>
          <button data-action="edit-player-character" data-id="${p.id}">캐릭터 수정</button>
          <button class="danger" data-action="delete-player-from-main" data-id="${p.id}">캐릭터 삭제</button>
          <button data-action="open-skills" data-id="${p.id}">스킬</button>
        </div>
      </div>
    </div>`);
  });
}
export function quickHp(id, delta) { const p = data.players.find(x => x.id === id); if (!p) return; p.hp = Math.max(0, Math.min(p.maxHp, p.hp + delta)); save(); renderAll(); }
export function changePlayerHpPrompt(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  const input = prompt(`${p.name}의 HP 변경값을 입력하세요. 예: -5 또는 10`, "0");
  if (input === null) return;
  const delta = Number(input);
  if (Number.isNaN(delta)) return alert("숫자로 입력하세요.");
  p.hp = Math.max(0, Math.min(Number(p.maxHp || 0), Number(p.hp || 0) + delta));
  save();
  renderAll();
  showToast("HP 변경 완료");
}
export function changePlayerGoldPrompt(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  const input = prompt(`${p.name}의 골드 변경값을 입력하세요. 예: -20 또는 50`, "0");
  if (input === null) return;
  const delta = Number(input);
  if (Number.isNaN(delta)) return alert("숫자로 입력하세요.");
  p.gold = Math.max(0, Number(p.gold || 0) + delta);
  save();
  renderAll();
  showToast("골드 변경 완료");
}
export function addPlayerConditionPrompt(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  if (!data.conditions.length) {
    const name = prompt("추가할 상태 이름을 입력하세요.", "상태이상");
    if (!name) return;
    p.conditions ??= [];
    p.conditions.push({ id: makeId(), name, effect: "custom", value: 0, duration: 1, remainingShield: 0 });
    syncStatus(p);
    save();
    renderAll();
    return;
  }
  const list = data.conditions.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
  const input = prompt(`추가할 상태 번호를 입력하세요.\n${list}`, "1");
  if (input === null) return;
  const c = data.conditions[Number(input) - 1];
  if (!c) return alert("상태 번호를 확인하세요.");
  applyCondition(p, c, c.duration);
  save();
  renderAll();
  showToast("상태 추가 완료");
}
export function removePlayerConditionPrompt(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  const list = p.conditions || [];
  if (!list.length) return alert("제거할 상태가 없습니다.");
  const input = prompt(`제거할 상태 번호를 입력하세요.\n${list.map((c, i) => `${i + 1}. ${c.name}`).join("\n")}`, "1");
  if (input === null) return;
  const idx = Number(input) - 1;
  if (!list[idx]) return alert("상태 번호를 확인하세요.");
  list.splice(idx, 1);
  syncStatus(p);
  save();
  renderAll();
  showToast("상태 제거 완료");
}
export function selectMainPlayerCharacter(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  data.playerSession.currentPlayerId = id;
  save();
  renderAll();
  showToast(`${p.name} 선택 완료`);
}
export function editPlayerCharacterPrompt(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  const oldName = p.name;
  const name = prompt("캐릭터 이름", p.name);
  if (name === null) return;
  const maxHp = prompt("최대 HP", p.maxHp);
  if (maxHp === null) return;
  const hp = prompt("현재 HP", p.hp);
  if (hp === null) return;
  const gold = prompt("골드", p.gold);
  if (gold === null) return;
  p.name = name.trim() || p.name;
  if (oldName !== p.name) {
    data.items.forEach(i => { if (i.owner === oldName) i.owner = p.name; });
    data.equipments.forEach(e => { if (e.equippedBy === oldName) e.equippedBy = p.name; });
  }
  p.maxHp = Math.max(1, Number(maxHp || p.maxHp));
  p.hp = Math.max(0, Math.min(p.maxHp, Number(hp || p.hp)));
  p.gold = Math.max(0, Number(gold || p.gold));
  save();
  renderAll();
  showToast("캐릭터 수정 완료");
}
export function deletePlayerFromMain(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`${p.name} 캐릭터를 삭제할까요?`)) return;
  data.players = data.players.filter(x => x.id !== id);
  if (data.playerSession.currentPlayerId === id) data.playerSession.currentPlayerId = "";
  save();
  renderAll();
  showToast("캐릭터 삭제 완료");
}
export function renderStatus(actor) { const list = actor.conditions || []; if (!list.length) return `<span class="status-pill">정상</span>`; return list.map(c => `<span class="status-pill">${esc(c.name)} ${c.effect === "shield" ? c.remainingShield : c.duration + "턴"}</span>`).join(""); }

export function openInventory(playerName) { appState.selectedInventoryPlayerName = playerName; $("inventoryModal").classList.remove("hidden"); $("inventoryTitle").textContent = `${playerName} 인벤토리`; renderInventory(); }
export function renderInventory() { const player = data.players.find(p => p.name === appState.selectedInventoryPlayerName); const content = $("inventoryContent"); const slots = $("equipmentSlots"); content.innerHTML = ""; slots.innerHTML = ""; data.items.filter(i => i.owner === appState.selectedInventoryPlayerName || i.owner === "파티 공용").forEach(i => content.insertAdjacentHTML("beforeend", `<div class="inventory-item"><strong>${esc(i.name)} x${i.qty}</strong><p>${esc(i.desc || "-")}</p><button data-action="use-item" data-id="${i.id}">사용</button></div>`)); Object.entries(EQUIP_SLOTS).forEach(([slot, label]) => { const eq = data.equipments.find(e => e.equippedBy === appState.selectedInventoryPlayerName && e.type === slot); slots.insertAdjacentHTML("beforeend", `<div class="equipment-slot ${eq ? "equipped" : ""}"><strong>${label}</strong>${eq?.image ? `<img class="equipment-img" src="${eq.image}">` : ""}<p>${eq ? `${esc(eq.name)}<br>${eq.type === "weapon" ? attackTypeName(eq.attackType) : resistText(eq)}<br>내구도 ${eq.durability}/${eq.maxDurability}` : "비어 있음"}</p>${eq ? `<button data-action="unequip" data-id="${eq.id}">해제</button>` : ""}</div>`); }); content.insertAdjacentHTML("beforeend", `<h3>장착 가능 장비</h3>`); data.equipments.filter(e => !e.equippedBy).forEach(e => content.insertAdjacentHTML("beforeend", `<div class="inventory-item"><strong>${esc(e.name)} [${EQUIP_SLOTS[e.type]}]</strong><p>${e.type === "weapon" ? attackTypeName(e.attackType) : resistText(e)}<br>내구도 ${e.durability}/${e.maxDurability}</p><button data-action="equip" data-id="${e.id}">장착</button></div>`)); }
export function equip(id) { const eq = data.equipments.find(e => e.id === id); if (!eq) return; data.equipments.filter(e => e.equippedBy === appState.selectedInventoryPlayerName && e.type === eq.type).forEach(e => e.equippedBy = ""); eq.equippedBy = appState.selectedInventoryPlayerName; save(); renderInventory(); renderPlayerCards(); }
export function unequip(id) { const eq = data.equipments.find(e => e.id === id); if (eq) eq.equippedBy = ""; save(); renderInventory(); renderPlayerCards(); }
export function useItem(id) { const item = data.items.find(i => i.id === id); const p = data.players.find(x => x.name === appState.selectedInventoryPlayerName); if (!item || !p) return; if (item.effect === "heal") p.hp = Math.min(p.maxHp, p.hp + item.effectAmount); if (item.effect === "mpHeal") p.mp = Math.min(p.maxMp, p.mp + item.effectAmount); if (item.effect === "condition") { const c = data.conditions.find(x => x.id === item.conditionId); if (c) applyCondition(p, c, c.duration); } item.qty -= 1; if (item.qty <= 0) data.items = data.items.filter(i => i.id !== id); save(); renderInventory(); renderPlayerCards(); }

export function openSkills(playerId) { const p = data.players.find(x => x.id === playerId); if (!p) return; $("skillModal").classList.remove("hidden"); $("skillModalTitle").textContent = `${p.name} 스킬`; const box = $("skillModalContent"); box.innerHTML = ""; const skills = data.skills.filter(s => s.ownerType === "player" && s.ownerId === playerId); if (!skills.length) box.innerHTML = `<p class="muted">스킬 없음</p>`; skills.forEach(s => box.insertAdjacentHTML("beforeend", `<div class="list-item"><div class="row-title">${esc(s.name)}</div><div class="row-meta">${skillName(s.type)} / ${STAT_LABELS[s.stat]} / MP ${s.mpCost}<br>${esc(s.desc || "")}</div></div>`)); }
export function openLevelModal(playerId) { appState.selectedLevelPlayerId = playerId; const p = data.players.find(x => x.id === playerId); if (!p) return; $("levelModal").classList.remove("hidden"); $("levelModalTitle").textContent = `${p.name} 스탯 강화`; $("levelModalInfo").textContent = `사용 가능 포인트: ${p.statPoints}`; const box = $("levelStatButtons"); box.innerHTML = ""; COMMON_STATS.forEach(stat => box.insertAdjacentHTML("beforeend", `<button class="level-stat-btn" data-level-player="${p.id}" data-level-stat="${stat}" data-action="increase-stat" data-stat="${stat}">${STAT_LABELS[stat]} +1</button>`)); }
export function increaseStat(stat) { const p = data.players.find(x => x.id === appState.selectedLevelPlayerId); if (!p) return; if (p.statPoints <= 0) return alert("스탯 포인트 없음"); p.stats[stat]++; p.statPoints--; if (stat === "VIT") { p.maxHp += 2; p.hp += 2; } if (stat === "INT" || stat === "MND") { p.maxMp += 1; p.mp += 1; } save(); renderAll(); openLevelModal(p.id); }

export function loadActiveBoss() { const id = $("bossSelect").value; if (id && !data.activeBossIds.includes(id)) data.activeBossIds.push(id); save(); renderActiveBosses(); }
export function renderActiveBosses() { const box = $("activeBossArea"); if (!box) return; box.innerHTML = ""; data.activeBossIds.forEach(id => { const b = data.bosses.find(x => x.id === id); if (!b) return; const hp = getPercent(b.hp, b.maxHp); box.insertAdjacentHTML("beforeend", `<div class="boss-card-mini"><h3>${esc(b.name)}</h3><span class="attack-type-badge">${attackTypeName(b.attackType)}</span><div>${renderStatus(b)}</div><div class="hp-frame"><div class="hp-bar hp" style="width:${hp}%"></div></div><div class="stat-line"><span>${b.hp}/${b.maxHp}</span><span>${hp}%</span></div><button class="small" data-action="grant-boss-reward" data-id="${b.id}">보상 지급</button><button class="small danger" data-action="hide-boss" data-id="${b.id}">숨김</button></div>`); }); }
export function hideBoss(id) { data.activeBossIds = data.activeBossIds.filter(x => x !== id); save(); renderActiveBosses(); }

export function loadActiveNpc() { const id = $("npcSelect").value; if (id && !data.activeNpcIds.includes(id)) data.activeNpcIds.push(id); save(); renderAll(); }
export function renderActiveNpcs() {
  const box = $("activeNpcArea");
  if (!box) return;
  box.innerHTML = "";
  data.activeNpcIds.forEach(id => {
    const n = data.npcs.find(x => x.id === id);
    if (!n) return;
    const cfg = data.npcJobConfigs?.[n.job] || { title: jobTitle(n.job), desc: "" };
    const isMerchant = n.job === "merchant" || n.job === "상인";
    const isForge = n.job === "repair" || n.job === "강화/수리";
    const shopBtn = isMerchant ? `<button class="small" data-action="open-main-scene-shop" data-id="${n.id}">상점 열기</button>` : "";
    const forgeBtn = isForge ? `<button class="small" data-action="open-main-scene-forge" data-id="${n.id}">대장간 열기</button>` : "";
    box.insertAdjacentHTML("beforeend", `<div class="npc-card-mini">${n.portrait ? `<img src="${n.portrait}">` : ""}<h3>${esc(n.name)}</h3><span class="job-badge">${esc(cfg.title || jobTitle(n.job))}</span><p class="muted">상태: ${esc(n.status || "정상")}</p><button class="small" data-action="toggle-npc-job" data-id="${n.id}">직업 창</button><button class="small danger" data-action="hide-npc" data-id="${n.id}">숨김</button><div id="npcJobPanel-${n.id}" class="npc-job-panel hidden">${esc(cfg.desc || "-")}<br>${shopBtn}${forgeBtn}</div></div>`);
  });
}
export function hideNpc(id) { data.activeNpcIds = data.activeNpcIds.filter(x => x !== id); save(); renderAll(); }
export function toggleNpcJob(id) {
  const el = $(`npcJobPanel-${id}`);
  if (el) el.classList.toggle("hidden");
  const n = data.npcs.find(x => x.id === id);
  if (n && (n.job === "merchant" || n.job === "상인")) openMainSceneShop(id);
  if (n && (n.job === "repair" || n.job === "강화/수리")) openMainSceneForge(id);
}

export function grantBossReward(id) { const b = data.bosses.find(x => x.id === id); const p = data.players[0]; if (!b || !p) return alert("플레이어 없음"); giveReward(p, b.reward, `보스 보상 ${b.name}`); }
